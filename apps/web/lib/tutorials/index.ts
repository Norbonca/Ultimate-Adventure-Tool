/**
 * M211 — Útmutatók: lekérdezések és formázás. Szerver- és kliensoldalon is használható
 * (nincs benne hook vagy szerveroldali függőség). A tartalom forrása `content.ts`.
 */

import { TUTORIALS, type Localized, type Tutorial, type TutorialLocale, type TutorialRole } from "./content";

export type { Localized, Tutorial, TutorialLocale, TutorialRole, TutorialStep } from "./content";

export const asTutorialLocale = (locale: string): TutorialLocale => (locale === "en" ? "en" : "hu");

/** A lokalizált szöveg a kért nyelven, magyar tartalékkal. */
export const loc = (value: Localized, locale: string): string => value[asTutorialLocale(locale)] || value.hu;

export const posterUrl = (slug: string) => `/tutorials/posters/${slug}.jpg`;
export const videoUrl = (slug: string) => `/tutorials/videos/${slug}.mp4`;
/** A bemutató diája (index 0-tól; a fájlnév 1-től). */
export const slideUrl = (slug: string, index: number) => `/tutorials/slides/${slug}/${index + 1}.jpg`;
export const captionsUrl = (slug: string, locale: TutorialLocale) => `/api/v1/tutorials/${slug}/captions/${locale}`;
export const tutorialHref = (slug: string) => `/tutorials/${slug}`;

/** A felirat nyelvei (ND-04: magyar + angol). */
export const CAPTION_LOCALES: TutorialLocale[] = ["hu", "en"];

export function listTutorials(): Tutorial[] {
  return TUTORIALS;
}

export function getTutorial(slug: string): Tutorial | null {
  return TUTORIALS.find((t) => t.slug === slug) ?? null;
}

/** A funkcióhoz tartozó útmutatók (a „Hogyan működik?” link csak akkor jelenik meg, ha van). */
export function tutorialsForAnchor(anchor: string): Tutorial[] {
  return TUTORIALS.filter((t) => t.anchors.includes(anchor));
}

export function relatedTutorials(tutorial: Tutorial): Tutorial[] {
  return tutorial.related.map(getTutorial).filter((t): t is Tutorial => t !== null);
}

/** Ékezet- és kisbetű-független keresési alak. */
export const normalizeSearch = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export interface TutorialFilter {
  q?: string | null;
  role?: TutorialRole | null;
}

export function filterTutorials(filter: TutorialFilter, locale: string): Tutorial[] {
  const q = normalizeSearch(filter.q ?? "");
  const words = q.split(/\s+/).filter(Boolean);
  return TUTORIALS.filter((t) => {
    if (filter.role && t.role !== filter.role) return false;
    if (words.length === 0) return true;
    const hay = normalizeSearch(
      [loc(t.title, locale), loc(t.summary, locale), loc(t.topic, locale), ...t.steps.map((s) => loc(s.text, locale))].join(" "),
    );
    return words.every((w) => hay.includes(w));
  });
}

/** 45 → „0:45”, 75 → „1:15”. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Az aktív lépés indexe a lejátszási időhöz (-1, ha még egyik sem kezdődött el). */
export function activeStepIndex(tutorial: Pick<Tutorial, "steps">, time: number): number {
  let index = -1;
  tutorial.steps.forEach((step, i) => {
    if (time >= step.at) index = i;
  });
  return index;
}

const vttTime = (seconds: number) => {
  const ms = Math.round(Math.max(0, seconds) * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const r = ms % 1000;
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(s)}.${p(r, 3)}`;
};

/** WebVTT felirat a lépésekből: minden lépés a saját időbélyegétől a következőig látszik. */
export function buildVtt(tutorial: Pick<Tutorial, "steps" | "duration">, locale: TutorialLocale): string {
  const cues = tutorial.steps.map((step, i) => {
    const end = i + 1 < tutorial.steps.length ? tutorial.steps[i + 1].at : tutorial.duration;
    return `${i + 1}\n${vttTime(step.at)} --> ${vttTime(end)}\n${loc(step.text, locale)}`;
  });
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}
