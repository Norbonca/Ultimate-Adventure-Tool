-- ============================================================================
-- 035 — Itinerary day coordinates for the globe route ("Terepgömb" nyomvonal)
--
-- Source: handoff/globe/034_itinerary_days_latlng.sql (Claude Design handoff,
-- 2026-09-14), renumbered — 033 and 034 already exist in this repo, and the
-- handoff's 033 (trips.location_lat/lng) is superseded by 034 here, which
-- carries provenance (location_geocode_source) as well.
--
-- Adds latitude/longitude to trip_itinerary_days so the globe can draw the
-- daily programme as a route. The globe needs at least two days with
-- coordinates for a trip before it draws a line; below that the trip is still
-- a marker from trips.location_lat/lng.
--
-- Idempotent: safe to re-run (IF NOT EXISTS guards, no data rewritten).
-- ============================================================================

BEGIN;

-- --- 1. Columns ------------------------------------------------------------

ALTER TABLE public.trip_itinerary_days
  ADD COLUMN IF NOT EXISTS latitude  DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6);

COMMENT ON COLUMN public.trip_itinerary_days.latitude IS
  'Latitude of the day''s station in WGS84 degrees. NULL when the day has no coordinate yet. The globe route is built from these.';
COMMENT ON COLUMN public.trip_itinerary_days.longitude IS
  'Longitude of the day''s station in WGS84 degrees.';

-- --- 2. Constraints (same shape as 034 on trips) ---------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itinerary_days_lat_range'
  ) THEN
    ALTER TABLE public.trip_itinerary_days ADD CONSTRAINT itinerary_days_lat_range
      CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itinerary_days_lng_range'
  ) THEN
    ALTER TABLE public.trip_itinerary_days ADD CONSTRAINT itinerary_days_lng_range
      CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itinerary_days_coords_paired'
  ) THEN
    ALTER TABLE public.trip_itinerary_days ADD CONSTRAINT itinerary_days_coords_paired
      CHECK ((latitude IS NULL) = (longitude IS NULL));
  END IF;
END $$;

-- --- 3. Index for the globe query -----------------------------------------
-- The globe endpoint reads a trip's days in order and keeps only the ones with
-- coordinates. Partial index keeps it small.

CREATE INDEX IF NOT EXISTS idx_itinerary_trip_day_latlng
  ON public.trip_itinerary_days (trip_id, day_number)
  WHERE latitude IS NOT NULL;

COMMIT;
