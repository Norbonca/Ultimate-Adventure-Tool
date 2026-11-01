-- Tranzakciós füstteszt a 067-hez (fx-sync ütemezés + M03 olvasási/írási szabályok). A végén ROLLBACK.
-- Élesben lefuttatva 2026-11-01 a migráció tartalmával, visszagörgetett tranzakcióban: PASS.
BEGIN;
DO $$
DECLARE org uuid := gen_random_uuid(); a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); cat uuid := (SELECT id FROM public.categories LIMIT 1);
  trip uuid; ex uuid; n int; bal RECORD;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) SELECT u, u||'@t.local','authenticated','authenticated' FROM unnest(ARRAY[org,a,b,c]) u;
  INSERT INTO public.profiles (id, display_name, slug, first_name, email) SELECT u, 'T '||u, 't-'||u, 'T', u||'@t.local' FROM unnest(ARRAY[org,a,b,c]) u ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.trips (organizer_id, title, slug, description, difficulty, location_country, max_participants, status, visibility, category_id, start_date, end_date, expenses_participants_can_add)
  VALUES (org,'FX','fx-'||org,'x',2,'HU',8,'draft','private',cat,'2027-01-01','2027-01-02', true) RETURNING id INTO trip;
  INSERT INTO public.trip_participants (trip_id, user_id, status) VALUES (trip, a, 'approved'), (trip, b, 'approved'), (trip, c, 'approved');
  -- a rögzítő (c) nem fizető, mégis szerkesztheti a saját tételét
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  INSERT INTO public.expenses (trip_id, payer_id, amount, currency, category, date, title, created_by, amount_settlement, fx_quality, fx_rate, fx_rate_source)
  VALUES (trip, a, 3000, 'HUF', 'food_drinks', '2026-02-18', 't', c, 3000, 'same', 1, 'same') RETURNING id INTO ex;
  INSERT INTO public.expense_splits (expense_id, user_id, amount, amount_settlement) VALUES (ex, a, 1000, 1000), (ex, b, 1000, 1000), (ex, c, 1000, 1000);
  UPDATE public.expenses SET title = 'javított' WHERE id = ex; GET DIAGNOSTICS n = ROW_COUNT; ASSERT n = 1, 'rögzítő szerkeszthet: ' || n;
  RESET ROLE;
  INSERT INTO public.settlements (trip_id, payer_id, receiver_id, amount, currency, method, confirmed_by_payer) VALUES (trip, b, a, 1000, 'HUF', 'cash', true);
  -- a szervező látja a részesedéseket → helyes egyenleg
  PERFORM set_config('request.jwt.claims', json_build_object('sub', org, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.expense_splits WHERE expense_id = ex; ASSERT n = 3, 'szervező splits: ' || n;
  SELECT * INTO bal FROM public.trip_balances(trip) WHERE user_id = b; ASSERT bal.balance = -1000, 'szervező szerint b: ' || bal.balance;
  RESET ROLE;
  -- a túra nem érintett résztvevője is látja a kiegyenlítést
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.settlements WHERE trip_id = trip; ASSERT n = 1, 'résztvevő látja: ' || n;
  RESET ROLE;
  ASSERT (SELECT schedule FROM cron.job WHERE jobname = 'fx-sync-daily') = '17 16 * * 1-5', 'cron';
  RAISE NOTICE 'ALL ASSERTS PASSED';
END $$;

-- SEC-015 / SEC-016 kihasználási kísérletek (mind elutasítandó)
DO $$
DECLARE org uuid := gen_random_uuid(); a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); x uuid := gen_random_uuid(); cat uuid := (SELECT id FROM public.categories LIMIT 1);
  trip uuid; trip2 uuid; ex uuid; ok boolean;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) SELECT u, u||'@t.local','authenticated','authenticated' FROM unnest(ARRAY[org,a,b,x]) u;
  INSERT INTO public.profiles (id, display_name, slug, first_name, email) SELECT u, 'T '||u, 't-'||u, 'T', u||'@t.local' FROM unnest(ARRAY[org,a,b,x]) u ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.trips (organizer_id, title, slug, description, difficulty, location_country, max_participants, status, visibility, category_id, start_date, end_date, expenses_participants_can_add)
  VALUES (org,'FX','fx-'||org,'x',2,'HU',8,'draft','private',cat,'2027-01-01','2027-01-02', true) RETURNING id INTO trip;
  INSERT INTO public.trips (organizer_id, title, slug, description, difficulty, location_country, max_participants, status, visibility, category_id, start_date, end_date)
  VALUES (x,'Other','o-'||x,'x',2,'HU',8,'draft','private',cat,'2027-01-01','2027-01-02') RETURNING id INTO trip2;
  INSERT INTO public.trip_participants (trip_id, user_id, status) VALUES (trip, a, 'approved'), (trip, b, 'approved');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  BEGIN INSERT INTO public.settlements (trip_id, payer_id, receiver_id, amount, currency, method, status, confirmed_by_payer, confirmed_by_payee) VALUES (trip2, a, x, 999, 'HUF', 'cash', 'completed', true, true); ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'E1 idegen túrába settlement';
  BEGIN INSERT INTO public.settlements (trip_id, payer_id, receiver_id, amount, currency, method, status, confirmed_by_payer, confirmed_by_payee) VALUES (trip, a, b, 999, 'HUF', 'cash', 'completed', true, true); ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'E2 completed beszúrás';
  BEGIN INSERT INTO public.expenses (trip_id, payer_id, amount, currency, category, date, title, created_by) VALUES (trip, x, 10, 'HUF', 'food_drinks', '2026-02-18', 't', a); ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'E3 nem-tag fizető';
  BEGIN INSERT INTO public.expenses (trip_id, payer_id, amount, currency, category, date, title, created_by) VALUES (trip, a, 10, 'HUF', 'food_drinks', '2026-02-18', 't', b); ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'E4 idegen created_by';
  INSERT INTO public.expenses (trip_id, payer_id, amount, currency, category, date, title, created_by, amount_settlement, fx_quality) VALUES (trip, a, 10, 'HUF', 'food_drinks', '2026-02-18', 't', a, 10, 'same') RETURNING id INTO ex;
  BEGIN INSERT INTO public.expense_splits (expense_id, user_id, amount, amount_settlement) VALUES (ex, x, 1, 1); ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'E5 nem-tag részesedés';
  BEGIN UPDATE public.expenses SET trip_id = trip2 WHERE id = ex; ok := false; EXCEPTION WHEN check_violation THEN ok := true; END;
  ASSERT ok, 'E6 trip_id átírás';
  RESET ROLE;
  -- SEC-018: a csak szerveroldali függvényeket az anon és az authenticated nem hívhatja
  ASSERT NOT has_function_privilege('anon', 'public.trigger_fx_sync(text)', 'EXECUTE'), 'SEC-018 trigger_fx_sync anon';
  ASSERT NOT has_function_privilege('authenticated', 'public.trigger_fx_sync(text)', 'EXECUTE'), 'SEC-018 trigger_fx_sync authenticated';
  ASSERT NOT has_function_privilege('anon', 'public.dispute_stale_settlements()', 'EXECUTE'), 'SEC-018 dispute anon';
  ASSERT NOT has_function_privilege('authenticated', 'public.dispute_stale_settlements()', 'EXECUTE'), 'SEC-018 dispute authenticated';
  ASSERT NOT has_function_privilege('anon', 'public.is_trip_member(uuid, uuid)', 'EXECUTE'), 'SEC-018 is_trip_member anon';
  ASSERT has_function_privilege('authenticated', 'public.is_trip_member(uuid, uuid)', 'EXECUTE'), 'SEC-018 is_trip_member authenticated';
  RAISE NOTICE 'SEC-015/016/018 PASSED';
END $$;
ROLLBACK;
