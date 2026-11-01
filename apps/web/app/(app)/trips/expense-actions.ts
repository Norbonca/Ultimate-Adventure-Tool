"use server";
/**
 * M03 Költségelszámolás — szerveroldali műveletek és olvasók (08_Megvalositasi_Terv.md V1-1…V1-7).
 * A jogosultságot az RLS dönti (066/067); itt csak a felhasználóbarát hibát és az üzleti szabályokat kezeljük.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { buildExpenseRows, type ResolvedRate } from "@/lib/expenses/build";
import { expenseInputSchema, fxSettingsSchema, settlementMarkSchema, disputeSchema } from "@/lib/expenses/schemas";
import { decimalToCents, optimizeSettlements } from "@/lib/expenses/money";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

async function tripCtx(supabase: Awaited<ReturnType<typeof createClient>>, tripId: string) {
  const { data } = await supabase
    .from("trips")
    .select("id, slug, organizer_id, settlement_currency, fx_mode, expenses_participants_can_add")
    .eq("id", tripId)
    .maybeSingle();
  return data;
}

async function resolveRate(supabase: Awaited<ReturnType<typeof createClient>>, tripId: string, currency: string, date: string, fxMode: string): Promise<ResolvedRate> {
  // settlement_date módban a végleges árfolyam a kiegyenlítés napjáé; rögzítéskor a mai (utolsó ismert) árfolyammal számolunk.
  const day = fxMode === "settlement_date" ? new Date().toISOString().slice(0, 10) : date;
  const { data, error } = await supabase.rpc("fx_resolve_rate", { p_trip_id: tripId, p_currency: currency, p_date: day });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return { rate: null, rate_date: null, source: "none", quality: "none" };
  return { rate: row.rate === null ? null : Number(row.rate), rate_date: row.rate_date, source: row.source, quality: row.quality };
}

/** Az űrlap átváltási sávjához (D04 X60Jf): mit kapna a tétel, mentés nélkül. */
export async function previewExpenseFx(tripId: string, currency: string, date: string): Promise<Result<{ fx: ResolvedRate }>> {
  const { t } = await getServerT();
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t("errors.notAuthenticated") };
  if (!z.string().uuid().safeParse(tripId).success || !/^[A-Za-z]{3}$/.test(currency) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: t("errors.validationFailed") };
  }
  const trip = await tripCtx(supabase, tripId);
  if (!trip) return { ok: false, error: t("expenses.errors.tripNotFound") };
  return { ok: true, fx: await resolveRate(supabase, tripId, currency.toUpperCase(), date, trip.fx_mode) };
}

const BUILD_ERRORS: Record<string, string> = {
  amount_invalid: "expenses.errors.amountInvalid",
  no_participants: "expenses.errors.noParticipants",
  sum_mismatch: "expenses.errors.sumMismatch",
  percent_mismatch: "expenses.errors.percentMismatch",
  negative: "expenses.errors.amountInvalid",
};

/** Új tétel vagy meglévő módosítása (expenseId megadásával). */
export async function saveExpense(raw: unknown, expenseId?: string): Promise<Result<{ id: string; quality: string }>> {
  const { t } = await getServerT();
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t("errors.notAuthenticated") };
  const parsed = expenseInputSchema.safeParse(raw);
  if (!parsed.success || (expenseId && !z.string().uuid().safeParse(expenseId).success)) {
    return { ok: false, error: t("errors.validationFailed") };
  }
  const input = parsed.data;
  const trip = await tripCtx(supabase, input.tripId);
  if (!trip) return { ok: false, error: t("expenses.errors.tripNotFound") };

  // A fizető és minden részesedő a túra tagja (szervező vagy jóváhagyott résztvevő) — az RLS ezt nem nézi.
  const { data: memberRows } = await supabase
    .from("trip_participants")
    .select("user_id")
    .eq("trip_id", trip.id)
    .in("status", ["approved", "participant"]);
  const members = new Set([trip.organizer_id, ...(memberRows ?? []).map((m) => m.user_id as string)]);
  if (!members.has(input.payerId) || input.participants.some((p) => !members.has(p))) {
    return { ok: false, error: t("expenses.errors.notAllowed") };
  }

  const fx = await resolveRate(supabase, trip.id, input.currency, input.date, trip.fx_mode);
  const built = buildExpenseRows(input, fx);
  if (!built.ok) return { ok: false, error: t(BUILD_ERRORS[built.error] as never) };
  const { expense, splits } = built.value;

  let id = expenseId;
  if (!id) {
    const { data, error } = await supabase
      .from("expenses")
      .insert({ ...expense, trip_id: trip.id, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) {
      console.error("saveExpense insert:", error);
      return { ok: false, error: t(error?.code === "42501" ? "expenses.errors.notAllowed" : "errors.saveFailed") };
    }
    id = data.id as string;
  } else {
    const { data: updated, error } = await supabase.from("expenses").update(expense).eq("id", id).eq("trip_id", trip.id).select("id");
    if (error) {
      console.error("saveExpense update:", error);
      return { ok: false, error: t(error.message.includes("expense_settled_locked") ? "expenses.errors.locked" : "errors.saveFailed") };
    }
    if (!updated?.length) return { ok: false, error: t("expenses.errors.notAllowed") };
    const { error: delErr } = await supabase.from("expense_splits").delete().eq("expense_id", id);
    if (delErr) {
      console.error("saveExpense splits delete:", delErr);
      return { ok: false, error: t("errors.saveFailed") };
    }
  }
  const { error: splitErr } = await supabase.from("expense_splits").insert(splits.map((s) => ({ ...s, expense_id: id })));
  if (splitErr) {
    console.error("saveExpense splits:", splitErr);
    if (!expenseId) await supabase.from("expenses").update({ status: "deleted" }).eq("id", id);
    return { ok: false, error: t("errors.saveFailed") };
  }
  revalidatePath(`/trips/${trip.slug}/expenses`);
  return { ok: true, id: id!, quality: expense.fx_quality };
}

/** Törlés (soft; a 003 triggere tölti a deleted_at-et) és visszavonás 24 órán belül (BR-M03-001). */
export async function setExpenseDeleted(expenseId: string, deleted: boolean): Promise<Result> {
  const { t } = await getServerT();
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t("errors.notAuthenticated") };
  if (!z.string().uuid().safeParse(expenseId).success) return { ok: false, error: t("errors.validationFailed") };
  const { data: row } = await supabase.from("expenses").select("id, deleted_at, trip_id, trips(slug)").eq("id", expenseId).maybeSingle();
  if (!row) return { ok: false, error: t("expenses.errors.notFound") };
  if (!deleted && row.deleted_at && Date.now() - new Date(row.deleted_at).getTime() > 24 * 3600_000) {
    return { ok: false, error: t("expenses.errors.restoreExpired") };
  }
  const { data, error } = await supabase
    .from("expenses")
    .update({ status: deleted ? "deleted" : "active", ...(deleted ? {} : { deleted_at: null }) })
    .eq("id", expenseId)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("setExpenseDeleted:", error);
    return { ok: false, error: t(error?.message.includes("expense_settled_locked") ? "expenses.errors.locked" : "expenses.errors.notAllowed") };
  }
  const slug = (row.trips as unknown as { slug: string } | null)?.slug;
  if (slug) revalidatePath(`/trips/${slug}/expenses`);
  return { ok: true };
}

/** Túra beállításai · Elszámolás (D02 XKV28): pénznem, mód, rögzítési jog, túraszintű árfolyamok. Csak a szervező. */
export async function saveTripFxSettings(raw: unknown): Promise<Result> {
  const { t } = await getServerT();
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t("errors.notAuthenticated") };
  const parsed = fxSettingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("errors.validationFailed") };
  const s = parsed.data;
  const trip = await tripCtx(supabase, s.tripId);
  if (!trip || trip.organizer_id !== user.id) return { ok: false, error: t("expenses.errors.notAllowed") };

  const rates: { currency: string; rate: number }[] = [];
  for (const r of s.rates) {
    const n = Number(r.rate.replace(/\s/g, "").replace(",", "."));
    if (!(n > 0) || !Number.isFinite(n)) return { ok: false, error: t("expenses.errors.rateInvalid") };
    if (r.currency !== s.settlementCurrency) rates.push({ currency: r.currency, rate: Math.round(n * 1e6) / 1e6 });
  }

  const changed = trip.settlement_currency !== s.settlementCurrency || trip.fx_mode !== s.fxMode;
  const { error } = await supabase
    .from("trips")
    .update({ ...(changed ? { settlement_currency: s.settlementCurrency, fx_mode: s.fxMode } : {}), expenses_participants_can_add: s.participantsCanAdd })
    .eq("id", trip.id);
  if (error) {
    console.error("saveTripFxSettings:", error);
    return { ok: false, error: t(error.message.includes("fx_settings_locked") ? "expenses.errors.fxLocked" : "errors.saveFailed") };
  }
  const { error: delErr } = await supabase.from("trip_fx_rates").delete().eq("trip_id", trip.id);
  if (!delErr && rates.length) {
    const { error: insErr } = await supabase
      .from("trip_fx_rates")
      .insert(rates.map((r) => ({ trip_id: trip.id, currency: r.currency, rate: r.rate, set_by: user.id })));
    if (insErr) {
      console.error("saveTripFxSettings rates:", insErr);
      return { ok: false, error: t("errors.saveFailed") };
    }
  }
  revalidatePath(`/trips/${trip.slug}/expenses`);
  revalidatePath(`/trips/${trip.slug}/edit`);
  return { ok: true };
}

export type ExpenseMember = { id: string; name: string; avatarUrl: string | null };
export type ExpenseListItem = {
  id: string; title: string; description: string | null; category: string; date: string;
  amount: string; currency: string; amountSettlement: string | null; fxRate: string | null; fxRateDate: string | null;
  fxQuality: string | null; payerId: string; createdBy: string | null; splitType: string;
  splits: { userId: string; amount: string; amountSettlement: string | null; percentage: string | null }[];
  status: string; deletedAt: string | null;
};
export type SettlementItem = {
  id: string; payerId: string; receiverId: string; amount: string; currency: string; method: string; status: string;
  confirmedByPayer: boolean; confirmedByPayee: boolean; paidMarkedAt: string | null; disputedBy: string | null;
  disputeNote: string | null; createdAt: string;
};
export type ExpensesView = {
  trip: { id: string; slug: string; title: string; startDate: string | null; endDate: string | null; organizerId: string; settlementCurrency: string; fxMode: string; participantsCanAdd: boolean; locationCountry: string };
  viewerId: string; isOrganizer: boolean; canAdd: boolean;
  members: ExpenseMember[];
  expenses: ExpenseListItem[];
  balances: { userId: string; paid: number; owed: number; balance: number; pending: number }[];
  transfers: { from: string; to: string; amount: number }[];
  settlements: SettlementItem[];
  tripRates: { currency: string; rate: string }[];
};

/** Olvasó a /trips/[slug]/expenses és /settle oldalakhoz. null: nincs belépve / nem tag / nincs túra. Összegek centben. */
export async function fetchExpensesView(slug: string): Promise<ExpensesView | null> {
  const { supabase, user } = await authed();
  if (!user) return null;
  const { data: trip } = await supabase
    .from("trips")
    .select("id, slug, title, start_date, end_date, organizer_id, settlement_currency, fx_mode, expenses_participants_can_add, location_country")
    .eq("slug", slug)
    .maybeSingle();
  if (!trip) return null;

  const isOrganizer = trip.organizer_id === user.id;
  const { data: parts } = await supabase
    .from("trip_participants")
    .select("user_id, status, profiles!trip_participants_user_id_fkey (id, display_name, avatar_url)")
    .eq("trip_id", trip.id)
    .in("status", ["approved", "participant"]);
  const isMember = isOrganizer || (parts ?? []).some((p) => p.user_id === user.id);
  if (!isMember) return null;

  const [{ data: org }, { data: exps }, { data: bal }, { data: sets }, { data: rates }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url").eq("id", trip.organizer_id).maybeSingle(),
    supabase
      .from("expenses")
      .select("id, title, description, category, date, amount, currency, amount_settlement, fx_rate, fx_rate_date, fx_quality, payer_id, created_by, split_type, status, deleted_at, expense_splits (user_id, amount, amount_settlement, percentage)")
      .eq("trip_id", trip.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.rpc("trip_balances", { p_trip_id: trip.id }),
    supabase
      .from("settlements")
      .select("id, payer_id, receiver_id, amount, currency, method, status, confirmed_by_payer, confirmed_by_payee, paid_marked_at, disputed_by, dispute_note, created_at")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: false }),
    supabase.from("trip_fx_rates").select("currency, rate").eq("trip_id", trip.id).order("currency"),
  ]);

  type Prof = { id: string; display_name: string | null; avatar_url: string | null } | null;
  const memberMap = new Map<string, ExpenseMember>();
  const addMember = (p: Prof, fallbackId?: string) => {
    const id = p?.id ?? fallbackId;
    if (id && !memberMap.has(id)) memberMap.set(id, { id, name: p?.display_name || "—", avatarUrl: p?.avatar_url ?? null });
  };
  addMember(org as Prof, trip.organizer_id);
  for (const p of parts ?? []) addMember(p.profiles as unknown as Prof, p.user_id);

  const expenses: ExpenseListItem[] = (exps ?? []).map((e) => ({
    id: e.id, title: e.title ?? "", description: e.description, category: e.category, date: e.date,
    amount: String(e.amount), currency: e.currency, amountSettlement: e.amount_settlement === null ? null : String(e.amount_settlement),
    fxRate: e.fx_rate === null ? null : String(e.fx_rate), fxRateDate: e.fx_rate_date, fxQuality: e.fx_quality,
    payerId: e.payer_id, createdBy: e.created_by, splitType: e.split_type, status: e.status, deletedAt: e.deleted_at,
    splits: ((e.expense_splits ?? []) as { user_id: string; amount: string; amount_settlement: string | null; percentage: string | null }[]).map((s) => ({
      userId: s.user_id, amount: String(s.amount), amountSettlement: s.amount_settlement === null ? null : String(s.amount_settlement), percentage: s.percentage,
    })),
  }));

  const balances = ((bal ?? []) as { user_id: string; paid: string; owed: string; balance: string; pending_expenses: number }[]).map((b) => ({
    userId: b.user_id, paid: decimalToCents(b.paid), owed: decimalToCents(b.owed), balance: decimalToCents(b.balance), pending: b.pending_expenses,
  }));
  for (const b of balances) if (!memberMap.has(b.userId)) memberMap.set(b.userId, { id: b.userId, name: "—", avatarUrl: null });

  const canAdd = isOrganizer || trip.expenses_participants_can_add;
  return {
    trip: {
      id: trip.id, slug: trip.slug, title: trip.title, startDate: trip.start_date, endDate: trip.end_date, organizerId: trip.organizer_id,
      settlementCurrency: trip.settlement_currency, fxMode: trip.fx_mode, participantsCanAdd: trip.expenses_participants_can_add, locationCountry: trip.location_country,
    },
    viewerId: user.id, isOrganizer, canAdd,
    members: [...memberMap.values()],
    expenses,
    balances,
    transfers: optimizeSettlements(balances.map((b) => ({ userId: b.userId, balance: b.balance }))),
    settlements: (sets ?? []).map((s) => ({
      id: s.id, payerId: s.payer_id, receiverId: s.receiver_id, amount: String(s.amount), currency: s.currency, method: s.method, status: s.status,
      confirmedByPayer: s.confirmed_by_payer, confirmedByPayee: s.confirmed_by_payee, paidMarkedAt: s.paid_marked_at,
      disputedBy: s.disputed_by, disputeNote: s.dispute_note, createdAt: s.created_at,
    })),
    tripRates: (rates ?? []).map((r) => ({ currency: r.currency, rate: String(r.rate) })),
  };
}

/** „Kifizettem” — a fizető jelzi; az összeg az aktuális optimalizált listából jön, nem a klienstől (az összeg nem módosítható). */
export async function markSettlementPaid(raw: unknown): Promise<Result> {
  const { t } = await getServerT();
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t("errors.notAuthenticated") };
  const parsed = settlementMarkSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("errors.validationFailed") };
  const { data: trip } = await supabase.from("trips").select("slug").eq("id", parsed.data.tripId).maybeSingle();
  if (!trip) return { ok: false, error: t("expenses.errors.tripNotFound") };
  const view = await fetchExpensesView(trip.slug);
  if (!view) return { ok: false, error: t("expenses.errors.notAllowed") };
  const transfer = view.transfers.find((x) => x.from === user.id && x.to === parsed.data.receiverId);
  if (!transfer) return { ok: false, error: t("expenses.errors.noDebt") };
  const open = view.settlements.some((s) => s.payerId === user.id && s.receiverId === parsed.data.receiverId && s.status === "pending");
  if (open) return { ok: false, error: t("expenses.errors.settlementOpen") };
  const amount = (transfer.amount / 100).toFixed(2);
  const { error } = await supabase.from("settlements").insert({
    trip_id: view.trip.id, payer_id: user.id, receiver_id: parsed.data.receiverId, amount, currency: view.trip.settlementCurrency,
    method: parsed.data.method, confirmed_by_payer: true, paid_marked_at: new Date().toISOString(),
  });
  if (error) {
    console.error("markSettlementPaid:", error);
    return { ok: false, error: t("errors.saveFailed") };
  }
  revalidatePath(`/trips/${trip.slug}/expenses`);
  return { ok: true };
}

/** A kedvezményezett megerősíti; a 003 triggere zárja (completed). */
export async function confirmSettlement(settlementId: string): Promise<Result> {
  const { t } = await getServerT();
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t("errors.notAuthenticated") };
  if (!z.string().uuid().safeParse(settlementId).success) return { ok: false, error: t("errors.validationFailed") };
  const { data, error } = await supabase
    .from("settlements")
    .update({ confirmed_by_payee: true })
    .eq("id", settlementId)
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .select("id, trips(slug)");
  if (error || !data?.length) {
    if (error) console.error("confirmSettlement:", error);
    return { ok: false, error: t("expenses.errors.notAllowed") };
  }
  const slug = (data[0].trips as unknown as { slug: string } | null)?.slug;
  if (slug) revalidatePath(`/trips/${slug}/expenses`);
  return { ok: true };
}

/** „Nem értek egyet” — bármelyik fél; csak jelzés, az összeg nem változik (Norbert, 2026-10-31 14:03). */
export async function disputeSettlement(raw: unknown): Promise<Result> {
  const { t } = await getServerT();
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t("errors.notAuthenticated") };
  const parsed = disputeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("errors.validationFailed") };
  const { data, error } = await supabase
    .from("settlements")
    .update({ status: "disputed", dispute_note: parsed.data.note || null })
    .eq("id", parsed.data.settlementId)
    .or(`payer_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq("status", "pending")
    .select("id, trips(slug)");
  if (error || !data?.length) {
    if (error) console.error("disputeSettlement:", error);
    return { ok: false, error: t("expenses.errors.notAllowed") };
  }
  const slug = (data[0].trips as unknown as { slug: string } | null)?.slug;
  if (slug) revalidatePath(`/trips/${slug}/expenses`);
  return { ok: true };
}

/** A manage-kártyához: a túra összes aktív költsége az elszámolási pénznemben (cent). */
export async function fetchTripExpenseTotal(tripId: string): Promise<{ total: number; currency: string | null }> {
  const { supabase } = await authed();
  const { data } = await supabase
    .from("expenses")
    .select("amount_settlement, trips(settlement_currency)")
    .eq("trip_id", tripId)
    .eq("status", "active");
  const total = (data ?? []).reduce((s, r) => s + (r.amount_settlement === null ? 0 : decimalToCents(r.amount_settlement)), 0);
  const currency = (data?.[0]?.trips as unknown as { settlement_currency: string } | null)?.settlement_currency ?? null;
  return { total, currency };
}
