import { describe, expect, it } from "vitest";
import { jsonLdScript, tripStructuredData } from "@/lib/share/trip-structured-data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a JSON-LD szerkezetét a teszt mezőnként olvassa
type Ld = Record<string, any>;

const ORIGIN = "https://www.ttvk.hu";
const base = {
  slug: "split-vitorlas-tura",
  title: "Split vitorlás túra",
  description: "Egy hét az Adrián.",
  imageUrl: "https://img.example/cover.jpg",
  startDate: "2027-07-11",
  endDate: "2027-07-18",
  city: "Split",
  region: "Dalmácia",
  country: "HR",
  priceAmount: 2500,
  priceCurrency: "eur",
  spotsLeft: 4,
  registrationDeadline: "2027-06-30",
  organizerName: "Varga Dóra",
  organizerSlug: "varga-dora",
  keywords: ["Vízi sportok", "Vitorlázás", null],
};

describe("tripStructuredData (FR-M02-010, ND-SH-04)", () => {
  it("TouristTrip-et ad, nem Event-et (Google esemény-irányelv)", () => {
    const [trip] = tripStructuredData(ORIGIN, base);
    expect(trip["@type"]).toBe("TouristTrip");
    expect(JSON.stringify(trip)).not.toMatch(/"Event"/);
  });

  it("kitölti a fő mezőket abszolút URL-ekkel", () => {
    const [trip] = tripStructuredData(ORIGIN, base) as Ld[];
    expect(trip.url).toBe("https://www.ttvk.hu/trips/split-vitorlas-tura");
    expect(trip.departureTime).toBe("2027-07-11");
    expect(trip.arrivalTime).toBe("2027-07-18");
    expect(trip.itinerary).toMatchObject({ "@type": "Place", name: "Split, HR", address: { addressLocality: "Split", addressCountry: "HR" } });
    expect(trip.provider).toEqual({ "@type": "Person", name: "Varga Dóra", url: "https://www.ttvk.hu/u/varga-dora" });
    expect(trip.offers).toMatchObject({ price: "2500.00", priceCurrency: "EUR", availability: "https://schema.org/InStock", validThrough: "2027-06-30" });
    expect(trip.keywords).toBe("Vízi sportok, Vitorlázás");
  });

  it("relatív képet abszolúttá tesz; telt házra SoldOut", () => {
    const [trip] = tripStructuredData(ORIGIN, { ...base, imageUrl: "/og/trips/x?v=1", spotsLeft: 0 }) as Ld[];
    expect(trip.image).toEqual(["https://www.ttvk.hu/og/trips/x?v=1"]);
    expect(trip.offers.availability).toBe("https://schema.org/SoldOut");
  });

  it("ár vagy pénznem nélkül nincs ajánlat; hiányzó mezők kimaradnak", () => {
    const [trip] = tripStructuredData(ORIGIN, { slug: "a", title: "A", description: "B", priceAmount: null, priceCurrency: null });
    expect(trip).not.toHaveProperty("offers");
    expect(trip).not.toHaveProperty("provider");
    expect(trip).not.toHaveProperty("itinerary");
    expect(Object.values(trip)).not.toContain(undefined);
  });

  it("útvonalsáv: Trevu › túra", () => {
    const [, crumb] = tripStructuredData(ORIGIN, base) as Ld[];
    expect(crumb["@type"]).toBe("BreadcrumbList");
    expect(crumb.itemListElement.map((i: Ld) => i.item)).toEqual(["https://www.ttvk.hu/", "https://www.ttvk.hu/trips/split-vitorlas-tura"]);
  });

  it("a script-tartalom nem zárhatja le a <script> blokkot", () => {
    const out = jsonLdScript(tripStructuredData(ORIGIN, { ...base, title: "</script><script>alert(1)</script>" }));
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out)[0].name).toBe("</script><script>alert(1)</script>");
  });
});
