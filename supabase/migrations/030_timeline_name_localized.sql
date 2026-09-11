-- ============================================
-- Migration 030: trip_phases / trip_milestones / trip_tasks — name_localized
-- ============================================
-- Cél: a sablonból létrehozott timeline-elemek neve nyelvfüggően jelenjen meg.
--
-- Eddig: initTimelineFromTemplate a ref_*_templates angol alapnevét (name)
-- másolta a trip_* táblákba, a ref-táblák name_localized ({"hu","en"}) mezője
-- elveszett. Emiatt a szervezői Timeline-nézet magyar felületen is angolul
-- mutatta a fázisokat, mérföldköveket és feladatokat.
--
-- Változás:
--   1. name_localized JSONB DEFAULT '{}' oszlop a három trip_* táblán.
--   2. Backfill: ahol a rekord sablonból jött (template_*_id) ÉS a neve még
--      a sablon alapneve (a szervező nem írta át), a sablon name_localized
--      értékét kapja. Kézzel átnevezett elem érintetlen marad ('{}').
--
-- Szemantika a kódban: megjelenítés = name_localized[locale] || name.
-- Kézi átnevezéskor a kód a name_localized-ot '{}'-re állítja, így az új név
-- minden nyelven érvényes.
--
-- Idempotens: IF NOT EXISTS + a backfill csak üres name_localized-ra fut.
-- ============================================

ALTER TABLE trip_phases     ADD COLUMN IF NOT EXISTS name_localized JSONB DEFAULT '{}';
ALTER TABLE trip_milestones ADD COLUMN IF NOT EXISTS name_localized JSONB DEFAULT '{}';
ALTER TABLE trip_tasks      ADD COLUMN IF NOT EXISTS name_localized JSONB DEFAULT '{}';

-- ── Backfill ────────────────────────────────

UPDATE trip_phases p
SET    name_localized = t.name_localized
FROM   ref_phase_templates t
WHERE  p.template_phase_id = t.id
  AND  p.name = t.name
  AND  COALESCE(p.name_localized, '{}'::jsonb) = '{}'::jsonb
  AND  COALESCE(t.name_localized, '{}'::jsonb) <> '{}'::jsonb;

UPDATE trip_milestones m
SET    name_localized = t.name_localized
FROM   ref_milestone_templates t
WHERE  m.template_milestone_id = t.id
  AND  m.name = t.name
  AND  COALESCE(m.name_localized, '{}'::jsonb) = '{}'::jsonb
  AND  COALESCE(t.name_localized, '{}'::jsonb) <> '{}'::jsonb;

UPDATE trip_tasks k
SET    name_localized = t.name_localized
FROM   ref_task_templates t
WHERE  k.template_task_id = t.id
  AND  k.name = t.name
  AND  COALESCE(k.name_localized, '{}'::jsonb) = '{}'::jsonb
  AND  COALESCE(t.name_localized, '{}'::jsonb) <> '{}'::jsonb;

-- ── Verifikáció (kézi futtatásra) ───────────
-- SELECT count(*) FILTER (WHERE name_localized ? 'hu') AS localized, count(*) FROM trip_phases;
-- SELECT count(*) FILTER (WHERE name_localized ? 'hu') AS localized, count(*) FROM trip_milestones;
-- SELECT count(*) FILTER (WHERE name_localized ? 'hu') AS localized, count(*) FROM trip_tasks;
