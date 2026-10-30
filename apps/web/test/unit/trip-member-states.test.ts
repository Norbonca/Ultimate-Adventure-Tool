import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: { auth: { getUser: vi.fn() }, from: vi.fn() } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/i18n/server", () => ({ getServerT: async () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/system-settings", () => ({ getAutoApprovalThreshold: async () => 15,
  computeDefaultRequireApproval: (size: number, threshold: number) => size <= threshold }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { waitlistApplication, removeParticipant, checkInParticipant } from "@/app/(app)/trips/actions";

const organizerId = "00000000-0000-4000-8000-000000000001";
const tripId = "00000000-0000-4000-8000-000000000010";
const participantId = "00000000-0000-4000-8000-000000000020";

function tripTable(organizer_id: string | null) {
  return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: organizer_id ? { organizer_id, slug: "test-trip" } : null }) };
}
function participantTable(result: { data: unknown; error?: { message: string } | null }) {
  return { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ error: null, ...result }) };
}
function wire(trip: ReturnType<typeof tripTable>, participants: ReturnType<typeof participantTable>) {
  mocks.client.from.mockImplementation((table: string) => table === "trips" ? trip : participants);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: organizerId } } });
});

describe("M02 lezárás II. — várólista, eltávolítás, check-in (§11.5.3)", () => {
  it("rejects unauthenticated callers and malformed input before DB access", async () => {
    mocks.client.auth.getUser.mockResolvedValue({ data: { user: null } });
    expect(await waitlistApplication(tripId, participantId)).toMatchObject({ ok: false, error: "errors.notAuthenticated" });
    mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: organizerId } } });
    expect(await removeParticipant(tripId, participantId, "x".repeat(1001))).toMatchObject({ error: "errors.validationFailed" });
    expect(await checkInParticipant("nope", participantId)).toMatchObject({ error: "errors.validationFailed" });
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
  it("only the organizer may change member state", async () => {
    const participants = participantTable({ data: { id: participantId } });
    wire(tripTable("00000000-0000-4000-8000-000000000099"), participants);
    expect(await removeParticipant(tripId, participantId)).toMatchObject({ ok: false, error: "trips.errors.organizerOnly" });
    expect(participants.update).not.toHaveBeenCalled();
  });
  it("waitlist: pending → waitlisted, scoped to trip and non-staff", async () => {
    const participants = participantTable({ data: { id: participantId } });
    wire(tripTable(organizerId), participants);
    expect(await waitlistApplication(tripId, participantId)).toEqual({ ok: true });
    expect(participants.update).toHaveBeenCalledWith({ status: "waitlisted" });
    expect(participants.in).toHaveBeenCalledWith("status", ["pending"]);
    expect(participants.eq).toHaveBeenCalledWith("is_staff_seat", false);
  });
  it("remove: member statuses → removed with timestamp and trimmed message", async () => {
    const participants = participantTable({ data: { id: participantId } });
    wire(tripTable(organizerId), participants);
    expect(await removeParticipant(tripId, participantId, "  Nem fizetett.  ")).toEqual({ ok: true });
    const payload = participants.update.mock.calls[0][0];
    expect(payload).toMatchObject({ status: "removed", removal_message: "Nem fizetett." });
    expect(payload.removed_at).toBeTruthy();
    expect(participants.in).toHaveBeenCalledWith("status", ["approved", "approved_pending_payment", "participant"]);
  });
  it("remove without message stores null", async () => {
    const participants = participantTable({ data: { id: participantId } });
    wire(tripTable(organizerId), participants);
    await removeParticipant(tripId, participantId);
    expect(participants.update.mock.calls[0][0].removal_message).toBeNull();
  });
  it("check-in: approved → participant with checked_in flag and time", async () => {
    const participants = participantTable({ data: { id: participantId } });
    wire(tripTable(organizerId), participants);
    expect(await checkInParticipant(tripId, participantId)).toEqual({ ok: true });
    const payload = participants.update.mock.calls[0][0];
    expect(payload).toMatchObject({ status: "participant", checked_in: true });
    expect(payload.checked_in_at).toBeTruthy();
    expect(participants.in).toHaveBeenCalledWith("status", ["approved", "approved_pending_payment"]);
  });
  it("maps a no-row update to participantStateChanged and DB errors to saveFailed", async () => {
    wire(tripTable(organizerId), participantTable({ data: null }));
    expect(await checkInParticipant(tripId, participantId)).toMatchObject({ ok: false, error: "trips.errors.participantStateChanged" });
    wire(tripTable(organizerId), participantTable({ data: null, error: { message: "boom" } }));
    expect(await removeParticipant(tripId, participantId)).toMatchObject({ ok: false, error: "errors.saveFailed" });
  });
});
