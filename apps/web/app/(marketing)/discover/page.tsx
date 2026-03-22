import { createClient } from "@/lib/supabase/server";
import { CATEGORY_DISPLAY, DIFFICULTY_LEVELS } from "@/lib/categories";
import DiscoverClient from "./discover-client";

export const metadata = {
  title: "Discover Adventures — Trevu",
  description:
    "Browse organized adventure trips across Central Europe. Hiking, climbing, sailing, cycling and more.",
};

async function fetchPublishedTrips() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select(
      `
      id, title, slug, short_description, description,
      start_date, end_date,
      location_country, location_region, location_city,
      difficulty, max_participants, current_participants,
      price_amount, price_currency, is_cost_sharing,
      cover_image_url, status, visibility,
      category_id,
      categories (id, name, name_localized, icon_name, color_hex),
      sub_disciplines (id, name, name_localized),
      profiles!trips_organizer_id_fkey (id, display_name, avatar_url, slug, subscription_tier)
    `
    )
    .eq("status", "published")
    .eq("visibility", "public")
    .is("deleted_at", null)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Discover trips fetch error:", error);
    return [];
  }
  return data || [];
}

async function fetchActiveCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, name_localized, icon_name, color_hex, display_order")
    .eq("status", "active")
    .order("display_order");

  if (error) {
    console.error("Categories fetch error:", error);
    return [];
  }
  return data || [];
}

async function fetchCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, slug")
    .eq("id", user.id)
    .single();

  return profile ? {
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    slug: profile.slug,
    initials: (profile.display_name || user.email || "U").slice(0, 2).toUpperCase(),
  } : null;
}

export default async function DiscoverPage() {
  const [trips, categories, currentUser] = await Promise.all([
    fetchPublishedTrips(),
    fetchActiveCategories(),
    fetchCurrentUser(),
  ]);

  return (
    <DiscoverClient
      trips={trips}
      categories={categories}
      categoryDisplay={CATEGORY_DISPLAY}
      difficultyLevels={DIFFICULTY_LEVELS}
      currentUser={currentUser}
    />
  );
}
