-- 069 — SEC-019 II.: a Security Advisor két maradék lelete (2026-11-01). Idempotens.
-- Számozás: a 069-et ez kapja; az M121 fenntartása 070-től.

-- 1. unaccent → extensions séma (Advisor 0014). Egyetlen hívója a generate_trip_slug(), amelynek a 068 óta
--    search_path = public, extensions — a feloldás az áthelyezés után is működik. Index, nézet, szabály,
--    generált oszlop és szövegkereső-konfiguráció nem hivatkozik rá (élesben ellenőrizve).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
             WHERE e.extname = 'unaccent' AND n.nspname = 'public') THEN
    ALTER EXTENSION unaccent SET SCHEMA extensions;
  END IF;
END $$;

-- 2. admin_audit_log, guide_admin_actions: RLS be, szabály nincs (Advisor 0008). A szándék: csak a service_role
--    (az admin server actionök createAdminClient()-tel írnak; a guide_admin_actions-t még semmi nem használja).
--    Kimondjuk: az ügyfélszerepek táblajogát visszavonjuk, és egy mindent tiltó szabály dokumentálja a szándékot.
--    A service_role RLS-kerülő, rá egyik sem hat.
REVOKE ALL ON TABLE public.admin_audit_log FROM anon, authenticated;
REVOKE ALL ON TABLE public.guide_admin_actions FROM anon, authenticated;
DROP POLICY IF EXISTS admin_audit_log_service_role_only ON public.admin_audit_log;
CREATE POLICY admin_audit_log_service_role_only ON public.admin_audit_log AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS guide_admin_actions_service_role_only ON public.guide_admin_actions;
CREATE POLICY guide_admin_actions_service_role_only ON public.guide_admin_actions AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
COMMENT ON TABLE public.admin_audit_log IS 'Admin audit-napló. Csak service_role ír és olvas (SEC-019 II., 069).';
COMMENT ON TABLE public.guide_admin_actions IS 'M17 admin-műveletnapló. Csak service_role (SEC-019 II., 069).';
