"use client";

/**
 * Résztvevő-változás jelzés kliens oldalon.
 *
 * A Csapat tabon több önállóan töltő komponens él (StaffSeatsManager,
 * ApplicationsManager, CrewMembersRow). Ha az egyik módosítja a
 * `trip_participants` táblát (elfogadás, elutasítás, szervezői hely), a többi
 * ezen a csatornán értesül és újratölt — a `router.refresh()` a kliens-állapotukat
 * nem frissítené.
 */

import { useEffect, useRef } from "react";

type Listener = (tripId: string) => void;
const listeners = new Set<Listener>();

export function notifyParticipantsChanged(tripId: string) {
  for (const listener of listeners) listener(tripId);
}

export function useParticipantsChanged(tripId: string, onChange: () => void) {
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const listener: Listener = (changedTripId) => {
      if (changedTripId === tripId) callback.current();
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [tripId]);
}
