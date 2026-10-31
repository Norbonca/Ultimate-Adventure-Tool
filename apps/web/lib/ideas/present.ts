/**
 * M22 — megjelenítési segédek (szerveroldal): kategória-chip, célterület-szöveg, időablak, állapot.
 * A szövegek i18n-kulcsból (NK-M22-006); a hónap- és országnevek Intl-ből.
 */

import { createClient } from "@/lib/supabase/server";
import type { CategoryToken } from "@/components/discover/TripBand";
import { CATEGORY_DISPLAY } from "@/lib/categories";
import { formatWindow } from "./window";
import type { IdeaListItem, IdeaStatus } from "./types";

type T = (key: string, params?: Record<string, string | number>) => string;

const TOKEN_BY_NAME: Record<string, CategoryToken> = {
  Hiking: "hiking", Mountaineering: "climbing", Mountain: "climbing", Climbing: "climbing", "Water Sports": "water",
  Cycling: "cycling", Motorsport: "motorsport", Running: "running", "Winter Sports": "winter", Expedition: "expedition",
};

export function categoryChip(cat: IdeaListItem["category"], locale: string): { label: string; token: CategoryToken; icon: string } | null {
  if (!cat) return null;
  const display = CATEGORY_DISPLAY[cat.name];
  const label = cat.name_localized?.[locale] ?? (locale === "en" ? display?.nameEn : display?.nameHu) ?? cat.name;
  return { label, token: TOKEN_BY_NAME[cat.name] ?? "hiking", icon: display?.icon ?? cat.icon_name ?? "mountain" };
}

export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale === "en" ? "en" : "hu"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** „Balti-tenger vagy Finn-öböl · FI, EE, SE” (FR-M22-003: „vagy” kötőszó; az országok kóddal). */
export function destinationsText(idea: IdeaListItem, t: T, withCodes = true): string {
  const names = idea.destinations.map((d) => d.name).join(` ${t("ideas.common.or")} `);
  const codes = Array.from(new Set(idea.destinations.flatMap((d) => d.country_codes)));
  const conts = Array.from(new Set(idea.destinations.map((d) => d.continent).filter(Boolean))) as string[];
  const tail = codes.length ? codes.join(", ") : conts.map((c) => t(`ideas.continent.${c.replace(/ /g, "_")}`)).join(", ");
  return withCodes && tail ? `${names} · ${tail}` : names;
}

/** „2027. júl.–aug. · legalább 10 nap” */
export function windowText(idea: IdeaListItem, t: T, locale: string): string {
  const w = formatWindow({ startMonth: idea.window_start_month, endMonth: idea.window_end_month, year: idea.window_year }, locale);
  return `${w}${durationText(idea, t) ? ` · ${durationText(idea, t)}` : ""}`;
}

export function durationText(idea: IdeaListItem, t: T): string {
  const a = idea.duration_min_days, b = idea.duration_max_days;
  if (a && b) return a === b ? t("ideas.common.daysExact", { days: a }) : t("ideas.common.daysRange", { min: a, max: b });
  if (a) return t("ideas.common.daysMin", { days: a });
  if (b) return t("ideas.common.daysMax", { days: b });
  return "";
}

export function membersText(idea: Pick<IdeaListItem, "member_count" | "party_size_total">, t: T): string {
  const base = t("ideas.common.members", { count: idea.member_count });
  return idea.party_size_total > idea.member_count ? `${base} · ${t("ideas.common.people", { count: idea.party_size_total })}` : base;
}

/** Állapot/szándék címke és tónusa (kártya lábléce, adatlap). */
export function statusChip(idea: Pick<IdeaListItem, "status" | "intent">, t: T): { label: string; tone: "neutral" | "info" | "success" | "muted" } {
  const s: IdeaStatus = idea.status;
  if (s === "converted") return { label: t("ideas.status.converted"), tone: "success" };
  if (s === "organizing") return { label: t("ideas.status.organizing"), tone: "info" };
  if (s === "expired") return { label: t("ideas.status.expired"), tone: "muted" };
  if (s === "closed") return { label: t("ideas.status.closed"), tone: "muted" };
  return { label: t(`ideas.intent.${idea.intent}`), tone: "neutral" };
}

export function ownerText(idea: IdeaListItem, t: T): string | null {
  const name = idea.owner?.display_name;
  return name ? t("ideas.common.ownerIdea", { name }) : null;
}

/** Kategória-borítóképek (ref_cover_images, az első aktív kategóriánként). */
export async function getCategoryCovers(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("ref_cover_images").select("category_id, url").eq("is_active", true).not("category_id", "is", null).order("is_featured", { ascending: false });
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as { category_id: string; url: string }[]) if (!map[r.category_id]) map[r.category_id] = r.url;
  return map;
}
