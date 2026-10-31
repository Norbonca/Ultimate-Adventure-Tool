import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ signIn: vi.fn(), signOut: vi.fn(), admin: vi.fn(), access: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signInWithPassword: mocks.signIn, signOut: mocks.signOut } }) }));
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: mocks.admin }));
vi.mock("@/lib/admin-auth", () => ({ getPlatformAdmin: mocks.access }));
vi.mock("@/lib/i18n/server", () => ({ getServerT: async () => ({ t: (key: string) => key }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import { adminLogin } from "@/app/(admin-public)/admin/login/actions";
function form(email = "assigned@example.test", password = "TestPass123!") { const data = new FormData(); data.set("email", email); data.set("password", password); return data; }
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("ADMIN_EMAIL", "bootstrap@example.test");
  mocks.signIn.mockResolvedValue({ error: null }); mocks.signOut.mockResolvedValue({ error: null });
  mocks.access.mockResolvedValue({ id: "assigned" });
});
afterEach(() => vi.unstubAllEnvs());
it("accepts an assigned active admin independent of ADMIN_EMAIL", async () => {
  await expect(adminLogin(null, form())).rejects.toThrow("redirect:/admin");
  expect(mocks.signIn).toHaveBeenCalledOnce(); expect(mocks.access).toHaveBeenCalledOnce();
});
it("accepts assigned admins when bootstrap email is unset", async () => {
  vi.stubEnv("ADMIN_EMAIL", "");
  await expect(adminLogin(null, form())).rejects.toThrow("redirect:/admin");
});
it("signs out authenticated accounts without an active admin grant", async () => {
  mocks.access.mockResolvedValue(null);
  expect(await adminLogin(null, form())).toEqual({ error: "admin.login.failed" });
  expect(mocks.signOut).toHaveBeenCalledOnce();
});
it("does not create privileged accounts after invalid credentials", async () => {
  mocks.signIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
  expect(await adminLogin(null, form("bootstrap@example.test"))).toEqual({ error: "admin.login.failed" });
  expect(mocks.admin).not.toHaveBeenCalled(); expect(mocks.access).not.toHaveBeenCalled();
});
it("rejects missing credentials before auth calls", async () => {
  expect(await adminLogin(null, form("", ""))).toEqual({ error: "admin.login.requiredFields" });
  expect(mocks.signIn).not.toHaveBeenCalled();
});
