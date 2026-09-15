/**
 * M23 Calendar — meteorológiai évszakok (BR-M23-005) és a relatív évszak-választás feloldása (EC-12).
 * A tartományok megegyeznek a 037-es seed évszak-definícióival.
 */

import type { Period } from "./period";
import { ruleOccurrence, type DateRange } from "./rules";

export type Hemisphere = "north" | "south";
export type SeasonKey = "spring" | "summer" | "autumn" | "winter";

export const SEASON_KEYS: readonly SeasonKey[] = ["spring", "summer", "autumn", "winter"];

/** [kezdő hónap, kezdő nap, záró hónap, záró nap] — a február 29. nem szökőévben 28-ra igazodik. */
const RANGES: Record<Hemisphere, Record<SeasonKey, [number, number, number, number]>> = {
  north: { spring: [3, 1, 5, 31], summer: [6, 1, 8, 31], autumn: [9, 1, 11, 30], winter: [12, 1, 2, 29] },
  south: { spring: [9, 1, 11, 30], summer: [12, 1, 2, 29], autumn: [3, 1, 5, 31], winter: [6, 1, 8, 31] },
};

/** Az évszak adott évben kezdődő előfordulása (a tél a következő évbe nyúlik; EC-01). */
export function seasonRange(season: SeasonKey, startYear: number, hemisphere: Hemisphere): DateRange {
  const [month, day, end_month, end_day] = RANGES[hemisphere][season];
  const range = ruleOccurrence({ kind: "fixed_annual", params: { month, day, end_month, end_day } }, startYear);
  if (!range) throw new Error("season_range_unavailable");
  return range;
}

/** Egy naptári nap évszaka a megadott féltekén. */
export function seasonFor(date: string, hemisphere: Hemisphere): SeasonKey {
  const month = Number(date.slice(5, 7));
  const north: SeasonKey = month >= 3 && month <= 5 ? "spring" : month <= 8 && month >= 6 ? "summer" : month >= 9 && month <= 11 ? "autumn" : "winter";
  if (hemisphere === "north") return north;
  return ({ spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" } as const)[north];
}

/**
 * „Tavasszal”, „Nyáron” … feloldása: a legközelebbi, még le nem zárult előfordulás a néző
 * féltekéje szerint (US-M23-009). A `today` a néző időzónája szerinti naptári nap (BR-M23-010).
 */
export function resolveSeason(season: SeasonKey, hemisphere: Hemisphere, today: string): Period {
  const year = Number(today.slice(0, 4));
  const range = [year - 1, year, year + 1]
    .map((y) => seasonRange(season, y, hemisphere))
    .find((r) => r.latest >= today);
  if (!range) throw new Error("season_range_unavailable");
  return { ...range, precision: "season" };
}
