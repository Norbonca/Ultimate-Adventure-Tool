/**
 * Type surface for the plain-JS globe renderer (`terepgomb.js`) and the
 * `/api/v1/trips/globe` payload it is fed from.
 * Keep in sync with those files — they are the implementation, this is the contract.
 */

/** One trip as the API returns it. */
export interface GlobeMarker {
  id: string;
  slug: string;
  title: string;
  lat: number;
  lng: number;
  /** 'country_centroid' markers are approximate placeholders, not real locations. */
  geocodeSource: string;
  country: string;
  region: string | null;
  city: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Weeks from `week0` to the start date (fractional; negative for past trips, may exceed 52). */
  week: number;
  /** Trip length in days (at least 1). */
  days: number;
  /** The trip ended before `week0`; the grid still lists it, so the globe does too. */
  past: boolean;
  host: string | null;
  difficulty: number;
  priceAmount: number | null;
  priceCurrency: string;
  isCostSharing: boolean;
  spotsLeft: number;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string | null;
  categoryNameLocalized: Record<string, string> | null;
  categoryColor: string | null;
}

export interface GlobePayloadCategory {
  id: string;
  name: string;
  name_localized: Record<string, string> | null;
  color_hex: string | null;
}

/** tripId → [[station name, lon, lat], …] in day order; only trips with ≥ 2 located days. */
export type GlobeRoutes = Record<string, [string, number, number][]>;

export interface GlobePayload {
  markers: GlobeMarker[];
  count: number;
  /** 'YYYY-MM-DD' — the day week 0 starts (today on the server). */
  week0: string;
  routes: GlobeRoutes;
  categories: GlobePayloadCategory[];
}

/** What the renderer draws. */
export interface GlobeTrip {
  id: string;
  slug: string;
  title: string;
  cat: string;
  place: string;
  host: string;
  week: number;
  days: number;
  price: string;
  spots: number;
  diff: number;
  /** [lon, lat] — d3-geo order. */
  ll: [number, number];
  approximate: boolean;
  /** Ended before week 0: pinned to the start of the timeline, the card says so. */
  past: boolean;
  /** Card image (`card_image_url`, falling back to `cover_image_url`); null → striped category placeholder. */
  image: string | null;
}

export interface GlobeCategory {
  id: string;
  label: string;
  color: string;
}

export interface GlobeStrings {
  autumn: string;
  winter: string;
  spring: string;
  summer: string;
  /** "Now, in <season>" chip label per season key. */
  seasonNow: { autumn: string; winter: string; spring: string; summer: string };
  seasonWinter: string;
  seasonSpring: string;
  seasonSpringBreak: string;
  seasonSummer: string;
  tokenHint: string;
  tokenDropOn: string;
  tokenDropOff: string;
  /** Contains `{count}`. */
  inWindow: string;
  /** Contains `{count}`. */
  hiddenBehind: string;
  /** Contains `{count}`. */
  tripsCount: string;
  /** Contains `{count}`. */
  days: string;
  /** Contains `{count}`. */
  spotsLeft: string;
  details: string;
  /** Contains `{count}`. */
  routePoints: string;
  fitRoute: string;
  close: string;
  approximate: string;
  past: string;
  reliefFail: string;
}

export interface TerepgombOptions {
  trips: GlobeTrip[];
  categories: GlobeCategory[];
  routes: GlobeRoutes;
  week0: string;
  tiles: { url: (z: number, x: number, y: number) => string; maxZoom: number };
  atlasUrl: string;
  locale: string;
  t: GlobeStrings;
  onOpen?: (slug: string) => void;
}

export interface TerepgombInstance {
  update(next: { trips: GlobeTrip[]; routes: GlobeRoutes }): void;
  /** Selects a trip and frames its route (or its marker). */
  frameTrip(id: string): void;
  destroy(): void;
}

export declare function mountGlobe(root: HTMLElement, opts: TerepgombOptions): Promise<TerepgombInstance>;
