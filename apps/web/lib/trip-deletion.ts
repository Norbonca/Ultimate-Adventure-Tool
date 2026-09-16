import type { TranslationKey } from "@uat/i18n";

/** BR-M02-009 cancellation reasons — must match the list in migration 041 `delete_or_cancel_trip`. */
export const CANCELLATION_REASONS = [
  "organizer_decision",
  "insufficient_participants",
  "weather",
  "safety",
  "force_majeure",
] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export const CANCELLATION_REASON_LABEL: Record<CancellationReason, TranslationKey> = {
  organizer_decision: "trips.deletion.reasonOrganizerDecision",
  insufficient_participants: "trips.deletion.reasonInsufficientParticipants",
  weather: "trips.deletion.reasonWeather",
  safety: "trips.deletion.reasonSafety",
  force_majeure: "trips.deletion.reasonForceMajeure",
};

/** Which dialog the organiser sees (D02 `v54yy`): A draft, B soft delete, C cancel; null = not deletable. */
export type TripDeletionMode = "draft" | "soft" | "cancel" | null;

export function tripDeletionMode(status: string, activeApplicants: number): TripDeletionMode {
  if (status === "draft") return "draft";
  if (!["published", "registration_open", "active"].includes(status)) return null;
  return activeApplicants > 0 ? "cancel" : "soft";
}
