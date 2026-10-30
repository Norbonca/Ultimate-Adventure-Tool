-- ============================================================================
-- Migration 049: M02 lezárás II. — eltávolítás és check-in állapotai (rendszerspec §11.5.3, D02 lIGgE/aP0QW/o4u2N6)
-- ============================================================================
-- Norbert döntése (2026-10-30): „indulhat a kész terv szerint”.
-- - `removed` résztvevő-státusz: a szervező távolította el a csapatból (a terv „eltávolítva” állapota);
--   különbözik a `cancelled`-től (saját visszavonás) és a `rejected`-től (jelentkezés elutasítva).
--   A számláló-trigger (031) csak approved/approved_pending_payment/participant sorokat számol → a hely felszabadul.
--   Az eltávolított újra jelentkezhet (a kód a `cancelled` mellett a `removed`-et is engedi).
-- - `removed_at`, `removal_message` (a szervező opcionális üzenete, max 1000). A check-in a 002 meglévő
--   `checked_in` + `checked_in_at` oszlopait használja (approved → participant).
-- Idempotens: ADD VALUE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS. Számozás: 047 SEC-008, 048 CODE-006; az M121 050-től.
-- ============================================================================

ALTER TYPE public.participant_status_t ADD VALUE IF NOT EXISTS 'removed';

ALTER TABLE public.trip_participants
  ADD COLUMN IF NOT EXISTS removed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removal_message TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_participants_removal_message_len') THEN
    ALTER TABLE public.trip_participants
      ADD CONSTRAINT chk_participants_removal_message_len CHECK (removal_message IS NULL OR length(removal_message) <= 1000);
  END IF;
END $$;

COMMENT ON COLUMN public.trip_participants.removed_at IS 'A szervező általi eltávolítás időpontja (status = removed).';
COMMENT ON COLUMN public.trip_participants.removal_message IS 'A szervező opcionális üzenete az eltávolításkor (max 1000); a résztvevő a túraoldalon látja.';
