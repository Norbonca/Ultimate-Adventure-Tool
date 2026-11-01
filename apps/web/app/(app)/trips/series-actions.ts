"use server";

/**
 * M024 Túrasorozat — szervezői műveletek (spec: modules/02_Trip_Management/024_Trip_Series/00_Uzleti_Specifikacio.md).
 *
 * - addSeriesDate (BR-M024-006): új időpont a túra másolataként, piszkozatként, ugyanabban a sorozatban.
 *   A másolást az adatbázis végzi (`add_trip_series_date`, 063, SECURITY INVOKER — a hívó RLS-ével).
 * - detachFromSeries (BR-M024-008): az időpont önálló túra lesz; egy időpontnál a sorozat feloszlik (063 trigger).
 *
 * Terv: design/D02_Trip_Management.pen#vcfZO.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import type { TranslationKey } from "@uat/i18n";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const addSeriesDateSchema = z
  .object({
    tripId: z.string().uuid(),
    startDate: isoDate,
    endDate: isoDate,
    maxParticipants: z.coerce.number().int().min(1).max(1000),
    priceAmount: z.union([z.coerce.number().min(0).max(100_000_000), z.literal(""), z.null()]).optional(),
    registrationDeadline: z.union([isoDate, z.literal(""), z.null()]).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "invalidDates" })
  .refine((v) => !v.registrationDeadline || v.registrationDeadline <= v.startDate, {
    path: ["registrationDeadline"],
    message: "invalidDeadline",
  });

export type AddSeriesDateInput = z.input<typeof addSeriesDateSchema>;

export type AddSeriesDateResult =
  | { ok: true; data: { tripId: string; slug: string } }
  | { ok: false; error: string; field?: "endDate" | "registrationDeadline" | "maxParticipants" };

const DB_ERROR_KEY: Record<string, TranslationKey> = {
  invalid_dates: "series.errors.invalidDates",
  invalid_deadline: "series.errors.invalidDeadline",
  invalid_max_participants: "series.errors.invalidCapacity",
  invalid_price: "errors.validationFailed",
  trip_not_found: "trips.errors.tripNotFound",
  not_authenticated: "errors.notAuthenticated",
};

export async function addSeriesDate(raw: AddSeriesDateInput): Promise<AddSeriesDateResult> {
  const { t } = await getServerT();
  const parsed = addSeriesDateSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    if (issue?.message === "invalidDates") return { ok: false, error: t("series.errors.invalidDates"), field: "endDate" };
    if (issue?.message === "invalidDeadline") {
      return { ok: false, error: t("series.errors.invalidDeadline"), field: "registrationDeadline" };
    }
    if (field === "maxParticipants") return { ok: false, error: t("series.errors.invalidCapacity"), field: "maxParticipants" };
    return { ok: false, error: t("errors.validationFailed") };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("errors.notAuthenticated") };

  const { data: newId, error } = await supabase.rpc("add_trip_series_date", {
    p_trip_id: input.tripId,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_max_participants: input.maxParticipants,
    p_price_amount: input.priceAmount === "" || input.priceAmount == null ? null : Number(input.priceAmount),
    p_registration_deadline: input.registrationDeadline || null,
  });
  if (error || !newId) {
    const key: TranslationKey = (error?.message && DB_ERROR_KEY[error.message]) || "errors.saveFailed";
    if (!DB_ERROR_KEY[error?.message ?? ""]) console.error("addSeriesDate error:", error);
    return { ok: false, error: t(key) };
  }

  const { data: created } = await supabase.from("trips").select("slug").eq("id", newId as string).maybeSingle();
  revalidatePath("/trips");
  revalidatePath("/");
  return { ok: true, data: { tripId: newId as string, slug: created?.slug ?? "" } };
}

export type DetachFromSeriesResult = { ok: true; data: null } | { ok: false; error: string };

export async function detachFromSeries(tripId: string): Promise<DetachFromSeriesResult> {
  const { t } = await getServerT();
  if (!z.string().uuid().safeParse(tripId).success) return { ok: false, error: t("errors.validationFailed") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("errors.notAuthenticated") };

  const { data: updated, error } = await supabase
    .from("trips")
    .update({ series_id: null })
    .eq("id", tripId)
    .eq("organizer_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !updated) {
    if (error) console.error("detachFromSeries error:", error);
    return { ok: false, error: t(error ? "errors.saveFailed" : "trips.errors.tripNotFound") };
  }

  revalidatePath("/trips");
  revalidatePath("/");
  return { ok: true, data: null };
}
