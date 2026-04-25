-- ============================================
-- Migration 026: trip_participants.staff_role_label
-- ============================================
-- Cél: a szervezői helyhez szabadszöveges pozíció címke (pl. "Kapitány", "Skipper", "Túravezető")
-- Csak akkor van érték, ha is_staff_seat = true
-- ============================================

ALTER TABLE trip_participants
  ADD COLUMN IF NOT EXISTS staff_role_label VARCHAR(100);

COMMENT ON COLUMN trip_participants.staff_role_label IS
  'Szabadszöveges szerep cimke szervezői helyhez (pl. Kapitány). Csak ha is_staff_seat = true.';
