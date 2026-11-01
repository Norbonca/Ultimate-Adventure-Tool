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

-- ── Biztonsági pótlások (2026-11-01, főkontextusbeli átnézés) ─────────────────
-- A 003 szabályai a kliens (PostgREST) közvetlen hívásaival kijátszhatók voltak; az M03 élesítése előtt zárjuk.
-- Tag = a túra szervezője vagy jóváhagyott résztvevője (approved/participant). SECURITY DEFINER, hogy RLS-rekurzió ne legyen.
CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = p_trip_id AND t.organizer_id = p_user_id)
      OR EXISTS (SELECT 1 FROM public.trip_participants p WHERE p.trip_id = p_trip_id AND p.user_id = p_user_id AND p.status IN ('approved', 'participant'));
$$;
REVOKE ALL ON FUNCTION public.is_trip_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid, uuid) TO authenticated, service_role;

-- 4. Kiegyenlítés beszúrása: csak a saját túrán, tagnak, „függőben” állapotban, kedvezményezetti megerősítés nélkül
--    (a 003 csak payer_id = auth.uid()-t nézett → bárki beírhatott „completed” sort bármely túra egyenlegébe).
ALTER POLICY "settlements_insert_payer" ON public.settlements
  WITH CHECK (
    payer_id = auth.uid()
    AND public.is_trip_member(trip_id, auth.uid())
    AND public.is_trip_member(trip_id, receiver_id)
    AND status = 'pending'
    AND confirmed_by_payee = false
  );
-- 5. Költség beszúrása: a rögzítő önmaga, a fizető a túra tagja (a 066 szabálya csak a beszúró jogát nézte).
ALTER POLICY expenses_insert_allowed ON public.expenses
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_trip_member(trip_id, payer_id)
    AND (
      EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.organizer_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.trips t
        JOIN public.trip_participants p ON p.trip_id = t.id AND p.user_id = auth.uid()
        WHERE t.id = trip_id AND t.expenses_participants_can_add AND p.status IN ('approved', 'participant')
      )
    )
  );
-- 6. Részesedés: csak a túra tagja kaphat részt.
ALTER POLICY expense_splits_write_expense_owner ON public.expense_splits
  WITH CHECK (EXISTS (SELECT 1 FROM public.expenses e JOIN public.trips t ON t.id = e.trip_id
                      WHERE e.id = expense_id
                        AND (e.payer_id = auth.uid() OR e.created_by = auth.uid() OR t.organizer_id = auth.uid())
                        AND public.is_trip_member(e.trip_id, user_id)));
-- 7. A tétel nem költöztethető másik túrára, a rögzítője nem írható át, a fizető csak tag lehet
--    (a 003 UPDATE-szabályának nincs WITH CHECK-je → a fizető átírhatta a trip_id-t).
CREATE OR REPLACE FUNCTION public.guard_expense_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.trip_id IS DISTINCT FROM OLD.trip_id OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'expense_identity_immutable' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.payer_id IS DISTINCT FROM OLD.payer_id AND NOT public.is_trip_member(NEW.trip_id, NEW.payer_id) THEN
    RAISE EXCEPTION 'expense_payer_not_member' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_expense_identity ON public.expenses;
CREATE TRIGGER trg_guard_expense_identity BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.guard_expense_identity();
