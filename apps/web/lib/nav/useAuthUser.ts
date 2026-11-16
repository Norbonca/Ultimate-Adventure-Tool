"use client";

import { useEffect, useState } from "react";

export type AuthUser = { email: string; displayName?: string; firstName?: string; lastName?: string } | null;

/**
 * Kliensoldali belépési állapot a `/api/v1/auth/check` végpontból. Ha a szülő már tudja a felhasználót,
 * add át `known`-ként (akkor nincs lekérés). `checked` hamis, amíg a válasz meg nem jött.
 */
export function useAuthUser(known?: AuthUser): { checked: boolean; user: AuthUser } {
  const [fetched, setFetched] = useState<{ checked: boolean; user: AuthUser }>({ checked: false, user: null });
  useEffect(() => {
    if (known !== undefined) return;
    let user: AuthUser = null;
    fetch("/api/v1/auth/check")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && d?.email) {
          user = {
            email: d.email,
            displayName: d.displayName ?? undefined,
            firstName: d.firstName ?? undefined,
            lastName: d.lastName ?? undefined,
          };
        }
      })
      .catch(() => {})
      .finally(() => setFetched({ checked: true, user }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return known !== undefined ? { checked: true, user: known } : fetched;
}
