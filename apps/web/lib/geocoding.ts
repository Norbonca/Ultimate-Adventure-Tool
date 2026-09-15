/**
 * Trip geocoding — server-side only (M121 Location Service, spec 0.2 §6).
 *
 * Turns a trip's location fields (country / region / city) into WGS84
 * coordinates for the globe discovery view. This file is the single
 * geocoding place in the app: server actions import it, and
 * `scripts/geocode-trips.mjs` mirrors its narrowing strategy. The planned
 * `lib/location/` extraction (spec §6.1, step 1b) moves it, it does not add a
 * second one.
 *
 * Providers sit behind `GeocodeProvider` (spec §6.3/§6.5): the active one is
 * chosen at runtime by `LOCATION_GEOCODER` (default `nominatim`), so swapping
 * provider is configuration, not a caller change. The full registry with
 * fallback chains and `system_settings` lives in step 1b; until then the
 * chain is fixed: provider → country centroid (see `countryCentroid`).
 *
 * Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 * identifying User-Agent, at most one request per second, results cached,
 * no client-side autocomplete. All four hold here: the browser never calls
 * Nominatim, requests are serialised per server process, answers (including
 * "not found") are cached, and the wizard asks only for a committed location,
 * not per keystroke (step2-basics.tsx).
 */

/** Provenance written to `trips.location_geocode_source` (migration 034 CHECK). */
export type GeocodeSource = 'nominatim' | 'country_centroid' | 'manual';

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
  source: GeocodeSource;
}

/** One structured-geocoding provider (spec §6.3 `GeocodingAdapter.geocodeStructured`). */
export interface GeocodeProvider {
  readonly key: string;
  /** Resolves one exact field combination; null when the provider has no match. Never throws. */
  lookup(params: { country: string; state?: string; city?: string }): Promise<GeocodeResult | null>;
}

// ── Nominatim ──────────────────────────────────────────────────────────────

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Trevu/1.0 (+https://www.ttvk.hu)';
const REQUEST_TIMEOUT_MS = 6000;
const MIN_INTERVAL_MS = 1100; // Nominatim: max 1 request/second.

/** Serialises outgoing requests so a server process never exceeds one per second. */
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

export const nominatimProvider: GeocodeProvider = {
  key: 'nominatim',
  lookup: (params) =>
    throttle(async () => {
      const url = new URL(NOMINATIM_ENDPOINT);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '1');
      url.searchParams.set('addressdetails', '0');
      for (const [key, value] of Object.entries(params)) {
        if (value) url.searchParams.set(key, value);
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
          source: 'nominatim' as const,
        };
      } catch (error) {
        // Network failure or timeout must never break trip saving.
        console.warn('[geocoding] Nominatim request failed:', error);
        return null;
      }
    }),
};

/** The only place a provider module is registered (spec §6.5 `PROVIDERS`). */
const PROVIDERS: Record<string, GeocodeProvider> = {
  nominatim: nominatimProvider,
};

/** The provider selected by `LOCATION_GEOCODER`; unknown keys fall back to Nominatim. */
export function activeGeocodeProvider(): GeocodeProvider {
  const key = (process.env.LOCATION_GEOCODER || 'nominatim').trim().toLowerCase();
  const provider = PROVIDERS[key];
  if (!provider) {
    console.warn(`[geocoding] unknown LOCATION_GEOCODER "${key}", using nominatim`);
    return nominatimProvider;
  }
  return provider;
}

// ── Country centroids — the last link of the fallback chain ─────────────────

/**
 * Country-level placeholders, the TS-side pair of the migration 034 backfill
 * (spec §6.1 `centroids.ts`). Same values, same codes: a trip whose place
 * cannot be resolved still lands in the right country, tagged
 * `country_centroid` so the globe draws it as approximate and
 * `scripts/geocode-trips.mjs` refines it later.
 */
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  HU: [47.1625, 19.5033], SK: [48.669, 19.699], CZ: [49.8175, 15.473], HR: [45.1, 15.2],
  SI: [46.1512, 14.9955], RO: [45.9432, 24.9668], DE: [51.1657, 10.4515], AT: [47.5162, 14.5501],
  PL: [51.9194, 19.1451], IT: [41.8719, 12.5674], FR: [46.2276, 2.2137], ES: [40.4637, -3.7492],
  PT: [39.3999, -8.2245], CH: [46.8182, 8.2275], GB: [55.3781, -3.436], NL: [52.1326, 5.2913],
  BE: [50.5039, 4.4699], SE: [60.1282, 18.6435], NO: [60.472, 8.4689], DK: [56.2639, 9.5018],
  FI: [61.9241, 25.7482], BG: [42.7339, 25.4858], RS: [44.0165, 21.0059], BA: [43.9159, 17.6791],
  ME: [42.7087, 19.3744], MK: [41.6086, 21.7453], AL: [41.1533, 20.1683], GR: [39.0742, 21.8243],
  IE: [53.1424, -7.6921], IS: [64.9631, -19.0208], LT: [55.1694, 23.8813], LV: [56.8796, 24.6032],
  EE: [58.5953, 25.0136], LU: [49.8153, 6.1296], MT: [35.9375, 14.3754], CY: [35.1264, 33.4299],
  US: [37.0902, -95.7129], CA: [56.1304, -106.3468], NZ: [-40.9006, 174.886], AU: [-25.2744, 133.7751],
  JP: [36.2048, 138.2529], TH: [15.87, 100.9925], NP: [28.3949, 84.124], PE: [-9.19, -75.0152],
  AR: [-38.4161, -63.6167], CL: [-35.6751, -71.543], ZA: [-30.5595, 22.9375], MA: [31.7917, -7.0926],
  GE: [42.3154, 43.3569], TR: [38.9637, 35.2433], IL: [31.0461, 34.8516], AE: [23.4241, 53.8478],
  IN: [20.5937, 78.9629], MX: [23.6345, -102.5528], CO: [4.5709, -74.2973], CR: [9.7489, -83.7534],
  EC: [-1.8312, -78.1834], KE: [-0.0236, 37.9062], TZ: [-6.369, 34.8888],
};

export function countryCentroid(countryCode: string | null | undefined): GeocodeResult | null {
  const code = countryCode?.trim().toUpperCase();
  const point = code ? COUNTRY_CENTROIDS[code] : undefined;
  if (!point) return null;
  return { lat: point[0], lng: point[1], displayName: code as string, source: 'country_centroid' };
}

// ── Cache + narrowing ───────────────────────────────────────────────────────

/**
 * Process-local cache. The wizard geocodes the same place twice — once for the
 * preview in step 2, once when the draft is saved — and Nominatim asks callers
 * not to repeat identical queries. "Not found" is cached too. The durable
 * cache is the trip row itself (an unchanged location is never re-queried);
 * a shared `geocode_cache` table is an open decision (spec NyK-05).
 */
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { result: GeocodeResult | null; storedAt: number }>();

function cacheKey(providerKey: string, query: GeocodeQuery): string {
  return [
    providerKey,
    query.country?.trim().toUpperCase() ?? '',
    query.region?.trim().toLowerCase() ?? '',
    query.city?.trim().toLowerCase() ?? '',
  ].join('|');
}

/**
 * Resolves the most specific location it can, narrowing on failure:
 * city+region+country → city+country → region+country → country.
 * Returns null when nothing resolves; the caller decides the fallback.
 */
export async function geocodeLocation(
  query: GeocodeQuery,
  provider: GeocodeProvider = activeGeocodeProvider()
): Promise<GeocodeResult | null> {
  const country = query.country?.trim();
  if (!country) return null;

  const key = cacheKey(provider.key, query);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.storedAt < CACHE_TTL_MS) {
    return cached.result;
  }

  const region = query.region?.trim() || '';
  const city = query.city?.trim() || '';

  const attempts: { country: string; state?: string; city?: string }[] = [];
  if (city && region) attempts.push({ country, state: region, city });
  if (city) attempts.push({ country, city });
  if (region) attempts.push({ country, state: region });
  attempts.push({ country });

  let result: GeocodeResult | null = null;
  for (const attempt of attempts) {
    result = await provider.lookup(attempt);
    if (result) {
      // A country-only match is a country-level point, not the trip's place:
      // tag it approximate so the globe says so and the batch script refines it.
      if (!attempt.city && !attempt.state) result = { ...result, source: 'country_centroid' };
      break;
    }
  }

  cache.set(key, { result, storedAt: Date.now() });
  return result;
}
