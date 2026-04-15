-- ============================================================================
-- Migration 021: M021 Trip Timeline — Szervezési Mérföldkövek
-- ============================================================================
-- Táblák: 4 sablon (ref_*) + 5 trip-specifikus
-- Enum: milestone_status_t
-- RLS: organizer CRUD, participant SELECT, template public read
-- Seed: 3 sablon preset (Minimal, Standard, Full) + fázisok + mérföldkövek + feladatok
-- ============================================================================

-- ═══════════════════════════════════════════════════════════
-- 1. ENUM
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE milestone_status_t AS ENUM ('not_started', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 2. SABLON TÁBLÁK (admin karbantartja)
-- ═══════════════════════════════════════════════════════════

-- Timeline sablon preset-ek
CREATE TABLE IF NOT EXISTS ref_timeline_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  name_localized JSONB DEFAULT '{}',
  description TEXT,
  description_localized JSONB DEFAULT '{}',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  icon VARCHAR(50) DEFAULT 'clipboard-list',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fázis sablonok
CREATE TABLE IF NOT EXISTS ref_phase_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_template_id UUID NOT NULL REFERENCES ref_timeline_templates(id) ON DELETE CASCADE,
  key VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_localized JSONB DEFAULT '{}',
  icon VARCHAR(50) DEFAULT 'circle',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mérföldkő sablonok
CREATE TABLE IF NOT EXISTS ref_milestone_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_template_id UUID NOT NULL REFERENCES ref_phase_templates(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  name_localized JSONB DEFAULT '{}',
  description TEXT,
  description_localized JSONB DEFAULT '{}',
  default_offset_days INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feladat sablonok
CREATE TABLE IF NOT EXISTS ref_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_template_id UUID NOT NULL REFERENCES ref_milestone_templates(id) ON DELETE CASCADE,
  name VARCHAR(300) NOT NULL,
  name_localized JSONB DEFAULT '{}',
  description TEXT,
  description_localized JSONB DEFAULT '{}',
  default_offset_days INTEGER,
  default_duration_days INTEGER DEFAULT 1,
  assignee_type VARCHAR(30) NOT NULL DEFAULT 'organizer',
  default_role VARCHAR(100),
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_blocking BOOLEAN NOT NULL DEFAULT false,
  requires_verification BOOLEAN NOT NULL DEFAULT false,
  task_type VARCHAR(30) NOT NULL DEFAULT 'checklist',
  task_config JSONB DEFAULT '{}',
  icon VARCHAR(50),
  color VARCHAR(7),
  help_text TEXT,
  help_text_localized JSONB DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexek sablon táblákra
CREATE INDEX IF NOT EXISTS idx_phase_templates_timeline ON ref_phase_templates(timeline_template_id);
CREATE INDEX IF NOT EXISTS idx_milestone_templates_phase ON ref_milestone_templates(phase_template_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_milestone ON ref_task_templates(milestone_template_id);

-- ═══════════════════════════════════════════════════════════
-- 3. TRIP-SPECIFIKUS TÁBLÁK
-- ═══════════════════════════════════════════════════════════

-- Trip fázisok
CREATE TABLE IF NOT EXISTS trip_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  template_phase_id UUID REFERENCES ref_phase_templates(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT 'circle',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_phases_trip ON trip_phases(trip_id);

-- Trip mérföldkövek
CREATE TABLE IF NOT EXISTS trip_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES trip_phases(id) ON DELETE CASCADE,
  template_milestone_id UUID REFERENCES ref_milestone_templates(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status milestone_status_t NOT NULL DEFAULT 'not_started',
  due_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_milestones_trip ON trip_milestones(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_milestones_phase ON trip_milestones(phase_id);

-- Mérföldkő felelősök (N:M)
CREATE TABLE IF NOT EXISTS trip_milestone_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES trip_milestones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_milestone_assignee UNIQUE (milestone_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_milestone_assignees_milestone ON trip_milestone_assignees(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_assignees_user ON trip_milestone_assignees(user_id);

-- Trip feladatok
CREATE TABLE IF NOT EXISTS trip_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES trip_milestones(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  template_task_id UUID REFERENCES ref_task_templates(id) ON DELETE SET NULL,
  name VARCHAR(300) NOT NULL,
  description TEXT,
  start_date DATE,
  due_date DATE,
  duration_days INTEGER,
  assignee_type VARCHAR(30) NOT NULL DEFAULT 'organizer',
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_blocking BOOLEAN NOT NULL DEFAULT false,
  requires_verification BOOLEAN NOT NULL DEFAULT false,
  task_type VARCHAR(30) NOT NULL DEFAULT 'checklist',
  task_config JSONB DEFAULT '{}',
  task_result JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_note TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_tasks_milestone ON trip_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_trip_tasks_trip ON trip_tasks(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_tasks_assignee ON trip_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_trip_tasks_status ON trip_tasks(trip_id, status);

-- Feladat felelősök (N:M)
CREATE TABLE IF NOT EXISTS trip_task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES trip_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_task_assignee UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON trip_task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON trip_task_assignees(user_id);

-- ═══════════════════════════════════════════════════════════
-- 4. updated_at TRIGGER
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_ref_timeline_templates_updated
    BEFORE UPDATE ON ref_timeline_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_trip_phases_updated
    BEFORE UPDATE ON trip_phases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_trip_milestones_updated
    BEFORE UPDATE ON trip_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_trip_tasks_updated
    BEFORE UPDATE ON trip_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 5. RLS POLICIES
-- ═══════════════════════════════════════════════════════════

-- ref_* sablonok: mindenki olvashat
ALTER TABLE ref_timeline_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ref_timeline_templates_read ON ref_timeline_templates;
CREATE POLICY ref_timeline_templates_read ON ref_timeline_templates FOR SELECT USING (true);

ALTER TABLE ref_phase_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ref_phase_templates_read ON ref_phase_templates;
CREATE POLICY ref_phase_templates_read ON ref_phase_templates FOR SELECT USING (true);

ALTER TABLE ref_milestone_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ref_milestone_templates_read ON ref_milestone_templates;
CREATE POLICY ref_milestone_templates_read ON ref_milestone_templates FOR SELECT USING (true);

ALTER TABLE ref_task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ref_task_templates_read ON ref_task_templates;
CREATE POLICY ref_task_templates_read ON ref_task_templates FOR SELECT USING (true);

-- trip_phases: szervező CRUD, résztvevők SELECT
ALTER TABLE trip_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trip_phases_select ON trip_phases;
CREATE POLICY trip_phases_select ON trip_phases FOR SELECT USING (
  trip_id IN (
    SELECT id FROM trips WHERE organizer_id = auth.uid()
    UNION
    SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
      AND status IN ('approved', 'approved_pending_payment', 'participant')
  )
);

DROP POLICY IF EXISTS trip_phases_manage ON trip_phases;
CREATE POLICY trip_phases_manage ON trip_phases FOR ALL USING (
  trip_id IN (SELECT id FROM trips WHERE organizer_id = auth.uid())
);

-- trip_milestones: szervező CRUD, résztvevők SELECT
ALTER TABLE trip_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trip_milestones_select ON trip_milestones;
CREATE POLICY trip_milestones_select ON trip_milestones FOR SELECT USING (
  trip_id IN (
    SELECT id FROM trips WHERE organizer_id = auth.uid()
    UNION
    SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
      AND status IN ('approved', 'approved_pending_payment', 'participant')
  )
);

DROP POLICY IF EXISTS trip_milestones_manage ON trip_milestones;
CREATE POLICY trip_milestones_manage ON trip_milestones FOR ALL USING (
  trip_id IN (SELECT id FROM trips WHERE organizer_id = auth.uid())
);

-- trip_milestone_assignees
ALTER TABLE trip_milestone_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS milestone_assignees_select ON trip_milestone_assignees;
CREATE POLICY milestone_assignees_select ON trip_milestone_assignees FOR SELECT USING (
  milestone_id IN (
    SELECT id FROM trip_milestones WHERE trip_id IN (
      SELECT id FROM trips WHERE organizer_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
        AND status IN ('approved', 'approved_pending_payment', 'participant')
    )
  )
);

DROP POLICY IF EXISTS milestone_assignees_manage ON trip_milestone_assignees;
CREATE POLICY milestone_assignees_manage ON trip_milestone_assignees FOR ALL USING (
  milestone_id IN (
    SELECT id FROM trip_milestones WHERE trip_id IN (
      SELECT id FROM trips WHERE organizer_id = auth.uid()
    )
  )
);

-- trip_tasks: szervező CRUD, assignee-k UPDATE
ALTER TABLE trip_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trip_tasks_select ON trip_tasks;
CREATE POLICY trip_tasks_select ON trip_tasks FOR SELECT USING (
  trip_id IN (
    SELECT id FROM trips WHERE organizer_id = auth.uid()
    UNION
    SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
      AND status IN ('approved', 'approved_pending_payment', 'participant')
  )
);

DROP POLICY IF EXISTS trip_tasks_manage ON trip_tasks;
CREATE POLICY trip_tasks_manage ON trip_tasks FOR ALL USING (
  trip_id IN (SELECT id FROM trips WHERE organizer_id = auth.uid())
);

DROP POLICY IF EXISTS trip_tasks_complete ON trip_tasks;
CREATE POLICY trip_tasks_complete ON trip_tasks FOR UPDATE USING (
  assignee_id = auth.uid()
  OR milestone_id IN (
    SELECT milestone_id FROM trip_milestone_assignees WHERE user_id = auth.uid()
  )
) WITH CHECK (
  assignee_id = auth.uid()
  OR milestone_id IN (
    SELECT milestone_id FROM trip_milestone_assignees WHERE user_id = auth.uid()
  )
);

-- trip_task_assignees
ALTER TABLE trip_task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_assignees_select ON trip_task_assignees;
CREATE POLICY task_assignees_select ON trip_task_assignees FOR SELECT USING (
  task_id IN (
    SELECT id FROM trip_tasks WHERE trip_id IN (
      SELECT id FROM trips WHERE organizer_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
        AND status IN ('approved', 'approved_pending_payment', 'participant')
    )
  )
);

DROP POLICY IF EXISTS task_assignees_manage ON trip_task_assignees;
CREATE POLICY task_assignees_manage ON trip_task_assignees FOR ALL USING (
  task_id IN (
    SELECT id FROM trip_tasks WHERE trip_id IN (
      SELECT id FROM trips WHERE organizer_id = auth.uid()
    )
  )
);

-- ═══════════════════════════════════════════════════════════
-- 6. SEED DATA — 3 sablon preset + fázisok + mérföldkövek + feladatok
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  -- Template IDs
  t_minimal UUID;
  t_standard UUID;
  t_full UUID;
  -- Phase IDs (Standard template — a leggyakrabban használt)
  p_ann UUID;
  p_reg UUID;
  p_prep UUID;
  p_adv UUID;
  p_wrap UUID;
  -- Phase IDs (Full template — extra fázisok)
  pf_ann UUID;
  pf_reg UUID;
  pf_prep UUID;
  pf_travel UUID;
  pf_adv UUID;
  pf_extra UUID;
  pf_back UUID;
  pf_wrap UUID;
  -- Phase IDs (Minimal template)
  pm_reg UUID;
  pm_adv UUID;
  pm_wrap UUID;
  -- Milestone IDs (Standard)
  ms_id UUID;
BEGIN
  -- ── Timeline Templates ────────────────────────────────
  INSERT INTO ref_timeline_templates (id, key, name, name_localized, description, description_localized, icon, sort_order)
  VALUES
    (gen_random_uuid(), 'minimal', 'Minimal', '{"hu":"Minimál szervezés","en":"Minimal Planning"}',
     'Basic timeline for simple trips', '{"hu":"Alap timeline egyszerű túrákhoz — regisztráció, túra, lezárás","en":"Basic timeline for simple trips — registration, adventure, wrap-up"}',
     'clipboard-list', 1),
    (gen_random_uuid(), 'standard', 'Standard', '{"hu":"Standard szervezés","en":"Standard Planning"}',
     'Recommended for most trips', '{"hu":"Ajánlott a legtöbb túrához — meghirdetés, regisztráció, előkészület, túra, lezárás","en":"Recommended for most trips — announcement, registration, preparation, adventure, wrap-up"}',
     'clipboard-check', 2),
    (gen_random_uuid(), 'full', 'Full', '{"hu":"Teljes szervezés","en":"Full Planning"}',
     'Complete pipeline for professional organizers', '{"hu":"Teljes szervezési pipeline profi szervezőknek — mind a 8 fázis","en":"Complete pipeline for professional organizers — all 8 phases"}',
     'list-checks', 3)
  RETURNING id INTO t_full; -- last inserted

  SELECT id INTO t_minimal FROM ref_timeline_templates WHERE key = 'minimal';
  SELECT id INTO t_standard FROM ref_timeline_templates WHERE key = 'standard';
  SELECT id INTO t_full FROM ref_timeline_templates WHERE key = 'full';

  -- ══════════════════════════════════════════════════════
  -- MINIMAL TEMPLATE: Registration → Adventure → Wrap-up
  -- ══════════════════════════════════════════════════════

  INSERT INTO ref_phase_templates (id, timeline_template_id, key, name, name_localized, icon, sort_order)
  VALUES
    (gen_random_uuid(), t_minimal, 'registration', 'Registration', '{"hu":"Regisztráció","en":"Registration"}', 'clipboard-list', 1),
    (gen_random_uuid(), t_minimal, 'adventure', 'Adventure', '{"hu":"Túra","en":"Adventure"}', 'compass', 2),
    (gen_random_uuid(), t_minimal, 'wrapup', 'Wrap-up', '{"hu":"Lezárás","en":"Wrap-up"}', 'flag', 3);

  SELECT id INTO pm_reg FROM ref_phase_templates WHERE timeline_template_id = t_minimal AND key = 'registration';
  SELECT id INTO pm_adv FROM ref_phase_templates WHERE timeline_template_id = t_minimal AND key = 'adventure';
  SELECT id INTO pm_wrap FROM ref_phase_templates WHERE timeline_template_id = t_minimal AND key = 'wrapup';

  -- Minimal: Registration milestones
  INSERT INTO ref_milestone_templates (phase_template_id, name, name_localized, default_offset_days, sort_order) VALUES
    (pm_reg, 'Manage Applications', '{"hu":"Jelentkezések kezelése","en":"Manage Applications"}', -30, 1),
    (pm_reg, 'Finalize Crew', '{"hu":"Létszám véglegesítése","en":"Finalize Crew"}', -7, 2);

  -- Minimal: Adventure milestones
  INSERT INTO ref_milestone_templates (phase_template_id, name, name_localized, default_offset_days, sort_order) VALUES
    (pm_adv, 'Trip Start', '{"hu":"Túra indulás","en":"Trip Start"}', 0, 1);

  -- Minimal: Wrap-up milestones
  INSERT INTO ref_milestone_templates (phase_template_id, name, name_localized, default_offset_days, sort_order) VALUES
    (pm_wrap, 'Settle Expenses', '{"hu":"Költségelszámolás","en":"Settle Expenses"}', 3, 1),
    (pm_wrap, 'Collect Feedback', '{"hu":"Visszajelzés gyűjtése","en":"Collect Feedback"}', 5, 2);

  -- Minimal: Basic tasks for milestones
  -- Registration → Manage Applications
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = pm_reg AND sort_order = 1;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Review applications', '{"hu":"Jelentkezések áttekintése","en":"Review applications"}', 'review', 'organizer', true, true, 1),
    (ms_id, 'Send responses', '{"hu":"Visszajelzés küldése","en":"Send responses"}', 'notification', 'organizer', true, false, 2);

  -- Registration → Finalize Crew
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = pm_reg AND sort_order = 2;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Finalize participant list', '{"hu":"Résztvevő lista véglegesítése","en":"Finalize participant list"}', 'checklist', 'organizer', true, true, 1),
    (ms_id, 'Send confirmation to crew', '{"hu":"Visszaigazolás küldése","en":"Send confirmation to crew"}', 'notification', 'organizer', true, false, 2);

  -- Wrap-up → Settle Expenses
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = pm_wrap AND sort_order = 1;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Collect receipts', '{"hu":"Bizonylatok összegyűjtése","en":"Collect receipts"}', 'checklist', 'organizer', true, false, 1),
    (ms_id, 'Calculate balances', '{"hu":"Egyenleg kiszámolása","en":"Calculate balances"}', 'checklist', 'organizer', true, true, 2);

  -- Wrap-up → Collect Feedback
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = pm_wrap AND sort_order = 2;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Send feedback survey', '{"hu":"Feedback kérdőív kiküldése","en":"Send feedback survey"}', 'notification', 'organizer', true, false, 1),
    (ms_id, 'Summarize responses', '{"hu":"Válaszok összesítése","en":"Summarize responses"}', 'checklist', 'organizer', false, false, 2);

  -- ══════════════════════════════════════════════════════
  -- STANDARD TEMPLATE: 5 fázis
  -- ══════════════════════════════════════════════════════

  INSERT INTO ref_phase_templates (id, timeline_template_id, key, name, name_localized, icon, sort_order)
  VALUES
    (gen_random_uuid(), t_standard, 'announcement', 'Announcement', '{"hu":"Meghirdetés","en":"Announcement"}', 'megaphone', 1),
    (gen_random_uuid(), t_standard, 'registration', 'Registration', '{"hu":"Regisztráció","en":"Registration"}', 'clipboard-list', 2),
    (gen_random_uuid(), t_standard, 'preparation', 'Preparation', '{"hu":"Előkészület","en":"Preparation"}', 'package', 3),
    (gen_random_uuid(), t_standard, 'adventure', 'Adventure', '{"hu":"Túra","en":"Adventure"}', 'compass', 4),
    (gen_random_uuid(), t_standard, 'wrapup', 'Wrap-up', '{"hu":"Lezárás","en":"Wrap-up"}', 'flag', 5);

  SELECT id INTO p_ann FROM ref_phase_templates WHERE timeline_template_id = t_standard AND key = 'announcement';
  SELECT id INTO p_reg FROM ref_phase_templates WHERE timeline_template_id = t_standard AND key = 'registration';
  SELECT id INTO p_prep FROM ref_phase_templates WHERE timeline_template_id = t_standard AND key = 'preparation';
  SELECT id INTO p_adv FROM ref_phase_templates WHERE timeline_template_id = t_standard AND key = 'adventure';
  SELECT id INTO p_wrap FROM ref_phase_templates WHERE timeline_template_id = t_standard AND key = 'wrapup';

  -- Standard: Announcement milestones + tasks
  INSERT INTO ref_milestone_templates (id, phase_template_id, name, name_localized, default_offset_days, sort_order)
  VALUES (gen_random_uuid(), p_ann, 'Create Trip Content', '{"hu":"Túra tartalom összeállítása","en":"Create Trip Content"}', -75, 1);
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = p_ann AND sort_order = 1;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, default_offset_days, default_duration_days, sort_order) VALUES
    (ms_id, 'Finalize trip description', '{"hu":"Túra leírás véglegesítése","en":"Finalize trip description"}', 'checklist', 'organizer', true, true, -5, 3, 1),
    (ms_id, 'Upload cover image and gallery', '{"hu":"Borítókép és galéria feltöltése","en":"Upload cover image and gallery"}', 'upload', 'organizer', true, true, -3, 1, 2),
    (ms_id, 'Create route/program outline', '{"hu":"Útvonal/program vázlat készítése","en":"Create route/program outline"}', 'checklist', 'organizer', true, false, -3, 3, 3),
    (ms_id, 'Set pricing and cost sharing', '{"hu":"Árazás és költségmegosztás beállítása","en":"Set pricing and cost sharing"}', 'checklist', 'organizer', true, true, -2, 1, 4);

  INSERT INTO ref_milestone_templates (id, phase_template_id, name, name_localized, default_offset_days, sort_order)
  VALUES (gen_random_uuid(), p_ann, 'Publish & Promote', '{"hu":"Publikálás és promóció","en":"Publish & Promote"}', -60, 2);
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = p_ann AND sort_order = 2;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Publish trip on platform', '{"hu":"Túra publikálása a platformon","en":"Publish trip on platform"}', 'checklist', 'organizer', true, true, 1),
    (ms_id, 'Share on social media', '{"hu":"Megosztás közösségi médiában","en":"Share on social media"}', 'link', 'organizer', false, false, 2),
    (ms_id, 'Notify past participants', '{"hu":"Korábbi résztvevők értesítése","en":"Notify past participants"}', 'notification', 'organizer', false, false, 3);

  -- Standard: Registration milestones + tasks
  INSERT INTO ref_milestone_templates (id, phase_template_id, name, name_localized, default_offset_days, sort_order)
  VALUES (gen_random_uuid(), p_reg, 'Manage Applications', '{"hu":"Jelentkezések kezelése","en":"Manage Applications"}', -45, 1);
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = p_reg AND sort_order = 1;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Review incoming applications', '{"hu":"Beérkezett jelentkezések áttekintése","en":"Review incoming applications"}', 'review', 'organizer', true, true, 1),
    (ms_id, 'Send acceptance/rejection', '{"hu":"Visszajelzés küldése jelentkezőknek","en":"Send acceptance/rejection"}', 'notification', 'organizer', true, false, 2),
    (ms_id, 'Answer questions', '{"hu":"Kérdések megválaszolása","en":"Answer questions"}', 'checklist', 'organizer', false, false, 3);

  INSERT INTO ref_milestone_templates (id, phase_template_id, name, name_localized, default_offset_days, sort_order)
  VALUES (gen_random_uuid(), p_reg, 'Collect Payments', '{"hu":"Fizetések beszedése","en":"Collect Payments"}', -30, 2);
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = p_reg AND sort_order = 2;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Send payment requests', '{"hu":"Fizetési felszólítás kiküldése","en":"Send payment requests"}', 'payment', 'organizer', true, true, 1),
    (ms_id, 'Track incoming payments', '{"hu":"Befizetések nyomon követése","en":"Track incoming payments"}', 'review', 'organizer', true, true, 2),
    (ms_id, 'Send reminders to late payers', '{"hu":"Emlékeztető küldése késedelmeseknek","en":"Send reminders to late payers"}', 'notification', 'organizer', true, false, 3),
    (ms_id, 'Send payment confirmations', '{"hu":"Visszaigazolás küldése a fizetőknek","en":"Send payment confirmations"}', 'notification', 'organizer', true, false, 4);

  INSERT INTO ref_milestone_templates (id, phase_template_id, name, name_localized, default_offset_days, sort_order)
  VALUES (gen_random_uuid(), p_reg, 'Finalize Crew', '{"hu":"Létszám véglegesítése","en":"Finalize Crew"}', -14, 3);
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = p_reg AND sort_order = 3;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Final review of applicants', '{"hu":"Jelentkezők végleges áttekintése","en":"Final review of applicants"}', 'review', 'organizer', true, true, 1),
    (ms_id, 'Finalize participant list', '{"hu":"Résztvevő lista véglegesítése","en":"Finalize participant list"}', 'checklist', 'organizer', true, true, 2),
    (ms_id, 'Send confirmation to everyone', '{"hu":"Visszaigazolás küldése mindenkinek","en":"Send confirmation to everyone"}', 'notification', 'organizer', true, false, 3);

  -- Standard: Preparation milestones + tasks
  INSERT INTO ref_milestone_templates (id, phase_template_id, name, name_localized, default_offset_days, sort_order)
  VALUES (gen_random_uuid(), p_prep, 'Book Accommodation', '{"hu":"Szállás foglalása","en":"Book Accommodation"}', -30, 1);
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = p_prep AND sort_order = 1;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Research options', '{"hu":"Szállásopciók felkutatása","en":"Research options"}', 'checklist', 'organizer', true, false, 1),
    (ms_id, 'Make reservation', '{"hu":"Foglalás leadása","en":"Make reservation"}', 'checklist', 'organizer', true, true, 2),
    (ms_id, 'Upload booking confirmation', '{"hu":"Foglalás visszaigazolás feltöltése","en":"Upload booking confirmation"}', 'upload', 'organizer', true, true, 3);

  INSERT INTO ref_milestone_templates (id, phase_template_id, name, name_localized, default_offset_days, sort_order)
  VALUES (gen_random_uuid(), p_prep, 'Organize Transport', '{"hu":"Közlekedés szervezése","en":"Organize Transport"}', -21, 2);
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = p_prep AND sort_order = 2;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Coordinate travel modes', '{"hu":"Utazási mód egyeztetése","en":"Coordinate travel modes"}', 'form', 'everyone', true, false, 1),
    (ms_id, 'Book tickets/rental', '{"hu":"Jegyek/bérlés foglalás","en":"Book tickets/rental"}', 'checklist', 'organizer', true, true, 2),
    (ms_id, 'Inform participants', '{"hu":"Résztvevők tájékoztatása","en":"Inform participants"}', 'notification', 'organizer', true, false, 3);

  INSERT INTO ref_milestone_templates (id, phase_template_id, name, name_localized, default_offset_days, sort_order)
  VALUES (gen_random_uuid(), p_prep, 'Safety Briefing', '{"hu":"Biztonsági briefing","en":"Safety Briefing"}', -5, 3);
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = p_prep AND sort_order = 3;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Prepare briefing materials', '{"hu":"Briefing anyag összeállítása","en":"Prepare briefing materials"}', 'checklist', 'organizer', true, false, 1),
    (ms_id, 'Send emergency plan', '{"hu":"Vészhelyzeti terv kommunikálása","en":"Send emergency plan"}', 'notification', 'organizer', true, true, 2),
    (ms_id, 'Participants acknowledge safety rules', '{"hu":"Résztvevők biztonsági szabályok elfogadása","en":"Participants acknowledge safety rules"}', 'confirm', 'everyone', true, true, 3);

  -- Standard: Adventure milestones
  INSERT INTO ref_milestone_templates (id, phase_template_id, name, name_localized, default_offset_days, sort_order)
  VALUES (gen_random_uuid(), p_adv, 'Meeting Point', '{"hu":"Találkozó","en":"Meeting Point"}', 0, 1);
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = p_adv AND sort_order = 1;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Headcount check', '{"hu":"Létszámellenőrzés","en":"Headcount check"}', 'checklist', 'organizer', true, true, 1),
    (ms_id, 'Equipment check', '{"hu":"Felszerelés ellenőrzés","en":"Equipment check"}', 'checklist', 'organizer', true, false, 2),
    (ms_id, 'Route briefing', '{"hu":"Útvonal briefing","en":"Route briefing"}', 'checklist', 'organizer', true, false, 3);

  -- Standard: Wrap-up milestones
  INSERT INTO ref_milestone_templates (id, phase_template_id, name, name_localized, default_offset_days, sort_order)
  VALUES (gen_random_uuid(), p_wrap, 'Settle Expenses', '{"hu":"Költségelszámolás","en":"Settle Expenses"}', 3, 1);
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = p_wrap AND sort_order = 1;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Collect all receipts', '{"hu":"Bizonylatok összegyűjtése","en":"Collect all receipts"}', 'checklist', 'organizer', true, false, 1),
    (ms_id, 'Calculate balances', '{"hu":"Egyenleg kiszámolása","en":"Calculate balances"}', 'checklist', 'organizer', true, true, 2),
    (ms_id, 'Send settlement requests', '{"hu":"Elszámolási felszólítás küldése","en":"Send settlement requests"}', 'notification', 'organizer', true, false, 3);

  INSERT INTO ref_milestone_templates (id, phase_template_id, name, name_localized, default_offset_days, sort_order)
  VALUES (gen_random_uuid(), p_wrap, 'Collect Feedback', '{"hu":"Visszajelzés gyűjtése","en":"Collect Feedback"}', 7, 2);
  SELECT id INTO ms_id FROM ref_milestone_templates WHERE phase_template_id = p_wrap AND sort_order = 2;
  INSERT INTO ref_task_templates (milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order) VALUES
    (ms_id, 'Send feedback survey', '{"hu":"Feedback kérdőív kiküldése","en":"Send feedback survey"}', 'notification', 'organizer', true, false, 1),
    (ms_id, 'Summarize responses', '{"hu":"Válaszok összesítése","en":"Summarize responses"}', 'checklist', 'organizer', false, false, 2),
    (ms_id, 'Create shared photo album', '{"hu":"Megosztott fotóalbum létrehozása","en":"Create shared photo album"}', 'link', 'organizer', false, false, 3);

  -- ══════════════════════════════════════════════════════
  -- FULL TEMPLATE: 8 fázis (minimális milestone/task-kal, admin bővíti)
  -- ══════════════════════════════════════════════════════

  INSERT INTO ref_phase_templates (id, timeline_template_id, key, name, name_localized, icon, sort_order)
  VALUES
    (gen_random_uuid(), t_full, 'announcement', 'Announcement', '{"hu":"Meghirdetés","en":"Announcement"}', 'megaphone', 1),
    (gen_random_uuid(), t_full, 'registration', 'Registration', '{"hu":"Regisztráció","en":"Registration"}', 'clipboard-list', 2),
    (gen_random_uuid(), t_full, 'preparation', 'Preparation', '{"hu":"Előkészület","en":"Preparation"}', 'package', 3),
    (gen_random_uuid(), t_full, 'travel_there', 'Travel There', '{"hu":"Odautazás","en":"Travel There"}', 'plane', 4),
    (gen_random_uuid(), t_full, 'adventure', 'Adventure', '{"hu":"Túra","en":"Adventure"}', 'compass', 5),
    (gen_random_uuid(), t_full, 'extra_programs', 'Extra Programs', '{"hu":"Kiegészítő programok","en":"Extra Programs"}', 'sparkles', 6),
    (gen_random_uuid(), t_full, 'travel_back', 'Travel Back', '{"hu":"Visszautazás","en":"Travel Back"}', 'home', 7),
    (gen_random_uuid(), t_full, 'wrapup', 'Wrap-up', '{"hu":"Lezárás","en":"Wrap-up"}', 'flag', 8);

  -- Full template: 1 milestone per phase (admin bővíti a részleteket)
  SELECT id INTO pf_ann FROM ref_phase_templates WHERE timeline_template_id = t_full AND key = 'announcement';
  SELECT id INTO pf_reg FROM ref_phase_templates WHERE timeline_template_id = t_full AND key = 'registration';
  SELECT id INTO pf_prep FROM ref_phase_templates WHERE timeline_template_id = t_full AND key = 'preparation';
  SELECT id INTO pf_travel FROM ref_phase_templates WHERE timeline_template_id = t_full AND key = 'travel_there';
  SELECT id INTO pf_adv FROM ref_phase_templates WHERE timeline_template_id = t_full AND key = 'adventure';
  SELECT id INTO pf_extra FROM ref_phase_templates WHERE timeline_template_id = t_full AND key = 'extra_programs';
  SELECT id INTO pf_back FROM ref_phase_templates WHERE timeline_template_id = t_full AND key = 'travel_back';
  SELECT id INTO pf_wrap FROM ref_phase_templates WHERE timeline_template_id = t_full AND key = 'wrapup';

  INSERT INTO ref_milestone_templates (phase_template_id, name, name_localized, default_offset_days, sort_order) VALUES
    (pf_ann, 'Create Trip Content', '{"hu":"Túra tartalom összeállítása","en":"Create Trip Content"}', -75, 1),
    (pf_ann, 'Publish & Promote', '{"hu":"Publikálás és promóció","en":"Publish & Promote"}', -60, 2),
    (pf_reg, 'Manage Applications', '{"hu":"Jelentkezések kezelése","en":"Manage Applications"}', -45, 1),
    (pf_reg, 'Collect Payments', '{"hu":"Fizetések beszedése","en":"Collect Payments"}', -30, 2),
    (pf_reg, 'Finalize Crew', '{"hu":"Létszám véglegesítése","en":"Finalize Crew"}', -14, 3),
    (pf_prep, 'Book Accommodation', '{"hu":"Szállás foglalása","en":"Book Accommodation"}', -30, 1),
    (pf_prep, 'Organize Transport', '{"hu":"Közlekedés szervezése","en":"Organize Transport"}', -21, 2),
    (pf_prep, 'Equipment Check', '{"hu":"Felszerelés ellenőrzés","en":"Equipment Check"}', -14, 3),
    (pf_prep, 'Permits & Insurance', '{"hu":"Engedélyek és biztosítás","en":"Permits & Insurance"}', -21, 4),
    (pf_prep, 'Safety Briefing', '{"hu":"Biztonsági briefing","en":"Safety Briefing"}', -5, 5),
    (pf_travel, 'Meeting Point', '{"hu":"Találkozópont","en":"Meeting Point"}', 0, 1),
    (pf_travel, 'Transfer to Location', '{"hu":"Transzfer a helyszínre","en":"Transfer to Location"}', 0, 2),
    (pf_adv, 'Day 1 — Departure', '{"hu":"1. nap — Indulás","en":"Day 1 — Departure"}', 0, 1),
    (pf_extra, 'Optional Programs', '{"hu":"Opcionális programok","en":"Optional Programs"}', 0, 1),
    (pf_back, 'Return Transfer', '{"hu":"Visszautazás szervezése","en":"Return Transfer"}', 0, 1),
    (pf_wrap, 'Settle Expenses', '{"hu":"Költségelszámolás","en":"Settle Expenses"}', 3, 1),
    (pf_wrap, 'Collect Feedback', '{"hu":"Visszajelzés gyűjtése","en":"Collect Feedback"}', 7, 2),
    (pf_wrap, 'Share Photos & Memories', '{"hu":"Fotók/emlékek megosztása","en":"Share Photos & Memories"}', 10, 3);

END $$;
