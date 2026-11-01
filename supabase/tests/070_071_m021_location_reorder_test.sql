-- Tranzakciós füstteszt a 070-hez (M121 locations / trip_locations) és a 071-hez (M021 due_time + átrendezés).
-- A végén ROLLBACK. Futtatás: docker exec -i supabase_db_trevu-local psql -U postgres -d postgres -v ON_ERROR_STOP=1 < ez.sql
BEGIN;
DO $$
DECLARE org uuid := gen_random_uuid(); p uuid := gen_random_uuid(); x uuid := gen_random_uuid(); cat uuid := (SELECT id FROM public.categories LIMIT 1);
  trip uuid; trip2 uuid; ph1 uuid; ph2 uuid; m1 uuid; m2 uuid; m3 uuid; t1 uuid; t2 uuid; foreign_ph uuid;
  loc uuid; xloc uuid; n int; ok boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
  INSERT INTO auth.users (id, email, aud, role) SELECT u, u||'@t.local','authenticated','authenticated' FROM unnest(ARRAY[org,p,x]) u;
  INSERT INTO public.profiles (id, display_name, slug, first_name, email) SELECT u, 'T '||u, 't-'||u, 'T', u||'@t.local' FROM unnest(ARRAY[org,p,x]) u ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.trips (organizer_id, title, slug, description, difficulty, location_country, max_participants, status, visibility, category_id, start_date, end_date)
  VALUES (org,'M021','m021-'||org,'x',2,'HU',8,'draft','private',cat,'2027-01-01','2027-01-02') RETURNING id INTO trip;
  INSERT INTO public.trips (organizer_id, title, slug, description, difficulty, location_country, max_participants, status, visibility, category_id, start_date, end_date)
  VALUES (x,'Idegen','idegen-'||x,'x',2,'HU',8,'draft','private',cat,'2027-01-01','2027-01-02') RETURNING id INTO trip2;
  INSERT INTO public.trip_participants (trip_id, user_id, status) VALUES (trip, p, 'approved');
  INSERT INTO public.trip_phases (trip_id, name, sort_order) VALUES (trip,'A',0) RETURNING id INTO ph1;
  INSERT INTO public.trip_phases (trip_id, name, sort_order) VALUES (trip,'B',1) RETURNING id INTO ph2;
  INSERT INTO public.trip_phases (trip_id, name, sort_order) VALUES (trip2,'X',0) RETURNING id INTO foreign_ph;
  INSERT INTO public.trip_milestones (trip_id, phase_id, name, sort_order) VALUES (trip, ph1, 'm1', 0) RETURNING id INTO m1;
  INSERT INTO public.trip_milestones (trip_id, phase_id, name, sort_order) VALUES (trip, ph1, 'm2', 1) RETURNING id INTO m2;
  INSERT INTO public.trip_milestones (trip_id, phase_id, name, sort_order) VALUES (trip, ph2, 'm3', 0) RETURNING id INTO m3;
  INSERT INTO public.trip_tasks (trip_id, milestone_id, name, sort_order) VALUES (trip, m1, 't1', 0) RETURNING id INTO t1;
  INSERT INTO public.trip_tasks (trip_id, milestone_id, name, sort_order) VALUES (trip, m1, 't2', 1) RETURNING id INTO t2;

  -- 071: óra csak nappal
  BEGIN UPDATE public.trip_milestones SET due_time = '08:00' WHERE id = m1; ok := false; EXCEPTION WHEN check_violation THEN ok := true; END;
  ASSERT ok, 'due_time nap nélkül elutasítva';
  UPDATE public.trip_milestones SET due_date = '2026-12-10', due_time = '08:00' WHERE id = m1;
  ASSERT (SELECT due_time FROM public.trip_milestones WHERE id = m1) = '08:00', 'due_time mentve';

  -- szervezőként
  PERFORM set_config('request.jwt.claims', json_build_object('sub', org, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  PERFORM public.reorder_trip_phases(trip, ARRAY[ph2, ph1]);
  ASSERT (SELECT sort_order FROM public.trip_phases WHERE id = ph2) = 0, 'fázis sorrend';
  PERFORM public.reorder_trip_milestones(trip, jsonb_build_array(
    jsonb_build_object('phase_id', ph1, 'milestone_ids', jsonb_build_array(m2)),
    jsonb_build_object('phase_id', ph2, 'milestone_ids', jsonb_build_array(m3, m1))));
  ASSERT (SELECT phase_id FROM public.trip_milestones WHERE id = m1) = ph2, 'm1 átkerült B-be';
  ASSERT (SELECT sort_order FROM public.trip_milestones WHERE id = m1) = 1, 'm1 a második';
  ASSERT (SELECT sort_order FROM public.trip_milestones WHERE id = m2) = 0, 'm2 az első A-ban';
  PERFORM public.reorder_trip_tasks(m1, ARRAY[t2, t1]);
  ASSERT (SELECT sort_order FROM public.trip_tasks WHERE id = t2) = 0, 'feladat sorrend';
  -- hiányos lista / idegen fázis elutasítva
  BEGIN PERFORM public.reorder_trip_milestones(trip, jsonb_build_array(jsonb_build_object('phase_id', ph1, 'milestone_ids', jsonb_build_array(m1)))); ok := false;
  EXCEPTION WHEN invalid_parameter_value THEN ok := true; END; ASSERT ok, 'hiányos elrendezés';
  BEGIN PERFORM public.reorder_trip_milestones(trip, jsonb_build_array(jsonb_build_object('phase_id', foreign_ph, 'milestone_ids', jsonb_build_array(m1, m2, m3)))); ok := false;
  EXCEPTION WHEN invalid_parameter_value THEN ok := true; END; ASSERT ok, 'idegen fázis';

  -- 070: hely létrehozása és kötése a mérföldkőhöz
  INSERT INTO public.locations (created_by, name, location_type, latitude, longitude, geocode_source, geocode_precision)
  VALUES (org, 'BAH csomópont, benzinkút', 'poi', 47.4729, 19.0164, 'nominatim', 'exact') RETURNING id INTO loc;
  ASSERT (SELECT geo IS NOT NULL FROM public.locations WHERE id = loc), 'geo generált';
  INSERT INTO public.trip_locations (trip_id, location_id, context, milestone_id, notes) VALUES (trip, loc, 'custom', m1, 'a mosó mellett');
  BEGIN INSERT INTO public.trip_locations (trip_id, location_id, context, milestone_id) VALUES (trip, loc, 'meeting_point', m1); ok := false;
  EXCEPTION WHEN unique_violation THEN ok := true; END; ASSERT ok, 'egy mérföldkő — egy hely';
  RESET ROLE;

  -- idegen szervező: nem rendezhet, nem köthet, nem lát
  PERFORM set_config('request.jwt.claims', json_build_object('sub', x, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.reorder_trip_phases(trip, ARRAY[ph1, ph2]); ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'idegen nem rendez';
  SELECT count(*) INTO n FROM public.trip_locations WHERE trip_id = trip; ASSERT n = 0, 'idegen nem lát kötést: ' || n;
  SELECT count(*) INTO n FROM public.locations WHERE id = loc; ASSERT n = 0, 'idegen nem lát helyet: ' || n;
  INSERT INTO public.locations (created_by, name) VALUES (x, 'Idegen hely') RETURNING id INTO xloc;
  RESET ROLE;

  -- szervező nem kötheti be az idegen privát helyét; a mérföldkő nem lehet másik túráé
  PERFORM set_config('request.jwt.claims', json_build_object('sub', org, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  BEGIN INSERT INTO public.trip_locations (trip_id, location_id, context, task_id) VALUES (trip, xloc, 'custom', t1); ok := false;
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END; ASSERT ok, 'idegen privát hely nem köthető';
  RESET ROLE;

  -- résztvevő: lát, nem rendez
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.trip_locations WHERE milestone_id = m1; ASSERT n = 1, 'résztvevő látja a kötést: ' || n;
  SELECT count(*) INTO n FROM public.locations WHERE id = loc; ASSERT n = 1, 'résztvevő látja a helyet: ' || n;
  BEGIN PERFORM public.reorder_trip_tasks(m1, ARRAY[t1, t2]); ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'résztvevő nem rendez';
  RESET ROLE;

  -- mérföldkő törlése a kötést viszi, a helyet nem
  DELETE FROM public.trip_milestones WHERE id = m1;
  ASSERT NOT EXISTS (SELECT 1 FROM public.trip_locations WHERE location_id = loc), 'kötés törölve';
  ASSERT EXISTS (SELECT 1 FROM public.locations WHERE id = loc), 'hely megmaradt';

  -- jogok
  ASSERT NOT has_function_privilege('anon', 'public.reorder_trip_milestones(uuid, jsonb)', 'EXECUTE'), 'anon nem hív';
  ASSERT has_function_privilege('authenticated', 'public.reorder_trip_milestones(uuid, jsonb)', 'EXECUTE'), 'authenticated hív';
  ASSERT NOT has_table_privilege('anon', 'public.trip_locations', 'INSERT'), 'anon nem ír';
  RAISE NOTICE '070/071 M021 ALL ASSERTS PASSED';
END $$;
ROLLBACK;
