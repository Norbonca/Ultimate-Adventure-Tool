-- 067 — Napi EKB-árfolyam szinkron ütemezése (rendszerspec §14.8; NyK-05 (a): pg_cron + pg_net → Edge Function `fx-sync`). 2026-11-01.
-- A függvény a repóban: supabase/functions/fx-sync (verify_jwt = false; csak közérdekű EKB-adat, 10 perces fojtás).
-- Számozás: a 067-et ez a migráció kapja; az M121 fenntartása 068-tól (Norbert döntésére vár a hubnote-ban).
-- Előfeltétel élesítéskor: az Edge Function telepítve (`supabase functions deploy fx-sync --no-verify-jwt`), különben a job 404-et naplóz, kárt nem okoz.
-- Idempotens.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

INSERT INTO public.system_settings (key, value, description) VALUES
  ('fx_sync_function_url', '"https://rpwajsbxrvypeqaalhvd.supabase.co/functions/v1/fx-sync"', '§14.8: az fx-sync Edge Function címe (pg_cron hívja)')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.trigger_fx_sync(p_triggered_by text DEFAULT 'cron')
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_url text; v_id bigint;
BEGIN
  SELECT trim(both '"' from value::text) INTO v_url FROM public.system_settings WHERE key = 'fx_sync_function_url';
  IF v_url IS NULL OR v_url = '' THEN RETURN NULL; END IF;
  SELECT net.http_post(
    url := v_url,
    body := jsonb_build_object('triggered_by', CASE WHEN p_triggered_by IN ('cron','admin','test') THEN p_triggered_by ELSE 'cron' END),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 30000
  ) INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.trigger_fx_sync(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_fx_sync(text) TO service_role;
COMMENT ON FUNCTION public.trigger_fx_sync(text) IS '§14.8: aszinkron hívás (pg_net) az fx-sync Edge Functionre; az eredmény az fx_sync_runs táblában.';

-- Az EKB 16:00 CET körül publikál; 16:17 UTC hétköznap (téli és nyári időben is a publikálás után).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fx-sync-daily') THEN PERFORM cron.unschedule('fx-sync-daily'); END IF;
    PERFORM cron.schedule('fx-sync-daily', '17 16 * * 1-5', 'SELECT public.trigger_fx_sync(''cron'')');
  END IF;
END $$;

-- ── M03 olvasási/írási szabályok igazítása a D04-tervhez (2026-11-01, a kód írása közben talált hiányok) ──
-- 1. A szervező is látja a részesedéseket (a 003 csak a résztvevőknek adta) — nélküle a trip_balances() (SECURITY INVOKER)
--    a szervezőnek hiányos egyenleget adna.
DROP POLICY IF EXISTS expense_splits_select_organizer ON public.expense_splits;
CREATE POLICY expense_splits_select_organizer ON public.expense_splits FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND public.is_trip_organizer(e.trip_id)));
-- 2. A tételt a rögzítője is szerkesztheti, nem csak a fizető és a szervező (spec: „létrehozó vagy szervező”).
DROP POLICY IF EXISTS expenses_update_created_by ON public.expenses;
CREATE POLICY expenses_update_created_by ON public.expenses FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
-- 3. A túra minden résztvevője látja a túra összes kiegyenlítését (D04 EzvWI „Minden kiegyenlítés a túrán”);
--    a 003 csak a feleknek és a szervezőnek adta.
DROP POLICY IF EXISTS settlements_select_trip_member ON public.settlements;
CREATE POLICY settlements_select_trip_member ON public.settlements FOR SELECT TO authenticated
  USING (public.is_trip_participant(trip_id));
