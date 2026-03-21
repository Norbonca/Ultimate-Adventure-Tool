-- Part 3/4: M03 Expense Sharing
-- ============================================
-- Expense Sharing - Database Schema
-- ============================================
-- Modul: M03 - Expense Sharing
-- Database: PostgreSQL 16+ (Supabase)
-- Encoding: UTF-8
-- Verzió: 1.0.0
-- Dátum: 2026-02-17
-- ============================================

BEGIN;

-- ============================================
-- ENUM TÍPUSOK
-- ============================================

-- Expense kategóriák (6 kategória)
CREATE TYPE expense_category_t AS ENUM (
  'food_drinks',        -- Food & Drinks (#D97706, utensils)
  'accommodation',      -- Accommodation (#DC2626, bed-double)
  'transport_fuel',     -- Transport & Fuel (#0D9488, car)
  'activities',         -- Activities (#8B5CF6, ticket)
  'gear_equipment',     -- Gear & Equipment (#DC2626, backpack)
  'marina_berth'        -- Marina/Berth (#3B82F6, anchor)
);

-- Split típusok
CREATE TYPE split_type_t AS ENUM (
  'equal',              -- Egyenlő elosztás (default)
  'custom',             -- Egyéni összegek
  'percentage'          -- Százalékos elosztás
);

-- Expense státusz
CREATE TYPE expense_status_t AS ENUM (
  'active',             -- Aktív költség
  'deleted'             -- Soft-deleted (24h-n belül visszavonható)
);

-- Settlement fizetési mód
CREATE TYPE settlement_method_t AS ENUM (
  'stripe',             -- Stripe online fizetés (ajánlott)
  'cash',               -- Készpénz (mindkét fél megerősítése szükséges)
  'bank_transfer'       -- Banki átutalás (kézi jelölés + megerősítés)
);

-- Settlement státusz
CREATE TYPE settlement_status_t AS ENUM (
  'pending',            -- Függőben
  'completed',          -- Teljesítve
  'failed',             -- Sikertelen (pl. Stripe hiba)
  'disputed'            -- Vitatott (30 nap unconfirmed → auto)
);

-- ============================================
-- TÁBLÁK
-- ============================================

-- ----------------------------------------
-- 1. expenses - Költségbejegyzések
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id             UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  payer_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Összeg adatok
  amount              DECIMAL(10,2) NOT NULL CHECK (amount > 0 AND amount <= 99999.99),
  currency            VARCHAR(3) NOT NULL DEFAULT 'EUR',
  amount_in_primary   DECIMAL(10,2),                    -- Átváltva trip elsődleges pénznemre
  exchange_rate       DECIMAL(10,6),                     -- Használt árfolyam (6 tizedes)

  -- Kategorizálás
  category            expense_category_t NOT NULL,
  description         VARCHAR(500),                      -- XSS sanitized

  -- Bizonylat
  receipt_url         TEXT,                               -- M08 média URL
  receipt_thumbnail_url TEXT,                             -- Thumbnail URL

  -- Dátum és típus
  date                DATE NOT NULL DEFAULT CURRENT_DATE,
  split_type          split_type_t NOT NULL DEFAULT 'equal',

  -- Státusz
  status              expense_status_t NOT NULL DEFAULT 'active',
  deleted_at          TIMESTAMPTZ,                       -- Soft delete timestamp

  -- Offline sync (A-kategória — Full Offline)
  local_id            UUID,                              -- Kliens-generált (idempotency key)
  sync_status         sync_status_t NOT NULL DEFAULT 'synced',
  local_updated_at    TIMESTAMPTZ,                       -- Utolsó lokális módosítás
  device_id           VARCHAR(64),                       -- Melyik eszköz módosította
  sync_version        INTEGER NOT NULL DEFAULT 1,        -- Optimistic locking

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE expenses IS 'M03: Túraköltségek rögzítése, offline-first append-only';
COMMENT ON COLUMN expenses.amount_in_primary IS 'Átváltva a trip elsődleges pénznemére';
COMMENT ON COLUMN expenses.exchange_rate IS 'A rögzítéskori ECB/Fixer.io árfolyam';
COMMENT ON COLUMN expenses.local_id IS 'Kliens-generált UUID az offline idempotency-hez';

-- ----------------------------------------
-- 2. expense_splits - Elosztás részletei
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS expense_splits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id          UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Elosztási adatok
  amount              DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  percentage          DECIMAL(5,2) CHECK (percentage >= 0 AND percentage <= 100),

  -- Settlement tracking
  is_settled          BOOLEAN NOT NULL DEFAULT false,
  settled_at          TIMESTAMPTZ,

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Egy user csak egyszer szerepelhet egy expense-ben
  UNIQUE (expense_id, user_id)
);

COMMENT ON TABLE expense_splits IS 'M03: Költségelosztás részletei felhasználónként';
COMMENT ON COLUMN expense_splits.percentage IS 'Percentage split esetén: 0-100, egyébként NULL';

-- ----------------------------------------
-- 3. expense_balances - Denormalizált egyenlegek
-- ----------------------------------------
-- Materialized/denormalizált tábla a gyors egyenleg-lekérdezéshez.
-- Background job (Inngest) frissíti minden expense CRUD után.
CREATE TABLE IF NOT EXISTS expense_balances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id             UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Egyenleg adatok
  total_paid          DECIMAL(10,2) NOT NULL DEFAULT 0,  -- Összesen fizetett
  total_owed          DECIMAL(10,2) NOT NULL DEFAULT 0,  -- Összesen tartozik
  balance             DECIMAL(10,2) NOT NULL DEFAULT 0,  -- paid - owed (>0: receives, <0: owes)
  currency            VARCHAR(3) NOT NULL DEFAULT 'EUR', -- Trip elsődleges pénzneme

  -- Számítás időbélyeg
  last_calculated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Egy user csak egyszer szerepelhet trip-enként
  UNIQUE (trip_id, user_id)
);

COMMENT ON TABLE expense_balances IS 'M03: Denormalizált egyenlegek (Inngest recalc)';
COMMENT ON COLUMN expense_balances.balance IS 'Pozitív: kap pénzt, Negatív: tartozik';

-- ----------------------------------------
-- 4. settlements - Elszámolások
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS settlements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id             UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  payer_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  receiver_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Összeg
  amount              DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency            VARCHAR(3) NOT NULL DEFAULT 'EUR',

  -- Fizetési mód és státusz
  method              settlement_method_t NOT NULL,
  status              settlement_status_t NOT NULL DEFAULT 'pending',

  -- Stripe integráció
  stripe_payment_id   VARCHAR(100),                      -- Stripe Payment Intent ID

  -- Cash/Bank Transfer megerősítés
  confirmed_by_payer  BOOLEAN NOT NULL DEFAULT false,    -- Fizető megerősítette
  confirmed_by_payee  BOOLEAN NOT NULL DEFAULT false,    -- Kedvezményezett megerősítette

  -- Megjegyzések
  notes               TEXT,

  -- Timestamps
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validáció
  CHECK (payer_id != receiver_id)
);

COMMENT ON TABLE settlements IS 'M03: Tartozások rendezése (Stripe, cash, bank transfer)';
COMMENT ON COLUMN settlements.confirmed_by_payer IS 'Cash/Bank Transfer: fizető megerősítette';
COMMENT ON COLUMN settlements.confirmed_by_payee IS 'Cash/Bank Transfer: kedvezményezett megerősítette';

-- ----------------------------------------
-- 5. exchange_rates - Árfolyam cache
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS exchange_rates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency       VARCHAR(3) NOT NULL DEFAULT 'EUR',
  target_currency     VARCHAR(3) NOT NULL,
  rate                DECIMAL(10,6) NOT NULL,            -- 6 tizedes pontosság
  source              VARCHAR(20) NOT NULL DEFAULT 'ecb', -- ecb / fixer
  rate_date           DATE NOT NULL,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (base_currency, target_currency, rate_date)
);

COMMENT ON TABLE exchange_rates IS 'M03: Napi árfolyamok cache-elése (ECB/Fixer.io)';

-- ============================================
-- INDEXEK
-- ============================================

-- expenses
CREATE INDEX idx_expenses_trip ON expenses(trip_id);
CREATE INDEX idx_expenses_payer ON expenses(payer_id);
CREATE INDEX idx_expenses_trip_date ON expenses(trip_id, date DESC);
CREATE INDEX idx_expenses_trip_category ON expenses(trip_id, category);
CREATE INDEX idx_expenses_sync ON expenses(sync_status) WHERE sync_status != 'synced';
CREATE INDEX idx_expenses_not_deleted ON expenses(trip_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_local_id ON expenses(local_id) WHERE local_id IS NOT NULL;

-- expense_splits
CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_expense_splits_unsettled ON expense_splits(expense_id) WHERE is_settled = false;

-- expense_balances
CREATE INDEX idx_balances_trip ON expense_balances(trip_id);
CREATE INDEX idx_balances_user ON expense_balances(user_id);

-- settlements
CREATE INDEX idx_settlements_trip ON settlements(trip_id);
CREATE INDEX idx_settlements_payer ON settlements(payer_id);
CREATE INDEX idx_settlements_receiver ON settlements(receiver_id);
CREATE INDEX idx_settlements_status ON settlements(trip_id, status);
CREATE INDEX idx_settlements_pending ON settlements(created_at) WHERE status = 'pending';

-- exchange_rates
CREATE INDEX idx_exchange_rates_date ON exchange_rates(rate_date DESC);
CREATE INDEX idx_exchange_rates_pair ON exchange_rates(base_currency, target_currency, rate_date DESC);

-- ============================================
-- TRIGGEREK
-- ============================================

CREATE TRIGGER set_updated_at_expenses
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_settlements
  BEFORE UPDATE ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Soft delete: deleted_at beállítása status='deleted' esetén
CREATE OR REPLACE FUNCTION set_expense_deleted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'deleted' AND OLD.status = 'active' THEN
    NEW.deleted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expense_soft_delete
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  WHEN (NEW.status = 'deleted')
  EXECUTE FUNCTION set_expense_deleted_at();

-- Settlement auto-complete: ha mindkét fél megerősítette (cash/bank_transfer)
CREATE OR REPLACE FUNCTION check_settlement_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.method IN ('cash', 'bank_transfer')
     AND NEW.confirmed_by_payer = true
     AND NEW.confirmed_by_payee = true
     AND NEW.status = 'pending' THEN
    NEW.status = 'completed';
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_settlement_auto_complete
  BEFORE UPDATE ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION check_settlement_confirmation();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- expenses: Trip résztvevők + szervező olvashat
CREATE POLICY "expenses_select_participant"
  ON expenses FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_participants
      WHERE user_id = auth.uid()
      AND status IN ('approved', 'participant')
    )
    OR trip_id IN (
      SELECT id FROM trips WHERE organizer_id = auth.uid()
    )
  );

-- expenses: Trip résztvevők + szervező hozhat létre
CREATE POLICY "expenses_insert_participant"
  ON expenses FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trip_participants
      WHERE user_id = auth.uid()
      AND status IN ('approved', 'participant')
    )
    OR trip_id IN (
      SELECT id FROM trips WHERE organizer_id = auth.uid()
    )
  );

-- expenses: Létrehozó vagy szervező szerkeszthet
CREATE POLICY "expenses_update_creator_organizer"
  ON expenses FOR UPDATE
  USING (
    payer_id = auth.uid()
    OR trip_id IN (
      SELECT id FROM trips WHERE organizer_id = auth.uid()
    )
  );

-- expense_splits: Trip résztvevők olvashatják
CREATE POLICY "expense_splits_select_participant"
  ON expense_splits FOR SELECT
  USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      WHERE e.trip_id IN (
        SELECT trip_id FROM trip_participants
        WHERE user_id = auth.uid()
        AND status IN ('approved', 'participant')
      )
    )
  );

-- expense_balances: Trip résztvevők + szervező
CREATE POLICY "expense_balances_select_participant"
  ON expense_balances FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_participants
      WHERE user_id = auth.uid()
      AND status IN ('approved', 'participant')
    )
    OR trip_id IN (
      SELECT id FROM trips WHERE organizer_id = auth.uid()
    )
  );

-- settlements: Érintett felek + szervező
CREATE POLICY "settlements_select_party"
  ON settlements FOR SELECT
  USING (
    payer_id = auth.uid()
    OR receiver_id = auth.uid()
    OR trip_id IN (
      SELECT id FROM trips WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "settlements_insert_payer"
  ON settlements FOR INSERT
  WITH CHECK (payer_id = auth.uid());

CREATE POLICY "settlements_update_party"
  ON settlements FOR UPDATE
  USING (
    payer_id = auth.uid()
    OR receiver_id = auth.uid()
  );

-- exchange_rates: Mindenki olvashatja (publikus adat)
CREATE POLICY "exchange_rates_select_all"
  ON exchange_rates FOR SELECT
  USING (true);

-- ============================================
-- SAMPLE DATA (Development Only)
-- ============================================

-- Exchange rates (ECB 2026-02-17 example)
INSERT INTO exchange_rates (base_currency, target_currency, rate, source, rate_date) VALUES
  ('EUR', 'HRK', 7.5345, 'ecb', '2026-02-17'),
  ('EUR', 'CZK', 25.2340, 'ecb', '2026-02-17'),
  ('EUR', 'HUF', 398.5000, 'ecb', '2026-02-17'),
  ('EUR', 'RON', 4.9750, 'ecb', '2026-02-17'),
  ('EUR', 'PLN', 4.3210, 'ecb', '2026-02-17')
ON CONFLICT (base_currency, target_currency, rate_date) DO NOTHING;

COMMIT;
