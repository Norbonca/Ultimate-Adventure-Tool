-- ============================================
-- Migration 025: Staff Seats (Szervezői helyek)
-- ============================================
-- Cél: a szervező kijelölhessen helyeket a csapaton belül
-- (jelentkezési flow nélkül), beleértve saját magát is
-- pl. Skipper egy 10 fős vitorlástúrán.
--
-- Spec: 00_Rendszerszintu_Funkcionalis_Specifikacio.md §11.8
-- Modul: M02 → FR-M02-007b
-- ============================================

-- 1. trips.staff_seats — szervezői helyek darabszáma
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS staff_seats INTEGER NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_trips_staff_seats'
  ) THEN
    ALTER TABLE trips
      ADD CONSTRAINT chk_trips_staff_seats CHECK (staff_seats >= 0 AND staff_seats <= 50);
  END IF;
END $$;

COMMENT ON COLUMN trips.staff_seats IS
  'Szervezői helyek darabszáma — a szervező közvetlenül jelöli ki, jelentkezés nélkül. Total team = max_participants + staff_seats.';

-- 2. trip_participants.is_staff_seat — szervezői hely-e a rekord
ALTER TABLE trip_participants
  ADD COLUMN IF NOT EXISTS is_staff_seat BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN trip_participants.is_staff_seat IS
  'true = szervezői hely (közvetlenül kijelölt, nincs jelentkezési flow). false = vendég jelentkezés.';

-- Index a gyors szűréshez a Csapat tabon
CREATE INDEX IF NOT EXISTS idx_participants_staff_seats
  ON trip_participants(trip_id) WHERE is_staff_seat = true;

-- 3. Participant count trigger frissítés — szervezői helyek kihagyása
-- A current_participants csak a vendég helyek foglaltságát mutatja
-- (a szervezői helyek külön számolóból jönnek)
CREATE OR REPLACE FUNCTION update_trip_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE trips SET current_participants = (
      SELECT COUNT(*) FROM trip_participants
      WHERE trip_id = NEW.trip_id
        AND is_staff_seat = false
        AND status IN ('approved', 'approved_pending_payment', 'participant')
    ) WHERE id = NEW.trip_id;
  END IF;

  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.trip_id != NEW.trip_id) THEN
    UPDATE trips SET current_participants = (
      SELECT COUNT(*) FROM trip_participants
      WHERE trip_id = OLD.trip_id
        AND is_staff_seat = false
        AND status IN ('approved', 'approved_pending_payment', 'participant')
    ) WHERE id = OLD.trip_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Backfill: a meglévő current_participants érték újraszámolása
-- (egységesen, a már jelen lévő rekordokra)
UPDATE trips t SET current_participants = (
  SELECT COUNT(*) FROM trip_participants p
  WHERE p.trip_id = t.id
    AND p.is_staff_seat = false
    AND p.status IN ('approved', 'approved_pending_payment', 'participant')
);
