import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: {} as ReturnType<typeof import("@/lib/supabase/client").createClient>, update: vi.fn(), insert: vi.fn(), upsert: vi.fn(), result: { data: { id: "own" }, error: null } as { data: { id: string } | null; error: { message: string } | null }, emergency: null as { id: string; name: string; phone: string; relationship: string } | null, contactUpdate: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => mocks.client }));
vi.mock("@/lib/i18n/useTranslation", () => ({ useTranslation: () => ({ t: (key: string) => key, locale: "en" }) }));
vi.mock("@/components/ImagePicker", () => ({ ImagePicker: () => null }));
import ProfileSettingsPage from "@/app/(app)/settings/profile/page";
let profileEq: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks(); mocks.result = { data: { id: "own" }, error: null }; mocks.emergency = null;
  profileEq = vi.fn();
  const profileWrite = { eq: profileEq, select: vi.fn(), maybeSingle: () => Promise.resolve(mocks.result) };
  profileEq.mockReturnValue(profileWrite); profileWrite.select.mockReturnValue(profileWrite);
  mocks.update.mockReturnValue(profileWrite); mocks.upsert.mockResolvedValue({ error: { code: "42501", message: "permission denied for table profiles" } });
  const contactWrite = { eq: vi.fn(), select: vi.fn(), single: vi.fn(async () => ({ data: { id: "contact" }, error: null })) };
  contactWrite.eq.mockReturnValue(contactWrite); contactWrite.select.mockReturnValue(contactWrite);
  mocks.insert.mockReturnValue(contactWrite); mocks.contactUpdate.mockReturnValue(contactWrite);
  mocks.client = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "own", email: "own@example.test" } } })) },
    rpc: vi.fn(async () => ({ data: { first_name: "Before", last_name: "User" } })),
    from: (table: string) => {
      if (table === "profiles") return { update: mocks.update, upsert: mocks.upsert, select: () => ({ eq: () => ({ single: async () => ({ data: { slug: "own" } }) }) }) };
      const chain = { select: vi.fn(), eq: vi.fn(), limit: vi.fn(), order: async () => ({ data: [] }), single: async () => ({ data: mocks.emergency }), update: mocks.contactUpdate, insert: mocks.insert, upsert: mocks.upsert };
      chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.limit.mockReturnValue(chain);
      return chain;
    },
  } as unknown as typeof mocks.client;
});
afterEach(cleanup);
async function save() { render(<ProfileSettingsPage />); await screen.findByDisplayValue("Before"); fireEvent.change(document.getElementById("first-name")!, { target: { value: "After" } }); fireEvent.click(screen.getByText("common.saveChanges")); }
it("updates only the current user's editable columns and confirms a returned row", async () => {
  await save(); await screen.findByText("common.saved");
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ first_name: "After" }));
  expect(profileEq).toHaveBeenCalledWith("id", "own");
  const payload = mocks.update.mock.calls[0][0];
  for (const key of ["id", "email", "slug", "subscription_tier", "reputation_points", "email_verified", "verified_organizer"]) expect(payload).not.toHaveProperty(key);
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it("does not claim success when RLS matches no profile", async () => {
  mocks.result = { data: null, error: null }; await save();
  await screen.findByText("errors.saveFailed"); expect(screen.queryByText("common.saved")).toBeNull();
});
it("creates an emergency contact without a nonexistent composite conflict key", async () => {
  render(<ProfileSettingsPage />); await screen.findByDisplayValue("Before");
  fireEvent.change(document.getElementById("emergency-name")!, { target: { value: "Contact" } });
  fireEvent.change(document.getElementById("emergency-phone")!, { target: { value: "+36301234567" } });
  fireEvent.click(screen.getByText("common.saveChanges")); await screen.findByText("common.saved");
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "own", name: "Contact" }));
});
it("updates an existing contact rather than inserting duplicates", async () => {
  mocks.emergency = { id: "contact", name: "Contact", phone: "+36301234567", relationship: "other" };
  await save(); await screen.findByText("common.saved"); expect(mocks.contactUpdate).toHaveBeenCalledOnce(); expect(mocks.insert).not.toHaveBeenCalled();
});
