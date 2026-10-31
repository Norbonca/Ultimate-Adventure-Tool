/**
 * M22 — validáció (10. fejezet) és tartalmi tilalom (BR-M22-011: e-mail, telefonszám, webcím — Norbert
 * 2026-10-31: A, tiltás). A hibakulcsok az `ideas.errors.*` szekcióra mutatnak (11. fejezet).
 */

import { z } from "zod";
import { CONTINENTS, IDEA_CLOSE_REASONS, IDEA_INTENTS, IDEA_REPORT_REASONS, IDEA_VISIBILITIES } from "./types";

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
const URL_RE = /(https?:\/\/|www\.)[^\s]+|\b[\w-]+\.(com|hu|eu|net|org|io|de|at|sk|ro|co|me|info|app|dev|ly|to)(\/[^\s]*)?\b/i;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;

/** Telefonszám-gyanús számsor: legalább 9 számjegy egy tömbben (a dátumok — 2027. 08. 10. — 8 számjegyűek). */
function looksLikePhone(text: string): boolean {
  for (const m of text.match(PHONE_RE) ?? []) {
    if (m.replace(/\D/g, "").length >= 9) return true;
  }
  return false;
}

/** Elérhetőség vagy link a szövegben? (BR-M22-011) */
export function containsContact(text: string | null | undefined): boolean {
  if (!text) return false;
  return EMAIL_RE.test(text) || URL_RE.test(text) || looksLikePhone(text);
}

const month = z.coerce.number().int().min(1).max(12);
const cleanText = (max: number) => z.string().trim().max(max).transform((v) => v || null).nullable().optional();

export const destinationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  continent: z.enum(CONTINENTS).nullable().optional(),
  country_codes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(10).default([]),
}).refine((d) => d.continent || d.country_codes.length > 0, { message: "destinationRequired", path: ["country_codes"] });

export const ideaInputSchema = z
  .object({
    title: z.string().trim().min(10, "titleLength").max(120, "titleLength"),
    category_id: z.string().uuid("categoryRequired"),
    sub_discipline_id: z.string().uuid().nullable().optional(),
    destinations: z.array(destinationSchema).min(1, "destinationRequired").max(5, "destinationMax"),
    window_start_month: month,
    window_end_month: month,
    window_year: z.coerce.number().int().min(2024).max(2100).optional(),
    period_key: z.string().max(40).nullable().optional(),
    duration_min_days: z.coerce.number().int().min(1).max(90).nullable().optional(),
    duration_max_days: z.coerce.number().int().min(1).max(90).nullable().optional(),
    description: cleanText(2000),
    difficulty: z.coerce.number().int().min(1).max(5).nullable().optional(),
    group_size_min: z.coerce.number().int().min(2).max(50).nullable().optional(),
    group_size_max: z.coerce.number().int().min(2).max(50).nullable().optional(),
    budget_amount: z.coerce.number().positive().nullable().optional(),
    budget_currency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
    intent: z.enum(IDEA_INTENTS).default("seeking_organizer"),
    visibility: z.enum(IDEA_VISIBILITIES).default("public"),
    language: z.enum(["hu", "en"]).default("hu"),
    created_via: z.enum(["form", "discover_empty", "taste_result", "board"]).default("form"),
  })
  .superRefine((v, ctx) => {
    if (v.duration_min_days && v.duration_max_days && v.duration_max_days < v.duration_min_days) ctx.addIssue({ code: "custom", message: "durationRange", path: ["duration_max_days"] });
    if (v.group_size_min && v.group_size_max && v.group_size_max < v.group_size_min) ctx.addIssue({ code: "custom", message: "groupSizeRange", path: ["group_size_max"] });
    if ((v.budget_amount && !v.budget_currency) || (!v.budget_amount && v.budget_currency)) ctx.addIssue({ code: "custom", message: "budgetInvalid", path: ["budget_amount"] });
    if (containsContact(v.title)) ctx.addIssue({ code: "custom", message: "contactNotAllowed", path: ["title"] });
    if (containsContact(v.description)) ctx.addIssue({ code: "custom", message: "contactNotAllowed", path: ["description"] });
  });
export type IdeaInput = z.infer<typeof ideaInputSchema>;

export const joinSchema = z.object({
  idea_id: z.string().uuid(),
  note: cleanText(300),
  preferred_months: z.array(month).max(12).default([]),
  is_anonymous: z.boolean().default(false),
  party_size: z.coerce.number().int().min(1, "partySizeRange").max(10, "partySizeRange").default(1),
  joined_via: z.enum(["detail", "discover_empty", "similar_offer", "link"]).default("detail"),
}).superRefine((v, ctx) => { if (containsContact(v.note)) ctx.addIssue({ code: "custom", message: "contactNotAllowed", path: ["note"] }); });
export type JoinInput = z.infer<typeof joinSchema>;

export const offerSchema = z.object({
  idea_id: z.string().uuid(),
  message: cleanText(500),
  planned_months: z.array(month).max(12).default([]),
}).superRefine((v, ctx) => { if (containsContact(v.message)) ctx.addIssue({ code: "custom", message: "contactNotAllowed", path: ["message"] }); });
export type OfferInput = z.infer<typeof offerSchema>;

export const closeSchema = z.object({ idea_id: z.string().uuid(), reason: z.enum(IDEA_CLOSE_REASONS) });
export const renewSchema = z.object({ idea_id: z.string().uuid(), window_start_month: month, window_end_month: month, window_year: z.coerce.number().int().min(2024).max(2100).optional() });
export const reportSchema = z.object({ idea_id: z.string().uuid(), reason: z.enum(IDEA_REPORT_REASONS), details: cleanText(500) });

/** A zod-hibából az első `ideas.errors.*` kulcs (a mezőnév a path első eleme). */
export function firstIssue(err: z.ZodError): { field: string; key: string } {
  const i = err.issues[0];
  const msg = i?.message ?? "invalid";
  const known = ["titleLength","categoryRequired","destinationRequired","destinationMax","windowInPast","windowTooFar","durationRange","groupSizeRange","contactNotAllowed","tooGeneral","dailyLimit","budgetInvalid","partySizeRange"];
  return { field: String(i?.path?.[0] ?? ""), key: known.includes(msg) ? msg : "invalid" };
}
