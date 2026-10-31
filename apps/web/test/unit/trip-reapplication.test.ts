import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: { auth: { getUser: vi.fn() }, from: vi.fn() } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/i18n/server", () => ({ getServerT: async () => ({ t: (key: string) => key }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { applyToTrip } from "@/app/(app)/trips/actions";

beforeEach(() => vi.clearAllMocks());
it("starts a removed member's new application without old check-in or organizer metadata", async () => {
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: "guest" } } });
  const trip = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: {
    id: "trip", organizer_id: "organizer", status: "published", require_approval: true, max_participants: 4, current_participants: 0,
  } }) };
  const participant = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: "member", status: "removed" } }), update: vi.fn().mockReturnThis() };
  mocks.client.from.mockImplementation((table: string) => table === "trips" ? trip : participant);
  expect(await applyToTrip("trip", "New application")).toMatchObject({ ok: true, status: "pending" });
  expect(participant.update).toHaveBeenCalledWith(expect.objectContaining({
    status: "pending", application_text: "New application", approved_at: null,
    checked_in: false, checked_in_at: null, paid_at: null, rejection_reason: null,
    removed_at: null, removal_message: null, crew_position_id: null, skill_match: null,
    is_staff_seat: false, staff_role_label: null,
  }));
});
