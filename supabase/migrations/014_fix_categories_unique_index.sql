-- ============================================================================
-- 014 — Fix: categories.status UNIQUE index → normal index
-- ============================================================================
-- Probléma: A 002-es migration UNIQUE indexet tett a status oszlopra,
--           ami csak 1 db 'active' kategóriát engedélyez (8 kellene).
-- Fix:      DROP UNIQUE index, CREATE normal index helyette.
-- ============================================================================

BEGIN;

DROP INDEX IF EXISTS idx_categories_status;
CREATE INDEX idx_categories_status ON categories(status);

COMMIT;
