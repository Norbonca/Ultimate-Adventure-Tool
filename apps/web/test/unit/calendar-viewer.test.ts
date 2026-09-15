import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), country: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc, from: mocks.from }),
}));

import { getViewerCalendar, getViewerCalendarPeriods } from "@/lib/calendar/service";

const none = { country: null, source: "none", timezone: "UTC" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mocks.from.mockImplementation((table: string) => {
    if (table !== "ref_countries") throw new Error(`unexpected table: ${table}`);
    return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.country }) }) }) };
  });
});

describe("M23 néző naptára — szolgáltatásréteg (BR-M23-006)", () => {
  it("a profil aktív országa és időzónája", async () => {
    mocks.rpc.mockResolvedValue({ data: { country_code: "AT", timezone: "Europe/Vienna" } });
    mocks.country.mockResolvedValue({ data: { code: "AT" } });
    await expect(getViewerCalendar()).resolves.toEqual({ country: "AT", source: "profile", timezone: "Europe/Vienna" });
    expect(mocks.rpc).toHaveBeenCalledWith("get_my_profile");
  });

  it("kijelentkezve: null + UTC, profil- és országlekérdezés nélkül", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(getViewerCalendar()).resolves.toEqual(none);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("a profilban nincs ország: null + UTC (nincs HU alapértelmezés)", async () => {
    mocks.rpc.mockResolvedValue({ data: { country_code: null, timezone: "Europe/Budapest" } });
    await expect(getViewerCalendar()).resolves.toEqual(none);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("inaktív vagy ismeretlen ország: null + UTC", async () => {
    mocks.rpc.mockResolvedValue({ data: { country_code: "RU", timezone: "Europe/Moscow" } });
    mocks.country.mockResolvedValue({ data: null });
    await expect(getViewerCalendar()).resolves.toEqual(none);
  });

  it("ország nélkül nincs országspecifikus időszak (üres lista, coverage none)", async () => {
    mocks.rpc.mockResolvedValue({ data: null });
    await expect(getViewerCalendarPeriods({ from: "2027-01-01", to: "2027-12-31" })).resolves.toEqual({
      ok: true,
      data: { calendar: none, coverage: "none", items: [] },
    });
  });
});
