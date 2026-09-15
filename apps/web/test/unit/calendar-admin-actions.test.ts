import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), role: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.role }) }) }) }),
  }),
}));
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: mocks.admin }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  deleteCalendarOccurrence,
  generateCalendarOccurrences,
  saveCalendarOccurrence,
  saveCalendarPeriod,
  saveCalendarTag,
  verifyCalendarOccurrence,
} from "@/app/(admin)/admin/calendar/actions";

const validPeriod = {
  key: "hu_test_period",
  labelHu: "Teszt",
  labelEn: "Test",
  periodType: "public_holiday",
  countryCode: "HU",
  subdivisionCode: null,
  hemisphere: null,
  ruleKind: "fixed_annual",
  ruleParams: { month: 5, day: 1 },
  durationDays: null,
  isDayOff: true,
  sourceText: "Teszt forrás",
  sourceUrl: null,
  status: "active",
  tagIds: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ADMIN_EMAIL", "bootstrap@example.com");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user", email: "ordinary@example.com" } } });
});
afterEach(() => vi.unstubAllEnvs());

describe("M23 admin Server Actionök — jogosultság (11. fejezet)", () => {
  const calls: Array<[string, () => Promise<unknown>]> = [
    ["saveCalendarPeriod", () => saveCalendarPeriod(validPeriod)],
    ["saveCalendarOccurrence", () => saveCalendarOccurrence({ periodId: "00000000-0000-4000-8000-000000000001", earliest: "2027-01-01", latest: "2027-01-01" })],
    ["verifyCalendarOccurrence", () => verifyCalendarOccurrence("00000000-0000-4000-8000-000000000001")],
    ["deleteCalendarOccurrence", () => deleteCalendarOccurrence("00000000-0000-4000-8000-000000000001")],
    ["generateCalendarOccurrences", () => generateCalendarOccurrences()],
    ["saveCalendarTag", () => saveCalendarTag({ key: "x_tag", labelHu: "x", labelEn: "x", iconKey: null, colorToken: null, sortOrder: 1, status: "active" })],
  ];

  it.each(calls)("%s: nem admin felhasználót átirányít, service role kliens nem jön létre", async (_name, call) => {
    mocks.role.mockResolvedValue({ data: null, error: null });
    await expect(call()).rejects.toThrow("redirect:/admin/login");
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("adatbázis-hibánál sem enged át (az átirányítás nem nyelődik el)", async () => {
    mocks.role.mockResolvedValue({ data: null, error: { message: "DB offline" } });
    await expect(generateCalendarOccurrences()).rejects.toThrow("redirect:/admin/login");
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("megerősítetlen bootstrap e-mail nem admin", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user", email: "bootstrap@example.com", email_confirmed_at: null } } });
    mocks.role.mockResolvedValue({ data: null, error: null });
    await expect(generateCalendarOccurrences()).rejects.toThrow("redirect:/admin/login");
  });

  it("bejelentkezés nélkül a belépésre irányít", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(saveCalendarPeriod(validPeriod)).rejects.toThrow("redirect:/admin/login");
  });
});

describe("M23 admin Server Actionök — validáció a határon", () => {
  beforeEach(() => {
    mocks.role.mockResolvedValue({ data: { id: "role" }, error: null });
    mocks.admin.mockReturnValue({ from: vi.fn(), rpc: vi.fn() });
  });

  it("hibás szabály → ruleInvalid, adatbázis-hívás nélkül", async () => {
    const res = await saveCalendarPeriod({ ...validPeriod, ruleParams: { month: 13, day: 1 } });
    expect(res).toEqual({ ok: false, error: "ruleInvalid" });
    expect(mocks.admin.mock.results[0].value.from).not.toHaveBeenCalled();
  });

  it("félteke csak évszaknál, ország kötelező ünnepnél → validationFailed", async () => {
    expect(await saveCalendarPeriod({ ...validPeriod, hemisphere: "north" })).toEqual({ ok: false, error: "validationFailed" });
    expect(await saveCalendarPeriod({ ...validPeriod, countryCode: null })).toEqual({ ok: false, error: "validationFailed" });
  });

  it("fordított vagy túl hosszú tartomány → invalidRange", async () => {
    const periodId = "00000000-0000-4000-8000-000000000001";
    expect(await saveCalendarOccurrence({ periodId, earliest: "2027-04-04", latest: "2027-03-25" })).toEqual({ ok: false, error: "invalidRange" });
    expect(await saveCalendarOccurrence({ periodId, earliest: "2027-01-01", latest: "2028-06-01" })).toEqual({ ok: false, error: "invalidRange" });
  });

  it("hibás azonosító → validationFailed", async () => {
    expect(await verifyCalendarOccurrence("not-a-uuid")).toEqual({ ok: false, error: "validationFailed" });
  });
});
