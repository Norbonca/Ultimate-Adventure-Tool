"use client";

/**
 * Kliensoldali „be van-e jelentkezve” jelzés a nem védett oldalakon megjelenő,
 * csak belépett felhasználónak szóló elemekhez (pl. M211 súgó).
 * Egy oldalbetöltésen belül egyszer kérdez (/api/v1/auth/check); amíg nincs válasz, `false`.
 */

import { useEffect, useState } from "react";

let pending: Promise<boolean> | null = null;

function check(): Promise<boolean> {
  pending ??= fetch("/api/v1/auth/check")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => !!d?.authenticated)
    .catch(() => false);
  return pending;
}

export function useIsLoggedIn(): boolean {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    check().then((v) => alive && setLoggedIn(v));
    return () => {
      alive = false;
    };
  }, []);
  return loggedIn;
}
