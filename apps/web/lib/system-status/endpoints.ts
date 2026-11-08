/**
 * M151 — a külső szolgáltatások életjel-címei (2026-11-08-án kipróbálva: mind 200).
 * Frankfurter: ugyanaz a v2 végpont, amit az fx-sync Edge Function hív (supabase/functions/_shared/fx-parse.ts).
 * Nominatim: a szolgáltatás saját /status végpontja (nem keresés — a használati szabályzatot nem terheli).
 * EOX: a 3D térkép Sentinel-2 alaprétegének z0 csempéje (lib/globe-tiles.ts).
 */
export const FRANKFURTER_STATUS_URL = "https://api.frankfurter.dev/v2/rates?base=EUR&quotes=HUF&providers=ECB";
export const NOMINATIM_STATUS_URL = "https://nominatim.openstreetmap.org/status";
export const EOX_STATUS_TILE_URL = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/0/0/0.jpg";
export const STATUS_USER_AGENT = "Trevu-status-check/1.0 (+https://www.ttvk.hu)";
