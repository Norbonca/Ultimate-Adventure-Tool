import type { TimelineLocation } from "@/app/(app)/trips/timeline-actions";
import type { LocationDraft } from "@/components/timeline/LocationField";
import type { PlaceCandidate } from "@/lib/geocoding";

/** Szerverről jött hely → szerkeszthető vázlat. */
export function toDraft(loc: TimelineLocation | null): LocationDraft | null {
  if (!loc) return null;
  return { name: loc.name, notes: loc.notes ?? "", address: loc.address, lat: loc.lat, lng: loc.lng, place: null };
}

/**
 * A saveTimelineLocation `place` mezője: új találat → a találat; csak név (nincs koordináta) → null;
 * meglévő, koordinátás hely változatlan koordinátával → undefined (a szerver megtartja).
 */
export function placePayload(draft: LocationDraft): PlaceCandidate | null | undefined {
  if (draft.place) return draft.place;
  if (draft.lat == null) return null;
  return undefined;
}
