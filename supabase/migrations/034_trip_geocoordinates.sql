-- ============================================================================
-- 034 — Trip geocoordinates for the globe discovery view
--
-- Adds latitude/longitude to trips so the 3D globe ("Terepgömb") can place
-- every published trip. Coordinates carry their provenance: the backfill below
-- only knows country centroids, while the trip wizard geocodes the actual
-- region/city via Nominatim. Consumers must be able to tell the two apart —
-- a country centroid is a placeholder, not a location.
--
-- Idempotent: safe to re-run (IF NOT EXISTS guards, backfill touches NULLs only).
-- ============================================================================

BEGIN;

-- --- 1. Columns ------------------------------------------------------------

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS location_lat            DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS location_lng            DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS location_geocoded_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_geocode_source VARCHAR(20);

COMMENT ON COLUMN public.trips.location_lat IS
  'Latitude in WGS84 degrees. NULL when the trip has never been geocoded.';
COMMENT ON COLUMN public.trips.location_lng IS
  'Longitude in WGS84 degrees. NULL when the trip has never been geocoded.';
COMMENT ON COLUMN public.trips.location_geocoded_at IS
  'When the current coordinate pair was written.';
COMMENT ON COLUMN public.trips.location_geocode_source IS
  'Provenance of the coordinates: country_centroid (approximate, country level) '
  '| nominatim (resolved from region/city) | manual (entered by a human).';

-- --- 2. Constraints --------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trips_location_lat_range'
  ) THEN
    ALTER TABLE public.trips ADD CONSTRAINT trips_location_lat_range
      CHECK (location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trips_location_lng_range'
  ) THEN
    ALTER TABLE public.trips ADD CONSTRAINT trips_location_lng_range
      CHECK (location_lng IS NULL OR (location_lng >= -180 AND location_lng <= 180));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trips_location_coords_paired'
  ) THEN
    ALTER TABLE public.trips ADD CONSTRAINT trips_location_coords_paired
      CHECK ((location_lat IS NULL) = (location_lng IS NULL));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trips_location_geocode_source_valid'
  ) THEN
    ALTER TABLE public.trips ADD CONSTRAINT trips_location_geocode_source_valid
      CHECK (location_geocode_source IS NULL
             OR location_geocode_source IN ('country_centroid', 'nominatim', 'manual'));
  END IF;
END $$;

-- --- 3. Index for the globe query -----------------------------------------
-- The globe endpoint reads published, public, non-deleted trips that have
-- coordinates. Partial index keeps it small.

CREATE INDEX IF NOT EXISTS idx_trips_globe_coords
  ON public.trips (location_lat, location_lng)
  WHERE status = 'published'
    AND visibility = 'public'
    AND deleted_at IS NULL
    AND location_lat IS NOT NULL;

-- --- 4. Backfill: country centroids ---------------------------------------
-- Approximate, country-level placeholders for trips that have no coordinates
-- yet. Every row written here is tagged 'country_centroid' so the Nominatim
-- pass (scripts/geocode-trips.mjs) knows it still needs refining.
-- Source: ISO 3166-1 country centroids (Google public dataset values).

WITH country_centroid (code, lat, lng) AS (
  VALUES
    ('HU', 47.162500, 19.503300), ('SK', 48.669000, 19.699000),
    ('CZ', 49.817500, 15.473000), ('HR', 45.100000, 15.200000),
    ('SI', 46.151200, 14.995500), ('RO', 45.943200, 24.966800),
    ('DE', 51.165700, 10.451500), ('AT', 47.516200, 14.550100),
    ('PL', 51.919400, 19.145100), ('IT', 41.871900, 12.567400),
    ('FR', 46.227600,  2.213700), ('ES', 40.463700, -3.749200),
    ('PT', 39.399900, -8.224500), ('CH', 46.818200,  8.227500),
    ('GB', 55.378100, -3.436000), ('NL', 52.132600,  5.291300),
    ('BE', 50.503900,  4.469900), ('SE', 60.128200, 18.643500),
    ('NO', 60.472000,  8.468900), ('DK', 56.263900,  9.501800),
    ('FI', 61.924100, 25.748200), ('BG', 42.733900, 25.485800),
    ('RS', 44.016500, 21.005900), ('BA', 43.915900, 17.679100),
    ('ME', 42.708700, 19.374400), ('MK', 41.608600, 21.745300),
    ('AL', 41.153300, 20.168300), ('GR', 39.074200, 21.824300),
    ('IE', 53.142400, -7.692100), ('IS', 64.963100, -19.020800),
    ('LT', 55.169400, 23.881300), ('LV', 56.879600, 24.603200),
    ('EE', 58.595300, 25.013600), ('LU', 49.815300,  6.129600),
    ('MT', 35.937500, 14.375400), ('CY', 35.126400, 33.429900),
    ('US', 37.090200, -95.712900), ('CA', 56.130400, -106.346800),
    ('NZ', -40.900600, 174.886000), ('AU', -25.274400, 133.775100),
    ('JP', 36.204800, 138.252900), ('TH', 15.870000, 100.992500),
    ('NP', 28.394900, 84.124000), ('PE', -9.190000, -75.015200),
    ('AR', -38.416100, -63.616700), ('CL', -35.675100, -71.543000),
    ('ZA', -30.559500, 22.937500), ('MA', 31.791700, -7.092600),
    ('GE', 42.315400, 43.356900), ('TR', 38.963700, 35.243300),
    ('IL', 31.046100, 34.851600), ('AE', 23.424100, 53.847800),
    ('IN', 20.593700, 78.962900), ('MX', 23.634500, -102.552800),
    ('CO',  4.570900, -74.297300), ('CR',  9.748900, -83.753400),
    ('EC', -1.831200, -78.183400), ('KE', -0.023600, 37.906200),
    ('TZ', -6.369000, 34.888800)
)
UPDATE public.trips trip
SET location_lat            = centroid.lat,
    location_lng            = centroid.lng,
    location_geocoded_at    = now(),
    location_geocode_source = 'country_centroid'
FROM country_centroid centroid
WHERE trip.location_country = centroid.code
  AND trip.location_lat IS NULL
  AND trip.deleted_at IS NULL;

COMMIT;
