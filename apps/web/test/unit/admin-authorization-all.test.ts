// SEC-013: every admin server action must refuse a signed-in non-admin before touching the
// service-role client. The trip-config and admin-users guards used to swallow redirect() in try/catch.
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), role: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.role, single: mocks.role }) }) }) }),
}) }));
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: mocks.admin }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import * as tripConfig from "@/app/(admin)/admin/trip-config/actions";
import * as adminUsers from "@/app/(admin)/admin/admin-users/actions";

const uuid = "00000000-0000-4000-8000-000000000001";
const calls: [string, () => Promise<unknown>][] = [
  ["getTripConfigData", () => tripConfig.getTripConfigData()],
  ["upsertCategory", () => tripConfig.upsertCategory({ name: "x", name_hu: "x", name_en: "x", icon_name: "x", color_hex: "#000000", status: "active", display_order: 1 } as never)],
  ["upsertSubDiscipline", () => tripConfig.upsertSubDiscipline({ category_id: uuid, name_hu: "x", name_en: "x", status: "active" } as never)],
  ["deleteSubDiscipline", () => tripConfig.deleteSubDiscipline(uuid)],
  ["upsertParameter", () => tripConfig.upsertParameter({ category_id: uuid } as never)],
  ["deleteParameter", () => tripConfig.deleteParameter(uuid)],
  ["getParameterOptions", () => tripConfig.getParameterOptions(uuid)],
  ["upsertParameterOption", () => tripConfig.upsertParameterOption({ parameter_id: uuid, value: "x", label_hu: "x", label_en: "x" } as never)],
  ["deleteParameterOption", () => tripConfig.deleteParameterOption(uuid)],
  ["getAdminRoles", () => adminUsers.getAdminRoles()],
  ["grantAdmin", () => adminUsers.grantAdmin({ email: "attacker@example.com", role: "super_admin" } as never)],
  ["updateAdminRole", () => adminUsers.updateAdminRole(uuid, "super_admin")],
  ["revokeAdmin", () => adminUsers.revokeAdmin(uuid)],
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ADMIN_EMAIL", "bootstrap@example.com");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user", email: "ordinary@example.com" } } });
  mocks.role.mockResolvedValue({ data: null, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe.each(calls)("%s", (_name, call) => {
  it("refuses a signed-in non-admin without using the service role", async () => {
    await expect(call()).rejects.toThrow("redirect:/admin/login");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("refuses the bootstrap e-mail while it is unconfirmed", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user", email: "bootstrap@example.com", email_confirmed_at: null } } });
    await expect(call()).rejects.toThrow("redirect:/admin/login");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(call()).rejects.toThrow("redirect:/admin/login");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
});
