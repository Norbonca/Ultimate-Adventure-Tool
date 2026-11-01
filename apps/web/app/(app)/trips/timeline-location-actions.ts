"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchPlaces, type PlaceCandidate } from "@/lib/geocoding";

// ============================================
// M021 Menetrend — helyszín a mérföldkőhöz és a feladathoz (M121 első szelet, 070)
// Terv: D02 „M021 v2 — Mérföldkő modál” (NO5UX), „Helyszín mező állapotai” (CDW0l).
// A hely a szervező locations sora; a kötés a trip_locations (context = 'custom', milestone_id / task_id).
// Jogosultság: RLS (is_trip_organizer) + guard_trip_location_refs trigger; itt csak a bemenet ellenőrzése.
// ============================================

const uuid = z.string().uuid();

/** Helykeresés — csak kifejezett indításra (gomb / Enter), a túra országára szűkítve, max. 5 találat. */
export async function searchTimelinePlaces(
  tripId: string,
  query: string,
): Promise<{ results: PlaceCandidate[]; error?: "forbidden" | "unavailable" | "too_short" }> {
  if (!uuid.safeParse(tripId).success) return { results: [], error: "forbidden" };
  const q = (query ?? "").trim();
  if (q.length < 3) return { results: [], error: "too_short" };
  if (q.length > 200) return { results: [], error: "too_short" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { results: [], error: "forbidden" };
  const { data: trip } = await supabase
    .from("trips")
    .select("organizer_id, location_country")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip || trip.organizer_id !== user.id) return { results: [], error: "forbidden" };

  const results = await searchPlaces(q, trip.location_country);
  if (results === null) return { results: [], error: "unavailable" };
  return { results };
}

const placeSchema = z.object({
  placeId: z.string().max(300),
  address: z.string().max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().max(100).nullable(),
  countryCode: z.string().length(2).nullable(),
});

const saveSchema = z
  .object({
    tripId: uuid,
    milestoneId: uuid.optional(),
    taskId: uuid.optional(),
    name: z.string().trim().min(1).max(300),
    notes: z.string().trim().max(500).optional().default(""),
    place: placeSchema.nullable().optional(),
  })
  .refine((v) => Boolean(v.milestoneId) !== Boolean(v.taskId), { message: "target" });

export type SaveTimelineLocationInput = z.input<typeof saveSchema>;

/**
 * Hely mentése (létrehozás vagy csere). Ha a mérföldkőhöz már tartozik a szervező saját helye, azt a sort
 * frissíti (nem halmoz árva helyeket); különben új locations sort hoz létre és köt be.
 */
export async function saveTimelineLocation(input: SaveTimelineLocationInput): Promise<{ error?: "invalid" | "forbidden" | "failed" }> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "forbidden" };

  const fields = {
    name: v.name,
    location_type: "poi",
    latitude: v.place?.lat ?? null,
    longitude: v.place?.lng ?? null,
    formatted_address: v.place?.address || null,
    city: v.place?.city ?? null,
    country_code: v.place?.countryCode ?? null,
    geocode_source: v.place ? "nominatim" : "manual",
    geocode_precision: v.place ? "place" : null,
    geocode_place_id: v.place?.placeId ?? null,
    geocoded_at: v.place ? new Date().toISOString() : null,
  };

  const target = v.milestoneId ? { column: "milestone_id", id: v.milestoneId } : { column: "task_id", id: v.taskId as string };
  const { data: existing } = await supabase
    .from("trip_locations")
    .select("id, location_id, locations(created_by)")
    .eq("trip_id", v.tripId)
    .eq(target.column, target.id)
    .maybeSingle();

  const owned = (existing?.locations as unknown as { created_by?: string } | null)?.created_by === user.id;
  if (existing && owned) {
    const { error: locError } = await supabase.from("locations").update(fields).eq("id", existing.location_id);
    if (locError) return { error: locError.code === "42501" ? "forbidden" : "failed" };
    const { error: bindError } = await supabase.from("trip_locations").update({ notes: v.notes || null }).eq("id", existing.id);
    return bindError ? { error: bindError.code === "42501" ? "forbidden" : "failed" } : {};
  }

  const { data: created, error: createError } = await supabase
    .from("locations")
    .insert({ ...fields, created_by: user.id })
    .select("id")
    .single();
  if (createError || !created) return { error: createError?.code === "42501" ? "forbidden" : "failed" };

  if (existing) {
    const { error } = await supabase
      .from("trip_locations")
      .update({ location_id: created.id, notes: v.notes || null })
      .eq("id", existing.id);
    return error ? { error: error.code === "42501" ? "forbidden" : "failed" } : {};
  }

  const { error: insertError } = await supabase.from("trip_locations").insert({
    trip_id: v.tripId,
    location_id: created.id,
    context: "custom",
    [target.column]: target.id,
    notes: v.notes || null,
  });
  if (insertError) {
    // A kötés nem jött létre → a frissen létrehozott hely ne maradjon árván.
    await supabase.from("locations").delete().eq("id", created.id);
    return { error: insertError.code === "42501" ? "forbidden" : "failed" };
  }
  return {};
}

const clearSchema = z
  .object({ tripId: uuid, milestoneId: uuid.optional(), taskId: uuid.optional() })
  .refine((v) => Boolean(v.milestoneId) !== Boolean(v.taskId), { message: "target" });

/** A kötés törlése; a hely a szervező könyvtárában megmarad. */
export async function clearTimelineLocation(input: z.input<typeof clearSchema>): Promise<{ error?: "invalid" | "forbidden" | "failed" }> {
  const parsed = clearSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "forbidden" };
  const query = supabase.from("trip_locations").delete().eq("trip_id", v.tripId);
  const { error } = v.milestoneId ? await query.eq("milestone_id", v.milestoneId) : await query.eq("task_id", v.taskId as string);
  return error ? { error: error.code === "42501" ? "forbidden" : "failed" } : {};
}
