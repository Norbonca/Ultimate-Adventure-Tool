/**
 * M23 Calendar — lefedettség (BR-M23-008: nincs adat ≠ nincs ünnep) és a „hiányzó év” jelzés
 * (FR-M23-009 4., EC-03).
 */

import type { RuleKind } from "./rules";

export type Coverage = "full" | "partial" | "none";

export interface CoveragePeriod {
  id: string;
  periodType: string;
  ruleKind: RuleKind;
  /** explicit, de nem ismétlődő (pl. egy adott évi áthelyezett nap) — nem hiányzik a következő évből */
  oneOff?: boolean;
  status: "active" | "inactive";
}

export interface CoverageOccurrence {
  periodId: string;
  year: number;
}

/** Az aktív, évenként megadott, ismétlődő definíciók közül azok, amelyeknek hiányzik valamelyik évük. */
export function missingYears(periods: CoveragePeriod[], occurrences: CoverageOccurrence[], years: number[]): Map<string, number[]> {
  const have = new Set(occurrences.map((o) => `${o.periodId}|${o.year}`));
  const firstYear = new Map<string, number>();
  for (const o of occurrences) firstYear.set(o.periodId, Math.min(firstYear.get(o.periodId) ?? o.year, o.year));
  const result = new Map<string, number[]>();
  for (const p of periods) {
    if (p.status !== "active" || p.ruleKind !== "explicit" || p.oneOff) continue;
    const since = firstYear.get(p.id) ?? -Infinity;
    const missing = years.filter((y) => y >= since && !have.has(`${p.id}|${y}`));
    if (missing.length) result.set(p.id, missing);
  }
  return result;
}

/**
 * `none`: a kért típusokból nincs aktív definíció; `partial`: valamelyik kért típusnak nincs definíciója,
 * vagy egy ismétlődő, évenként megadott definícióból hiányzik egy év; különben `full`.
 */
export function computeCoverage(input: {
  periods: CoveragePeriod[];
  occurrences: CoverageOccurrence[];
  years: number[];
  types?: string[];
}): Coverage {
  const wanted = input.types?.length ? new Set(input.types) : null;
  const active = input.periods.filter((p) => p.status === "active" && (!wanted || wanted.has(p.periodType)));
  if (active.length === 0) return "none";
  if (wanted && [...wanted].some((type) => !active.some((p) => p.periodType === type))) return "partial";
  return missingYears(active, input.occurrences, input.years).size > 0 ? "partial" : "full";
}
