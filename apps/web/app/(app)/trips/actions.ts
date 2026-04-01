"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n/server";
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
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { tripId: "", error: t('errors.notAuthenticated') };
  }

  // Get or create profile (defensive — trigger should create it, but fallback if not)
  let { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Auto-create profile if trigger failed
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User";
    const slug =
      displayName
        .toLowerCase()
        .replace(/[áàâä]/g, "a")
        .replace(/[éèêë]/g, "e")
        .replace(/[íìîï]/g, "i")
        .replace(/[óòôöő]/g, "o")
        .replace(/[úùûüű]/g, "u")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) +
      "-" +
      Math.random().toString(36).substring(2, 6);

    const { data: newProfile, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email || "",
          display_name: displayName,
          slug,
          first_name: displayName.split(" ")[0] || "",
          last_name: displayName.split(" ").slice(1).join(" ") || "",
        },
        { onConflict: "id" }
      )
      .select("id")
      .single();

    if (profileError || !newProfile) {
      console.error("Profile auto-create error:", profileError);
      return { tripId: "", error: t('errors.profileCreateFailed').replace('{error}', profileError?.message || 'unknown error') };
    }
    profile = newProfile;
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
    cover_image_source: formData.cover_image_source || "system",
    card_image_url: formData.card_image_url || null,
    card_image_source: formData.card_image_source || "system",
    tags: formData.tags || [],
    status: "draft" as const,
  };

  if (existingTripId) {
    // UPDATE existing trip — preserve current status (don't reset to draft!)
    const { status: _ignoreStatus, ...payloadWithoutStatus } = tripPayload;
    const { error } = await supabase
      .from("trips")
      .update({
        ...payloadWithoutStatus,
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
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { slug: "", error: t('errors.notAuthenticated') };
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
    .select("id, parameter_id, value, label, label_localized, sort_order")
    .in("parameter_id", parameterIds)
    .order("sort_order");

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
      id, title, slug, short_description, cover_image_url, cover_image_source, card_image_url, card_image_source,
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
// fetchTripForEdit — Load trip by ID for the wizard (edit mode)
// ============================================
export async function fetchTripForEdit(tripId: string): Promise<{
  formData: WizardFormData;
  tripId: string;
  status: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: trip, error } = await supabase
    .from("trips")
    .select(
      `
      *,
      categories (id, name, name_localized, icon_name, color_hex)
    `
    )
    .eq("id", tripId)
    .eq("organizer_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !trip) {
    console.error("Trip edit fetch error:", error);
    return null;
  }

  const cat = Array.isArray(trip.categories) ? trip.categories[0] : trip.categories;

  const formData: WizardFormData = {
    category_id: trip.category_id || "",
    category_name: (cat as { name: string } | null)?.name || "",
    trip_type: trip.visibility === "private" ? "private" : "public",
    title: trip.title || "",
    short_description: trip.short_description || "",
    description: trip.description || "",
    start_date: trip.start_date || "",
    end_date: trip.end_date || "",
    location_country: trip.location_country || "HU",
    location_region: trip.location_region || "",
    location_city: trip.location_city || "",
    max_participants: trip.max_participants || 10,
    min_participants: trip.min_participants || 2,
    difficulty: trip.difficulty || 1,
    sub_discipline_id: trip.sub_discipline_id || "",
    category_details: (trip.category_details as Record<string, unknown>) || {},
    visibility: trip.visibility || "public",
    require_approval: trip.require_approval ?? true,
    registration_deadline: trip.registration_deadline || "",
    price_amount: trip.price_amount ? Number(trip.price_amount) : null,
    price_currency: trip.price_currency || "EUR",
    is_cost_sharing: trip.is_cost_sharing ?? true,
    cover_image_url: trip.cover_image_url || "",
    cover_image_source: trip.cover_image_source || "system",
    card_image_url: trip.card_image_url || "",
    card_image_source: trip.card_image_source || "system",
    tags: (trip.tags as string[]) || [],
    crew_positions: [],
    show_on_landing: trip.show_on_landing ?? true,
  };

  return { formData, tripId: trip.id, status: trip.status };
}

// ============================================
// fetchCoverImages — Load stock/system cover images
// ============================================
export async function fetchCoverImages(categoryId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("ref_cover_images")
    .select(
      "id, category_id, url, thumbnail_url, alt_text, alt_text_localized, source, photographer, tags, is_featured, sort_order"
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("sort_order");

  if (categoryId) {
    // Return both category-specific and universal (null category_id) images
    query = query.or(`category_id.eq.${categoryId},category_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Cover images fetch error:", error);
    return [];
  }
  return data || [];
}

// ============================================
// fetchExperienceLevels — Load difficulty descriptions per category
// ============================================
export async function fetchExperienceLevels(categoryId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("experience_level_descriptions")
    .select("id, category_id, level, label, description, description_localized")
    .order("level");

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Experience levels fetch error:", error);
    return [];
  }
  return data || [];
}

// ============================================
// uploadCoverImage — Upload user image to Supabase Storage
// ============================================
export async function uploadCoverImage(
  formDataFile: FormData
): Promise<{ url: string; error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { url: "", error: t('errors.notAuthenticated') };
  }

  const file = formDataFile.get("file") as File;
  if (!file) {
    return { url: "", error: t('errors.noFileSelected') };
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!allowedTypes.includes(file.type)) {
    return { url: "", error: t('errors.unsupportedFileFormat') };
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { url: "", error: t('errors.fileSizeLimitExceeded') };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("trip-covers")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return { url: "", error: t('errors.uploadFailed').replace('{error}', uploadError.message) };
  }

  const { data: publicUrl } = supabase.storage
    .from("trip-covers")
    .getPublicUrl(fileName);

  return { url: publicUrl.publicUrl };
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

// ============================================
// fetchTripParticipants — Load participants for a trip
// ============================================
export async function fetchTripParticipants(tripId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trip_participants")
    .select(`
      id, trip_id, user_id, status, application_text,
      skill_match, applied_at, approved_at, paid_at,
      crew_position_id,
      profiles!trip_participants_user_id_fkey (id, display_name, avatar_url, slug),
      trip_crew_positions (id, role_name)
    `)
    .eq("trip_id", tripId)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Participants fetch error:", error);
    return [];
  }
  return data || [];
}

// ============================================
// fetchCrewPositions — Load crew positions for a trip
// ============================================
export async function fetchCrewPositions(tripId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trip_crew_positions")
    .select("id, trip_id, role_name, description, required_skill_level, spots, filled_spots, sort_order")
    .eq("trip_id", tripId)
    .order("sort_order");

  if (error) {
    console.error("Crew positions fetch error:", error);
    return [];
  }
  return data || [];
}

// ============================================
// fetchTripItinerary — Load itinerary days for a trip
// ============================================
export async function fetchTripItinerary(tripId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trip_itinerary_days")
    .select("id, trip_id, day_number, title, description, date, start_location, end_location, distance_km, elevation_gain_m, estimated_hours")
    .eq("trip_id", tripId)
    .order("day_number");

  if (error) {
    console.error("Itinerary fetch error:", error);
    return [];
  }
  return data || [];
}
