import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { admin, clientFor, createTestUser, deleteTestUser, INTEGRATION_ENABLED, type TestUser } from "./_setup";
import { INITIAL_FORM_DATA } from "@/app/(app)/trips/types";
let currentClient: SupabaseClient;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => currentClient }));
vi.mock("@/lib/i18n/server", () => ({ getServerT: async () => ({ t: (key: string) => key }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { saveDraft, publishTrip, applyToTrip, cancelApplication } from "@/app/(app)/trips/actions";

(INTEGRATION_ENABLED ? describe : describe.skip)("real Supabase trip lifecycle", () => {
  let owner: TestUser, applicant: TestUser;
  beforeAll(async () => {
    owner = await createTestUser("lifecycle-owner");
    applicant = await createTestUser("lifecycle-applicant");
  });
  afterAll(async () => {
    if (applicant) await deleteTestUser(applicant.id);
    if (owner) await deleteTestUser(owner.id);
  });
  it("saves, publishes, rejects foreign edits, applies and cancels with correct counters", async () => {
    currentClient = await clientFor(owner);
    const { data: category } = await admin().from("categories").select("id").eq("status", "active").limit(1).single();
    const form = { ...INITIAL_FORM_DATA, category_id: category!.id, title: "Lifecycle test trip",
      start_date: "2027-01-01", end_date: "2027-01-02", require_approval: false, visibility: "public" as const,
      cover_image_url: "https://example.com/cover.jpg" };
    const draft = await saveDraft(form);
    expect(draft.error).toBeUndefined();
    expect(draft.tripId).toBeTruthy();
    const published = await publishTrip(draft.tripId, form);
    expect(published.error).toBeUndefined();
    expect(published.slug.length).toBeLessThanOrEqual(80);
    expect((await saveDraft({ ...form, title: "Edited test trip" }, draft.tripId)).error).toBeUndefined();
    const { data: trip } = await admin().from("trips").select("status,slug").eq("id", draft.tripId).single();
    expect(trip).toMatchObject({ status: "published", slug: published.slug });
    currentClient = await clientFor(applicant);
    expect((await saveDraft(form, draft.tripId)).error).toBeTruthy();
    expect(await applyToTrip(draft.tripId)).toMatchObject({ ok: true, status: "approved" });
    expect((await applyToTrip(draft.tripId)).ok).toBe(false);
    expect((await cancelApplication(draft.tripId)).ok).toBe(true);
    const { data: final } = await admin().from("trips").select("current_participants").eq("id", draft.tripId).single();
    expect(final?.current_participants).toBe(0);
  });
  it("keeps a default private publication hidden from anonymous readers", async () => {
    currentClient = await clientFor(owner);
    const { data: category } = await admin().from("categories").select("id").eq("status", "active").limit(1).single();
    const form = { ...INITIAL_FORM_DATA, category_id: category!.id, title: "Private lifecycle trip",
      start_date: "2027-01-01", end_date: "2027-01-02", cover_image_url: "https://example.com/cover.jpg" };
    expect(form.visibility).toBe("private");
    const draft = await saveDraft(form);
    expect(draft.error).toBeUndefined();
    expect((await publishTrip(draft.tripId, form)).error).toBeUndefined();
    const anonymous = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await anonymous.from("trips").select("id").eq("id", draft.tripId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

});
