import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), role: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.role }) }) }) }),
}) }));
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: mocks.admin }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import * as actions from "@/app/(admin)/admin/admin-users/actions";
const calls = [
  () => actions.getAdminRoles(),
  () => actions.grantAdmin({ email: "target@example.test", role: "super_admin" }),
  () => actions.updateAdminRole("target-role", "super_admin"),
  () => actions.revokeAdmin("target-role"),
];
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("ADMIN_EMAIL", "bootstrap@example.test");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "actor", email: "actor@example.test", email_confirmed_at: "2026-01-01" } } });
  mocks.admin.mockImplementation(() => { throw new Error("SERVICE_ROLE_REACHED"); });
});
afterEach(() => vi.unstubAllEnvs());
describe.each(["support_agent", "content_moderator", "finance_admin", "operations_admin"])("%s", role => {
  it.each(calls)("refuses admin-role action before service-role access %#", async call => {
    mocks.role.mockResolvedValue({ data: { id: "role", role }, error: null });
    await expect(call()).rejects.toThrow("redirect:/admin/login");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
});
it.each(calls)("permits an active super-admin to reach the guarded service operation %#", async call => {
  mocks.role.mockResolvedValue({ data: { id: "role", role: "super_admin" }, error: null });
  await expect(call()).rejects.toThrow("SERVICE_ROLE_REACHED");
  expect(mocks.admin).toHaveBeenCalledOnce();
});
