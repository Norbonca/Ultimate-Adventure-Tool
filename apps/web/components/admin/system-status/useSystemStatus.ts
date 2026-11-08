"use client";
/**
 * M151 — az állapot lekérése és automatikus frissítése (spec K-4, K-6):
 * 30 mp-enként, amíg a lap látható; visszatéréskor azonnal, ha a legutóbbi lekérés régebbi 30 mp-nél.
 * Sikertelen lekérésnél az utolsó ismert állapot megmarad; lejárt munkamenetnél a belépésre visz.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SystemStatus } from "@/lib/system-status/types";

export const REFRESH_INTERVAL_MS = 30_000;
const ENDPOINT = "/api/v1/admin/system-status";

export function useSystemStatus() {
  const router = useRouter();
  const [data, setData] = useState<SystemStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(true);
  const lastFetchAt = useRef(0);
  const inFlight = useRef(false);

  const load = useCallback(async (force = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    lastFetchAt.current = Date.now();
    setChecking(true);
    try {
      const res = await fetch(force ? `${ENDPOINT}?force=1` : ENDPOINT, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) throw new Error(`status ${res.status}`);
      setData((await res.json()) as SystemStatus);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetchAt.current >= REFRESH_INTERVAL_MS) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const recheck = useCallback(() => load(true), [load]);
  return { data, failed, checking, recheck };
}
