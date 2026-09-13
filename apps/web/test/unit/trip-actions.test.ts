import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: { auth: { getUser: vi.fn() }, from: vi.fn() } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/i18n/server", () => ({ getServerT: async () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/system-settings", () => ({ getAutoApprovalThreshold: async () => 15,
  computeDefaultRequireApproval: (size: number, threshold: number) => size <= threshold }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { saveDraft, publishTrip } from "@/app/(app)/trips/actions";
import { INITIAL_FORM_DATA } from "@/app/(app)/trips/types";

const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id } } });
});
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
});
