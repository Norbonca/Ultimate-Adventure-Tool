#!/usr/bin/env node
/**
 * Refines trip coordinates with Nominatim.
 *
 * Migration 034 backfills every trip with its country centroid — a placeholder
 * that puts ten Hungarian trips on one pixel in the middle of Hungary. This
 * script walks the trips that still carry a placeholder and resolves the real
 * region/city, tagging the result `nominatim`.
 *
 * Mirrors the query strategy of `lib/geocoding.ts` — that file is the contract,
 * this is its batch counterpart (a .mjs script cannot import the TS module).
 *
 *   node scripts/geocode-trips.mjs              # local database
 *   node scripts/geocode-trips.mjs --dry-run    # show what it would write
 *   node scripts/geocode-trips.mjs --all        # re-resolve everything
 *   ALLOW_PROD_GEOCODE=1 node scripts/geocode-trips.mjs   # production
 *
 * Nominatim usage policy: max 1 request/second, identifying User-Agent.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const SUPABASE_URL = process.env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const isLocal = SUPABASE_URL.includes("localhost") || SUPABASE_URL.includes("127.0.0.1");
if (!isLocal && !process.env.ALLOW_PROD_GEOCODE) {
  console.error(`✗ Safety abort: ${SUPABASE_URL} is not local.`);
  console.error("  Re-run with ALLOW_PROD_GEOCODE=1 if you really mean production.");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");
const REFRESH_ALL = process.argv.includes("--all");

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Trevu/1.0 (+https://www.ttvk.hu)";
const MIN_INTERVAL_MS = 1100;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function queryNominatim(params) {
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return null;

  const lat = Number(results[0].lat);
  const lng = Number(results[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), displayName: results[0].display_name };
}

async function geocode(trip) {
  const country = trip.location_country;
  const region = (trip.location_region || "").trim();
  const city = (trip.location_city || "").trim();

  const attempts = [];
  if (city && region) attempts.push({ country, state: region, city });
  if (city) attempts.push({ country, city });
  if (region) attempts.push({ country, state: region });

  for (const attempt of attempts) {
    await sleep(MIN_INTERVAL_MS);
    try {
      const result = await queryNominatim(attempt);
      if (result) return result;
    } catch (error) {
      console.warn(`  ! ${trip.slug}: ${error.message}`);
    }
  }
  return null;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let query = supabase
    .from("trips")
    .select("id, slug, title, location_country, location_region, location_city, location_geocode_source")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (!REFRESH_ALL) {
    query = query.or("location_geocode_source.is.null,location_geocode_source.eq.country_centroid");
  }

  const { data: trips, error } = await query;
  if (error) {
    console.error("✗ Trip fetch failed:", error.message);
    process.exit(1);
  }

  // Only trips with something more specific than a country can be refined.
  const candidates = (trips || []).filter(
    (trip) => (trip.location_region || "").trim() || (trip.location_city || "").trim()
  );
  const skipped = (trips || []).length - candidates.length;

  console.log(`Database: ${SUPABASE_URL}`);
  console.log(`Candidates: ${candidates.length} (${skipped} have no region or city — country centroid stands)`);
  if (DRY_RUN) console.log("DRY RUN — nothing will be written\n");

  let resolved = 0;
  let unresolved = 0;

  for (const trip of candidates) {
    const place = [trip.location_city, trip.location_region, trip.location_country].filter(Boolean).join(", ");
    const result = await geocode(trip);

    if (!result) {
      unresolved += 1;
      console.log(`  – ${trip.title} (${place}) — not resolved, keeping centroid`);
      continue;
    }

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from("trips")
        .update({
          location_lat: result.lat,
          location_lng: result.lng,
          location_geocoded_at: new Date().toISOString(),
          location_geocode_source: "nominatim",
        })
        .eq("id", trip.id);

      if (updateError) {
        console.error(`  ✗ ${trip.title}: ${updateError.message}`);
        unresolved += 1;
        continue;
      }
    }

    resolved += 1;
    console.log(`  ✓ ${trip.title} → ${result.lat}, ${result.lng}  (${result.displayName.slice(0, 60)})`);
  }

  console.log(`\n${DRY_RUN ? "Would resolve" : "Resolved"}: ${resolved} · unresolved: ${unresolved}`);
}

main().catch((error) => {
  console.error("✗ Unexpected failure:", error);
  process.exit(1);
});
