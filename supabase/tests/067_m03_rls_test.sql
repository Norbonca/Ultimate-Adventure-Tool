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
ROLLBACK;
