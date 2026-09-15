import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: { auth: { getUser: vi.fn() }, from: vi.fn() } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/i18n/server", () => ({ getServerT: async () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/system-settings", () => ({ getAutoApprovalThreshold: async () => 15,
  computeDefaultRequireApproval: (size: number, threshold: number) => size <= threshold }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const geo = vi.hoisted(() => ({ geocodeLocation: vi.fn() }));
vi.mock("@/lib/geocoding", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/geocoding")>()),
  geocodeLocation: geo.geocodeLocation,
}));
import { saveDraft, publishTrip } from "@/app/(app)/trips/actions";
import { INITIAL_FORM_DATA } from "@/app/(app)/trips/types";

const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id } } });
  geo.geocodeLocation.mockResolvedValue(null);
});

/** profiles + trips mock where the INSERT branch reports the written payload. */
function mockInsertingClient() {
  const profile = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id } }),
  };
  const inserted: Record<string, unknown>[] = [];
  const trip = {
    insert: vi.fn((payload: Record<string, unknown>) => {
      inserted.push(payload);
      return trip;
    }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "trip-1" }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  mocks.client.from.mockImplementation((table: string) => (table === "profiles" ? profile : trip));
  return { inserted };
}

/** profiles + trips mock for the UPDATE branch; the first maybeSingle is the current location. */
function mockUpdatingClient(current: Record<string, unknown>) {
  const profile = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id } }) };
  const updated: Record<string, unknown>[] = [];
  const trip = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn((payload: Record<string, unknown>) => { updated.push(payload); return trip; }),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn()
      .mockResolvedValueOnce({ data: current })
      .mockResolvedValue({ data: { id: "trip-1" }, error: null }),
  };
  mocks.client.from.mockImplementation((table: string) => (table === "profiles" ? profile : trip));
  return { updated };
}
describe("trip server actions", () => {
  it("rejects unauthenticated writes before DB access", async () => {
    mocks.client.auth.getUser.mockResolvedValue({ data: { user: null } });
    expect(await saveDraft({})).toMatchObject({ error: "errors.notAuthenticated" });
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
  it("rejects invalid input before DB access", async () => {
    expect(await saveDraft({ max_participants: -1 })).toMatchObject({ error: "errors.validationFailed" });
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
  it("cannot publish an incomplete draft", async () => {
    expect(await publishTrip(id, INITIAL_FORM_DATA)).toMatchObject({ error: "errors.validationFailed" });
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
  it("does not report success when UPDATE affects no owned row", async () => {
    const profile = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id } }) };
    const trip = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    mocks.client.from.mockImplementation((table: string) => table === "profiles" ? profile : trip);
    expect(await saveDraft(INITIAL_FORM_DATA, id)).toMatchObject({ error: "errors.saveFailed" });
    expect(trip.eq).toHaveBeenCalledWith("organizer_id", id);
  });

  // ── Globe coordinates (migration 034 + lib/geocoding) ───────────────────
  it("stores the geocoded coordinates with their provenance", async () => {
    const { inserted } = mockInsertingClient();
    geo.geocodeLocation.mockResolvedValue({
      lat: 47.6817, lng: 16.5845, displayName: "Sopron, Győr-Moson-Sopron", source: "nominatim",
    });

    await saveDraft({ ...INITIAL_FORM_DATA, location_country: "HU", location_city: "Sopron" });

    expect(geo.geocodeLocation).toHaveBeenCalledWith(
      expect.objectContaining({ country: "HU", city: "Sopron" })
    );
    expect(inserted[0]).toMatchObject({
      location_lat: 47.6817,
      location_lng: 16.5845,
      location_geocode_source: "nominatim",
    });
  });

  it("still saves the draft when geocoding finds nothing — on the country centroid", async () => {
    const { inserted } = mockInsertingClient();
    geo.geocodeLocation.mockResolvedValue(null);

    const result = await saveDraft({ ...INITIAL_FORM_DATA, location_country: "HU", location_city: "Zzz" });

    expect(result.error).toBeUndefined();
    expect(inserted[0]).toMatchObject({
      location_lat: 47.1625,
      location_lng: 19.5033,
      location_geocode_source: "country_centroid",
    });
  });

  it("clears the coordinates of a new trip in a country without a centroid", async () => {
    const { inserted } = mockInsertingClient();
    geo.geocodeLocation.mockResolvedValue(null);

    await saveDraft({ ...INITIAL_FORM_DATA, location_country: "VN", location_city: "Sapa" });

    expect(inserted[0]).toMatchObject({ location_lat: null, location_lng: null, location_geocode_source: null });
  });

  it("does not re-geocode an unchanged location that already resolved", async () => {
    const profile = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id } }) };
    const trip = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
        // first call: resolveTripCoordinates reads the current location
        .mockResolvedValueOnce({ data: {
          location_country: "HU", location_region: null, location_city: "Sopron",
          location_lat: 47.6817, location_geocode_source: "nominatim",
        } })
        // second call: the UPDATE itself
        .mockResolvedValue({ data: { id: "trip-1" }, error: null }),
    };
    mocks.client.from.mockImplementation((table: string) => (table === "profiles" ? profile : trip));

    await saveDraft({ ...INITIAL_FORM_DATA, location_country: "HU", location_city: "Sopron" }, id);

    expect(trip.update).toHaveBeenCalled(); // the save really ran past validation
    expect(geo.geocodeLocation).not.toHaveBeenCalled();
  });

  it("re-geocodes an edited trip whose location changed", async () => {
    const { updated } = mockUpdatingClient({
      location_country: "HU", location_region: null, location_city: "Sopron",
      location_lat: 47.6817, location_geocode_source: "nominatim",
    });
    geo.geocodeLocation.mockResolvedValue({ lat: 47.9, lng: 20.37, displayName: "Eger", source: "nominatim" });

    await saveDraft({ ...INITIAL_FORM_DATA, location_country: "HU", location_city: "Eger" }, id);

    expect(geo.geocodeLocation).toHaveBeenCalledWith(expect.objectContaining({ city: "Eger" }));
    expect(updated[0]).toMatchObject({ location_lat: 47.9, location_lng: 20.37, location_geocode_source: "nominatim" });
  });

  it("never keeps the old place's point when a changed location cannot be resolved", async () => {
    const { updated } = mockUpdatingClient({
      location_country: "HU", location_region: null, location_city: "Sopron",
      location_lat: 47.6817, location_geocode_source: "nominatim",
    });
    geo.geocodeLocation.mockResolvedValue(null);

    await saveDraft({ ...INITIAL_FORM_DATA, location_country: "AT", location_city: "Nowhere" }, id);

    expect(updated[0]).toMatchObject({ location_lat: 47.5162, location_lng: 14.5501, location_geocode_source: "country_centroid" });
  });

  it("keeps an unchanged placeholder when the retry still finds nothing", async () => {
    const { updated } = mockUpdatingClient({
      location_country: "HU", location_region: null, location_city: "Zzz",
      location_lat: 47.1625, location_geocode_source: "country_centroid",
    });
    geo.geocodeLocation.mockResolvedValue(null);

    await saveDraft({ ...INITIAL_FORM_DATA, location_country: "HU", location_city: "Zzz" }, id);

    expect(geo.geocodeLocation).toHaveBeenCalled();
    expect(updated[0]).not.toHaveProperty("location_lat");
  });
});
