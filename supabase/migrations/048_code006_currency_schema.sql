-- ============================================================================
-- Migration 048: CODE-006 — a pénznem-kezelés három sémahibája (rendszerspec §14.11, Norbert 2026-09-13 / „most” 2026-10-30)
-- ============================================================================
-- 1. 🔴 `expenses.amount <= 99999.99` — pénznem-tudatlan plafon (100 000 Ft-os számla elutasítva). Marad a `> 0`.
-- 2. Statikus pénznemlista helyett dinamikus: `profiles.preferred_currency` CHECK → idegen kulcs a
--    `ref_currencies`-re; ugyanez `trips.price_currency`, `expenses.currency`, `exchange_rates.base/target`.
--    Kivezetés = `is_active = false` (HRK), a sor nem törölhető, régi tételek hivatkozhatnak rá.
-- 3. `exchange_rates.rate DECIMAL(10,6)` → `DECIMAL(14,6)` (EUR→IDR 20 404,99 nem fért be; a hat tizedes marad).
--
-- A §14 többi része (fx_mode, trip_fx_rates, pillanatkép-mezők, fx_rate_sources, szinkron) az M03
-- költségelszámolással együtt készül (§14.13) — nem ennek a migrációnak a része.
-- Számozás: 046 = katamarán (PR #35), 047 = SEC-008; az M121 049-től.
-- Idempotens: DROP CONSTRAINT IF EXISTS, feltételes ADD CONSTRAINT, ALTER TYPE újrafuttatható.
-- Élesen ellenőrizve 2026-10-30: minden profil-, túra- és árfolyam-pénznemkód megvan a ref_currencies-ben.
-- ============================================================================

BEGIN;

-- 1. HUF-plafon
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_amount_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_check CHECK (amount > 0);

-- 2. Dinamikus pénznemlista — idegen kulcsok a ref_currencies-re
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_preferred_currency;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_preferred_currency') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_preferred_currency FOREIGN KEY (preferred_currency) REFERENCES public.ref_currencies(code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trips_price_currency') THEN
    ALTER TABLE public.trips
      ADD CONSTRAINT fk_trips_price_currency FOREIGN KEY (price_currency) REFERENCES public.ref_currencies(code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_currency') THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT fk_expenses_currency FOREIGN KEY (currency) REFERENCES public.ref_currencies(code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exchange_rates_base_currency') THEN
    ALTER TABLE public.exchange_rates
      ADD CONSTRAINT fk_exchange_rates_base_currency FOREIGN KEY (base_currency) REFERENCES public.ref_currencies(code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exchange_rates_target_currency') THEN
    ALTER TABLE public.exchange_rates
      ADD CONSTRAINT fk_exchange_rates_target_currency FOREIGN KEY (target_currency) REFERENCES public.ref_currencies(code);
  END IF;
END $$;

-- A megszűnt horvát kuna: inaktív, nem törölt (régi tételek olvashatók maradnak)
UPDATE public.ref_currencies SET is_active = false WHERE code = 'HRK' AND is_active;

-- 3. Árfolyam szélessége
ALTER TABLE public.exchange_rates ALTER COLUMN rate TYPE DECIMAL(14,6);

COMMENT ON COLUMN public.expenses.amount IS 'Összeg a tétel pénznemében; felső korlát nincs (CODE-006, §14.11/1), csak > 0.';
COMMENT ON COLUMN public.exchange_rates.rate IS 'Jegyzés a forrás natív irányában (EUR→X), hat tizedes, DECIMAL(14,6) (§14.5/3).';

COMMIT;
