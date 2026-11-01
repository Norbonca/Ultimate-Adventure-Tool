-- Tranzakciós füstteszt a 068-hoz (SEC-019). A végén ROLLBACK.
BEGIN;
DO $$
DECLARE n int;
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.is_platform_admin_user(uuid)', 'EXECUTE'), 'admin fn anon';
  ASSERT has_function_privilege('authenticated', 'public.is_platform_admin_user(uuid)', 'EXECUTE'), 'admin fn authenticated';
  ASSERT NOT has_function_privilege('anon', 'public.trip_idea_recompute(uuid)', 'EXECUTE'), 'recompute anon';
  ASSERT has_function_privilege('authenticated', 'public.trip_idea_recompute(uuid)', 'EXECUTE'), 'recompute authenticated';
  -- az anonként kiértékelt szabályok függvényei maradnak
  ASSERT has_function_privilege('anon', 'public.can_view_trip_idea(uuid)', 'EXECUTE'), 'can_view_trip_idea anon';
  ASSERT has_function_privilege('anon', 'public.is_trip_participant(uuid)', 'EXECUTE'), 'is_trip_participant anon';
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
   WHERE s.nspname = 'public' AND pg_get_function_result(p.oid) = 'trigger' AND p.prosecdef
     AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
     AND p.proname IN ('guard_participant_transition','handle_new_user','sync_profile_visibility','trip_idea_children_changed',
                       'trip_idea_daily_limit','trip_idea_on_trip_change','trip_idea_owner_joins','trip_idea_report_threshold','update_trip_participant_count');
  ASSERT n = 0, 'triggerfüggvények RPC-n: ' || n;
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
   WHERE s.nspname = 'public' AND p.proname IN ('generate_trip_slug','update_updated_at_column','check_settlement_confirmation')
     AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%');
  ASSERT n = 0, 'search_path hiányzik: ' || n;
  ASSERT (SELECT count(*) FROM pg_class WHERE relname IN ('v_category_form_fields','v_category_summary','v_user_skills_enriched')
            AND 'security_invoker=true' = ANY (coalesce(reloptions, '{}'))) = 3, 'security_invoker nézetek';
  -- anonként a nézetek és a publikus túraolvasás továbbra is működik
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.v_category_summary; ASSERT n > 0, 'anon v_category_summary: ' || n;
  SELECT count(*) INTO n FROM public.trips; -- a trips_select_participant (has_trip_participation) nem dobhat 42501-et
  SELECT count(*) INTO n FROM public.trip_ideas; -- can_view_trip_idea
  RESET ROLE;
  RAISE NOTICE '068 SEC-019 PASSED';
END $$;
ROLLBACK;
