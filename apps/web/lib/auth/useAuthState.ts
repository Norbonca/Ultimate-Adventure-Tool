"use client";

/**
 * Háromállapotú belépési jelzés („unknown” amíg nincs válasz) a nyilvános oldalak
 * csak kijelentkezett látogatónak szóló elemeihez (pl. M211b promó blokk) — így
 * belépett felhasználónál nem villan fel. Oldalbetöltésenként egy kérés.
 */

import { useEffect, useState } from "react";

export type AuthState = "unknown" | "in" | "out";

let pending: Promise<AuthState> | null = null;

function check(): Promise<AuthState> {
  pending ??= fetch("/api/v1/auth/check")
    .then((r) => (r.ok ? r.json() : null))
    .then((d): AuthState => (d?.authenticated ? "in" : "out"))
    .catch((): AuthState => "out");
  return pending;
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>("unknown");
  useEffect(() => {
    let alive = true;
    check().then((v) => alive && setState(v));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
