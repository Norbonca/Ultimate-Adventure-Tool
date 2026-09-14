/**
 * Surface tiles for the Terepgömb (3D globe) — provider table.
 *
 * The renderer inverse-projects every screen pixel onto Web Mercator tiles, so
 * any XYZ/WMTS source in EPSG:3857 works. Which one is used is a licence
 * question, not a rendering one, and that is why it lives here and not in the
 * renderer:
 *
 *  - EOX Sentinel-2 cloudless — 10 m/px imagery, the surface sharpens as you
 *    zoom in (max zoom 13). 10 m means coastlines, islands and relief are
 *    crisp, buildings and streets are not — street-level imagery would need
 *    ArcGIS World Imagery (terms to be verified) or a paid source. Not a goal:
 *    in this phase the globe is an overview picture (Norbert, 2026-09-14). The free licence is CC-BY-NC-SA 4.0
 *    (non-commercial); commercial use needs an "EOX Commercial
 *    Attribution-RestrictedUse" licence from EOX (cloudless.eox.at/documentation
 *    /license, read 2026-09-14). **Default since 2026-09-14 by Norbert's
 *    decision (NyK-13): the licence is bought before go-live — until then the
 *    product is in local testing only.** Going live without it is a licence
 *    breach, not a rendering bug.
 *  - NASA GIBS Blue Marble — public NASA imagery, no key, CORS enabled, max
 *    zoom 8 (~600 m/px), blurry when zoomed in. Fallback that is safe for a
 *    paid product without any licence.
 *
 * Selection: NEXT_PUBLIC_GLOBE_TILES=eox|gibs (default eox). This is the
 * stop-gap before the M121 provider registry (spec 0.2 §6.5) — when the
 * registry lands, this table becomes one of its `basemap` providers and the
 * registry's licence guard (`commercialUse`) takes over this comment's job.
 */

export type GlobeTileProviderKey = 'gibs' | 'eox';

export interface GlobeTileProvider {
  key: GlobeTileProviderKey;
  /** XYZ tile URL for Web Mercator (EPSG:3857). */
  url: (z: number, x: number, y: number) => string;
  /** Highest zoom the provider serves; the renderer clamps its tile zoom to this. */
  maxZoom: number;
  /** Attribution shown in the globe footer — the provider's required wording. */
  attribution: { text: string; href: string };
  licence: string;
  commercialUse: 'allowed' | 'requires-licence';
}

const PROVIDERS: Record<GlobeTileProviderKey, GlobeTileProvider> = {
  gibs: {
    key: 'gibs',
    url: (z, x, y) =>
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/${z}/${y}/${x}.jpeg`,
    maxZoom: 8,
    attribution: { text: 'NASA GIBS — Blue Marble', href: 'https://earthdata.nasa.gov/gibs' },
    licence: 'NASA imagery, public access',
    commercialUse: 'allowed',
  },
  eox: {
    key: 'eox',
    url: (z, x, y) =>
      `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/${z}/${y}/${x}.jpg`,
    maxZoom: 13,
    attribution: {
      text: 'EOxCloudless by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2020)',
      href: 'https://cloudless.eox.at',
    },
    licence: 'CC-BY-NC-SA 4.0 (non-commercial); commercial use needs an EOX licence',
    commercialUse: 'requires-licence',
  },
};

export function getGlobeTileProvider(): GlobeTileProvider {
  const wanted = process.env.NEXT_PUBLIC_GLOBE_TILES;
  if (wanted === 'gibs') return PROVIDERS.gibs;
  return PROVIDERS.eox;
}

/** Natural Earth (via world-atlas) is public domain; credited alongside the tiles. */
export const GLOBE_ATLAS_URL = '/globe/countries-50m.json';
export const GLOBE_ATLAS_ATTRIBUTION = { text: 'Natural Earth', href: 'https://www.naturalearthdata.com' };
