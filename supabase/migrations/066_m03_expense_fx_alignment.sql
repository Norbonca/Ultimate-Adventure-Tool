-- 066 — M03 Költségelszámolás séma-igazítás a §14-hez és a 2026-10-31-i döntésekhez (08_Megvalositasi_Terv.md §6 M-B). 2026-10-31.
-- Előfeltétel: 065 (fx_mode_t, trips.settlement_currency, fx_resolve_rate).
--  • pillanatkép-mezők a tételen (§14.4); amount_settlement NULL = átváltás függőben (a mentés nem tiltott — 09:39);
--  • expense_splits.amount_settlement: a részesedés az elszámolási pénznemben, 2 tizedes (GAP-012);
--  • amount_in_primary / exchange_rate és expense_balances: NEM töröljük (MIGRATION_PROTOCOL 1.4 — soft-deprecate, 30 nap után DROP külön migrációban; NyK-13 így teljesül);
--  • rögzítési jog: szervező, vagy participant ha trips.expenses_participants_can_add (GAP-011);
--  • kiegyenlítés: senki nem módosítja az összeget, csak „nem ért egyet” jelezhető (14:03); 30 nap után pg_cron → disputed (NyK-06);
--  • egyenleg: számított függvény, nem tárolt tábla (GAP-006/007).
-- Idempotens. DROP COLUMN / DROP TABLE nincs.

-- ── 1. expenses: pillanatkép (§14.4) ─────────────────────────────────────────
-- DECIMAL(20,10), nem a §14.5 szerinti (14,6): a keresztárfolyam HUF-elszámolásnál 0,0025 nagyságrendű, hat tizedessel 0,016 % hibát adna (lásd 065 fx_resolve_rate).
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS fx_rate          DECIMAL(20,10) CHECK (fx_rate IS NULL OR fx_rate > 0);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS fx_rate_date     DATE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS fx_rate_source   TEXT CHECK (fx_rate_source IS NULL OR fx_rate_source IN ('same','trip','peg','ecb','ecb:derived','manual'));
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS fx_quality       TEXT CHECK (fx_quality IS NULL OR fx_quality IN ('same','trip','peg','exact','backfill','stale','none'));
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS amount_settlement DECIMAL(12,2) CHECK (amount_settlement IS NULL OR amount_settlement > 0);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS fx_locked_at     TIMESTAMPTZ;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS title            VARCHAR(120);
ALTER TABLE public.expenses ALTER COLUMN currency DROP DEFAULT;
-- Legfeljebb 2 tizedes a bevitelben (GAP-012; a DECIMAL(10,2) ezt tárolásban már adja, a CHECK a kerekítés nélküli írást zárja ki)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_amount_scale') THEN
    ALTER TABLE public.expenses ADD CONSTRAINT chk_expenses_amount_scale CHECK (amount = round(amount, 2));
  END IF;
END $$;
COMMENT ON COLUMN public.expenses.fx_rate IS '§14.4 pillanatkép: ennyi `currency` járt 1 egység elszámolási pénznemért a mentéskor; nem frissül utólag.';
COMMENT ON COLUMN public.expenses.fx_rate_date IS '§14.4: a tényleges jegyzés napja (hétvégén az előző jegyzésé).';
COMMENT ON COLUMN public.expenses.fx_rate_source IS 'same | trip | peg | ecb | ecb:derived | manual — honnan jött az árfolyam.';
COMMENT ON COLUMN public.expenses.fx_quality IS 'exact | backfill | stale (utolsó ismert, figyelmeztetés) | none (átváltás függőben) | same | trip | peg.';
COMMENT ON COLUMN public.expenses.amount_settlement IS 'A tétel az elszámolási pénznemben, 2 tizedesre kerekítve; NULL = még nincs árfolyam, az egyenlegbe nem számít bele.';
COMMENT ON COLUMN public.expenses.title IS 'Megnevezés (D04 Hpeqs „Megnevezés”); a description a hosszabb megjegyzés.';
COMMENT ON COLUMN public.expenses.amount_in_primary IS 'ELAVULT (066, 2026-10-31): helyette amount_settlement. Kódból nem írjuk; törlés külön migrációban 30 nap után.';
COMMENT ON COLUMN public.expenses.exchange_rate IS 'ELAVULT (066, 2026-10-31): helyette fx_rate + fx_rate_date + fx_rate_source. Törlés külön migrációban 30 nap után.';
COMMENT ON TABLE public.expense_balances IS 'ELAVULT (066, 2026-10-31, GAP-007): az egyenleg számított — public.trip_balances(trip_id). Nem írjuk; törlés külön migrációban.';

-- ── 2. expense_splits: részesedés az elszámolási pénznemben ──────────────────
ALTER TABLE public.expense_splits ADD COLUMN IF NOT EXISTS amount_settlement DECIMAL(12,2) CHECK (amount_settlement IS NULL OR amount_settlement >= 0);
COMMENT ON COLUMN public.expense_splits.amount IS 'Részesedés a tétel pénznemében (eredeti).';
COMMENT ON COLUMN public.expense_splits.amount_settlement IS 'Részesedés az elszámolási pénznemben, 2 tizedes; a kerekítési maradék a fizető részesedésén (BR-M03-004). NULL, ha a tétel átváltása függőben.';

-- ── 3. Rögzítési jog (GAP-011) — az INSERT-szabály újraírva ──────────────────
DROP POLICY IF EXISTS "expenses_insert_participant" ON public.expenses;
CREATE POLICY expenses_insert_allowed ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.organizer_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.trip_participants p ON p.trip_id = t.id AND p.user_id = auth.uid()
      WHERE t.id = trip_id AND t.expenses_participants_can_add
        AND p.status IN ('approved', 'participant')
    )
  );
COMMENT ON POLICY expenses_insert_allowed ON public.expenses IS 'GAP-011: szervező mindig; participant csak ha trips.expenses_participants_can_add.';
-- expense_splits írás: a tétel írója (a 003-ban nem volt INSERT-szabály a splits-re)
DROP POLICY IF EXISTS expense_splits_write_expense_owner ON public.expense_splits;
CREATE POLICY expense_splits_write_expense_owner ON public.expense_splits FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.expenses e JOIN public.trips t ON t.id = e.trip_id
                 WHERE e.id = expense_id AND (e.payer_id = auth.uid() OR e.created_by = auth.uid() OR t.organizer_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.expenses e JOIN public.trips t ON t.id = e.trip_id
                 WHERE e.id = expense_id AND (e.payer_id = auth.uid() OR e.created_by = auth.uid() OR t.organizer_id = auth.uid())));
GRANT INSERT, UPDATE, DELETE ON public.expense_splits TO authenticated;

-- Kiegyenlített tétel zárolt (BR-M03-001): ha bármely részesedése is_settled, a tétel nem módosítható és nem törölhető.
CREATE OR REPLACE FUNCTION public.guard_settled_expense()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.expense_splits s WHERE s.expense_id = OLD.id AND s.is_settled) THEN
    RAISE EXCEPTION 'expense_settled_locked' USING HINT = 'A tétel már kiegyenlített részesedést tartalmaz, nem módosítható.', ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_settled_expense ON public.expenses;
CREATE TRIGGER trg_guard_settled_expense BEFORE UPDATE OF amount, currency, payer_id, split_type, status, deleted_at, date ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.guard_settled_expense();

-- ── 4. Kiegyenlítés: összeg nem módosítható, csak megerősítés / „nem ért egyet” (14:03) ──
ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS disputed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;
ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS dispute_note TEXT CHECK (dispute_note IS NULL OR length(dispute_note) <= 500);
ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS paid_marked_at TIMESTAMPTZ;
COMMENT ON COLUMN public.settlements.disputed_by IS 'Aki jelezte, hogy nem ért egyet (fizető vagy kedvezményezett); az összeget senki nem írja át — a feloldás a költségtételek javításával történik.';
COMMENT ON COLUMN public.settlements.paid_marked_at IS 'A fizető „Kifizettem” jelzésének ideje.';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_settlements_amount_scale') THEN
    ALTER TABLE public.settlements ADD CONSTRAINT chk_settlements_amount_scale CHECK (amount = round(amount, 2));
  END IF;
END $$;

-- A felek csak a saját jelölésüket és a „nem ért egyet” mezőket írhatják; minden más mező változatlan (a service_role kivétel).
CREATE OR REPLACE FUNCTION public.guard_settlement_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF current_setting('role', true) = 'service_role' OR v_uid IS NULL THEN RETURN NEW; END IF;
  IF NEW.amount <> OLD.amount OR NEW.currency <> OLD.currency OR NEW.payer_id <> OLD.payer_id
     OR NEW.receiver_id <> OLD.receiver_id OR NEW.method <> OLD.method OR NEW.trip_id <> OLD.trip_id THEN
    RAISE EXCEPTION 'settlement_immutable' USING HINT = 'A kiegyenlítés összege és felei nem módosíthatók; jelezd, ha nem értesz egyet.', ERRCODE = 'check_violation';
  END IF;
  IF OLD.status IN ('completed') THEN
    RAISE EXCEPTION 'settlement_closed' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.confirmed_by_payer <> OLD.confirmed_by_payer AND v_uid <> OLD.payer_id THEN
    RAISE EXCEPTION 'settlement_not_payer' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.confirmed_by_payee <> OLD.confirmed_by_payee AND v_uid <> OLD.receiver_id THEN
    RAISE EXCEPTION 'settlement_not_payee' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.confirmed_by_payer AND NOT OLD.confirmed_by_payer THEN NEW.paid_marked_at := now(); END IF;
  IF NEW.status = 'disputed' AND OLD.status <> 'disputed' THEN
    IF v_uid NOT IN (OLD.payer_id, OLD.receiver_id) THEN
      RAISE EXCEPTION 'settlement_not_party' USING ERRCODE = 'insufficient_privilege';
    END IF;
    NEW.disputed_by := v_uid; NEW.disputed_at := now();
  ELSIF NEW.status <> OLD.status AND NEW.status NOT IN ('completed', 'disputed') THEN
    RAISE EXCEPTION 'settlement_status_transition' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_settlement_update ON public.settlements;
CREATE TRIGGER trg_guard_settlement_update BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.guard_settlement_update();

-- 30 nap után a meg nem erősített kiegyenlítés „nem ért egyet” állapotba kerül (BR-M03-006, NyK-06) — pg_cron, a purge mintájára.
CREATE OR REPLACE FUNCTION public.dispute_stale_settlements()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_days int; v_n int;
BEGIN
  SELECT coalesce((value)::text::int, 30) INTO v_days FROM public.system_settings WHERE key = 'fx_settlement_dispute_days';
  UPDATE public.settlements
     SET status = 'disputed', disputed_at = now(), dispute_note = coalesce(dispute_note, 'Automatikus: ' || v_days || ' napig nem erősítették meg.')
   WHERE status = 'pending' AND confirmed_by_payer AND NOT confirmed_by_payee
     AND coalesce(paid_marked_at, created_at) < now() - make_interval(days => v_days);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.dispute_stale_settlements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispute_stale_settlements() TO service_role;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispute-stale-settlements') THEN PERFORM cron.unschedule('dispute-stale-settlements'); END IF;
    PERFORM cron.schedule('dispute-stale-settlements', '31 3 * * *', 'SELECT public.dispute_stale_settlements()');
  END IF;
END $$;

-- ── 5. Egyenleg — számított (GAP-006/007), az elszámolási pénznemben ─────────
-- paid: amit a résztvevő fizetett (amount_settlement, aktív tétel); owed: a részesedései; settled_out/in: lezárt kiegyenlítések.
-- balance > 0: neki tartoznak; < 0: ő tartozik. A függőben lévő (amount_settlement NULL) tételek nem számítanak.
CREATE OR REPLACE FUNCTION public.trip_balances(p_trip_id uuid)
RETURNS TABLE (user_id uuid, paid numeric, owed numeric, settled_out numeric, settled_in numeric, balance numeric, pending_expenses integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  WITH members AS (
    SELECT p.user_id FROM public.trip_participants p WHERE p.trip_id = p_trip_id AND p.status IN ('approved', 'participant')
    UNION SELECT t.organizer_id FROM public.trips t WHERE t.id = p_trip_id
    UNION SELECT e.payer_id FROM public.expenses e WHERE e.trip_id = p_trip_id AND e.status = 'active' AND e.deleted_at IS NULL
    UNION SELECT s.user_id FROM public.expense_splits s JOIN public.expenses e ON e.id = s.expense_id
      WHERE e.trip_id = p_trip_id AND e.status = 'active' AND e.deleted_at IS NULL
  ),
  act AS (SELECT * FROM public.expenses e WHERE e.trip_id = p_trip_id AND e.status = 'active' AND e.deleted_at IS NULL),
  paid AS (SELECT a.payer_id AS uid, sum(a.amount_settlement) AS v, count(*) FILTER (WHERE a.amount_settlement IS NULL) AS pend FROM act a GROUP BY a.payer_id),
  owed AS (SELECT s.user_id AS uid, sum(s.amount_settlement) AS v FROM public.expense_splits s JOIN act a ON a.id = s.expense_id GROUP BY s.user_id),
  so AS (SELECT s.payer_id AS uid, sum(s.amount) AS v FROM public.settlements s WHERE s.trip_id = p_trip_id AND s.status = 'completed' GROUP BY s.payer_id),
  si AS (SELECT s.receiver_id AS uid, sum(s.amount) AS v FROM public.settlements s WHERE s.trip_id = p_trip_id AND s.status = 'completed' GROUP BY s.receiver_id)
  SELECT m.user_id,
         coalesce(paid.v, 0)::numeric, coalesce(owed.v, 0)::numeric, coalesce(so.v, 0)::numeric, coalesce(si.v, 0)::numeric,
         round(coalesce(paid.v, 0) - coalesce(owed.v, 0) + coalesce(so.v, 0) - coalesce(si.v, 0), 2)::numeric,
         coalesce(paid.pend, 0)::integer
    FROM members m
    LEFT JOIN paid ON paid.uid = m.user_id
    LEFT JOIN owed ON owed.uid = m.user_id
    LEFT JOIN so ON so.uid = m.user_id
    LEFT JOIN si ON si.uid = m.user_id;
$$;
COMMENT ON FUNCTION public.trip_balances(uuid) IS 'M03 egyenleg résztvevőnként az elszámolási pénznemben, számított (GAP-006/007). SECURITY INVOKER: a hívó RLS-e dönt, mit lát. Az optimalizált (greedy) lista ebből épül az alkalmazásban.';
GRANT EXECUTE ON FUNCTION public.trip_balances(uuid) TO authenticated, service_role;
