-- ============================================================================
-- 008 — M00 Category Reference Database
-- ============================================================================
-- Modul:       M00 Reference Data (Category-Specific)
-- Database:    Supabase PostgreSQL 16+
-- Encoding:    UTF-8
-- Dátum:       2026-03-21
-- Forrás:      modules/00_Reference_Data/02_Category_Reference_Database_Design.md
-- ============================================================================
-- Tartalom:
--   1. ref_category_parameters     — Wizard Step 3 dynamic form fields
--   2. ref_parameter_options       — Select/multiselect value lists
--   3. ref_parameter_dependencies  — Conditional field visibility rules
--   4. ref_equipment_categories    — Equipment type groupings
--   5. ref_equipment               — Master equipment catalog
--   6. ref_subdiscipline_equipment — Sub-discipline ↔ equipment junction
--   7. ref_certifications          — Certifications & licenses
--   8. ref_grading_systems         — Sport-specific grading systems
--   9. ref_grading_levels          — Grade values per system
--  10. ref_safety_requirements     — Safety requirements per difficulty
-- ============================================================================
-- Megjegyzés: A seed data külön migrációban kerül betöltésre (009_seed_*.sql)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ref_category_parameters — Kategória-specifikus paraméter definíciók
-- ============================================================================
-- Egy sor = egy mező a Wizard Step 3 űrlapon.
-- Hajtja: Wizard Step 3, Trip Detail page, Discover filters, AI Trip Planner

CREATE TABLE ref_category_parameters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,

  -- Azonosítás
  parameter_key     VARCHAR(50) NOT NULL,

  -- Megjelenítés
  label             VARCHAR(100) NOT NULL,
  label_localized   JSONB NOT NULL DEFAULT '{}',
  description       TEXT,
  description_localized JSONB,
  placeholder       VARCHAR(200),
  placeholder_localized JSONB,
  icon_name         VARCHAR(50),

  -- Típus & validáció
  field_type        VARCHAR(20) NOT NULL,
  unit              VARCHAR(20),
  is_required       BOOLEAN NOT NULL DEFAULT false,
  default_value     JSONB,
  validation        JSONB,

  -- Csoportosítás & rendezés
  group_key         VARCHAR(50),
  group_label       VARCHAR(100),
  group_label_localized JSONB,
  display_order     INTEGER NOT NULL DEFAULT 0,

  -- Szűrés relevancia
  is_filterable     BOOLEAN NOT NULL DEFAULT false,
  is_searchable     BOOLEAN NOT NULL DEFAULT false,
  show_on_card      BOOLEAN NOT NULL DEFAULT false,
  show_on_detail    BOOLEAN NOT NULL DEFAULT true,

  -- Alkategória specifikus
  sub_discipline_id UUID REFERENCES sub_disciplines(id) ON DELETE SET NULL,

  -- Lifecycle
  status            category_status_t NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_category_param UNIQUE (category_id, parameter_key, sub_discipline_id),
  CONSTRAINT chk_field_type CHECK (
    field_type IN ('text', 'number', 'boolean', 'select', 'multiselect', 'range', 'date', 'textarea')
  )
);

COMMENT ON TABLE ref_category_parameters IS 'M00: Dynamic form field definitions for Wizard Step 3, per category/sub-discipline';
COMMENT ON COLUMN ref_category_parameters.parameter_key IS 'Unique key within category, maps to trips.category_details JSONB keys';
COMMENT ON COLUMN ref_category_parameters.sub_discipline_id IS 'NULL = applies to all sub-disciplines in category';
COMMENT ON COLUMN ref_category_parameters.validation IS 'JSON: {"min":0,"max":9000,"step":0.1,"pattern":"^[A-Z]"}';
COMMENT ON COLUMN ref_category_parameters.group_key IS 'Logical grouping: route, terrain, logistics, technical, conditions, equipment, rules';

CREATE INDEX idx_cat_params_category ON ref_category_parameters(category_id);
CREATE INDEX idx_cat_params_subdiscipline ON ref_category_parameters(sub_discipline_id);
CREATE INDEX idx_cat_params_status ON ref_category_parameters(status);
CREATE INDEX idx_cat_params_group ON ref_category_parameters(category_id, group_key);
CREATE INDEX idx_cat_params_filterable ON ref_category_parameters(category_id) WHERE is_filterable = true;

-- updated_at trigger
CREATE TRIGGER set_updated_at_cat_params
  BEFORE UPDATE ON ref_category_parameters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ref_parameter_options — Választható értékek (select/multiselect)
-- ============================================================================

CREATE TABLE ref_parameter_options (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_id      UUID NOT NULL REFERENCES ref_category_parameters(id) ON DELETE CASCADE,

  value             VARCHAR(100) NOT NULL,
  label             VARCHAR(150) NOT NULL,
  label_localized   JSONB NOT NULL DEFAULT '{}',
  description       TEXT,
  icon_name         VARCHAR(50),
  color_hex         VARCHAR(7),

  -- Hierarchia (pl. terrain type → sub-type)
  parent_option_id  UUID REFERENCES ref_parameter_options(id) ON DELETE SET NULL,

  is_default        BOOLEAN NOT NULL DEFAULT false,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  status            category_status_t NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_param_option UNIQUE (parameter_id, value)
);

COMMENT ON TABLE ref_parameter_options IS 'M00: Dropdown/select values for category parameters';

CREATE INDEX idx_param_options_parameter ON ref_parameter_options(parameter_id);
CREATE INDEX idx_param_options_parent ON ref_parameter_options(parent_option_id);

-- ============================================================================
-- 3. ref_parameter_dependencies — Feltételes mezőmegjelenés
-- ============================================================================

CREATE TABLE ref_parameter_dependencies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_id          UUID NOT NULL REFERENCES ref_category_parameters(id) ON DELETE CASCADE,
  depends_on_param_id   UUID NOT NULL REFERENCES ref_category_parameters(id) ON DELETE CASCADE,

  condition_type        VARCHAR(20) NOT NULL,
  condition_value       JSONB NOT NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_param_dependency UNIQUE (parameter_id, depends_on_param_id),
  CONSTRAINT chk_condition_type CHECK (
    condition_type IN ('equals', 'not_equals', 'in', 'not_in', 'gt', 'lt', 'gte', 'lte', 'is_true', 'is_false')
  )
);

COMMENT ON TABLE ref_parameter_dependencies IS 'M00: Conditional field visibility rules (show field X only when field Y has value Z)';

CREATE INDEX idx_param_deps_parameter ON ref_parameter_dependencies(parameter_id);
CREATE INDEX idx_param_deps_depends ON ref_parameter_dependencies(depends_on_param_id);

-- ============================================================================
-- 4. ref_equipment_categories — Felszerelés típus csoportok
-- ============================================================================

CREATE TABLE ref_equipment_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(50) NOT NULL UNIQUE,
  label           VARCHAR(100) NOT NULL,
  label_localized JSONB NOT NULL DEFAULT '{}',
  icon_name       VARCHAR(50) NOT NULL,
  color_hex       VARCHAR(7),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ref_equipment_categories IS 'M00: Equipment type groupings (clothing, safety, technical_gear, etc.)';

-- ============================================================================
-- 5. ref_equipment — Felszerelés katalógus
-- ============================================================================

CREATE TABLE ref_equipment (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_category_id UUID NOT NULL REFERENCES ref_equipment_categories(id) ON DELETE RESTRICT,

  name                  VARCHAR(150) NOT NULL,
  name_localized        JSONB NOT NULL DEFAULT '{}',
  description           TEXT,
  description_localized JSONB,

  -- Tulajdonságok (AI packing hints)
  weight_hint_g         INTEGER,
  volume_hint_l         DECIMAL(5,1),
  price_hint_eur        DECIMAL(8,2),
  is_rentable           BOOLEAN NOT NULL DEFAULT false,

  -- Univerzális vagy kategória-kötött
  is_universal          BOOLEAN NOT NULL DEFAULT false,

  -- Lifecycle
  status                category_status_t NOT NULL DEFAULT 'active',
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ref_equipment IS 'M00: Master equipment catalog for packing lists & AI recommendations';
COMMENT ON COLUMN ref_equipment.weight_hint_g IS 'Average weight in grams (for AI packing weight estimate)';
COMMENT ON COLUMN ref_equipment.is_universal IS 'true = relevant for all categories (e.g., sunscreen, first aid)';

CREATE INDEX idx_equipment_category ON ref_equipment(equipment_category_id);
CREATE INDEX idx_equipment_universal ON ref_equipment(is_universal) WHERE is_universal = true;
CREATE INDEX idx_equipment_status ON ref_equipment(status);

CREATE TRIGGER set_updated_at_equipment
  BEFORE UPDATE ON ref_equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ref_subdiscipline_equipment — Alkategória ↔ Felszerelés kapcsolat
-- ============================================================================

CREATE TABLE ref_subdiscipline_equipment (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_discipline_id UUID NOT NULL REFERENCES sub_disciplines(id) ON DELETE CASCADE,
  equipment_id      UUID NOT NULL REFERENCES ref_equipment(id) ON DELETE CASCADE,

  priority          VARCHAR(20) NOT NULL DEFAULT 'recommended',
  required_from_difficulty INTEGER,
  required_for_environment VARCHAR(100),

  -- AI packing hints
  quantity_hint     INTEGER NOT NULL DEFAULT 1,
  notes             TEXT,
  notes_localized   JSONB,

  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_subdiscipline_equipment UNIQUE (sub_discipline_id, equipment_id),
  CONSTRAINT chk_priority CHECK (priority IN ('required', 'recommended', 'optional')),
  CONSTRAINT chk_difficulty CHECK (required_from_difficulty IS NULL OR (required_from_difficulty >= 1 AND required_from_difficulty <= 5))
);

COMMENT ON TABLE ref_subdiscipline_equipment IS 'M00: Equipment recommendations per sub-discipline with priority levels';
COMMENT ON COLUMN ref_subdiscipline_equipment.priority IS 'required=must have, recommended=should have, optional=nice to have';
COMMENT ON COLUMN ref_subdiscipline_equipment.required_from_difficulty IS 'NULL=always applies, 3=required from difficulty 3+';

CREATE INDEX idx_subdisc_equip_subdiscipline ON ref_subdiscipline_equipment(sub_discipline_id);
CREATE INDEX idx_subdisc_equip_equipment ON ref_subdiscipline_equipment(equipment_id);
CREATE INDEX idx_subdisc_equip_priority ON ref_subdiscipline_equipment(priority);

-- ============================================================================
-- 7. ref_certifications — Képesítések / Jogosítványok
-- ============================================================================

CREATE TABLE ref_certifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sub_discipline_id   UUID REFERENCES sub_disciplines(id) ON DELETE SET NULL,

  name                VARCHAR(150) NOT NULL,
  name_localized      JSONB NOT NULL DEFAULT '{}',
  abbreviation        VARCHAR(20),
  description         TEXT,
  description_localized JSONB,

  issuing_bodies      JSONB,

  level               INTEGER NOT NULL DEFAULT 1,
  level_label         VARCHAR(50),
  is_internationally_recognized BOOLEAN NOT NULL DEFAULT true,

  required_from_difficulty INTEGER,
  is_organizer_required   BOOLEAN NOT NULL DEFAULT false,
  is_participant_required BOOLEAN NOT NULL DEFAULT false,

  status              category_status_t NOT NULL DEFAULT 'active',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_cert_level CHECK (level >= 1 AND level <= 4),
  CONSTRAINT chk_cert_difficulty CHECK (required_from_difficulty IS NULL OR (required_from_difficulty >= 1 AND required_from_difficulty <= 5))
);

COMMENT ON TABLE ref_certifications IS 'M00: Certifications, licenses & qualifications per category/sub-discipline';
COMMENT ON COLUMN ref_certifications.issuing_bodies IS 'JSON array: ["RYA", "IYT", "ASA"]';
COMMENT ON COLUMN ref_certifications.level IS '1=basic, 2=intermediate, 3=advanced, 4=professional';

CREATE INDEX idx_certifications_category ON ref_certifications(category_id);
CREATE INDEX idx_certifications_subdiscipline ON ref_certifications(sub_discipline_id);
CREATE INDEX idx_certifications_status ON ref_certifications(status);

CREATE TRIGGER set_updated_at_certifications
  BEFORE UPDATE ON ref_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. ref_grading_systems — Nehézségi skálák per sport
-- ============================================================================

CREATE TABLE ref_grading_systems (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sub_discipline_id UUID REFERENCES sub_disciplines(id) ON DELETE SET NULL,

  name              VARCHAR(100) NOT NULL,
  name_localized    JSONB NOT NULL DEFAULT '{}',
  abbreviation      VARCHAR(20),
  description       TEXT,

  is_primary        BOOLEAN NOT NULL DEFAULT false,
  region            VARCHAR(50),

  status            category_status_t NOT NULL DEFAULT 'active',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_grading_system UNIQUE (category_id, name)
);

COMMENT ON TABLE ref_grading_systems IS 'M00: Sport-specific difficulty grading systems (UIAA, French Alpine, WW Scale, etc.)';
COMMENT ON COLUMN ref_grading_systems.is_primary IS 'true = default grading system for this category';

CREATE INDEX idx_grading_systems_category ON ref_grading_systems(category_id);
CREATE INDEX idx_grading_systems_subdiscipline ON ref_grading_systems(sub_discipline_id);

-- ============================================================================
-- 9. ref_grading_levels — Fokozatok per grading rendszer
-- ============================================================================

CREATE TABLE ref_grading_levels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_system_id   UUID NOT NULL REFERENCES ref_grading_systems(id) ON DELETE CASCADE,

  grade_value         VARCHAR(20) NOT NULL,
  grade_label         VARCHAR(100) NOT NULL,
  grade_label_localized JSONB,
  description         TEXT,
  description_localized JSONB,

  -- Konverzió: generikus 1-5 difficulty skálára
  difficulty_min      INTEGER NOT NULL,
  difficulty_max      INTEGER NOT NULL,

  color_hex           VARCHAR(7),
  sort_order          INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT uq_grading_level UNIQUE (grading_system_id, grade_value),
  CONSTRAINT chk_difficulty_range CHECK (
    difficulty_min >= 1 AND difficulty_max <= 5 AND difficulty_min <= difficulty_max
  )
);

COMMENT ON TABLE ref_grading_levels IS 'M00: Specific grade values per grading system with generic difficulty mapping';
COMMENT ON COLUMN ref_grading_levels.difficulty_min IS 'Maps to trips.difficulty (1-5) — lower bound';
COMMENT ON COLUMN ref_grading_levels.difficulty_max IS 'Maps to trips.difficulty (1-5) — upper bound';

CREATE INDEX idx_grading_levels_system ON ref_grading_levels(grading_system_id);
CREATE INDEX idx_grading_levels_difficulty ON ref_grading_levels(difficulty_min, difficulty_max);

-- ============================================================================
-- 10. ref_safety_requirements — Biztonsági követelmények
-- ============================================================================

CREATE TABLE ref_safety_requirements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sub_discipline_id   UUID REFERENCES sub_disciplines(id) ON DELETE SET NULL,

  name                VARCHAR(150) NOT NULL,
  name_localized      JSONB NOT NULL DEFAULT '{}',
  description         TEXT,
  description_localized JSONB,

  requirement_type    VARCHAR(30) NOT NULL,

  min_difficulty      INTEGER NOT NULL DEFAULT 1,
  max_difficulty      INTEGER,
  is_mandatory        BOOLEAN NOT NULL DEFAULT true,

  -- Kapcsolódó entitások
  equipment_id        UUID REFERENCES ref_equipment(id) ON DELETE SET NULL,
  certification_id    UUID REFERENCES ref_certifications(id) ON DELETE SET NULL,

  sort_order          INTEGER NOT NULL DEFAULT 0,
  status              category_status_t NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_requirement_type CHECK (
    requirement_type IN ('gear', 'knowledge', 'physical', 'certification', 'insurance', 'permit')
  ),
  CONSTRAINT chk_safety_difficulty_range CHECK (
    min_difficulty >= 1 AND min_difficulty <= 5 AND
    (max_difficulty IS NULL OR (max_difficulty >= min_difficulty AND max_difficulty <= 5))
  )
);

COMMENT ON TABLE ref_safety_requirements IS 'M00: Safety requirements per category/sub-discipline/difficulty level';
COMMENT ON COLUMN ref_safety_requirements.requirement_type IS 'gear/knowledge/physical/certification/insurance/permit';

CREATE INDEX idx_safety_req_category ON ref_safety_requirements(category_id);
CREATE INDEX idx_safety_req_subdiscipline ON ref_safety_requirements(sub_discipline_id);
CREATE INDEX idx_safety_req_difficulty ON ref_safety_requirements(min_difficulty);
CREATE INDEX idx_safety_req_type ON ref_safety_requirements(requirement_type);

-- ============================================================================
-- 11. ROW LEVEL SECURITY — All reference tables: public read, admin write
-- ============================================================================

ALTER TABLE ref_category_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_parameter_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_parameter_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_subdiscipline_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_grading_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_safety_requirements ENABLE ROW LEVEL SECURITY;

-- Public SELECT for all
CREATE POLICY ref_cat_params_read ON ref_category_parameters FOR SELECT USING (true);
CREATE POLICY ref_param_options_read ON ref_parameter_options FOR SELECT USING (true);
CREATE POLICY ref_param_deps_read ON ref_parameter_dependencies FOR SELECT USING (true);
CREATE POLICY ref_equip_cats_read ON ref_equipment_categories FOR SELECT USING (true);
CREATE POLICY ref_equip_read ON ref_equipment FOR SELECT USING (true);
CREATE POLICY ref_subdisc_equip_read ON ref_subdiscipline_equipment FOR SELECT USING (true);
CREATE POLICY ref_certs_read ON ref_certifications FOR SELECT USING (true);
CREATE POLICY ref_grading_sys_read ON ref_grading_systems FOR SELECT USING (true);
CREATE POLICY ref_grading_lvl_read ON ref_grading_levels FOR SELECT USING (true);
CREATE POLICY ref_safety_req_read ON ref_safety_requirements FOR SELECT USING (true);

-- Admin-only DML (INSERT/UPDATE/DELETE via service_role — no explicit policies needed)
-- The absence of INSERT/UPDATE/DELETE policies means only service_role can modify

-- ============================================================================
-- 12. VIEWS — Hasznos nézetek a frontend/API számára
-- ============================================================================

-- View: Kategória paraméterek opciókkal együtt (Wizard Step 3)
CREATE OR REPLACE VIEW v_category_form_fields AS
SELECT
  cp.id AS parameter_id,
  cp.category_id,
  c.name AS category_name,
  c.icon_name AS category_icon,
  c.color_hex AS category_color,
  cp.sub_discipline_id,
  sd.name AS sub_discipline_name,
  cp.parameter_key,
  cp.label,
  cp.label_localized,
  cp.description,
  cp.icon_name,
  cp.field_type,
  cp.unit,
  cp.is_required,
  cp.default_value,
  cp.validation,
  cp.group_key,
  cp.group_label,
  cp.group_label_localized,
  cp.display_order,
  cp.is_filterable,
  cp.show_on_card,
  cp.show_on_detail,
  -- Aggregált opciók (select/multiselect mezőkhöz)
  CASE WHEN cp.field_type IN ('select', 'multiselect') THEN
    (SELECT jsonb_agg(
      jsonb_build_object(
        'value', po.value,
        'label', po.label,
        'label_localized', po.label_localized,
        'icon_name', po.icon_name,
        'color_hex', po.color_hex,
        'is_default', po.is_default
      ) ORDER BY po.sort_order
    ) FROM ref_parameter_options po
      WHERE po.parameter_id = cp.id AND po.status = 'active')
  ELSE NULL END AS options,
  -- Függőségek
  (SELECT jsonb_agg(
    jsonb_build_object(
      'depends_on', pd.depends_on_param_id,
      'condition_type', pd.condition_type,
      'condition_value', pd.condition_value
    )
  ) FROM ref_parameter_dependencies pd
    WHERE pd.parameter_id = cp.id) AS dependencies
FROM ref_category_parameters cp
JOIN categories c ON c.id = cp.category_id
LEFT JOIN sub_disciplines sd ON sd.id = cp.sub_discipline_id
WHERE cp.status = 'active'
ORDER BY cp.category_id, cp.display_order;

COMMENT ON VIEW v_category_form_fields IS 'M00: Wizard Step 3 form fields with options and dependencies — ready for frontend consumption';

-- View: Felhasználói készségek referencia adatokkal
CREATE OR REPLACE VIEW v_user_skills_enriched AS
SELECT
  us.id,
  us.user_id,
  us.category_id,
  c.name AS category_name,
  c.name_localized AS category_name_localized,
  c.icon_name AS category_icon,
  c.color_hex AS category_color,
  us.skill_level,
  us.years_experience,
  us.certifications,
  us.notes,
  -- Experience level description
  eld.label AS level_label,
  eld.description AS level_description,
  eld.description_localized AS level_description_localized,
  -- Grading systems for this category
  (SELECT jsonb_agg(
    jsonb_build_object(
      'id', gs.id,
      'name', gs.name,
      'abbreviation', gs.abbreviation,
      'is_primary', gs.is_primary
    ) ORDER BY gs.sort_order
  ) FROM ref_grading_systems gs
    WHERE gs.category_id = us.category_id AND gs.status = 'active') AS grading_systems,
  -- Available certifications for this category
  (SELECT jsonb_agg(
    jsonb_build_object(
      'id', rc.id,
      'name', rc.name,
      'abbreviation', rc.abbreviation,
      'level', rc.level,
      'level_label', rc.level_label
    ) ORDER BY rc.sort_order
  ) FROM ref_certifications rc
    WHERE rc.category_id = us.category_id AND rc.status = 'active') AS available_certifications
FROM user_skills us
JOIN categories c ON c.id = us.category_id
LEFT JOIN experience_level_descriptions eld
  ON eld.category_id = us.category_id
  AND eld.level = CASE us.skill_level
    WHEN 'beginner' THEN 1
    WHEN 'intermediate' THEN 2
    WHEN 'advanced' THEN 3
    WHEN 'expert' THEN 4
    ELSE 1
  END;

COMMENT ON VIEW v_user_skills_enriched IS 'M00+M01: User skills joined with category data, grading systems, and certifications';

-- View: Kategória összefoglaló (profil oldal / discover)
CREATE OR REPLACE VIEW v_category_summary AS
SELECT
  c.id,
  c.name,
  c.name_localized,
  c.description,
  c.icon_name,
  c.color_hex,
  c.display_order,
  -- Sub-discipline count
  (SELECT COUNT(*) FROM sub_disciplines sd WHERE sd.category_id = c.id AND sd.status = 'active') AS sub_discipline_count,
  -- Environment count
  (SELECT COUNT(*) FROM environments e
    JOIN sub_disciplines sd ON sd.id = e.sub_discipline_id
    WHERE sd.category_id = c.id) AS environment_count,
  -- Parameter count (wizard fields)
  (SELECT COUNT(*) FROM ref_category_parameters cp WHERE cp.category_id = c.id AND cp.status = 'active') AS parameter_count,
  -- Certification count
  (SELECT COUNT(*) FROM ref_certifications rc WHERE rc.category_id = c.id AND rc.status = 'active') AS certification_count,
  -- Grading system count
  (SELECT COUNT(*) FROM ref_grading_systems gs WHERE gs.category_id = c.id AND gs.status = 'active') AS grading_system_count,
  -- Equipment count (via sub-disciplines)
  (SELECT COUNT(DISTINCT se.equipment_id) FROM ref_subdiscipline_equipment se
    JOIN sub_disciplines sd ON sd.id = se.sub_discipline_id
    WHERE sd.category_id = c.id) AS equipment_count,
  -- Safety requirement count
  (SELECT COUNT(*) FROM ref_safety_requirements sr WHERE sr.category_id = c.id AND sr.status = 'active') AS safety_requirement_count
FROM categories c
WHERE c.status = 'active'
ORDER BY c.display_order;

COMMENT ON VIEW v_category_summary IS 'M00: Category overview with reference data counts — for profile page & admin dashboard';

COMMIT;
