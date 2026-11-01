-- 065 — Rendszerszintű devizakezelés (rendszerspec §14; M03 megvalósítási terv §6 M-A). 2026-10-31.
-- Norbert döntései 2026-10-31 (08_Megvalositasi_Terv.md §9/b):
--  • a szervező választja az elszámolási pénznemet és az átváltási módot (§14.3 három érték), az első aktív tételtől zárolt;
--  • a meglévő túrák elszámolási pénzneme az ország pénzneme (ref_countries.default_currency) — NyK-03;
--  • résztvevő akkor rögzíthet, ha a szervező engedélyezi (trips.expenses_participants_can_add, alap false) — GAP-011;
--  • nincs friss árfolyam → az utolsó ismert, figyelmeztetéssel; a mentés sosem tiltott (§14.8 jegyzet, 09:39);
--  • az árfolyamforrás az adminban állítható (fx_rate_sources).
-- Számozás: élesben 055–058 (058 = SEC-014, PR #65), a gap-terv 059–064; ez a terv 065–066, az M121 067-től.
-- Idempotens: IF NOT EXISTS / ON CONFLICT / DO-blokk a típusokra és constraintekre. DROP COLUMN / DROP TABLE nincs (MIGRATION_PROTOCOL 1.4).

-- ── 1. Átváltási mód ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.fx_mode_t AS ENUM ('expense_date', 'settlement_date', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
COMMENT ON TYPE public.fx_mode_t IS '§14.3: expense_date = a költés napjának jegyzése; settlement_date = a kiegyenlítés napjáé; fixed = túraszintű, a szervező adja meg.';

-- ── 2. Árfolyamforrások (§14.7) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fx_rate_sources (
  code            TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('api', 'manual')),
  base_url        TEXT,
  enabled         BOOLEAN NOT NULL DEFAULT false,
  priority        INTEGER NOT NULL DEFAULT 100,
  last_synced_at  TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.fx_rate_sources IS '§14.7: árfolyamforrások; az admin kapcsolja és sorrendezi. A szinkron a legkisebb priority értékű engedélyezett api-forrást használja.';
INSERT INTO public.fx_rate_sources (code, name, kind, base_url, enabled, priority, notes) VALUES
  ('ecb',         'Európai Központi Bank (referenciaárfolyam)', 'api',    'https://www.ecb.europa.eu/stats/eurofxref/', false, 20, 'XML; a Frankfurter ugyanezt az adatot adja JSON-ként'),
  ('frankfurter', 'Frankfurter (ECB-adat, JSON)',               'api',    'https://api.frankfurter.dev/v1',               true,  10, 'Elsődleges forrás (§14.13/1)'),
  ('mnb',         'Magyar Nemzeti Bank',                        'api',    'https://www.mnb.hu/arfolyamok.asmx',           false, 30, 'HUF-alapú, csak tartalék'),
  ('manual',      'Kézi / rendszerszintű állandó árfolyam',     'manual', NULL,                                           true,  90, 'BAM, BGN rögzített EUR-paritás (1,95583)')
ON CONFLICT (code) DO NOTHING;

-- ── 3. exchange_rates bővítése (§14.6) ───────────────────────────────────────
ALTER TABLE public.exchange_rates ADD COLUMN IF NOT EXISTS unit INTEGER NOT NULL DEFAULT 1 CHECK (unit > 0);
ALTER TABLE public.exchange_rates ADD COLUMN IF NOT EXISTS is_derived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.exchange_rates ALTER COLUMN source SET DEFAULT 'ecb';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exchange_rates_source') THEN
    ALTER TABLE public.exchange_rates
      ADD CONSTRAINT fk_exchange_rates_source FOREIGN KEY (source) REFERENCES public.fx_rate_sources(code);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exchange_rates_base_currency_target_currency_rate_date_key') THEN
    ALTER TABLE public.exchange_rates DROP CONSTRAINT exchange_rates_base_currency_target_currency_rate_date_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_exchange_rates_source_pair_date') THEN
    ALTER TABLE public.exchange_rates
      ADD CONSTRAINT uq_exchange_rates_source_pair_date UNIQUE (source, base_currency, target_currency, rate_date);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair_date ON public.exchange_rates (base_currency, target_currency, rate_date DESC);
COMMENT ON COLUMN public.exchange_rates.unit IS '§14.6: hány egység bázisért érvényes a rate (ECB: 1; MNB: 1 vagy 100).';
COMMENT ON COLUMN public.exchange_rates.is_derived IS '§14.6: EUR-on át számított keresztárfolyam.';
COMMENT ON COLUMN public.exchange_rates.source IS 'fx_rate_sources.code — az adat eredete (ecb = a Frankfurter is ECB-adatot ad), nem a letöltő.';

-- Rendszerszintű állandó árfolyamok (§14.7; D02 XKV28 megjegyzés): BAM és BGN EUR-paritása.
INSERT INTO public.exchange_rates (base_currency, target_currency, rate, source, rate_date, unit, is_derived)
SELECT 'EUR', c.code, 1.95583, 'manual', DATE '1999-01-01', 1, false
FROM public.ref_currencies c WHERE c.code IN ('BAM', 'BGN')
ON CONFLICT ON CONSTRAINT uq_exchange_rates_source_pair_date DO NOTHING;

-- ── 4. Szinkron-napló (§14.8) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fx_sync_runs (
  id              BIGSERIAL PRIMARY KEY,
  source_code     TEXT NOT NULL REFERENCES public.fx_rate_sources(code),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'partial', 'error')),
  rate_date       DATE,
  rates_upserted  INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  triggered_by    TEXT NOT NULL DEFAULT 'cron' CHECK (triggered_by IN ('cron', 'admin', 'test'))
);
CREATE INDEX IF NOT EXISTS idx_fx_sync_runs_started ON public.fx_sync_runs (started_at DESC);
COMMENT ON TABLE public.fx_sync_runs IS '§14.8: minden napi szinkron és admin „Szinkronizálás most” futás egy sor; az admin innen látja a hibát.';

-- ── 5. trips: elszámolási pénznem, mód, rögzítési jog ────────────────────────
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS settlement_currency VARCHAR(3);
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS fx_mode public.fx_mode_t NOT NULL DEFAULT 'expense_date';
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS expenses_participants_can_add BOOLEAN NOT NULL DEFAULT false;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trips_settlement_currency') THEN
    ALTER TABLE public.trips
      ADD CONSTRAINT fk_trips_settlement_currency FOREIGN KEY (settlement_currency) REFERENCES public.ref_currencies(code);
  END IF;
END $$;
-- Backfill (NyK-03 „országhoz igazítva”): a túra országának pénzneme; ha az ország ismeretlen vagy a pénzneme inaktív → EUR.
UPDATE public.trips t
SET settlement_currency = COALESCE(
  (SELECT c.default_currency FROM public.ref_countries c
     JOIN public.ref_currencies cur ON cur.code = c.default_currency AND cur.is_active
    WHERE c.code = upper(t.location_country)),
  'EUR')
WHERE t.settlement_currency IS NULL;
ALTER TABLE public.trips ALTER COLUMN settlement_currency SET NOT NULL;
COMMENT ON COLUMN public.trips.settlement_currency IS '§14.2: ebben számoljuk az egyenlegeket és a kiegyenlítést; az első aktív költségtételtől zárolt.';
COMMENT ON COLUMN public.trips.fx_mode IS '§14.3: átváltási mód, túraszinten; az első aktív költségtételtől zárolt.';
COMMENT ON COLUMN public.trips.expenses_participants_can_add IS 'GAP-011 (Norbert 2026-10-31): true → a participant státuszú résztvevő is rögzíthet költséget; alapból csak a szervező.';

-- Új túra: ha a varázsló nem ad elszámolási pénznemet, az ország pénzneme (aktív), különben a system_settings alapértéke; a mód a system_settings alapértéke.
CREATE OR REPLACE FUNCTION public.default_trip_fx_settings()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_cur varchar(3); v_mode text;
BEGIN
  IF NEW.settlement_currency IS NULL THEN
    SELECT c.default_currency INTO v_cur FROM public.ref_countries c JOIN public.ref_currencies cur ON cur.code = c.default_currency AND cur.is_active
     WHERE c.code = upper(NEW.location_country);
    IF v_cur IS NULL THEN SELECT trim(both '"' from value::text) INTO v_cur FROM public.system_settings WHERE key = 'fx_default_settlement_currency'; END IF;
    NEW.settlement_currency := coalesce(v_cur, 'EUR');
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT trim(both '"' from value::text) INTO v_mode FROM public.system_settings WHERE key = 'fx_default_mode';
    IF v_mode IN ('expense_date', 'settlement_date', 'fixed') AND NEW.fx_mode = 'expense_date' THEN NEW.fx_mode := v_mode::public.fx_mode_t; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_default_trip_fx_settings ON public.trips;
CREATE TRIGGER trg_default_trip_fx_settings BEFORE INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.default_trip_fx_settings();

-- Zárolás (§14.3): aktív tétel mellett a két mező nem módosítható.
CREATE OR REPLACE FUNCTION public.guard_trip_fx_settings()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (NEW.settlement_currency IS DISTINCT FROM OLD.settlement_currency OR NEW.fx_mode IS DISTINCT FROM OLD.fx_mode)
     AND EXISTS (SELECT 1 FROM public.expenses e WHERE e.trip_id = NEW.id AND e.status = 'active' AND e.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'fx_settings_locked' USING HINT = 'A túrán már van költségtétel; az elszámolási pénznem és az átváltási mód nem módosítható (§14.3).', ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_trip_fx_settings ON public.trips;
CREATE TRIGGER trg_guard_trip_fx_settings BEFORE UPDATE OF settlement_currency, fx_mode ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.guard_trip_fx_settings();

-- ── 6. Túraszintű árfolyamok (fixed mód, §14.3/§14.9) ────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_fx_rates (
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  currency    VARCHAR(3) NOT NULL REFERENCES public.ref_currencies(code),
  rate        DECIMAL(14,6) NOT NULL CHECK (rate > 0),
  set_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  set_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  note        TEXT,
  PRIMARY KEY (trip_id, currency)
);
COMMENT ON TABLE public.trip_fx_rates IS 'fixed módban a szervező árfolyamai pénznemenként. rate = ennyi `currency` jár 1 egység elszámolási pénznemért (ECB-irány: 1 EUR = 400 HUF → rate 400).';

-- ── 7. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.fx_rate_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_sync_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_fx_rates  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fx_rate_sources_admin_select ON public.fx_rate_sources;
CREATE POLICY fx_rate_sources_admin_select ON public.fx_rate_sources FOR SELECT TO authenticated
  USING (public.is_platform_admin_user(auth.uid()));
DROP POLICY IF EXISTS fx_rate_sources_admin_update ON public.fx_rate_sources;
CREATE POLICY fx_rate_sources_admin_update ON public.fx_rate_sources FOR UPDATE TO authenticated
  USING (public.is_platform_admin_user(auth.uid())) WITH CHECK (public.is_platform_admin_user(auth.uid()));
DROP POLICY IF EXISTS fx_sync_runs_admin_select ON public.fx_sync_runs;
CREATE POLICY fx_sync_runs_admin_select ON public.fx_sync_runs FOR SELECT TO authenticated
  USING (public.is_platform_admin_user(auth.uid()));
-- trip_fx_rates: olvasás a túra láthatósága szerint (SEC-008 minta), írás csak a szervező.
DROP POLICY IF EXISTS trip_fx_rates_select ON public.trip_fx_rates;
CREATE POLICY trip_fx_rates_select ON public.trip_fx_rates FOR SELECT TO authenticated
  USING (public.can_view_trip(trip_id));
DROP POLICY IF EXISTS trip_fx_rates_organizer_write ON public.trip_fx_rates;
CREATE POLICY trip_fx_rates_organizer_write ON public.trip_fx_rates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.organizer_id = auth.uid()));
GRANT SELECT ON public.fx_rate_sources, public.fx_sync_runs, public.trip_fx_rates TO authenticated;
GRANT UPDATE ON public.fx_rate_sources TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.trip_fx_rates TO authenticated;
GRANT ALL ON public.fx_rate_sources, public.fx_sync_runs, public.trip_fx_rates TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.fx_sync_runs_id_seq TO service_role;

-- ── 8. system_settings (§14.13) ──────────────────────────────────────────────
INSERT INTO public.system_settings (key, value, description) VALUES
  ('fx_default_mode',                '"expense_date"', '§14: új túra alapértelmezett átváltási módja (expense_date | settlement_date | fixed)'),
  ('fx_default_settlement_currency', '"EUR"',          '§14: új túra alapértelmezett elszámolási pénzneme, ha az ország pénzneme nem aktív'),
  ('fx_max_backfill_days',           '7',              '§14.8: hétvége/ünnep — ennyi napot lépünk vissza az utolsó jegyzésre; ezen túl „utolsó ismert” figyelmeztetéssel'),
  ('fx_sync_hour_utc',               '16',             '§14.8: a napi szinkron órája (az ECB 16:00 CET körül publikál)'),
  ('fx_settlement_dispute_days',     '30',             'BR-M03-006: ennyi nap után a meg nem erősített kiegyenlítés „nem ért egyet” állapotba kerül (pg_cron)')
ON CONFLICT (key) DO NOTHING;

-- ── 9. Árfolyam-feloldás (§14.4–14.8 + a 2026-10-31 09:39-es döntés) ─────────
-- Eredmény: rate = ennyi `p_currency` jár 1 egység elszámolási pénznemért (NULL = még nincs árfolyam → átváltás függőben).
-- quality: same (azonos pénznem) · trip (túraszintű) · peg (állandó paritás) · exact (aznapi jegyzés) ·
--          backfill (≤ fx_max_backfill_days visszalépés) · stale (utolsó ismert, figyelmeztetés) · none.
CREATE OR REPLACE FUNCTION public.fx_resolve_rate(p_trip_id uuid, p_currency varchar, p_date date)
RETURNS TABLE (rate numeric, rate_date date, source text, is_derived boolean, quality text)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_settle varchar(3); v_mode public.fx_mode_t; v_back int;
  r_c RECORD; r_s RECORD;
BEGIN
  SELECT t.settlement_currency, t.fx_mode INTO v_settle, v_mode FROM public.trips t WHERE t.id = p_trip_id;
  IF v_settle IS NULL THEN RETURN; END IF;
  IF upper(p_currency) = v_settle THEN
    RETURN QUERY SELECT 1::numeric, p_date, 'same'::text, false, 'same'::text; RETURN;
  END IF;
  IF v_mode = 'fixed' THEN
    SELECT f.rate AS rate, f.set_at::date AS set_at INTO r_c FROM public.trip_fx_rates f WHERE f.trip_id = p_trip_id AND f.currency = upper(p_currency);
    IF FOUND THEN RETURN QUERY SELECT r_c.rate, r_c.set_at, 'trip'::text, false, 'trip'::text; RETURN; END IF;
  END IF;
  SELECT coalesce((value)::text::int, 7) INTO v_back FROM public.system_settings WHERE key = 'fx_max_backfill_days';
  -- EUR → p_currency utolsó jegyzése a napon vagy előtte (manual = állandó paritás, bármely dátum); EUR tételnél 1.
  IF upper(p_currency) = 'EUR' THEN
    SELECT 1::numeric AS rate, p_date AS rate_date, 'ecb'::varchar AS source INTO r_c;
  ELSE
    SELECT e.rate / e.unit AS rate, e.rate_date, e.source INTO r_c
      FROM public.exchange_rates e
     WHERE e.base_currency = 'EUR' AND e.target_currency = upper(p_currency) AND e.rate_date <= p_date
     ORDER BY e.rate_date DESC LIMIT 1;
    IF NOT FOUND THEN RETURN QUERY SELECT NULL::numeric, NULL::date, 'none'::text, false, 'none'::text; RETURN; END IF;
  END IF;
  IF v_settle = 'EUR' THEN
    RETURN QUERY SELECT r_c.rate, r_c.rate_date, r_c.source::text, false,
      CASE WHEN r_c.source = 'manual' THEN 'peg' WHEN r_c.rate_date = p_date THEN 'exact'
           WHEN p_date - r_c.rate_date <= v_back THEN 'backfill' ELSE 'stale' END;
    RETURN;
  END IF;
  -- Keresztárfolyam EUR-on át: 1 S = (EUR→C) / (EUR→S) C
  SELECT e.rate / e.unit AS rate, e.rate_date, e.source INTO r_s
    FROM public.exchange_rates e
   WHERE e.base_currency = 'EUR' AND e.target_currency = v_settle AND e.rate_date <= p_date
   ORDER BY e.rate_date DESC LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT NULL::numeric, NULL::date, 'none'::text, false, 'none'::text; RETURN; END IF;
  -- 10 tizedes: HUF-elszámolásnál 1 HUF = 0,0025 EUR — hat tizedessel 0,016 % hiba lenne egy 1 200 €-s tételen (≈ 78 Ft).
  RETURN QUERY SELECT round(r_c.rate / r_s.rate, 10), LEAST(r_c.rate_date, r_s.rate_date), 'ecb:derived'::text, true,
    CASE WHEN r_c.source = 'manual' AND r_s.source = 'manual' THEN 'peg'
         WHEN LEAST(r_c.rate_date, r_s.rate_date) = p_date THEN 'exact'
         WHEN p_date - LEAST(CASE WHEN r_c.source = 'manual' THEN p_date ELSE r_c.rate_date END,
                             CASE WHEN r_s.source = 'manual' THEN p_date ELSE r_s.rate_date END) <= v_back THEN 'backfill'
         ELSE 'stale' END;
END $$;
COMMENT ON FUNCTION public.fx_resolve_rate(uuid, varchar, date) IS '§14 árfolyam-feloldás egy túra tételéhez; a hívó RLS-e dönt a túra láthatóságáról. NULL rate = átváltás függőben (a mentés megy).';
GRANT EXECUTE ON FUNCTION public.fx_resolve_rate(uuid, varchar, date) TO authenticated, service_role;
