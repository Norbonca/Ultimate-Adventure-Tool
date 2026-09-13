import { describe, it, expect } from "vitest";
import { draftTripSchema, publishTripSchema } from "@/lib/trip-validation";
import { INITIAL_FORM_DATA } from "@/app/(app)/trips/types";

const valid = { ...INITIAL_FORM_DATA, category_id: "00000000-0000-4000-8000-000000000001",
  title: "Weekend hiking", start_date: "2027-01-01", end_date: "2027-01-02",
  cover_image_url: "https://example.com/cover.jpg" };

describe("trip action boundary validation", () => {
  it("allows incomplete drafts but rejects incomplete publication", () => {
    expect(draftTripSchema.safeParse(INITIAL_FORM_DATA).success).toBe(true);
    expect(publishTripSchema.safeParse(INITIAL_FORM_DATA).success).toBe(false);
  });
  it("accepts a complete publication", () => expect(publishTripSchema.safeParse(valid).success).toBe(true));
  it.each([
    { max_participants: -1 }, { max_participants: "10" }, { min_participants: 11 },
    { end_date: "2026-01-01" }, { start_date: "2027-02-30" },
    { price_amount: -10 }, { category_id: "invalid" },
    { cover_image_url: "javascript:alert(1)" }, { visibility: "everyone" },
  ])("rejects invalid values: %j", value => {
    expect(publishTripSchema.safeParse({ ...valid, ...value }).success).toBe(false);
  });
  it("strips fields outside the input contract", () => {
    expect(draftTripSchema.parse({ ...valid, organizer_id: "attacker", status: "published" }))
      .not.toHaveProperty("organizer_id");
  });
});
