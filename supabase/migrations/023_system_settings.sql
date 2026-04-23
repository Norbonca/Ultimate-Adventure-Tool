-- ============================================================
-- 023_system_settings.sql
-- ============================================================
-- Globális rendszerbeállítások (key-value).
-- Első use-case: automatikus jóváhagyási küszöb (max_participants > 15 → auto-approval).
--
-- RLS szabály:
--   - READ: bárki (authenticated + anon) olvashatja → a kliens tudja a küszöböt
--   - WRITE: csak admin_roles táblában jelölt user, vagy service_role
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE system_settings IS 'Global key-value configuration readable by all, writable by admins only';
COMMENT ON COLUMN system_settings.value IS 'JSONB payload — can be scalar or structured';

-- updated_at touch trigger
CREATE OR REPLACE FUNCTION touch_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON system_settings;
CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION touch_system_settings_updated_at();

-- RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_read_all" ON system_settings;
CREATE POLICY "system_settings_read_all"
  ON system_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "system_settings_write_admin" ON system_settings;
CREATE POLICY "system_settings_write_admin"
  ON system_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Seed — a business rule alapértelmezett értékei
-- ============================================================
INSERT INTO system_settings (key, value, description)
VALUES (
  'trip_auto_approval_threshold',
  '15'::jsonb,
  'Ha a trip.max_participants > ezen érték, a require_approval alapértelmezetten false lesz (auto-approval). A szervező a wizardban / edit formon felülírhatja.'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Helper függvény — default require_approval számolás
-- ============================================================
-- Használat:
--   SELECT fn_default_require_approval(12);  -- → true (küszöb alatt)
--   SELECT fn_default_require_approval(20);  -- → false (küszöb felett)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_default_require_approval(max_participants_in INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  threshold INTEGER;
BEGIN
  SELECT (value #>> '{}')::INTEGER
    INTO threshold
    FROM system_settings
    WHERE key = 'trip_auto_approval_threshold';

  -- Fallback ha hiányzik a beállítás
  IF threshold IS NULL THEN
    threshold := 15;
  END IF;

  RETURN max_participants_in <= threshold;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_default_require_approval(INTEGER) IS
  'Visszaadja az alapértelmezett require_approval értéket adott max_participants-re. A system_settings.trip_auto_approval_threshold-ot olvassa.';
