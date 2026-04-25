-- ============================================
-- Migration 027: DELETE policy trip_participants
-- ============================================
-- Hiba: Migration 002 nem hozott létre DELETE policy-t — az S27-ben bevezetett
-- removeStaffSeat() server action emiatt csendben blokkolva volt RLS által.
--
-- Megoldás: két DELETE policy
--   - participants_delete_organizer: a túra szervezője bármelyik résztvevő
--     rekordot törölheti (jellemzően szervezői helyek felszabadítása).
--   - participants_delete_self: a felhasználó saját pending/cancelled rekordját
--     teljesen el is távolíthatja (GDPR / takarítás), de NEM
--     törölhet approved/participant rekordot — azt csak szervező.
--
-- Megjegyzés: a meglévő cancelApplication továbbra is UPDATE-tel státuszt
-- állít cancelled-re (history megőrzés), ez kompatibilis ezzel a két policy-vel.
-- ============================================

DROP POLICY IF EXISTS participants_delete_organizer ON trip_participants;
CREATE POLICY participants_delete_organizer ON trip_participants FOR DELETE
  USING (is_trip_organizer(trip_id));

DROP POLICY IF EXISTS participants_delete_self ON trip_participants;
CREATE POLICY participants_delete_self ON trip_participants FOR DELETE
  USING (
    user_id = auth.uid()
    AND status IN ('pending', 'cancelled')
  );
