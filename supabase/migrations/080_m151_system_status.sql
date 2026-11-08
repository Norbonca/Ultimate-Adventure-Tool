-- ============================================================================
-- 080 — M151 Rendszerállapot: admin_system_status()
-- Spec: modules/15_Admin_Panel/151_System_Status/README.md §4
--
-- Csak olvas: a lefutott migrációk verziólistája és a pg_cron feladatok utolsó futása.
-- Tábla nem jön létre, írás nincs. Csak a service_role hívhatja (az admin API service role
-- kliensen fut, a platform-admin jogosultságot az API-route ellenőrzi).
-- Supabase-en a REVOKE … FROM PUBLIC önmagában hatástalan (SEC-018), ezért az anon és az
-- authenticated szerepet kifejezetten is kizárjuk.
-- Számozás: az M121 sávja 072–079; a 080 ezen kívül esik (MIGRATION_PROTOCOL.md).
-- Függőség: csak a pg_cron (067); ha a séma hiányzik, az adott mező null (nem hiba).
-- Idempotens: CREATE OR REPLACE + REVOKE/GRANT.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_system_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_migrations jsonb;
  v_cron jsonb;
BEGIN
  BEGIN
    SELECT coalesce(jsonb_agg(m.version ORDER BY m.version), '[]'::jsonb)
      INTO v_migrations
      FROM supabase_migrations.schema_migrations m;
  EXCEPTION WHEN undefined_table OR invalid_schema_name THEN
    v_migrations := NULL;
  END;

  BEGIN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'name', j.jobname,
             'schedule', j.schedule,
             'active', j.active,
             'status', r.status,
             'start_time', r.start_time
           ) ORDER BY j.jobname), '[]'::jsonb)
      INTO v_cron
      FROM cron.job j
      LEFT JOIN LATERAL (
        SELECT d.status, d.start_time
          FROM cron.job_run_details d
         WHERE d.jobid = j.jobid
         ORDER BY d.start_time DESC NULLS LAST
         LIMIT 1
      ) r ON true;
  EXCEPTION WHEN undefined_table OR invalid_schema_name THEN
    v_cron := NULL;
  END;

  RETURN jsonb_build_object('migrations', v_migrations, 'cron', v_cron);
END;
$$;

COMMENT ON FUNCTION public.admin_system_status() IS
  'M151: lefutott migrációk + pg_cron utolsó futások az admin rendszerállapot-oldalhoz. Csak service_role.';

REVOKE ALL ON FUNCTION public.admin_system_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_system_status() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_system_status() TO service_role;
