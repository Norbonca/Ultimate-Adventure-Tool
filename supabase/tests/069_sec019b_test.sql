-- Tranzakciós füstteszt a 069-hez (SEC-019 II.). A végén ROLLBACK.
BEGIN;
DO $$
DECLARE n int; ok boolean;
BEGIN
  ASSERT (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'unaccent') = 'extensions', 'unaccent sémája';
  ASSERT public.generate_trip_slug('Árvíztűrő Tükörfúrógép') = 'arvizturo-tukorfurogep', 'slug ékezettel: ' || public.generate_trip_slug('Árvíztűrő Tükörfúrógép');
  ASSERT NOT has_table_privilege('anon', 'public.admin_audit_log', 'SELECT'), 'audit anon select';
  ASSERT NOT has_table_privilege('authenticated', 'public.admin_audit_log', 'INSERT'), 'audit authenticated insert';
  ASSERT NOT has_table_privilege('authenticated', 'public.guide_admin_actions', 'SELECT'), 'guide authenticated select';
  ASSERT (SELECT count(*) FROM pg_policies WHERE tablename IN ('admin_audit_log','guide_admin_actions')) = 2, 'szabályok';
  -- a service_role (admin server actionök) továbbra is ír
  SET LOCAL ROLE service_role;
  INSERT INTO public.admin_audit_log (action, target_type, result) VALUES ('test.probe', 'calendar', 'success');
  SELECT count(*) INTO n FROM public.admin_audit_log WHERE action = 'test.probe'; ASSERT n = 1, 'service_role ír/olvas: ' || n;
  RESET ROLE;
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM 1 FROM public.admin_audit_log LIMIT 1; ok := false; EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  ASSERT ok, 'authenticated nem olvas';
  RESET ROLE;
  RAISE NOTICE '069 SEC-019 II. PASSED';
END $$;
ROLLBACK;
