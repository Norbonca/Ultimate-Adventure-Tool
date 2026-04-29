-- Migration 028: Relocate PostGIS extension from `public` to `extensions` schema
--
-- Context:
--   Supabase Advisor (2026-04-27 alert) flagged `public.spatial_ref_sys` with
--   `rls_disabled_in_public` (CRITICAL — table publicly accessible without RLS).
--   The table is owned by the PostGIS extension; RLS cannot be enabled on it
--   directly because `supabase_admin` owns it. The official Supabase guidance
--   for this finding is to relocate the PostGIS extension to a dedicated
--   `extensions` schema (which is excluded from public-schema RLS audits).
--
--   PostGIS is not relocatable (`ALTER EXTENSION ... SET SCHEMA` fails with
--   `extension "postgis" does not support SET SCHEMA`), so we drop and
--   recreate it.
--
-- Safety pre-check (verified before authoring this migration):
--   - 0 rows of geography data in production:
--     trips.meeting_point_geo: 0 non-null
--     trip_pois.geo:           0 non-null
--     guide_profiles.location: 0 non-null
--   - No user-defined functions/views/triggers reference PostGIS objects
--     (only PostGIS-internal symbols use them).
--   - search_path already includes `extensions` (default Supabase config),
--     so unqualified `ST_*` calls in app code will continue to resolve.
--
-- Steps:
--   1. Drop GiST indexes that depend on geography columns
--   2. Drop the (empty) geography columns
--   3. DROP EXTENSION postgis CASCADE
--   4. CREATE SCHEMA extensions (no-op if exists)
--   5. CREATE EXTENSION postgis WITH SCHEMA extensions
--   6. Re-add geography columns (qualified type)
--   7. Re-create GiST indexes
--
-- Idempotent: uses IF EXISTS / IF NOT EXISTS where supported.

BEGIN;

-- 1. Drop dependent indexes
DROP INDEX IF EXISTS public.idx_trips_geo;
DROP INDEX IF EXISTS public.idx_pois_geo;
DROP INDEX IF EXISTS public.idx_guide_profiles_location;

-- 2. Drop empty geography columns (data verified 0 rows)
ALTER TABLE public.trips           DROP COLUMN IF EXISTS meeting_point_geo;
ALTER TABLE public.trip_pois       DROP COLUMN IF EXISTS geo;
ALTER TABLE public.guide_profiles  DROP COLUMN IF EXISTS location;

-- 3. Drop the extension (CASCADE removes any remaining PostGIS-owned objects)
DROP EXTENSION IF EXISTS postgis CASCADE;

-- 4. Ensure dedicated schema exists
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;

-- 5. Recreate PostGIS in the extensions schema
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 6. Re-add geography columns with explicit schema-qualified type
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS meeting_point_geo extensions.geography(Point, 4326);

ALTER TABLE public.trip_pois
  ADD COLUMN IF NOT EXISTS geo extensions.geography(Point, 4326);

ALTER TABLE public.guide_profiles
  ADD COLUMN IF NOT EXISTS location extensions.geography(Point, 4326);

-- 7. Recreate the GiST indexes (matching previous definitions, including
--    the partial-index WHERE clause for guide_profiles)
CREATE INDEX IF NOT EXISTS idx_trips_geo
  ON public.trips USING gist (meeting_point_geo);

CREATE INDEX IF NOT EXISTS idx_pois_geo
  ON public.trip_pois USING gist (geo);

CREATE INDEX IF NOT EXISTS idx_guide_profiles_location
  ON public.guide_profiles USING gist (location)
  WHERE status = 'active'::guide_status_t AND deleted_at IS NULL;

COMMIT;
