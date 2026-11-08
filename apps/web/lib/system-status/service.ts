/**
 * M151 — gyorsítótár a futtatás köré (spec §3 „Terhelés”): 15 mp-ig ugyanazt adja vissza példányonként,
 * a kézi ellenőrzés megkerüli, de 5 mp-en belül nem ismétel; párhuzamos kérések egy futást osztanak meg.
 */
import { runSystemChecks } from "./checks";
import type { SystemStatus } from "./types";

export const CACHE_TTL_MS = 15_000;
export const FORCE_MIN_INTERVAL_MS = 5_000;

let cached: { at: number; data: SystemStatus } | null = null;
let inFlight: Promise<SystemStatus> | null = null;

export function shouldReuse(cachedAt: number | null, now: number, force: boolean): boolean {
  if (cachedAt === null) return false;
  const age = now - cachedAt;
  return force ? age < FORCE_MIN_INTERVAL_MS : age < CACHE_TTL_MS;
}

export async function getSystemStatus({ force = false }: { force?: boolean } = {}): Promise<SystemStatus> {
  const now = Date.now();
  if (cached && shouldReuse(cached.at, now, force)) return cached.data;
  if (inFlight) return inFlight;
  inFlight = runSystemChecks()
    .then((data) => {
      cached = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
