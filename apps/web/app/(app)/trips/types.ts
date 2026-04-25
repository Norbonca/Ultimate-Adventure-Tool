// ============================================
// M02 Trip Types — Shared between wizard and actions
// ============================================

export interface CategoryRow {
  id: string;
  name: string;
  name_localized: Record<string, string>;
  description: string | null;
  icon_name: string;
  color_hex: string;
  status: string;
  display_order: number;
}

export interface SubDisciplineRow {
  id: string;
  category_id: string;
  name: string;
  name_localized: Record<string, string>;
  description: string | null;
  status: string;
  display_order: number;
}

export interface CategoryParameterRow {
  id: string;
  category_id: string;
  sub_discipline_id: string | null;
  parameter_key: string;
  label: string;
  label_localized: Record<string, string>;
  description: string | null;
  placeholder: string | null;
  icon_name: string | null;
  field_type: "text" | "number" | "boolean" | "select" | "multiselect" | "range" | "date" | "textarea";
  unit: string | null;
  is_required: boolean;
  default_value: unknown;
  validation: { min?: number; max?: number; step?: number } | null;
  group_key: string | null;
  group_label: string | null;
  group_label_localized: Record<string, string> | null;
  display_order: number;
  is_filterable: boolean;
  show_on_card: boolean;
  status: string;
}

export interface ParameterOptionRow {
  id: string;
  parameter_id: string;
  value: string;
  label: string;
  label_localized: Record<string, string>;
  sort_order: number;
}

export interface CoverImageRow {
  id: string;
  category_id: string | null;
  url: string;
  thumbnail_url: string | null;
  alt_text: string;
  alt_text_localized: Record<string, string>;
  source: string;
  photographer: string | null;
  tags: string[];
  is_featured: boolean;
  sort_order: number;
}

export interface ExperienceLevelRow {
  id: string;
  category_id: string;
  level: number;
  label: string;
  description: string | null;
  description_localized: Record<string, string> | null;
}

export interface WizardFormData {
  // Step 1
  category_id: string;
  category_name: string;
  trip_type: "private" | "public";

  // Step 2 — Basic Info
  title: string;
  short_description: string;
  description: string;
  start_date: string;
  end_date: string;
  location_country: string;
  location_region: string;
  location_city: string;
  max_participants: number;
  min_participants: number;
  staff_seats: number;
  difficulty: number;
  sub_discipline_id: string;

  // Step 3 — Category-specific (dynamic)
  category_details: Record<string, unknown>;

  // Step 4 — Publish settings
  visibility: "public" | "followers_only" | "private";
  require_approval: boolean;
  registration_deadline: string;
  price_amount: number | null;
  price_currency: string;
  is_cost_sharing: boolean;
  cover_image_url: string;
  cover_image_source: "system" | "user_upload";
  card_image_url: string;
  card_image_source: "system" | "user_upload";
  tags: string[];
  crew_positions: string[];
  show_on_landing: boolean;
}

export const INITIAL_FORM_DATA: WizardFormData = {
  category_id: "",
  category_name: "",
  trip_type: "private",
  title: "",
  short_description: "",
  description: "",
  start_date: "",
  end_date: "",
  location_country: "HU",
  location_region: "",
  location_city: "",
  max_participants: 10,
  min_participants: 2,
  staff_seats: 0,
  difficulty: 1,
  sub_discipline_id: "",
  category_details: {},
  visibility: "public",
  require_approval: true,
  registration_deadline: "",
  price_amount: null,
  price_currency: "EUR",
  is_cost_sharing: true,
  cover_image_url: "",
  cover_image_source: "system",
  card_image_url: "",
  card_image_source: "system",
  tags: [],
  crew_positions: [],
  show_on_landing: true,
};
