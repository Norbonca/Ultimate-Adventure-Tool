-- Tranzakciós füstteszt a 063-hoz (M024 Túrasorozat). A végén ROLLBACK.
BEGIN;
DO $$
DECLARE org uuid := gen_random_uuid(); x uuid := gen_random_uuid(); cat uuid := (SELECT id FROM public.categories LIMIT 1);
  trip uuid; trip2 uuid; other uuid; ser uuid; foreign_ser uuid; d1 uuid; n int; ok boolean; r public.trips%ROWTYPE;
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
  INSERT INTO auth.users (id, email, aud, role) SELECT u, u||'@t.local','authenticated','authenticated' FROM unnest(ARRAY[org,x]) u;
  INSERT INTO public.profiles (id, display_name, slug, first_name, email) SELECT u, 'T '||u, 't-'||u, 'T', u||'@t.local' FROM unnest(ARRAY[org,x]) u ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.trips (organizer_id, title, slug, description, difficulty, location_country, max_participants, status, visibility, category_id, start_date, end_date, price_amount, price_currency, registration_deadline_date)
  VALUES (org,'Adriatic Offshore','m024-'||org,'leírás',3,'HR',8,'draft','public',cat,'2027-05-10','2027-05-17', 450, 'EUR', '2027-04-20') RETURNING id INTO trip;
  INSERT INTO public.trip_itinerary_days (trip_id, day_number, title, date) VALUES (trip, 1, 'Nap 1', '2027-05-10') RETURNING id INTO d1;
  INSERT INTO public.trip_itinerary_days (trip_id, day_number, title, date) VALUES (trip, 2, 'Nap 2', '2027-05-11');
  INSERT INTO public.trip_participants (trip_id, user_id, status) VALUES (trip, x, 'approved');
  INSERT INTO public.trips (organizer_id, title, slug, description, difficulty, location_country, max_participants, status, visibility, category_id, start_date, end_date)
  VALUES (x,'Other','m024o-'||x,'x',2,'HU',8,'draft','private',cat,'2027-01-01','2027-01-02') RETURNING id INTO other;

  -- 1. Új időpont a szervezőként: piszkozat, sorozat létrejön, a forrás is bekerül, program eltolva
  PERFORM set_config('request.jwt.claims', json_build_object('sub', org, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  trip2 := public.add_trip_series_date(trip, '2027-06-07', '2027-06-14', 10, 490, '2027-05-20');
  SELECT series_id INTO ser FROM public.trips WHERE id = trip; ASSERT ser IS NOT NULL, 'forrás a sorozatban';
  SELECT * INTO r FROM public.trips WHERE id = trip2;
  ASSERT r.series_id = ser, 'új időpont ugyanabban a sorozatban';
  ASSERT r.status = 'draft' AND r.published_at IS NULL, 'piszkozat';
  ASSERT r.current_participants = 0, 'nincs jelentkező';
  ASSERT r.start_date = '2027-06-07' AND r.end_date = '2027-06-14' AND r.max_participants = 10 AND r.price_amount = 490, 'felülírt mezők';
  ASSERT r.description = 'leírás' AND r.category_id = cat AND r.location_country = 'HR' AND r.difficulty = 3, 'másolt mezők';
  ASSERT r.slug <> (SELECT slug FROM public.trips WHERE id = trip), 'új slug';
  ASSERT r.registration_deadline IS NOT NULL, 'határidő-pillanat számolva';
  SELECT count(*) INTO n FROM public.trip_itinerary_days WHERE trip_id = trip2; ASSERT n = 2, 'program másolva: ' || n;
  ASSERT (SELECT date FROM public.trip_itinerary_days WHERE trip_id = trip2 AND day_number = 2) = '2027-06-08', 'program dátuma eltolva';
  RESET ROLE;
  SELECT count(*) INTO n FROM public.trip_participants WHERE trip_id = trip2; ASSERT n = 0, 'jelentkezők nem másolódnak';

  -- 2. Második új időpont ugyanabba a sorozatba (nem jön létre új sorozat)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', org, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  PERFORM public.add_trip_series_date(trip2, '2027-07-05', '2027-07-12', 8, 450, NULL);
  SELECT count(*) INTO n FROM public.trips WHERE series_id = ser; ASSERT n = 3, 'három időpont: ' || n;
  SELECT count(*) INTO n FROM public.trip_series WHERE organizer_id = org; ASSERT n = 1, 'egy sorozat: ' || n;

  -- 3. Hibás bemenet
  BEGIN PERFORM public.add_trip_series_date(trip, '2027-06-14', '2027-06-07', 10, 490, NULL); ok := false; EXCEPTION WHEN invalid_parameter_value THEN ok := true; END;
  ASSERT ok, 'fordított dátum';
  BEGIN PERFORM public.add_trip_series_date(trip, '2027-06-07', '2027-06-14', 0, 490, NULL); ok := false; EXCEPTION WHEN invalid_parameter_value THEN ok := true; END;
  ASSERT ok, 'nulla létszám';
  BEGIN PERFORM public.add_trip_series_date(trip, '2027-06-07', '2027-06-14', 5, 490, '2027-07-01'); ok := false; EXCEPTION WHEN invalid_parameter_value THEN ok := true; END;
  ASSERT ok, 'határidő a kezdés után';
  RESET ROLE;

  -- 4. Idegen: nem adhat időpontot más túrájához, nem csatolhatja a saját túráját idegen sorozathoz
  PERFORM set_config('request.jwt.claims', json_build_object('sub', x, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.add_trip_series_date(trip, '2027-08-02', '2027-08-09', 8, 450, NULL); ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'idegen túrához időpont';
  BEGIN UPDATE public.trips SET series_id = ser WHERE id = other; ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'saját túra idegen sorozatba';
  BEGIN INSERT INTO public.trip_series (organizer_id, title) VALUES (org, 'hamis'); ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'sorozat más nevében';
  UPDATE public.trip_series SET title = 'átírva' WHERE id = ser; GET DIAGNOSTICS n = ROW_COUNT; ASSERT n = 0, 'idegen sorozat átírása: ' || n;
  DELETE FROM public.trip_series WHERE id = ser; GET DIAGNOSTICS n = ROW_COUNT; ASSERT n = 0, 'idegen sorozat törlése: ' || n;
  SELECT count(*) INTO n FROM public.trip_series WHERE id = ser; ASSERT n = 1, 'a sorozat olvasható (nyilvános cím)';
  RESET ROLE;

  -- 5. Anon: olvashat, nem hívhatja az új időpontot
  ASSERT NOT has_function_privilege('anon', 'public.add_trip_series_date(uuid, date, date, integer, numeric, date)', 'EXECUTE'), 'anon add_trip_series_date';
  ASSERT has_function_privilege('authenticated', 'public.add_trip_series_date(uuid, date, date, integer, numeric, date)', 'EXECUTE'), 'authenticated add_trip_series_date';
  ASSERT NOT has_function_privilege('anon', 'public.cleanup_trip_series()', 'EXECUTE'), 'anon cleanup';
  ASSERT NOT has_function_privilege('authenticated', 'public.guard_trip_series_owner()', 'EXECUTE'), 'authenticated guard';
  ASSERT NOT has_table_privilege('anon', 'public.trip_series', 'INSERT'), 'anon insert';

  -- 6. Leválasztás: a szervező nullázza; két időpontnál a sorozat megmarad, egynél megszűnik
  PERFORM set_config('request.jwt.claims', json_build_object('sub', org, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  UPDATE public.trips SET series_id = NULL WHERE id = trip2;
  SELECT count(*) INTO n FROM public.trips WHERE series_id = ser; ASSERT n = 2, 'két időpont marad: ' || n;
  UPDATE public.trips SET series_id = NULL WHERE id = trip;
  SELECT count(*) INTO n FROM public.trips WHERE series_id = ser; ASSERT n = 0, 'egy maradt → a sorozat feloszlik: ' || n;
  SELECT count(*) INTO n FROM public.trip_series WHERE id = ser; ASSERT n = 0, 'sorozat törölve';
  RESET ROLE;
  RAISE NOTICE 'M024 063 ALL ASSERTS PASSED';
END $$;
ROLLBACK;
