-- ============================================================================
-- 019: admin_roles — Admin jogosultságkezelés
-- ============================================================================
-- Célja: Admin felhasználók nyilvántartása (ki kap admin hozzáférést a panelhez)
-- Az ADMIN_EMAIL env var mellé DB-alapú admin kezelés.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS admin_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        VARCHAR(50) NOT NULL DEFAULT 'operations_admin',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  granted_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_admin_role_user UNIQUE (user_id),
  CONSTRAINT chk_admin_role CHECK (
    role IN ('super_admin', 'operations_admin', 'content_moderator', 'support_agent', 'finance_admin')
  )
);

COMMENT ON TABLE admin_roles IS 'M15: Admin panel access control — who has admin privileges';
COMMENT ON COLUMN admin_roles.role IS 'super_admin / operations_admin / content_moderator / support_agent / finance_admin';

CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON admin_roles(is_active) WHERE is_active = true;

-- updated_at automatikus frissítése
CREATE OR REPLACE TRIGGER set_updated_at_admin_roles
  BEFORE UPDATE ON admin_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: csak service_role módosíthat, autentikált user olvashatja saját sorát
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_roles_self_read ON admin_roles
  FOR SELECT USING (auth.uid() = user_id);

-- admin_audit_log — ha még nem létezik
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_role      VARCHAR(50),
  action          VARCHAR(100) NOT NULL,
  target_type     VARCHAR(50),
  target_id       UUID,
  details         JSONB,
  result          VARCHAR(20) NOT NULL DEFAULT 'success',
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_audit_result CHECK (result IN ('success', 'failure', 'partial'))
);

COMMENT ON TABLE admin_audit_log IS 'M15: Admin audit trail — minden admin műveletet naplóz';

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON admin_audit_log(target_type, target_id);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Csak service_role írhat/olvashat (explicit policy nélkül = service_role only)

COMMIT;
