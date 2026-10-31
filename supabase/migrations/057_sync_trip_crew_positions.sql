-- F02: persist the name-only crew editor atomically. Existing role IDs and their
-- skill/capacity metadata survive unchanged; a failed replacement rolls back.
-- No backfill: previously unsaved client-only roles cannot be reconstructed.
BEGIN;
CREATE OR REPLACE FUNCTION public.sync_trip_crew_positions(p_trip_id uuid, p_roles text[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT organizer_id INTO v_owner FROM public.trips
    WHERE id = p_trip_id AND deleted_at IS NULL FOR UPDATE;
  IF auth.uid() IS NULL OR v_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'organizer_only' USING ERRCODE = '42501';
  END IF;
  IF p_roles IS NULL OR cardinality(p_roles) > 50 OR EXISTS (
    SELECT 1 FROM unnest(p_roles) AS r(name)
    WHERE name IS NULL OR length(btrim(name)) = 0 OR length(btrim(name)) > 100
  ) THEN
    RAISE EXCEPTION 'invalid_crew_positions' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.trip_crew_positions c
    JOIN public.trip_participants p ON p.crew_position_id = c.id
    WHERE c.trip_id = p_trip_id
      AND NOT EXISTS (SELECT 1 FROM unnest(p_roles) r(name) WHERE btrim(r.name) = c.role_name)
  ) THEN
    RAISE EXCEPTION 'crew_position_in_use' USING ERRCODE = '23503';
  END IF;
  DELETE FROM public.trip_crew_positions c WHERE c.trip_id = p_trip_id
    AND NOT EXISTS (SELECT 1 FROM unnest(p_roles) r(name) WHERE btrim(r.name) = c.role_name);
  INSERT INTO public.trip_crew_positions(trip_id, role_name, spots, sort_order)
    SELECT p_trip_id, btrim(name), 1, (min(ord) - 1)::integer
    FROM unnest(p_roles) WITH ORDINALITY r(name, ord) GROUP BY btrim(name)
    ON CONFLICT (trip_id, role_name) DO UPDATE SET sort_order = EXCLUDED.sort_order;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_trip_crew_positions(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_trip_crew_positions(uuid, text[]) TO authenticated;
COMMIT;
