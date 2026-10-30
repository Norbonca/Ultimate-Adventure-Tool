-- ============================================================================
-- Migration 047: SEC-008 — a túra gyermektábláinak olvasása a szülőtúra láthatóságához kötve
-- ============================================================================
-- Hiba (SECURITY_LOG SEC-008, 2026-09-15): a `trip_itinerary_days`, `trip_pois` és `trip_crew_positions`
-- SELECT-szabálya `USING (true)` volt, így privát, vázlat vagy törölt túra napi programja, 035 óta a
-- méterpontos koordinátái, POI-jai és szervezői pozíciói az anon Data API-n bárkinek olvashatók voltak.
--
-- Megoldás: `public.can_view_trip(trip_id)` — SECURITY INVOKER, így a `trips` tábla saját RLS-e dönt
-- (trips_select_public / _organizer / _participant, 032 + 041), nincs duplikált láthatósági logika.
-- A globe-végpont (`published` + `public` + `show_on_landing` szűrő a szülőn) és a publikus túraoldal
-- változatlanul működik: a nyilvános, publikált túra gyermekei továbbra is olvashatók.
--
-- Norbert döntése (2026-10-30): „most”. Számozás: 046 = PR #35 (katamarán), az M121 048-tól.
-- Idempotens: CREATE OR REPLACE, DROP POLICY IF EXISTS.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.can_view_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = p_trip_id);
$$;
COMMENT ON FUNCTION public.can_view_trip(uuid) IS
  'SEC-008: igaz, ha a hívó a trips RLS-e szerint látja a túrát (nyilvános+publikált, szervező vagy résztvevő). SECURITY INVOKER — a trips szabályai döntenek.';
GRANT EXECUTE ON FUNCTION public.can_view_trip(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS itinerary_select ON public.trip_itinerary_days;
CREATE POLICY itinerary_select ON public.trip_itinerary_days FOR SELECT
  USING (public.can_view_trip(trip_id));

DROP POLICY IF EXISTS pois_select ON public.trip_pois;
CREATE POLICY pois_select ON public.trip_pois FOR SELECT
  USING (public.can_view_trip(trip_id));

DROP POLICY IF EXISTS crew_select ON public.trip_crew_positions;
CREATE POLICY crew_select ON public.trip_crew_positions FOR SELECT
  USING (public.can_view_trip(trip_id));

COMMIT;
