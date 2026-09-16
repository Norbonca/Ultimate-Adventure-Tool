import { z } from "zod";
import { isValidTimeZone } from "@/lib/timezone";

const optionalId = z.union([z.string().uuid(), z.literal("")]);
const date = z.string().date();
const optionalDate = z.union([date, z.literal("")]);
const imageUrl = z.union([z.string().url().refine(value => /^https?:\/\//.test(value)), z.literal("")]);

// Drafts may be incomplete, but their fields must still be well formed.
export const draftTripSchema = z.object({
  category_id: optionalId, category_name: z.string().max(100),
  trip_type: z.enum(["public", "private"]),
  title: z.string().max(200), short_description: z.string().max(500),
  description: z.string().max(20000), start_date: optionalDate, end_date: optionalDate,
  location_country: z.string().regex(/^[A-Z]{2}$/),
  location_region: z.string().max(100), location_city: z.string().max(100),
  max_participants: z.number().int().min(2).max(500),
  min_participants: z.number().int().min(2).max(500),
  staff_seats: z.number().int().min(0).max(50), difficulty: z.number().int().min(1).max(5),
  sub_discipline_id: optionalId, category_details: z.record(z.unknown()),
  visibility: z.enum(["public", "followers_only", "private"]), require_approval: z.boolean(),
  registration_deadline: optionalDate,
  timezone: z.string().max(64).refine(isValidTimeZone, "Invalid timezone"),
  price_amount: z.number().finite().nonnegative().nullable(),
  price_currency: z.string().regex(/^[A-Z]{3}$/), is_cost_sharing: z.boolean(),
  cover_image_url: imageUrl, cover_image_source: z.enum(["system", "user_upload"]),
  card_image_url: imageUrl, card_image_source: z.enum(["system", "user_upload"]),
  tags: z.array(z.string().max(50)).max(30), crew_positions: z.array(z.string()).max(50),
  show_on_landing: z.boolean(),
}).partial().superRefine((value, ctx) => {
  if (value.start_date && value.end_date && value.end_date < value.start_date)
    ctx.addIssue({ code: "custom", path: ["end_date"], message: "Invalid date order" });
  if (value.min_participants && value.max_participants && value.min_participants > value.max_participants)
    ctx.addIssue({ code: "custom", path: ["max_participants"], message: "Invalid capacity" });
});

export const PUBLISH_REQUIRED_FIELDS = ["category_id", "title", "start_date", "end_date", "cover_image_url"] as const;
export type PublishRequiredField = (typeof PUBLISH_REQUIRED_FIELDS)[number];

/** The required publication fields that are still empty, in form order (the wizard names them to the user). */
export function missingPublishFields(value: Partial<Record<PublishRequiredField, string | null | undefined>>): PublishRequiredField[] {
  return PUBLISH_REQUIRED_FIELDS.filter((key) => !value[key]?.trim());
}

export const publishTripSchema = draftTripSchema.superRefine((value, ctx) => {
  for (const key of PUBLISH_REQUIRED_FIELDS) {
    if (!value[key]?.trim()) ctx.addIssue({ code: "custom", path: [key], message: "Required" });
  }
  if (!value.title || value.title.trim().length < 3)
    ctx.addIssue({ code: "custom", path: ["title"], message: "Title too short" });
});
