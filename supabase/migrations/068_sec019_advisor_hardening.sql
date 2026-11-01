-- 068 — SEC-019: a Supabase Security Advisor (2026-11-01) leleteinek javítása. Idempotens.
-- Számozás: a 068-at ez kapja; az M121 fenntartása 069-től.
-- Háttér (SEC-018): a pg_default_acl az anon/authenticated szerepnek külön EXECUTE-ot ad, ezért név szerint vonunk vissza.

-- 1. Anon-tól visszavonva — egyik sem szerepel anonként kiértékelt RLS-szabályban:
--    is_platform_admin_user: csak authenticated-szabályok használják (fx_*, trip_idea_reports) és a SECURITY DEFINER
--    can_view_trip_idea (az tulajdonosként hívja). Anonként bármely UUID-ról kideríthető volt, hogy platformadmin-e.
--    trip_idea_recompute: az ötlet-server actionök bejelentkezve hívják, a triggerek tulajdonosként.
REVOKE ALL ON FUNCTION public.is_platform_admin_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin_user(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.trip_idea_recompute(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trip_idea_recompute(uuid) TO authenticated, service_role;
-- Tudatosan MARAD anonnak: can_view_trip_idea, has_trip_participation, is_calendar_admin, is_trip_organizer,
-- is_trip_participant — „public” szerepű SELECT-szabályok hívják, nélkülük az anon olvasás 42501-gyel elbukna.

-- 2. Triggerfüggvények: RPC-n semmi keresnivalójuk (triggerként a futtatási jog nem számít).
DO $$
DECLARE fn text; oid_ regprocedure;
BEGIN
  FOREACH fn IN ARRAY ARRAY['guard_participant_transition','handle_new_user','sync_profile_visibility','trip_idea_children_changed',
                            'trip_idea_daily_limit','trip_idea_on_trip_change','trip_idea_owner_joins','trip_idea_report_threshold',
                            'update_trip_participant_count'] LOOP
    FOR oid_ IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = fn AND pg_get_function_result(p.oid) = 'trigger' LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', oid_);
    END LOOP;
  END LOOP;
END $$;

-- 3. Rögzített search_path (Advisor 0011) — mind SECURITY INVOKER; a jelenlegi feloldás megmarad (public, extensions).
DO $$
DECLARE fn text; oid_ regprocedure;
BEGIN
  FOREACH fn IN ARRAY ARRAY['update_ref_cover_images_updated_at','update_ref_avatar_images_updated_at','update_user_images_updated_at',
                            'touch_system_settings_updated_at','fn_default_require_approval','recount_crew_position_filled_spots',
                            'update_crew_position_filled_spots','update_updated_at_column','generate_trip_slug','set_expense_deleted_at',
                            'check_settlement_confirmation','generate_guide_booking_number','set_guide_booking_number',
                            'calculate_guide_overall_rating'] LOOP
    FOR oid_ IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = fn AND NOT p.prosecdef LOOP
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', oid_);
    END LOOP;
  END LOOP;
END $$;

-- 4. A három nézet a lekérdező jogaival fut (Advisor 0010). Az alaptáblák SELECT-szabálya mind „public: true”,
--    így a látható sorok köre nem változik (élesben anonként ellenőrizve: 37 / 8 / 0 sor, mint előtte).
ALTER VIEW public.v_category_form_fields SET (security_invoker = true);
ALTER VIEW public.v_category_summary SET (security_invoker = true);
ALTER VIEW public.v_user_skills_enriched SET (security_invoker = true);

-- Nem ebben a migrációban: az unaccent áthelyezése (a keresőfüggvények minősítés nélkül hívják — külön, teszttel);
-- az admin_audit_log és a guide_admin_actions RLS-e szabály nélkül = csak service_role (szándékos);
-- a kiszivárgott jelszavak elleni védelem a Supabase Auth beállítása, nem migráció.
