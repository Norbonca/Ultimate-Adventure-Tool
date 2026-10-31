/**
 * M22 Trip Ideas — közös típusok és állandók.
 * Spec: modules/22_Trip_Ideas/01_Funkcionalis_Specifikacio.md (5., 7., 8., 9. fejezet; döntések 2026-10-31).
 * Terv: design/D22_Trip_Ideas.pen.
 */

export const IDEA_STATUSES = ["open", "organizing", "converted", "expired", "closed"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const IDEA_INTENTS = ["seeking_organizer", "seeking_companions", "will_organize"] as const;
export type IdeaIntent = (typeof IDEA_INTENTS)[number];

export const IDEA_VISIBILITIES = ["public", "followers_only", "link_only"] as const;
export type IdeaVisibility = (typeof IDEA_VISIBILITIES)[number];

export const IDEA_CLOSE_REASONS = ["realized", "no_longer_relevant", "other"] as const;
export type IdeaCloseReason = (typeof IDEA_CLOSE_REASONS)[number];

export const IDEA_REPORT_REASONS = ["spam", "hidden_commercial", "inappropriate", "other"] as const;
export type IdeaReportReason = (typeof IDEA_REPORT_REASONS)[number];

export const CONTINENTS = ["Europe", "Asia", "Africa", "North America", "South America", "Oceania"] as const;
export type Continent = (typeof CONTINENTS)[number];

/** Állapotok, amelyekben csatlakozni és vállalni lehet (8.1). */
export const JOINABLE_STATUSES: readonly IdeaStatus[] = ["open", "organizing", "converted"];

export interface IdeaDestination {
  id?: string;
  name: string;
  continent: string | null;
  country_codes: string[];
  sort_order?: number;
}

export interface IdeaRow {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description: string | null;
  category_id: string;
  sub_discipline_id: string | null;
  window_start_month: number;
  window_end_month: number;
  window_year: number;
  window_start_date: string;
  window_end_date: string;
  period_key: string | null;
  duration_min_days: number | null;
  duration_max_days: number | null;
  difficulty: number | null;
  group_size_min: number | null;
  group_size_max: number | null;
  budget_amount: number | null;
  budget_currency: string | null;
  intent: IdeaIntent;
  visibility: IdeaVisibility;
  language: string;
  status: IdeaStatus;
  moderation_status: "none" | "under_review" | "removed";
  closed_reason: IdeaCloseReason | null;
  expires_at: string;
  timezone: string;
  member_count: number;
  party_size_total: number;
  offer_count: number;
  created_at: string;
  updated_at: string;
}

export interface IdeaListItem extends IdeaRow {
  destinations: IdeaDestination[];
  category: { id: string; name: string; name_localized: Record<string, string> | null; icon_name: string; color_hex: string } | null;
  owner: { id: string; display_name: string | null; avatar_url: string | null; profile_visibility?: string | null } | null;
}

export interface IdeaMember {
  idea_id: string;
  user_id: string;
  status: "active" | "left";
  is_anonymous: boolean;
  note: string | null;
  preferred_months: number[];
  party_size: number;
  notifications_enabled: boolean;
  joined_at: string;
  profile: { id: string; display_name: string | null; avatar_url: string | null; profile_visibility?: string | null } | null;
}

export interface IdeaOffer {
  id: string;
  idea_id: string;
  organizer_id: string;
  message: string | null;
  planned_months: number[];
  status: "active" | "withdrawn";
  created_at: string;
  profile: { id: string; display_name: string | null; avatar_url: string | null; verified_organizer?: boolean | null } | null;
}

export interface IdeaLinkedTrip {
  trip_id: string;
  created_by: string;
  trip: { id: string; slug: string; title: string; start_date: string | null; end_date: string | null; status: string; cover_image_url: string | null } | null;
}
