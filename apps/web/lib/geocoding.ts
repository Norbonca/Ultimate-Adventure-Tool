/**
 * Nominatim geocoding — server-side only.
 *
 * Turns a trip's location fields (country / region / city) into WGS84
 * coordinates for the globe discovery view. Server-side only for three
 * reasons: Nominatim requires an identifying User-Agent that a browser
 * cannot set, its usage policy caps requests at one per second, and the
 * endpoint sends no CORS headers.
 *
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 * Every result is tagged `nominatim` so callers can tell a resolved
 * location from the country-centroid placeholder written by migration 034.
 */

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Trevu/1.0 (+https://www.ttvk.hu)';
const REQUEST_TIMEOUT_MS = 6000;
const MIN_INTERVAL_MS = 1100; // Nominatim: max 1 request/second.

export interface GeocodeQuery {
  /** ISO 3166-1 alpha-2 country code, e.g. 'HU'. */
  country: string;
  region?: string | null;
  city?: string | null;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  source: 'nominatim';
}

/** Serialises outgoing requests so we never exceed one per second. */
let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function throttle<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return task();
  });
  // Keep the chain alive even when a task rejects.
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function queryNominatim(params: Record<string, string>): Promise<GeocodeResult | null> {
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`[geocoding] Nominatim responded ${response.status} for`, params);
      return null;
    }

    const results: unknown = await response.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    const first = results[0] as { lat?: string; lon?: string; display_name?: string };
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      displayName: first.display_name ?? '',
      source: 'nominatim',
    };
  } catch (error) {
    // Network failure or timeout must never break trip saving.
    console.warn('[geocoding] Nominatim request failed:', error);
    return null;
  }
}

/**
 * Process-local cache. The wizard geocodes the same place twice — once for the
 * live preview in step 2, once when the draft is saved — and Nominatim asks
 * callers not to repeat identical queries. An hour is well inside the usage
 * policy and far shorter than how often a town moves.
 */
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { result: GeocodeResult | null; storedAt: number }>();

function cacheKey(query: GeocodeQuery): string {
  return [
    query.country?.trim().toUpperCase() ?? '',
    query.region?.trim().toLowerCase() ?? '',
    query.city?.trim().toLowerCase() ?? '',
  ].join('|');
}

/**
 * Resolves the most specific location it can, narrowing on failure:
 * city+region+country → city+country → region+country → country.
 * Returns null when nothing resolves; the caller keeps whatever it had.
 */
export async function geocodeLocation(query: GeocodeQuery): Promise<GeocodeResult | null> {
  const country = query.country?.trim();
  if (!country) return null;

  const key = cacheKey(query);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.storedAt < CACHE_TTL_MS) {
    return cached.result;
  }

  const region = query.region?.trim() || '';
  const city = query.city?.trim() || '';

  const attempts: Record<string, string>[] = [];
  if (city && region) attempts.push({ country, state: region, city });
  if (city) attempts.push({ country, city });
  if (region) attempts.push({ country, state: region });
  attempts.push({ country });

  let result: GeocodeResult | null = null;
  for (const attempt of attempts) {
    result = await throttle(() => queryNominatim(attempt));
    if (result) break;
  }

  cache.set(key, { result, storedAt: Date.now() });
  return result;
}
