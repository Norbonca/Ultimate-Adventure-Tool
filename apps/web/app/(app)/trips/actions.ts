"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { WizardFormData } from "./types";

// ============================================
// Helper: slug generálás
// ============================================
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[áàâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôöő]/g, "o")
    .replace(/[úùûüű]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
  // Add random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

// ============================================
// saveDraft — UPSERT draft trip
// ============================================
export async function saveDraft(
  formData: Partial<WizardFormData>,
  existingTripId?: string
): Promise<{ tripId: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { tripId: "", error: "Nincs bejelentkezett felhasználó" };
  }

  // Get profile id (profiles.id = auth.users.id via trigger)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { tripId: "", error: "Profil nem található" };
  }

  const tripPayload = {
    organizer_id: profile.id,
    category_id: formData.category_id || null,
    sub_discipline_id: formData.sub_discipline_id || null,
    title: formData.title || "Névtelen túra",
    slug: generateSlug(formData.title || "draft"),
    short_description: formData.short_description || null,
    description: formData.description || "",
    start_date: formData.start_date || null,
    end_date: formData.end_date || null,
    location_country: formData.location_country || "HU",
    location_region: formData.location_region || null,
    location_city: formData.location_city || null,
    max_participants: formData.max_participants || 10,
    min_participants: formData.min_participants || 2,
    difficulty: formData.difficulty || 1,
    category_details: formData.category_details || {},
    visibility: formData.visibility || "public",
    require_approval: formData.require_approval ?? true,
    registration_deadline: formData.registration_deadline || null,
    price_amount: formData.price_amount || null,
    price_currency: formData.price_currency || "EUR",
    is_cost_sharing: formData.is_cost_sharing ?? true,
    cover_image_url: formData.cover_image_url || null,
    tags: formData.tags || [],
    status: "draft" as const,
  };

  if (existingTripId) {
    // UPDATE existing draft
    const { error } = await supabase
      .from("trips")
      .update({
        ...tripPayload,
        slug: undefined, // don't change slug on update
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingTripId)
      .eq("organizer_id", profile.id);

    if (error) {
      console.error("Draft update error:", error);
      return { tripId: existingTripId, error: error.message };
    }
    return { tripId: existingTripId };
  } else {
    // INSERT new draft
    const { data, error } = await supabase
      .from("trips")
      .insert(tripPayload)
      .select("id")
      .single();

    if (error) {
      console.error("Draft insert error:", error);
      return { tripId: "", error: error.message };
    }
    return { tripId: data.id };
  }
}

// ============================================
// publishTrip — Update draft → published
// ============================================
export async function publishTrip(
  tripId: string,
  formData: WizardFormData
): Promise<{ slug: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { slug: "", error: "Nincs bejelentkezett felhasználó" };
  }

  // First save all data
  const { error: saveError } = await saveDraft(formData, tripId);
  if (saveError) {
    return { slug: "", error: saveError };
  }

  // Then publish
  const { data, error } = await supabase
    .from("trips")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tripId)
    .eq("organizer_id", user.id)
    .select("slug")
    .single();

  if (error) {
    console.error("Publish error:", error);
    return { slug: "", error: error.message };
  }

  return { slug: data.slug };
}

// ============================================
// fetchCategories — Load active categories
// ============================================
export async function fetchCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, name_localized, description, icon_name, color_hex, status, display_order")
    .eq("status", "active")
    .order("display_order");

  if (error) {
    console.error("Categories fetch error:", error);
    return [];
  }
  return data || [];
}

// ============================================
// fetchSubDisciplines — Load for a category
// ============================================
export async function fetchSubDisciplines(categoryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sub_disciplines")
    .select("id, category_id, name, name_localized, description, status, display_order")
    .eq("category_id", categoryId)
    .eq("status", "active")
    .order("display_order");

  if (error) {
    console.error("Sub-disciplines fetch error:", error);
    return [];
  }
  return data || [];
}

// ============================================
// fetchCategoryParameters — Load wizard step 3 fields
// ============================================
export async function fetchCategoryParameters(
  categoryId: string,
  subDisciplineId?: string
) {
  const supabase = await createClient();

  let query = supabase
    .from("ref_category_parameters")
    .select("*")
    .eq("category_id", categoryId)
    .eq("status", "active")
    .order("display_order");

  // Get parameters that are either global (null sub_discipline_id) or match the sub-discipline
  if (subDisciplineId) {
    query = query.or(`sub_discipline_id.is.null,sub_discipline_id.eq.${subDisciplineId}`);
  } else {
    query = query.is("sub_discipline_id", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Parameters fetch error:", error);
    return [];
  }
  return data || [];
}

// ============================================
// fetchParameterOptions — Load select/multiselect options
// ============================================
export async function fetchParameterOptions(parameterIds: string[]) {
  if (parameterIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ref_parameter_options")
    .select("id, parameter_id, value, label, label_localized, display_order")
    .in("parameter_id", parameterIds)
    .order("display_order");

  if (error) {
    console.error("Parameter options fetch error:", error);
    return [];
  }
  return data || [];
}

// ============================================
// fetchCountries — for location selector
// ============================================
export async function fetchCountries() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ref_countries")
    .select("code, name_hu, name_en, flag_emoji")
    .eq("is_active", true)
    .order("sort_order");

  if (error) return [];
  return data || [];
}

// ============================================
// fetchTripBySlug — Load a single trip by slug (public detail page)
// ============================================
export async function fetchTripBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trips")
    .select(
      `
      *,
      categories (id, name, name_localized, icon_name, color_hex),
      sub_disciplines (id, name, name_localized),
      profiles!trips_organizer_id_fkey (id, display_name, avatar_url, slug, subscription_tier)
    `
    )
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Trip fetch error:", error);
    return null;
  }
  return data;
}

// ============================================
// fetchMyTrips — Load all trips for the current user
// ============================================
export async function fetchMyTrips() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("trips")
    .select(
      `
      id, title, slug, short_description, cover_image_url,
      status, visibility, difficulty,
      start_date, end_date,
      location_country, location_region, location_city,
      max_participants, current_participants,
      price_amount, price_currency,
      category_id,
      categories (name, name_localized, icon_name, color_hex),
      created_at, updated_at, published_at
    `
    )
    .eq("organizer_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("My trips fetch error:", error);
    return [];
  }
  return data || [];
}

// ============================================
// fetchCategoryParametersForDisplay — for trip detail page
// ============================================
export async function fetchCategoryParametersForDisplay(
  categoryId: string,
  subDisciplineId?: string | null
) {
  const supabase = await createClient();

  let query = supabase
    .from("ref_category_parameters")
    .select("parameter_key, label, label_localized, unit, icon_name, field_type, group_key, group_label, group_label_localized, show_on_detail")
    .eq("category_id", categoryId)
    .eq("status", "active")
    .eq("show_on_detail", true)
    .order("display_order");

  if (subDisciplineId) {
    query = query.or(`sub_discipline_id.is.null,sub_discipline_id.eq.${subDisciplineId}`);
  } else {
    query = query.is("sub_discipline_id", null);
  }

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}
