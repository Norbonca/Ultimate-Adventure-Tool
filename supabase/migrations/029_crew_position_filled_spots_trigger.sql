-- ============================================
-- Migration 029: trip_crew_positions.filled_spots automatikus frissítés
-- ============================================
-- Cél: a trip_participants tábla INSERT/UPDATE/DELETE műveletei automatikusan
-- újraszámolják a kapcsolódó trip_crew_positions.filled_spots értékét.
--
-- Eddig: assignStaffSeat / removeStaffSeat / inviteStaffByEmail / applyToTrip
-- nem érintette a filled_spots-ot — kézzel kellett volna frissíteni minden
-- helyen, de sehol nem volt frissítve. A public Crew Card progress bar
-- emiatt mindig 0%-ot mutatott volna.
--
-- Logika: egy crew_position akkor "betöltött", ha legalább 1 trip_participants
-- rekord referál rá ÉS:
--   - is_staff_seat = true (közvetlen szervezői kijelölés), VAGY
--   - status IN ('approved', 'approved_pending_payment', 'participant')
--     (jóváhagyott vagy aktív vendég jelentkező)
--
-- Forrás: S29 átvételi pont 3/4 — modul M02
-- ============================================

-- 1. Helper függvény — egy konkrét pozíció filled_spots-ját újraszámolja
CREATE OR REPLACE FUNCTION recount_crew_position_filled_spots(p_position_id UUID)
RETURNS VOID AS $$
BEGIN
  IF p_position_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE trip_crew_positions SET filled_spots = (
    SELECT COUNT(*) FROM trip_participants
    WHERE crew_position_id = p_position_id
      AND (
        is_staff_seat = true
        OR status IN ('approved', 'approved_pending_payment', 'participant')
      )
  )
  WHERE id = p_position_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recount_crew_position_filled_spots IS
  'M02 (S29): trip_crew_positions.filled_spots újraszámolása egy adott pozícióra.';

-- 2. Trigger függvény — INSERT/UPDATE/DELETE eseményekre
CREATE OR REPLACE FUNCTION update_crew_position_filled_spots()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recount_crew_position_filled_spots(NEW.crew_position_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM recount_crew_position_filled_spots(OLD.crew_position_id);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Ha a crew_position_id, a status, vagy az is_staff_seat változott,
    -- mindkét pozíciót (régi és új) újra kell számolni.
    IF OLD.crew_position_id IS DISTINCT FROM NEW.crew_position_id
       OR OLD.status IS DISTINCT FROM NEW.status
       OR OLD.is_staff_seat IS DISTINCT FROM NEW.is_staff_seat THEN
      PERFORM recount_crew_position_filled_spots(OLD.crew_position_id);
      IF NEW.crew_position_id IS DISTINCT FROM OLD.crew_position_id THEN
        PERFORM recount_crew_position_filled_spots(NEW.crew_position_id);
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger telepítése (idempotens)
DROP TRIGGER IF EXISTS trg_crew_position_filled_count ON trip_participants;

CREATE TRIGGER trg_crew_position_filled_count
  AFTER INSERT OR UPDATE OR DELETE ON trip_participants
  FOR EACH ROW EXECUTE FUNCTION update_crew_position_filled_spots();

-- 4. Backfill: minden meglévő pozíció filled_spots értékének újraszámolása
UPDATE trip_crew_positions p SET filled_spots = (
  SELECT COUNT(*) FROM trip_participants tp
  WHERE tp.crew_position_id = p.id
    AND (
      tp.is_staff_seat = true
      OR tp.status IN ('approved', 'approved_pending_payment', 'participant')
    )
);
