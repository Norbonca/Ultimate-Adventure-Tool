import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activeGeocodeProvider,
  countryCentroid,
  geocodeLocation,
  nominatimProvider,
  type GeocodeProvider,
} from "@/lib/geocoding";

/** A provider stub that answers only the field combinations it knows. */
function stubProvider(key: string, known: Record<string, [number, number]>): GeocodeProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    key,
    calls,
    async lookup(params) {
      const id = [params.country, params.state ?? "", params.city ?? ""].join("|");
      calls.push(id);
      const hit = known[id];
      return hit ? { lat: hit[0], lng: hit[1], displayName: id, source: "nominatim" } : null;
    },
  };
}

describe("lib/geocoding", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("narrows city+region → city → region → country and stops at the first hit", async () => {
    const provider = stubProvider("stub-narrow", { "HR||Split": [43.51, 16.44] });
    const result = await geocodeLocation({ country: "HR", region: "Dalmácia", city: "Split" }, provider);
    expect(provider.calls).toEqual(["HR|Dalmácia|Split", "HR||Split"]);
    expect(result).toMatchObject({ lat: 43.51, lng: 16.44, source: "nominatim" });
  });

  it("tags a country-only match as approximate", async () => {
    const provider = stubProvider("stub-country", { "HU||": [47.18, 19.5] });
    const result = await geocodeLocation({ country: "HU", city: "Nincsilyen" }, provider);
    expect(result?.source).toBe("country_centroid");
  });

  it("caches answers, including 'not found', per provider and place", async () => {
    const provider = stubProvider("stub-cache", {});
    await geocodeLocation({ country: "XX", city: "A" }, provider);
    const first = provider.calls.length;
    await geocodeLocation({ country: "xx", city: " a " }, provider);
    expect(provider.calls.length).toBe(first);
  });

  it("returns the migration 034 centroid, or null for an unknown country", () => {
    expect(countryCentroid("hu")).toMatchObject({ lat: 47.1625, lng: 19.5033, source: "country_centroid" });
    expect(countryCentroid("VN")).toBeNull();
    expect(countryCentroid(null)).toBeNull();
  });

  it("selects the provider from LOCATION_GEOCODER and falls back to Nominatim", () => {
    vi.stubEnv("LOCATION_GEOCODER", "nominatim");
    expect(activeGeocodeProvider()).toBe(nominatimProvider);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("LOCATION_GEOCODER", "does-not-exist");
    expect(activeGeocodeProvider()).toBe(nominatimProvider);
  });
});
