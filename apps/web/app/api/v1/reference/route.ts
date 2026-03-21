import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/v1/reference
 *
 * Returns all active reference data (countries, languages, currencies, timezones).
 * Cached for 1 hour — reference data rarely changes.
 */
export async function GET() {
  const supabase = await createClient();

  const [countries, languages, currencies, timezones] = await Promise.all([
    supabase
      .from("ref_countries")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("ref_languages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("ref_currencies")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("ref_timezones")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (countries.error || languages.error || currencies.error || timezones.error) {
    return NextResponse.json(
      { error: "Failed to load reference data" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      countries: countries.data,
      languages: languages.data,
      currencies: currencies.data,
      timezones: timezones.data,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
