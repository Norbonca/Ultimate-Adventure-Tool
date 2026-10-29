-- M23 Calendar (043, korábban 037) — RLS-, szabálymotor- és seed-ellenőrzés. Helyi adatbázison, minden változás visszagördül.
-- Futtatás: docker exec -i supabase_db_trevu-local psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m23-calendar.sql
\set ON_ERROR_STOP on
BEGIN;

-- ─── Szabálymotor: ismert húsvéti dátumok és szabálytípusok ──────────────────
DO $$ BEGIN
  IF public.calendar_easter_date(2025) <> '2025-04-20' OR public.calendar_easter_date(2026) <> '2026-04-05'
    OR public.calendar_easter_date(2027) <> '2027-03-28' OR public.calendar_easter_date(2028) <> '2028-04-16' THEN
    RAISE EXCEPTION 'FAIL nyugati húsvét';
  END IF;
  IF public.calendar_easter_date(2024, 'orthodox') <> '2024-05-05' OR public.calendar_easter_date(2026, 'orthodox') <> '2026-04-12'
    OR public.calendar_easter_date(2027, 'orthodox') <> '2027-05-02' OR public.calendar_easter_date(2028, 'orthodox') <> '2028-04-16' THEN
    RAISE EXCEPTION 'FAIL ortodox húsvét';
  END IF;
  -- utolsó hétfő májusban (GB Spring Bank Holiday 2027: máj. 31.), első hétfő (máj. 3.)
  IF (SELECT earliest FROM public.calendar_rule_occurrence('nth_weekday', '{"month":5,"weekday":1,"n":-1}', NULL, 2027)) <> '2027-05-31'
    OR (SELECT earliest FROM public.calendar_rule_occurrence('nth_weekday', '{"month":5,"weekday":1,"n":1}', NULL, 2027)) <> '2027-05-03' THEN
    RAISE EXCEPTION 'FAIL nth_weekday';
  END IF;
  -- északi tél szökőévben: 2027-12-01 → 2028-02-29 (F-01)
  IF (SELECT latest FROM public.calendar_rule_occurrence('fixed_annual', '{"month":12,"day":1,"end_month":2,"end_day":29}', NULL, 2027)) <> '2028-02-29'
    OR (SELECT latest FROM public.calendar_rule_occurrence('fixed_annual', '{"month":12,"day":1,"end_month":2,"end_day":29}', NULL, 2026)) <> '2027-02-28' THEN
    RAISE EXCEPTION 'FAIL fixed_annual záró nap';
  END IF;
  IF public.calendar_rule_params_valid('nth_weekday', '{"month":5}') OR public.calendar_rule_params_valid('fixed_annual', '{"month":"x","day":1}')
    OR NOT public.calendar_rule_params_valid('easter_offset', '{"offset":50}') THEN
    RAISE EXCEPTION 'FAIL paraméter-validáció';
  END IF;
END $$;

-- ─── Seed ────────────────────────────────────────────────────────────────────
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.ref_countries WHERE continent = 'Europe' AND primary_timezone IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL európai ország fő zóna nélkül: %', n; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ref_calendar_occurrences o JOIN public.ref_calendar_periods p ON p.id = o.period_id
    WHERE p.country_code = 'HU' AND p.key = 'hu_school_spring_break' AND o.year = 2027
      AND o.earliest = '2027-03-25' AND o.latest = '2027-04-04' AND o.status = 'verified') THEN
    RAISE EXCEPTION 'FAIL HU 2027 tavaszi szünet';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ref_calendar_occurrences o JOIN public.ref_calendar_periods p ON p.id = o.period_id
    WHERE p.country_code = 'HU' AND p.key = 'hu_easter_monday' AND o.year = 2027 AND o.earliest = '2027-03-29' AND o.status = 'generated') THEN
    RAISE EXCEPTION 'FAIL HU 2027 húsvéthétfő';
  END IF;
  -- 16. fejezet 3.: az ismételt generálás nem hoz létre új sort
  IF public.calendar_generate_occurrences(2026, 2028) <> 0 THEN RAISE EXCEPTION 'FAIL generálás nem idempotens'; END IF;
  -- Minden generated előfordulás egyezik a szabállyal (SQL-oldali önkonzisztencia)
  SELECT count(*) INTO n FROM public.ref_calendar_occurrences o JOIN public.ref_calendar_periods p ON p.id = o.period_id
    CROSS JOIN LATERAL public.calendar_rule_occurrence(p.rule_kind, p.rule_params, p.duration_days, o.year) r
    WHERE o.status = 'generated' AND (r.earliest, r.latest) IS DISTINCT FROM (o.earliest, o.latest);
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL generated ≠ szabály: %', n; END IF;
END $$;

-- ─── Tesztszereplők ──────────────────────────────────────────────────────────
INSERT INTO public.profiles(id, display_name, slug, email) VALUES
('00000000-0000-4000-8000-0000000023a1','Cal Admin','m23-cal-admin','m23-admin@audit.local'),
('00000000-0000-4000-8000-0000000023a2','Cal User','m23-cal-user','m23-user@audit.local');
INSERT INTO public.admin_roles(user_id, role, is_active) VALUES ('00000000-0000-4000-8000-0000000023a1', 'operations_admin', true);

-- Admin: inaktivál egy címkét és egy definíciót, felvesz egy entered előfordulást
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000023a1","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE v_period uuid; BEGIN
  IF NOT public.is_calendar_admin() THEN RAISE EXCEPTION 'FAIL admin felismerése'; END IF;
  UPDATE public.ref_calendar_tags SET status = 'inactive' WHERE key = 'family_friendly';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL admin címke-inaktiválás'; END IF;
  INSERT INTO public.ref_calendar_periods (key, label_localized, period_type, country_code, rule_kind, rule_params, source_text)
    VALUES ('hu_test_custom', '{"hu":"Teszt","en":"Test"}', 'custom', 'HU', 'explicit', '{}', 'teszt') RETURNING id INTO v_period;
  INSERT INTO public.ref_calendar_occurrences (period_id, year, earliest, latest, status)
    VALUES (v_period, 2027, '2027-07-01', '2027-07-10', 'entered');
  BEGIN
    UPDATE public.ref_calendar_periods SET key = 'hu_test_renamed' WHERE id = v_period;
    RAISE EXCEPTION 'FAIL kulcs módosítható';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    INSERT INTO public.ref_calendar_occurrences (period_id, year, earliest, latest) VALUES (v_period, 2028, '2028-07-10', '2028-07-01');
    RAISE EXCEPTION 'FAIL fordított tartomány';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;

-- Bejelentkezett, nem admin felhasználó: nem ír (16. fejezet 8.)
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000023a2","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
  IF public.is_calendar_admin() THEN RAISE EXCEPTION 'FAIL nem admin adminnak látszik'; END IF;
  BEGIN
    INSERT INTO public.ref_calendar_periods (key, label_localized, period_type, country_code, rule_kind, rule_params, source_text)
      VALUES ('hu_hack', '{"hu":"x","en":"x"}', 'custom', 'HU', 'explicit', '{}', 'x');
    RAISE EXCEPTION 'FAIL nem admin definíciót írt';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.ref_calendar_tags (key, label_localized) VALUES ('hack', '{"hu":"x","en":"x"}');
    RAISE EXCEPTION 'FAIL nem admin címkét írt';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.calendar_generate_occurrences(2029, 2029);
    RAISE EXCEPTION 'FAIL nem admin generált';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.ref_calendar_periods SET status = 'inactive' WHERE country_code = 'HU';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 0 THEN RAISE EXCEPTION 'FAIL nem admin definíciót módosított'; END IF;
  UPDATE public.ref_calendar_occurrences SET earliest = earliest WHERE true;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 0 THEN RAISE EXCEPTION 'FAIL nem admin előfordulást módosított'; END IF;
  DELETE FROM public.ref_calendar_occurrences WHERE true;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 0 THEN RAISE EXCEPTION 'FAIL nem admin előfordulást törölt'; END IF;
  DELETE FROM public.ref_calendar_period_tags WHERE true;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 0 THEN RAISE EXCEPTION 'FAIL nem admin címkekapcsolatot törölt'; END IF;
END $$;
RESET ROLE;

-- Admin sem töröl definíciót vagy címkét (BR-M23-009)
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000023a1","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
  DELETE FROM public.ref_calendar_periods WHERE key = 'hu_test_custom';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 0 THEN RAISE EXCEPTION 'FAIL definíció törölhető'; END IF;
  DELETE FROM public.ref_calendar_tags WHERE key = 'ski_season';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 0 THEN RAISE EXCEPTION 'FAIL címke törölhető'; END IF;
END $$;
RESET ROLE;

-- Látogató (anon): olvas, nem ír; entered és inaktív nem látszik (NyK-05, 16. fejezet 9.)
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SET LOCAL ROLE anon;
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.ref_calendar_occurrences WHERE status = 'entered';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL anon entered előfordulást lát: %', n; END IF;
  SELECT count(*) INTO n FROM public.ref_calendar_occurrences;
  IF n < 1600 THEN RAISE EXCEPTION 'FAIL anon nem látja a publikus előfordulásokat: %', n; END IF;
  IF EXISTS (SELECT 1 FROM public.ref_calendar_tags WHERE key = 'family_friendly') THEN RAISE EXCEPTION 'FAIL inaktív címke látszik'; END IF;
  IF EXISTS (SELECT 1 FROM public.ref_calendar_period_tags) THEN RAISE EXCEPTION 'FAIL inaktív címke kapcsolata látszik'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ref_calendar_periods WHERE key = 'hu_school_spring_break') THEN RAISE EXCEPTION 'FAIL a címkézett definíció eltűnt'; END IF;
  BEGIN
    INSERT INTO public.ref_calendar_tags (key, label_localized) VALUES ('anon_hack', '{"hu":"x","en":"x"}');
    RAISE EXCEPTION 'FAIL anon címkét írt';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.ref_calendar_tags SET sort_order = 0 WHERE true;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 0 THEN RAISE EXCEPTION 'FAIL anon címkét módosított'; END IF;
END $$;
RESET ROLE;

SELECT 'M23 calendar SQL tests: PASS' AS result;
ROLLBACK;
