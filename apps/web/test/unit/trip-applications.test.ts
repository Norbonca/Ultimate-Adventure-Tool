import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: { auth: { getUser: vi.fn() }, from: vi.fn() } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/i18n/server", () => ({ getServerT: async () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/system-settings", () => ({ getAutoApprovalThreshold: async () => 15,
  computeDefaultRequireApproval: (size: number, threshold: number) => size <= threshold }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { approveApplication, rejectApplication } from "@/app/(app)/trips/actions";

const organizerId = "00000000-0000-4000-8000-000000000001";
const tripId = "00000000-0000-4000-8000-000000000010";
const participantId = "00000000-0000-4000-8000-000000000020";

function tripTable(organizer_id: string | null) {
  return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: organizer_id ? { organizer_id, slug: "test-trip" } : null }) };
}
function participantTable(result: { data: unknown; error?: { message: string } | null }) {
  const table = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ error: null, ...result }) };
  return table;
}
function wire(trip: ReturnType<typeof tripTable>, participants: ReturnType<typeof participantTable>) {
  mocks.client.from.mockImplementation((table: string) => table === "trips" ? trip : participants);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: organizerId } } });
});

describe("organizer application decisions", () => {
  it("rejects unauthenticated callers before DB access", async () => {
    mocks.client.auth.getUser.mockResolvedValue({ data: { user: null } });
    expect(await approveApplication(tripId, participantId)).toMatchObject({ ok: false, error: "errors.notAuthenticated" });
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
  it("rejects malformed ids and over-long reasons before DB access", async () => {
    expect(await approveApplication("not-a-uuid", participantId)).toMatchObject({ error: "errors.validationFailed" });
    expect(await rejectApplication(tripId, participantId, "x".repeat(1001))).toMatchObject({ error: "errors.validationFailed" });
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
  it("only the organizer may decide", async () => {
    const participants = participantTable({ data: { id: participantId } });
    wire(tripTable("00000000-0000-4000-8000-000000000099"), participants);
    expect(await approveApplication(tripId, participantId)).toMatchObject({ ok: false, error: "trips.errors.organizerOnly" });
    expect(participants.update).not.toHaveBeenCalled();
  });
  it("approve writes approved + approved_at, scoped to trip, non-staff, pending/waitlisted", async () => {
    const participants = participantTable({ data: { id: participantId } });
    wire(tripTable(organizerId), participants);
    expect(await approveApplication(tripId, participantId)).toEqual({ ok: true });
    expect(participants.update).toHaveBeenCalledWith(expect.objectContaining({ status: "approved", rejection_reason: null }));
    expect(participants.update.mock.calls[0][0].approved_at).toBeTruthy();
    expect(participants.eq).toHaveBeenCalledWith("id", participantId);
    expect(participants.eq).toHaveBeenCalledWith("trip_id", tripId);
    expect(participants.eq).toHaveBeenCalledWith("is_staff_seat", false);
    expect(participants.in).toHaveBeenCalledWith("status", ["pending", "waitlisted"]);
  });
  it("reject stores the trimmed reason and never sets approved_at", async () => {
    const participants = participantTable({ data: { id: participantId } });
    wire(tripTable(organizerId), participants);
    expect(await rejectApplication(tripId, participantId, "  Nincs elég tapasztalat  ")).toEqual({ ok: true });
    const payload = participants.update.mock.calls[0][0];
    expect(payload).toEqual({ status: "rejected", rejection_reason: "Nincs elég tapasztalat" });
  });
  it("reports when no pending row was affected (withdrawn or already decided)", async () => {
    wire(tripTable(organizerId), participantTable({ data: null }));
    expect(await approveApplication(tripId, participantId)).toMatchObject({ ok: false, error: "trips.errors.applicationNotPending" });
  });
  it("maps the capacity trigger error to tripFull", async () => {
    wire(tripTable(organizerId), participantTable({ data: null, error: { message: "trip_full" } }));
    expect(await approveApplication(tripId, participantId)).toMatchObject({ ok: false, error: "trips.errors.tripFull" });
  });
});
