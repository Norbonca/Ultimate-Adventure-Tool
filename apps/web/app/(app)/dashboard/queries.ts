/**
 * A nyitóoldal adatai — „mit kell most csinálnom?”
 *
 * Design: design/claude/D25_Nyitooldal#Teli (1440), #Ures, #Uj, #Teli_390, #Ures_390.
 * A lap két sávra bontja a teendőt: amire mások várnak (szervezőként) és ami a sajátod
 * (résztvevőként). Minden teendő ma is létező adatból áll elő; a forrásokat a
 * `TodoKind` sorai nevezik meg.
 *
 * Nincs benne (V1.1): a túrákon átívelő költség-egyenleg (M03) és az M23 naptári
 * figyelmeztetés. Mindkettőhöz van adat, de külön összesítő réteg kell hozzá.
 */

import { createClient } from "@/lib/supabase/server";

/** Mettől számít „hamarosan” egy határidő; ezen túl nem teendő, csak a túra adatlapján látszik. */
const HORIZON_DAYS = 30;
/** Ennyi nap után szól a lap, hogy a piszkozat nem ment ki. */
const STALE_DRAFT_DAYS = 7;
/** Ennyi nappal indulás előtt kerül a felkészülés a teendők közé. */
const TRIP_SOON_DAYS = 14;

export type TodoKind =
  | "pendingApplications"   // trip_participants.status = pending (a túráimon)
  | "organizerTask"         // trip_tasks, assignee_type = organizer (M021)
  | "staleDraft"            // trips.status = draft, régóta érintetlen
  | "deadlineSoon"          // trips.registration_deadline közeleg
  | "participantTask"       // trip_tasks, assignee_type = participant (M021)
  | "applicationPending"    // a saját jelentkezésem elbírálás alatt
  | "waitlisted"            // várólistán vagyok
  | "tripSoon"              // indul a túra, amire megyek
  | "ideaJoiners";          // csatlakoztak a túraötletemhez (M22)

export type TodoAction = "review" | "open" | "continue" | "share" | "check";

export interface Todo {
  id: string;
  kind: TodoKind;
  icon: string;
  href: string;
  /** A túra (vagy ötlet) címe — a sor második sora. */
  trip: string;
  /** A szöveg behelyettesítései: {count}, {name}, {days}. */
  params: Record<string, string | number>;
  /** Hány nap a határidőig; negatív = lejárt; null = nincs határidő. */
  days: number | null;
  action: TodoAction;
  /** Nem sürgős, nem szorít: halványan, a sor végén. */
  soft: boolean;
  /** Hány azonos nevű feladat áll e mögött a sor mögött ugyanazon a túrán. */
  same?: number;
}

export interface NextTrip {
  title: string;
  slug: string;
  cover: string | null;
  startDate: string;
  endDate: string;
  place: string;
  days: number;
  role: "organizer" | "participant";
}

export interface DashboardData {
  organizer: Todo[];
  participant: Todo[];
  /** Hány sor maradt ki a sávonkénti korlát miatt. */
  organizerMore: number;
  participantMore: number;
  nextTrip: NextTrip | null;
  stats: { trips: number; days: number; countries: number } | null;
  /** Van-e bármilyen múltja a felhasználónak: ettől függ, hogy az „új felhasználó” lapot kapja-e. */
  hasHistory: boolean;
}

const napok = (datum: string | null): number | null => {
  if (!datum) return null;
  const ma = new Date();
  ma.setHours(0, 0, 0, 0);
  const cel = new Date(datum);
  cel.setHours(0, 0, 0, 0);
  return Math.round((cel.getTime() - ma.getTime()) / 86_400_000);
};

const surgos = (t: Todo) => t.days !== null && t.days <= 2;

/** Sávonként legfeljebb ennyi sor; a többit a „mind” hivatkozás viszi tovább. */
export const SAV_MAX = 5;

/**
 * Ugyanazon a túrán ugyanazzal a névvel álló feladatok egy sorrá válnak: a legközelebbi
 * határidővel és egy darabszámmal. Négy egyforma „Tankolás, gyülekező” sor hibának látszik,
 * nem munkának.
 */
function osszevon(items: Todo[]): Todo[] {
  const map = new Map<string, Todo>();
  for (const t of items) {
    const kulcs = `${t.kind}|${t.trip}|${t.params.name ?? ""}`;
    const meglevo = map.get(kulcs);
    if (!meglevo) {
      map.set(kulcs, { ...t, same: 1 });
      continue;
    }
    meglevo.same = (meglevo.same ?? 1) + 1;
    if (meglevo.days === null || (t.days !== null && t.days < meglevo.days)) {
      meglevo.days = t.days;
      meglevo.href = t.href;
    }
  }
  return [...map.values()];
}

/** Lejárt elöl, utána a közeli határidő; a határidő nélküli és a halvány a végén. */
const rangsor = (a: Todo, b: Todo) => {
  if (a.soft !== b.soft) return a.soft ? 1 : -1;
  if (a.days === null && b.days === null) return 0;
  if (a.days === null) return 1;
  if (b.days === null) return -1;
  return a.days - b.days;
};

const lokalizalt = (name: string, localized: unknown, locale: string): string => {
  if (localized && typeof localized === "object") {
    const ertek = (localized as Record<string, unknown>)[locale];
    if (typeof ertek === "string" && ertek.trim()) return ertek;
  }
  return name;
};

const helyszin = (orszag: string | null, varos: string | null) =>
  [varos, orszag].filter(Boolean).join(", ");

export async function fetchDashboard(userId: string, locale: string): Promise<DashboardData> {
  const supabase = await createClient();
  const ma = new Date().toISOString().slice(0, 10);

  // ── A saját túráim (szervezőként) és a jelentkezéseim ──────────────────────
  const [szervezett, reszvetel] = await Promise.all([
    supabase
      .from("trips")
      .select("id, title, slug, status, start_date, end_date, updated_at, registration_deadline, cover_image_url, card_image_url, location_country, location_city")
      .eq("organizer_id", userId)
      .is("deleted_at", null),
    supabase
      .from("trip_participants")
      .select("id, status, trip_id, trips!inner(id, title, slug, status, start_date, end_date, cover_image_url, card_image_url, location_country, location_city, organizer_id, deleted_at)")
      .eq("user_id", userId)
      .in("status", ["pending", "approved", "approved_pending_payment", "participant", "waitlisted"]),
  ]);

  const sajatTurak = (szervezett.data ?? []) as Array<{
    id: string; title: string; slug: string; status: string; start_date: string; end_date: string;
    updated_at: string; registration_deadline: string | null; cover_image_url: string | null;
    card_image_url: string | null; location_country: string | null; location_city: string | null;
  }>;
  const sajatIdk = sajatTurak.map((t) => t.id);

  type Reszvetel = {
    id: string; status: string; trip_id: string;
    trips: { id: string; title: string; slug: string; status: string; start_date: string; end_date: string;
      cover_image_url: string | null; card_image_url: string | null; location_country: string | null;
      location_city: string | null; organizer_id: string; deleted_at: string | null } | null;
  };
  const reszvetelek = ((reszvetel.data ?? []) as unknown as Reszvetel[])
    .filter((r) => r.trips && !r.trips.deleted_at && r.trips.organizer_id !== userId);
  const reszvetelIdk = reszvetelek.map((r) => r.trip_id);

  // ── Párhuzamos lekérdezések a teendőkhöz ──────────────────────────────────
  const [jelentkezesek, szervezoiFeladatok, resztvevoiFeladatok, otletek] = await Promise.all([
    sajatIdk.length
      ? supabase.from("trip_participants").select("trip_id").in("trip_id", sajatIdk).eq("status", "pending")
      : Promise.resolve({ data: [] as { trip_id: string }[] }),
    sajatIdk.length
      ? supabase
          .from("trip_tasks")
          .select("id, trip_id, name, name_localized, due_date, is_blocking")
          .in("trip_id", sajatIdk)
          .eq("assignee_type", "organizer")
          .eq("status", "pending")
          .not("due_date", "is", null)
          .order("due_date", { ascending: true })
          .limit(40)
      : Promise.resolve({ data: [] as never[] }),
    reszvetelIdk.length
      ? supabase
          .from("trip_tasks")
          .select("id, trip_id, name, name_localized, due_date, is_blocking")
          .in("trip_id", reszvetelIdk)
          .eq("assignee_type", "participant")
          .eq("status", "pending")
          .not("due_date", "is", null)
          .order("due_date", { ascending: true })
          .limit(20)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("trip_ideas")
      .select("id, slug, title, member_count")
      .eq("owner_id", userId)
      .in("status", ["open", "organizing"])
      .is("deleted_at", null)
      .limit(10),
  ]);

  const turaNev = new Map(sajatTurak.map((t) => [t.id, t.title]));
  const reszvetelNev = new Map(reszvetelek.map((r) => [r.trip_id, r.trips!.title]));
  const reszvetelSlug = new Map(reszvetelek.map((r) => [r.trip_id, r.trips!.slug]));
  const sajatSlug = new Map(sajatTurak.map((t) => [t.id, t.slug]));

  // ── Szervezői sáv ─────────────────────────────────────────────────────────
  const organizer: Todo[] = [];

  const jelentkezesDb = new Map<string, number>();
  for (const sor of (jelentkezesek.data ?? []) as { trip_id: string }[]) {
    jelentkezesDb.set(sor.trip_id, (jelentkezesDb.get(sor.trip_id) ?? 0) + 1);
  }
  for (const [tripId, count] of jelentkezesDb) {
    organizer.push({
      id: `appl-${tripId}`,
      kind: "pendingApplications",
      icon: "clipboard-list",
      href: `/trips/${sajatSlug.get(tripId)}/manage?tab=team`,
      trip: turaNev.get(tripId) ?? "",
      params: { count },
      // A jelentkezőre mások várnak: a lap sürgősnek veszi, de dátuma nincs.
      days: 0,
      action: "review",
      soft: false,
    });
  }

  for (const f of (szervezoiFeladatok.data ?? []) as Array<{ id: string; trip_id: string; name: string; name_localized: unknown; due_date: string; is_blocking: boolean }>) {
    const d = napok(f.due_date);
    if (d === null || d > HORIZON_DAYS) continue;
    organizer.push({
      id: `otask-${f.id}`,
      kind: "organizerTask",
      icon: f.is_blocking ? "circle-alert" : "square",
      href: `/trips/${sajatSlug.get(f.trip_id)}/manage`,
      trip: turaNev.get(f.trip_id) ?? "",
      params: { name: lokalizalt(f.name, f.name_localized, locale) },
      days: d,
      action: "open",
      soft: false,
    });
  }

  for (const t of sajatTurak) {
    if (t.status === "draft") {
      const eltelt = Math.max(0, -(napok(t.updated_at.slice(0, 10)) ?? 0));
      if (eltelt >= STALE_DRAFT_DAYS) {
        organizer.push({
          id: `draft-${t.id}`,
          kind: "staleDraft",
          icon: "file-pen",
          href: `/trips/${t.slug}/edit`,
          trip: t.title,
          params: { days: eltelt },
          days: null,
          action: "continue",
          soft: true,
        });
      }
      continue;
    }
    const hatarido = napok(t.registration_deadline ? t.registration_deadline.slice(0, 10) : null);
    if (hatarido !== null && hatarido >= 0 && hatarido <= TRIP_SOON_DAYS && t.start_date >= ma) {
      organizer.push({
        id: `deadline-${t.id}`,
        kind: "deadlineSoon",
        icon: "megaphone",
        href: `/trips/${t.slug}`,
        trip: t.title,
        params: { days: hatarido },
        days: hatarido,
        action: "share",
        soft: false,
      });
    }
  }

  for (const o of (otletek.data ?? []) as Array<{ id: string; slug: string; title: string; member_count: number | null }>) {
    if ((o.member_count ?? 0) < 1) continue;
    organizer.push({
      id: `idea-${o.id}`,
      kind: "ideaJoiners",
      icon: "lightbulb",
      href: `/ideas/${o.slug}`,
      trip: o.title,
      params: { count: o.member_count ?? 0 },
      days: null,
      action: "check",
      soft: true,
    });
  }

  // ── Résztvevői sáv ────────────────────────────────────────────────────────
  const participant: Todo[] = [];

  for (const f of (resztvevoiFeladatok.data ?? []) as Array<{ id: string; trip_id: string; name: string; name_localized: unknown; due_date: string; is_blocking: boolean }>) {
    const d = napok(f.due_date);
    if (d === null || d > HORIZON_DAYS) continue;
    participant.push({
      id: `ptask-${f.id}`,
      kind: "participantTask",
      icon: f.is_blocking ? "circle-alert" : "square",
      href: `/trips/${reszvetelSlug.get(f.trip_id)}/participant`,
      trip: reszvetelNev.get(f.trip_id) ?? "",
      params: { name: lokalizalt(f.name, f.name_localized, locale) },
      days: d,
      action: "open",
      soft: false,
    });
  }

  for (const r of reszvetelek) {
    const tura = r.trips!;
    if (tura.end_date < ma) continue;
    if (r.status === "pending") {
      participant.push({
        id: `mine-${r.id}`, kind: "applicationPending", icon: "hourglass",
        href: `/trips/${tura.slug}`, trip: tura.title, params: {},
        days: null, action: "check", soft: true,
      });
      continue;
    }
    if (r.status === "waitlisted") {
      participant.push({
        id: `wait-${r.id}`, kind: "waitlisted", icon: "hourglass",
        href: `/trips/${tura.slug}`, trip: tura.title, params: {},
        days: null, action: "check", soft: true,
      });
      continue;
    }
    const indulas = napok(tura.start_date);
    if (indulas !== null && indulas >= 0 && indulas <= TRIP_SOON_DAYS) {
      participant.push({
        id: `soon-${r.id}`, kind: "tripSoon", icon: "backpack",
        href: `/trips/${tura.slug}/participant`, trip: tura.title,
        params: { days: indulas }, days: indulas, action: "open", soft: false,
      });
    }
  }

  const organizerOsszes = osszevon(organizer).sort(rangsor);
  const participantOsszes = osszevon(participant).sort(rangsor);

  // ── A következő túra: a legközelebbi, amin szervezőként vagy résztvevőként ott vagy ──
  const jovobeli: NextTrip[] = [];
  for (const t of sajatTurak) {
    if (t.status === "draft" || t.status === "cancelled" || t.end_date < ma) continue;
    jovobeli.push({
      title: t.title, slug: t.slug, cover: t.cover_image_url ?? t.card_image_url,
      startDate: t.start_date, endDate: t.end_date, place: helyszin(t.location_country, t.location_city),
      days: napok(t.start_date) ?? 0, role: "organizer",
    });
  }
  for (const r of reszvetelek) {
    const t = r.trips!;
    if (t.status === "cancelled" || t.end_date < ma || r.status === "pending" || r.status === "waitlisted") continue;
    jovobeli.push({
      title: t.title, slug: t.slug, cover: t.cover_image_url ?? t.card_image_url,
      startDate: t.start_date, endDate: t.end_date, place: helyszin(t.location_country, t.location_city),
      days: napok(t.start_date) ?? 0, role: "participant",
    });
  }
  jovobeli.sort((a, b) => a.startDate.localeCompare(b.startDate));
  const nextTrip = jovobeli[0] ?? null;

  // ── Az utad eddig: a /trips oldalon is ugyanez a számítás ─────────────────
  const valodi = sajatTurak.filter((t) => t.status !== "draft");
  const vallalt = reszvetelek
    .filter((r) => ["approved", "approved_pending_payment", "participant"].includes(r.status))
    .map((r) => r.trips!);
  const osszes = [
    ...valodi.map((t) => ({ start: t.start_date, end: t.end_date, country: t.location_country })),
    ...vallalt.map((t) => ({ start: t.start_date, end: t.end_date, country: t.location_country })),
  ];
  const napSzam = osszes.reduce((sum, t) => {
    if (!t.start || !t.end) return sum;
    const n = (new Date(t.end).getTime() - new Date(t.start).getTime()) / 86_400_000 + 1;
    return sum + Math.max(n, 1);
  }, 0);
  const orszagok = new Set(osszes.map((t) => t.country).filter(Boolean)).size;

  const hasHistory = sajatTurak.length > 0 || reszvetelek.length > 0;

  return {
    organizer: organizerOsszes.slice(0, SAV_MAX),
    participant: participantOsszes.slice(0, SAV_MAX),
    organizerMore: Math.max(0, organizerOsszes.length - SAV_MAX),
    participantMore: Math.max(0, participantOsszes.length - SAV_MAX),
    nextTrip,
    stats: hasHistory ? { trips: osszes.length, days: Math.round(napSzam), countries: orszagok } : null,
    hasHistory,
  };
}

export const urgent = (t: Todo) => surgos(t);

// ── Ami még érdekelhet ──────────────────────────────────────────────────────

export interface Suggestion {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  place: string;
  dates: string;
  price: string;
  categoryName: string | null;
  categoryColor: string | null;
}

/**
 * Ajánlott túrák: a kedvenc kalandtípusaidban (user_adventure_interests), illetve a korábban
 * szervezett túráid kategóriáiban — a „Mire várnak” ötletajánló mintájára. Csak olyan túra,
 * ami jelentkezésre nyitott, a jövőben indul, és nem a sajátod.
 */
export async function fetchSuggestions(userId: string, locale: string, limit = 3): Promise<Suggestion[]> {
  const supabase = await createClient();
  const ma = new Date().toISOString().slice(0, 10);

  const [erdeklodes, sajat] = await Promise.all([
    supabase.from("user_adventure_interests").select("category_id").eq("user_id", userId),
    supabase.from("trips").select("category_id").eq("organizer_id", userId).is("deleted_at", null),
  ]);
  const kategoriak = Array.from(new Set([
    ...((erdeklodes.data ?? []) as { category_id: string }[]).map((r) => r.category_id),
    ...((sajat.data ?? []) as { category_id: string }[]).map((r) => r.category_id),
  ].filter(Boolean)));

  let q = supabase
    .from("trips")
    .select("id, slug, title, start_date, end_date, cover_image_url, card_image_url, location_country, location_city, price_amount, price_currency, categories (name, name_localized, color_hex)")
    .in("status", ["published", "registration_open"])
    .eq("visibility", "public")
    .is("deleted_at", null)
    .neq("organizer_id", userId)
    .gte("start_date", ma)
    .order("start_date", { ascending: true })
    .limit(limit);
  if (kategoriak.length) q = q.in("category_id", kategoriak);

  const { data } = await q;
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "hu-HU", { year: "numeric", month: "short", day: "numeric" });
  const penz = (amount: number | null, currency: string | null) => {
    if (amount === null || !currency) return "";
    try {
      return new Intl.NumberFormat(locale === "en" ? "en-US" : "hu-HU", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  };

  type Sor = {
    id: string; slug: string; title: string; start_date: string; end_date: string;
    cover_image_url: string | null; card_image_url: string | null;
    location_country: string | null; location_city: string | null;
    price_amount: number | null; price_currency: string | null;
    categories: { name: string; name_localized: Record<string, string> | null; color_hex: string | null } | null;
  };

  return ((data ?? []) as unknown as Sor[]).map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    image: t.card_image_url ?? t.cover_image_url,
    place: helyszin(t.location_country, t.location_city),
    dates: `${fmt.format(new Date(t.start_date))} – ${fmt.format(new Date(t.end_date))}`,
    price: penz(t.price_amount, t.price_currency),
    categoryName: t.categories ? (t.categories.name_localized?.[locale] ?? t.categories.name) : null,
    categoryColor: t.categories?.color_hex ?? null,
  }));
}
