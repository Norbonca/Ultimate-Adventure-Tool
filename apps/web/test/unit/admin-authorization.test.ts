import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), role: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.role }) }) }) }),
}) }));
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: mocks.admin }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import { getAdminStats } from "@/app/(admin)/admin/actions";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ADMIN_EMAIL", "bootstrap@example.com");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user", email: "ordinary@example.com" } } });
});
afterEach(() => vi.unstubAllEnvs());
it.each([{ data: null, error: null }, { data: null, error: { message: "DB offline" } }])(
  "denies missing or unavailable admin role without swallowing the redirect: %j", async value => {
    mocks.role.mockResolvedValue(value);
    await expect(getAdminStats()).rejects.toThrow("redirect:/dashboard");
    expect(mocks.admin).not.toHaveBeenCalled();
  },
);
it("does not grant bootstrap access to an unconfirmed email", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user", email: "bootstrap@example.com", email_confirmed_at: null } } });
  mocks.role.mockResolvedValue({ data: null, error: null });
  await expect(getAdminStats()).rejects.toThrow("redirect:/dashboard");
  expect(mocks.admin).not.toHaveBeenCalled();
});
it("requires authentication", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  await expect(getAdminStats()).rejects.toThrow("redirect:/login");
  expect(mocks.admin).not.toHaveBeenCalled();
});
