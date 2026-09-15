import { describe, expect, it } from "vitest";
import {
  buildTripSearchText,
  countryNames,
  matchesQuery,
  normalizeSearchText,
  parseWhen,
  tripMatchesWhen,
} from "@/lib/trip-search";

const split = {
  title: "Split vitorlás túra",
  short_description: "Egy hét az Adrián",
  description: null,
  location_city: "Split",
  location_region: "Split",
  location_country: "HR",
  categories: { name: "Water Sports", name_localized: { hu: "Vízi sportok" } },
  sub_disciplines: [{ name: "Sailing", name_localized: { hu: "Vitorlázás" } }],
  profiles: { display_name: "Jurancsik Norbert" },
};

describe("trip search — Hova?", () => {
  it("normalizes accents, case and spacing", () => {
    expect(normalizeSearchText("  Horvátország   TÚRA ")).toBe("horvatorszag tura");
  });

  it("finds a trip by country name in Hungarian and English, by city, category, sub-discipline and organizer", () => {
    const text = buildTripSearchText(split, ["Vízi sport"]);
    for (const query of ["horvátország", "Croatia", "split", "vízi", "vitorlázás", "sailing", "norbert", "adrian"]) {
      expect(matchesQuery(text, query), query).toBe(true);
    }
  });

  it("needs every word to match", () => {
    const text = buildTripSearchText(split);
    expect(matchesQuery(text, "split vitorlás")).toBe(true);
    expect(matchesQuery(text, "split tátra")).toBe(false);
    expect(matchesQuery(text, "")).toBe(true);
  });

  it("keeps an unknown country code searchable as is", () => {
    expect(countryNames("HR")).toMatch(/Horvátország/);
    expect(countryNames(null)).toBe("");
  });
});

describe("trip search — Mikor?", () => {
  const nepal = ["2026-12-24", "2027-01-06"] as const;
  const june = ["2027-06-13", "2027-06-20"] as const;

  it("returns no filter for an empty field and an invalid one for gibberish", () => {
    expect(parseWhen("   ")).toBeNull();
    expect(parseWhen("valamikor")?.invalid).toBe(true);
    expect(tripMatchesWhen(parseWhen("valamikor"), ...june)).toBe(false);
  });

  it("understands month names with Hungarian suffixes and English", () => {
    for (const text of ["június", "júniusban", "jún", "June", "2027 június", "2027.06"]) {
      expect(tripMatchesWhen(parseWhen(text), ...june), text).toBe(true);
      expect(tripMatchesWhen(parseWhen(text), ...nepal), text).toBe(false);
    }
  });

  it("matches a trip spanning the new year by either year or month", () => {
    expect(tripMatchesWhen(parseWhen("2027"), ...nepal)).toBe(true);
    expect(tripMatchesWhen(parseWhen("2026 december"), ...nepal)).toBe(true);
    expect(tripMatchesWhen(parseWhen("január"), ...nepal)).toBe(true);
    expect(tripMatchesWhen(parseWhen("2026 január"), ...nepal)).toBe(false);
  });

  it("understands seasons", () => {
    expect(tripMatchesWhen(parseWhen("nyáron"), ...june)).toBe(true);
    expect(tripMatchesWhen(parseWhen("télen"), ...nepal)).toBe(true);
    expect(tripMatchesWhen(parseWhen("ősszel"), ...june)).toBe(false);
  });

  it("understands month ranges, wrapping over the year end", () => {
    expect(tripMatchesWhen(parseWhen("2027 jan–márc"), ...nepal)).toBe(true);
    expect(tripMatchesWhen(parseWhen("2027 jan–márc"), ...june)).toBe(false);
    expect(tripMatchesWhen(parseWhen("nov - feb"), ...nepal)).toBe(true);
    expect(tripMatchesWhen(parseWhen("május-július"), ...june)).toBe(true);
  });

  it("matches an exact date inside the trip", () => {
    expect(tripMatchesWhen(parseWhen("2027-06-15"), ...june)).toBe(true);
    expect(tripMatchesWhen(parseWhen("2027. 06. 21."), ...june)).toBe(false);
  });

  it("never matches a trip without dates once a date is given", () => {
    expect(tripMatchesWhen(parseWhen("2027"), null, null)).toBe(false);
    expect(tripMatchesWhen(null, null, null)).toBe(true);
  });
});
