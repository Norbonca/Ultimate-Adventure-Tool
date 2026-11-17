/**
 * A nyitóoldal teendő-sorainak szövegei — tiszta függvények, hogy tesztelhetők legyenek.
 *
 * A sürgősséget soha nem csak szín hordozza: a `hatarido()` mindig ad szöveget is
 * („2 napja lejárt”, „ma”, „12 nap”), és az `surgos` mező dönti el a narancs sávot.
 * Design: design/claude/D25_Nyitooldal#Teli.
 */

import type { TranslationKey } from "@uat/i18n";
import type { Todo } from "@/app/(app)/dashboard/queries";

export type Ford = (key: TranslationKey, params?: Record<string, string | number>) => string;

export const TODO_KULCS: Record<Todo["kind"], TranslationKey> = {
  pendingApplications: "dashboard.todoPendingApplications",
  organizerTask: "dashboard.todoOrganizerTask",
  staleDraft: "dashboard.todoStaleDraft",
  deadlineSoon: "dashboard.todoDeadlineSoon",
  participantTask: "dashboard.todoParticipantTask",
  applicationPending: "dashboard.todoApplicationPending",
  waitlisted: "dashboard.todoWaitlisted",
  tripSoon: "dashboard.todoTripSoon",
  ideaJoiners: "dashboard.todoIdeaJoiners",
};

export const AKCIO_KULCS: Record<Todo["action"], TranslationKey> = {
  review: "dashboard.actionReview",
  open: "dashboard.actionOpen",
  continue: "dashboard.actionContinue",
  share: "dashboard.actionShare",
  check: "dashboard.actionCheck",
};

/** Egy teendő címe; az egyes számú és a „ma” változat külön kulcs. */
export function todoCim(t: Ford, todo: Todo): string {
  if (todo.kind === "pendingApplications" && todo.params.count === 1) return t("dashboard.todoPendingApplicationsOne");
  if (todo.kind === "ideaJoiners" && todo.params.count === 1) return t("dashboard.todoIdeaJoinersOne");
  if (todo.kind === "deadlineSoon" && todo.days === 0) return t("dashboard.todoDeadlineToday");
  if (todo.kind === "tripSoon" && todo.days === 0) return t("dashboard.todoTripToday");
  return t(TODO_KULCS[todo.kind], todo.params);
}

/** A határidő szövege. Sürgős: lejárt, ma vagy holnap — ennyi kap narancs sávot. */
export function hatarido(t: Ford, todo: Pick<Todo, "days">): { szoveg: string; surgos: boolean } {
  if (todo.days === null) return { szoveg: t("dashboard.dueNone"), surgos: false };
  if (todo.days < 0) {
    const n = Math.abs(todo.days);
    return { szoveg: n === 1 ? t("dashboard.dueOverdueOne") : t("dashboard.dueOverdue", { days: n }), surgos: true };
  }
  if (todo.days === 0) return { szoveg: t("dashboard.dueToday"), surgos: true };
  if (todo.days === 1) return { szoveg: t("dashboard.dueTomorrow"), surgos: true };
  return { szoveg: t("dashboard.dueDays", { days: todo.days }), surgos: todo.days <= 2 };
}

/** A sáv számlálója: hány szorító teendő és hány ráérős. */
export function savSzamlalo(t: Ford, items: Pick<Todo, "soft">[]): string {
  const kemeny = items.filter((i) => !i.soft).length;
  const lagy = items.length - kemeny;
  if (kemeny === 0) return t("dashboard.laneCountSoftOnly", { soft: lagy });
  if (lagy === 0) return t("dashboard.laneCount", { count: kemeny });
  return t("dashboard.laneCountWithSoft", { count: kemeny, soft: lagy });
}

/** Lejárt elöl, utána a közeli határidő; a ráérős és a határidő nélküli a végén. */
export function todoRangsor(a: Pick<Todo, "days" | "soft">, b: Pick<Todo, "days" | "soft">): number {
  if (a.soft !== b.soft) return a.soft ? 1 : -1;
  if (a.days === null && b.days === null) return 0;
  if (a.days === null) return 1;
  if (b.days === null) return -1;
  return a.days - b.days;
}
