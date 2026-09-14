import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/v1/trips/globe
 *
 * Marker feed for the 3D globe discovery view ("Terepgömb"). Returns every
 * published, public, non-deleted trip that has coordinates, in the smallest
 * shape the globe needs — the full trip cards come from the page's own
 * server-side query, so this payload stays under a few dozen KB.
 *
 * `geocodeSource` travels with each marker: `country_centroid` means the
 * coordinates are a country-level placeholder (migration 034 backfill), not
 * the real location. The globe renders those with a softer marker so the
 * user is not told a Hungarian trip happens in the geometric middle of Hungary.
 */

export const dynamic = "force-dynamic";

interface GlobeTripRow {
  id: string;
  slug: string;
  title: string;
  location_country: string;
  location_region: string | null;
  location_city: string | null;
  location_lat: string | number | null;
  location_lng: string | number | null;
  location_geocode_source: string | null;
  start_date: string | null;
  end_date: string | null;
  difficulty: number;
  price_amount: string | number | null;
  price_currency: string;
  is_cost_sharing: boolean;
  max_participants: number;
  current_participants: number;
  card_image_url: string | null;
  cover_image_url: string | null;
  category_id: string;
  categories:
    | { name: string; name_localized: Record<string, string>; color_hex: string }
    | { name: string; name_localized: Record<string, string>; color_hex: string }[]
    | null;
}

function firstOrNull<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trips")
    .select(
      `
      id, slug, title,
      location_country, location_region, location_city,
      location_lat, location_lng, location_geocode_source,
      start_date, end_date, difficulty,
      price_amount, price_currency, is_cost_sharing,
      max_participants, current_participants,
      card_image_url, cover_image_url,
      category_id,
      categories (name, name_localized, color_hex)
    `
    )
    .eq("status", "published")
    .eq("visibility", "public")
    .is("deleted_at", null)
    .not("location_lat", "is", null)
    .not("location_lng", "is", null)
    .order("start_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Globe trips fetch error:", error);
    return NextResponse.json({ error: "Failed to load globe data" }, { status: 500 });
  }

  const markers = ((data ?? []) as GlobeTripRow[]).map((trip) => {
    const category = firstOrNull(trip.categories);
    return {
      id: trip.id,
      slug: trip.slug,
      title: trip.title,
      lat: Number(trip.location_lat),
      lng: Number(trip.location_lng),
      geocodeSource: trip.location_geocode_source ?? "unknown",
      country: trip.location_country,
      region: trip.location_region,
      city: trip.location_city,
      startDate: trip.start_date,
      endDate: trip.end_date,
      difficulty: trip.difficulty,
      priceAmount: trip.price_amount === null ? null : Number(trip.price_amount),
      priceCurrency: trip.price_currency,
      isCostSharing: trip.is_cost_sharing,
      spotsLeft: Math.max(0, trip.max_participants - trip.current_participants),
      imageUrl: trip.card_image_url ?? trip.cover_image_url,
      categoryId: trip.category_id,
      categoryName: category?.name ?? null,
      categoryNameLocalized: category?.name_localized ?? null,
      categoryColor: category?.color_hex ?? null,
    };
  });

  return NextResponse.json(
    { markers, count: markers.length, generatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
