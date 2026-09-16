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
  it("accepts IANA time zones and a date-only registration deadline", () => {
    expect(publishTripSchema.safeParse({ ...valid, timezone: "Europe/Budapest", registration_deadline: "2027-01-01" }).success).toBe(true);
    expect(publishTripSchema.safeParse({ ...valid, timezone: "UTC" }).success).toBe(true);
  });
  it.each([
    { timezone: "Mars/Olympus_Mons" }, { timezone: "" }, { registration_deadline: "2027-01-01T12:00" },
  ])("rejects invalid time zone or deadline values: %j", value => {
    expect(publishTripSchema.safeParse({ ...valid, ...value }).success).toBe(false);
  });
  it("strips fields outside the input contract", () => {
    expect(draftTripSchema.parse({ ...valid, organizer_id: "attacker", status: "published" }))
      .not.toHaveProperty("organizer_id");
  });
});

describe("missingPublishFields", () => {
  it("names every empty required field in form order", async () => {
    const { missingPublishFields } = await import("@/lib/trip-validation");
    expect(missingPublishFields(INITIAL_FORM_DATA)).toEqual(["category_id", "title", "start_date", "end_date", "cover_image_url"]);
  });
  it("reports only the cover image when that is the one gap", async () => {
    const { missingPublishFields } = await import("@/lib/trip-validation");
    expect(missingPublishFields({ ...valid, cover_image_url: "  " })).toEqual(["cover_image_url"]);
    expect(missingPublishFields(valid)).toEqual([]);
  });
});
