"use server";

// US-M02-015 / BR-M02-009 — delete, soft-delete or cancel a trip (migration 041).
// Design: D02 `v54yy` (A draft, B soft delete, C cancel, D restore) + `m5cJrw` (mobile) + `XKV28` dangerSec.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { CANCELLATION_REASONS, type CancellationReason } from "@/lib/trip-deletion";

const tripId = z.string().uuid();

/** How many active applicants the trip has — decides between modal B (0) and C (> 0). */
export async function fetchTripApplicantCount(id: string): Promise<number | null> {
  if (!tripId.safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trip_active_applicant_count", { p_trip_id: id });
  if (error) {
    console.error("trip_active_applicant_count error:", error);
    return null;
  }
  return data as number;
}

export type TripDeletionResult =
  | { ok: true; result: "deleted" | "soft_deleted" | "cancelled" }
  | { ok: false; error: string };

export async function deleteOrCancelTrip(
  id: string,
  reason?: CancellationReason,
  message?: string
): Promise<TripDeletionResult> {
  const { t } = await getServerT();
  const input = z
    .object({ id: tripId, reason: z.enum(CANCELLATION_REASONS).optional(), message: z.string().max(2000).optional() })
    .safeParse({ id, reason, message });
  if (!input.success) return { ok: false, error: t("errors.validationFailed") };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_or_cancel_trip", {
    p_trip_id: input.data.id,
    p_reason: input.data.reason ?? null,
    p_message: input.data.message ?? null,
  });
  if (error) {
    console.error("delete_or_cancel_trip error:", error);
    return { ok: false, error: t("trips.deletion.failed") };
  }
  revalidatePath("/trips");
  revalidatePath("/");
  return { ok: true, result: (data as { result: "deleted" | "soft_deleted" | "cancelled" }).result };
}

export interface DeletedTrip {
  id: string;
  title: string;
  slug: string;
  deleted_at: string;
  restorable_until: string;
}

export async function fetchMyDeletedTrips(): Promise<DeletedTrip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_deleted_trips");
  if (error) {
    console.error("my_deleted_trips error:", error);
    return [];
  }
  return (data ?? []) as DeletedTrip[];
}

export async function restoreTrip(id: string): Promise<{ ok: boolean; error?: string }> {
  const { t } = await getServerT();
  if (!tripId.safeParse(id).success) return { ok: false, error: t("errors.validationFailed") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("restore_trip", { p_trip_id: id });
  if (error) {
    console.error("restore_trip error:", error);
    return { ok: false, error: t("trips.deletion.restoreFailed") };
  }
  revalidatePath("/trips");
  return { ok: true };
}
