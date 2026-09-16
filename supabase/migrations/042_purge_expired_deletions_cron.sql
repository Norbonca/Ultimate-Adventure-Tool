-- Migration 042: a 30 nap utáni végleges törlés ütemezése pg_cronnal (US-M01-017, BR-M02-009)
--
-- Norbert döntése (2026-09-16): pg_cron (és nem Vercel Cron). A 041-es migráció
-- `purge_expired_deletions()` függvényét naponta egyszer futtatja:
--   - a 30 napnál régebben soft-delete-elt túrák végleges törlése;
--   - a türelmi idejét letöltött fiókok anonimizálása.
-- Időpont: 03:17 UTC (alacsony forgalom, nem egész óra, hogy ne torlódjon más ütemezett jobbal).
-- A job a `postgres` szerepben fut; a függvény futtatási joga továbbra is csak service_role-é.
--
-- Számozás: a 042 azért ez, mert élesben a 041 után ez következik; a `feat/m23-calendar`
-- migrációi ezért 043–045-re számozódtak át.
--
-- Idempotens: a bővítményt csak hiányzáskor telepíti; a jobot a neve alapján előbb törli, majd újra ütemezi.
BEGIN;

-- Csak ha még nincs telepítve: a Supabase `after-create` szkriptje a jogosultságokat maga adja ki,
-- és ismételt futtatáskor (IF NOT EXISTS mellett is) „dependent privileges exist” hibával elbukna.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron WITH SCHEMA pg_catalog;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-deletions') THEN
    PERFORM cron.unschedule('purge-expired-deletions');
  END IF;
  PERFORM cron.schedule('purge-expired-deletions', '17 3 * * *', 'SELECT public.purge_expired_deletions()');
END;
$$;

-- A pg_cron nem takarít maga után: a 30 napnál régebbi futásnaplók törlése hetente
-- (Supabase-ajánlás, a cron.job_run_details tábla ne nőjön korlátlanul).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-cron-run-details') THEN
    PERFORM cron.unschedule('cleanup-cron-run-details');
  END IF;
  PERFORM cron.schedule('cleanup-cron-run-details', '43 3 * * 0',
    $job$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '30 days'$job$);
END;
$$;

COMMIT;
