-- Tranzakciós füstteszt a 065 (§14 devizakezelés) és 066 (M03 séma-igazítás) migrációkhoz.
-- Futtatás a már migrált adatbázison: psql -v ON_ERROR_STOP=1 -f <fájl> (a végén ROLLBACK).
-- Élesben lefuttatva 2026-10-31 (Supabase MCP, visszagörgetett tranzakcióban): ALL ASSERTS PASSED.
BEGIN;
DO $$
DECLARE org uuid := gen_random_uuid(); a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); cat uuid := (SELECT id FROM public.categories LIMIT 1);
  trip uuid; ex uuid; st uuid; r RECORD; ok boolean; bal RECORD;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) VALUES (org, org||'@t.local','authenticated','authenticated'),(a, a||'@t.local','authenticated','authenticated'),(b, b||'@t.local','authenticated','authenticated');
  INSERT INTO public.profiles (id, display_name, slug, first_name, email) SELECT u, 'T '||u, 't-'||u, 'T', u||'@t.local' FROM unnest(ARRAY[org,a,b]) u ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.trips (organizer_id, title, slug, description, difficulty, location_country, max_participants, status, visibility, category_id, start_date, end_date)
  VALUES (org,'FX','fx-'||org,'x',2,'HU',8,'draft','private',cat,'2027-01-01','2027-01-02') RETURNING id INTO trip;
  -- alapérték: az ország pénzneme (NyK-03)
  ASSERT (SELECT settlement_currency FROM public.trips WHERE id = trip) = 'HUF', 'default HUF az országból';
  INSERT INTO public.trip_participants (trip_id, user_id, status) VALUES (trip, a, 'approved'), (trip, b, 'approved');
  -- keresztárfolyam EUR-on át, 7 napon belüli visszalépés (a 003 seed 2026-02-17-i HUF jegyzése)
  SELECT * INTO r FROM public.fx_resolve_rate(trip, 'EUR', DATE '2026-02-18');
  ASSERT r.quality = 'backfill' AND r.is_derived AND round(r.rate, 6) = round(1/398.5::numeric, 6), 'EUR→HUF derived: ' || r.rate || ' ' || r.quality;
  -- GAP-011: résztvevő nem rögzíthet, amíg a szervező nem engedélyezi
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.expenses (trip_id, payer_id, amount, currency, category, date, title, created_by) VALUES (trip, a, 100, 'EUR', 'food_drinks', '2026-02-18', 'teszt', a);
    ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'participant insert kell hogy elbukjon';
  RESET ROLE;
  UPDATE public.trips SET expenses_participants_can_add = true WHERE id = trip;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  INSERT INTO public.expenses (trip_id, payer_id, amount, currency, category, date, title, created_by, fx_rate, fx_rate_date, fx_rate_source, fx_quality, amount_settlement)
  VALUES (trip, a, 100, 'EUR', 'food_drinks', '2026-02-18', 'teszt', a, round(1/398.5::numeric,10), '2026-02-17', 'ecb:derived', 'backfill', 39850.00) RETURNING id INTO ex;
  INSERT INTO public.expense_splits (expense_id, user_id, amount, amount_settlement) VALUES (ex, a, 50, 19925.00), (ex, b, 50, 19925.00);
  RESET ROLE;
  -- §14.3 zárolás az első aktív tételtől
  BEGIN UPDATE public.trips SET fx_mode = 'fixed' WHERE id = trip; ok := false; EXCEPTION WHEN check_violation THEN ok := true; END;
  ASSERT ok, 'fx zárolás';
  -- egyenleg (számított)
  SELECT * INTO bal FROM public.trip_balances(trip) WHERE user_id = b; ASSERT bal.balance = -19925.00, 'b egyenleg ' || bal.balance;
  SELECT * INTO bal FROM public.trip_balances(trip) WHERE user_id = a; ASSERT bal.balance = 19925.00, 'a egyenleg ' || bal.balance;
  -- kiegyenlítés: összeg nem módosítható, csak a saját jelölés; két oldali megerősítés → completed
  INSERT INTO public.settlements (trip_id, payer_id, receiver_id, amount, currency, method) VALUES (trip, b, a, 19925.00, 'HUF', 'cash') RETURNING id INTO st;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  BEGIN UPDATE public.settlements SET amount = 1 WHERE id = st; ok := false; EXCEPTION WHEN check_violation THEN ok := true; END; ASSERT ok, 'összeg nem módosítható';
  BEGIN UPDATE public.settlements SET confirmed_by_payee = true WHERE id = st; ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END; ASSERT ok, 'fizető nem erősíthet payee-ként';
  UPDATE public.settlements SET confirmed_by_payer = true WHERE id = st;
  RESET ROLE; PERFORM set_config('request.jwt.claims', json_build_object('sub', org, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  UPDATE public.settlements SET status = 'disputed' WHERE id = st;
  RESET ROLE;
  ASSERT (SELECT status FROM public.settlements WHERE id = st) = 'pending', 'kívülálló (szervező) nem vitathat — RLS 0 sor';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  UPDATE public.settlements SET confirmed_by_payee = true WHERE id = st;
  RESET ROLE;
  SELECT * INTO r FROM public.settlements WHERE id = st; ASSERT r.status = 'completed' AND r.paid_marked_at IS NOT NULL, 'completed: ' || r.status;
  SELECT * INTO bal FROM public.trip_balances(trip) WHERE user_id = b; ASSERT bal.balance = 0, 'b egyenleg kiegyenlítés után ' || bal.balance;
  ASSERT public.dispute_stale_settlements() = 0, 'stale 0';
  -- „nem értek egyet” a kedvezményezettől
  INSERT INTO public.settlements (trip_id, payer_id, receiver_id, amount, currency, method) VALUES (trip, b, a, 10.00, 'HUF', 'bank_transfer') RETURNING id INTO st;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true); SET LOCAL ROLE authenticated;
  UPDATE public.settlements SET status = 'disputed', dispute_note = 'nem jött meg' WHERE id = st;
  RESET ROLE;
  SELECT * INTO r FROM public.settlements WHERE id = st; ASSERT r.status = 'disputed' AND r.disputed_by = a AND r.disputed_at IS NOT NULL, 'disputed by a';
  RAISE NOTICE 'ALL ASSERTS PASSED';
END $$;
ROLLBACK;
