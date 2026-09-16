/**
 * M23 Calendar — zod-sémák a Server Actionök és a lekérdező szolgáltatás határán (10. fejezet).
 * A szabályok az adatbázis CHECK-jeinek tükrei (043), hogy a hiba az űrlapon derüljön ki.
 */

import { z } from "zod";
import { isIsoDate } from "./period";
import { diffDays, RULE_KINDS, validateRuleParams, type RuleKind } from "./rules";

export const PERIOD_TYPES = [
  "national_holiday",
  "public_holiday",
  "bridge_day",
  "swapped_workday",
  "holiday_season",
  "school_holiday",
  "season",
  "custom",
] as const;
export type PeriodType = (typeof PERIOD_TYPES)[number];

export const CALENDAR_STATUSES = ["active", "inactive"] as const;
export const OCCURRENCE_STATUSES = ["generated", "entered", "verified"] as const;
export type OccurrenceStatus = (typeof OCCURRENCE_STATUSES)[number];

const keySchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9_]+$/);
const nameSchema = z.string().trim().min(1).max(200);
const optionalText = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => (v ? v : null));
const isoDateSchema = z.string().refine(isIsoDate);

export const periodInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    key: keySchema,
    labelHu: nameSchema,
    labelEn: nameSchema,
    descriptionHu: optionalText(1000),
    descriptionEn: optionalText(1000),
    periodType: z.enum(PERIOD_TYPES),
    countryCode: z.string().regex(/^[A-Z]{2}$/).nullable(),
    subdivisionCode: z.string().trim().regex(/^[A-Z]{2}-[A-Z0-9]{1,3}$/).nullable(),
    hemisphere: z.enum(["north", "south"]).nullable(),
    ruleKind: z.enum(RULE_KINDS as [RuleKind, ...RuleKind[]]),
    ruleParams: z.record(z.unknown()),
    durationDays: z.number().int().min(1).max(366).nullable(),
    isDayOff: z.boolean(),
    sourceText: z.string().trim().min(1).max(1000),
    sourceUrl: z.string().trim().url().regex(/^https?:\/\//).nullable(),
    status: z.enum(CALENDAR_STATUSES),
    tagIds: z.array(z.string().uuid()).max(50),
  })
  .superRefine((value, ctx) => {
    if (!validateRuleParams(value.ruleKind, value.ruleParams)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ruleParams"], message: "ruleInvalid" });
    }
    if (value.hemisphere && value.periodType !== "season") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hemisphere"], message: "hemisphereOnlySeason" });
    }
    if (!value.countryCode && value.periodType !== "season" && value.periodType !== "custom") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["countryCode"], message: "countryRequired" });
    }
    if (value.subdivisionCode && (!value.countryCode || !value.subdivisionCode.startsWith(`${value.countryCode}-`))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subdivisionCode"], message: "subdivisionMismatch" });
    }
  });
export type PeriodInput = z.infer<typeof periodInputSchema>;

export const occurrenceInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    periodId: z.string().uuid(),
    earliest: isoDateSchema,
    latest: isoDateSchema,
    sourceNote: optionalText(1000),
  })
  .superRefine((value, ctx) => {
    const days = diffDays(value.earliest, value.latest);
    if (days < 0 || days > 366) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["latest"], message: "invalidRange" });
    }
  });
export type OccurrenceInput = z.infer<typeof occurrenceInputSchema>;

export const tagInputSchema = z.object({
  id: z.string().uuid().optional(),
  key: keySchema.max(40),
  labelHu: nameSchema,
  labelEn: nameSchema,
  iconKey: z.string().trim().regex(/^[a-z0-9-]+$/).max(50).nullable(),
  colorToken: z.string().trim().regex(/^[a-z][a-z0-9-]*$/).max(40).nullable(),
  sortOrder: z.number().int().min(0).max(9999),
  status: z.enum(CALENDAR_STATUSES),
});
export type TagInput = z.infer<typeof tagInputSchema>;

/** A publikus lekérdezés paraméterei; a tartomány legfeljebb 3 év (10. fejezet: `400 invalid_params`). */
export const periodsQuerySchema = z
  .object({
    country: z.string().regex(/^[A-Z]{2}$/),
    from: isoDateSchema,
    to: isoDateSchema,
    types: z.array(z.enum(PERIOD_TYPES)).optional(),
    tags: z.array(keySchema.max(40)).optional(),
    locale: z.enum(["hu", "en"]).default("hu"),
  })
  .refine((q) => {
    const days = diffDays(q.from, q.to);
    return days >= 0 && days <= 366 * 3;
  }, { message: "invalidRange", path: ["to"] });
export type PeriodsQuery = z.input<typeof periodsQuerySchema>;
