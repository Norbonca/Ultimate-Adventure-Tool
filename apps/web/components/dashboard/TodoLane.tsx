/**
 * Teendő-sáv a nyitóoldalon — egy szerepkör dolgai egy listában.
 *
 * Design: design/claude/D25_Nyitooldal#Teli (1440), #Teli_390 (390).
 * A két szerep a felületmóddal válik el: a szervezői sáv Night (szén) — erre mások várnak —,
 * a résztvevői Day (csont). A sürgősséget soha nem csak szín hordozza: a bal oldali 3 px-es
 * narancs sáv mellett mindig ott a szöveges határidő is.
 */

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getServerT } from "@/lib/i18n/server";
import type { Todo } from "@/app/(app)/dashboard/queries";
import type { TranslationKey } from "@uat/i18n";

const SZOVEG: Record<Todo["kind"], TranslationKey> = {
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

const AKCIO: Record<Todo["action"], TranslationKey> = {
  review: "dashboard.actionReview",
  open: "dashboard.actionOpen",
  continue: "dashboard.actionContinue",
  share: "dashboard.actionShare",
  check: "dashboard.actionCheck",
};

type Ford = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** Egy teendő címe — az egyes és a többes számú változat külön kulcs. */
function cim(t: Ford, todo: Todo): string {
  if (todo.kind === "pendingApplications" && todo.params.count === 1) return t("dashboard.todoPendingApplicationsOne");
  if (todo.kind === "ideaJoiners" && todo.params.count === 1) return t("dashboard.todoIdeaJoinersOne");
  if (todo.kind === "deadlineSoon" && todo.days === 0) return t("dashboard.todoDeadlineToday");
  if (todo.kind === "tripSoon" && todo.days === 0) return t("dashboard.todoTripToday");
  return t(SZOVEG[todo.kind], todo.params);
}

/** A határidő szövege. A „sürgős” fogalma: lejárt, ma vagy holnap. */
function hatarido(t: Ford, todo: Todo): { szoveg: string; surgos: boolean } {
  if (todo.days === null) return { szoveg: t("dashboard.dueNone"), surgos: false };
  if (todo.days < 0) {
    const n = Math.abs(todo.days);
    return { szoveg: n === 1 ? t("dashboard.dueOverdueOne") : t("dashboard.dueOverdue", { days: n }), surgos: true };
  }
  if (todo.days === 0) return { szoveg: t("dashboard.dueToday"), surgos: true };
  if (todo.days === 1) return { szoveg: t("dashboard.dueTomorrow"), surgos: true };
  return { szoveg: t("dashboard.dueDays", { days: todo.days }), surgos: todo.days <= 2 };
}

interface TodoLaneProps {
  items: Todo[];
  /** A szervezői sáv szén (Night), a résztvevői csont (Day). */
  night?: boolean;
  titleKey: TranslationKey;
  hintKey: TranslationKey;
  testId: string;
}

export async function TodoLane({ items, night = false, titleKey, hintKey, testId }: TodoLaneProps) {
  if (items.length === 0) return null;
  const { t } = await getServerT();
  const ford = t as Ford;

  const kemeny = items.filter((i) => !i.soft).length;
  const lagy = items.length - kemeny;
  const szamlalo =
    kemeny === 0
      ? ford("dashboard.laneCountSoftOnly", { soft: lagy })
      : lagy === 0
        ? ford("dashboard.laneCount", { count: kemeny })
        : ford("dashboard.laneCountWithSoft", { count: kemeny, soft: lagy });

  return (
    <section
      {...(night ? { "data-surface": "night" } : {})}
      data-testid={testId}
      className="bg-canvas text-ink"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 md:gap-5 md:px-[120px] md:py-11">
        <div className="flex flex-wrap items-baseline justify-between gap-2 gap-x-6">
          <h2 className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{ford(titleKey)}</h2>
          <p className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-ink-muted">{szamlalo}</p>
        </div>
        <p className="max-w-[620px] text-[15px] text-ink-muted md:text-base">{ford(hintKey)}</p>

        <ul>
          {items.map((todo, i) => {
            const { szoveg, surgos } = hatarido(ford, todo);
            return (
              <li key={todo.id} className={todo.soft ? "opacity-60" : undefined}>
                <Link
                  href={todo.href}
                  data-testid={`dash-todo-${todo.kind}`}
                  className={`flex items-start gap-3 py-3 md:min-h-[72px] md:items-center md:gap-[18px] md:py-0 focus-visible:outline-hidden focus-visible:shadow-(--focus-ring) ${
                    i === items.length - 1 ? "" : "border-b border-line"
                  }`}
                >
                  <span aria-hidden className={`w-[3px] self-stretch ${surgos ? "bg-accent" : "bg-transparent"}`} />
                  <span className="flex items-center py-[2px] md:py-0">
                    <Icon name={todo.icon} size={22} aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="text-base font-bold leading-snug md:text-lg">{cim(ford, todo)}</span>
                    <span className="text-sm text-ink-muted md:text-[15px]">{todo.trip}</span>
                    <span className="mt-1 flex items-center justify-between gap-3 md:hidden">
                      <span className={`font-mono text-[13px] font-medium uppercase tracking-[0.06em] ${surgos ? "text-accent" : "text-ink-muted"}`}>
                        {szoveg}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-accent">
                        {ford(AKCIO[todo.action])}
                        <Icon name="arrow-right" size={15} aria-hidden />
                      </span>
                    </span>
                  </span>
                  <span className={`hidden whitespace-nowrap font-mono text-[13px] font-medium uppercase tracking-[0.06em] md:inline ${surgos ? "text-accent" : "text-ink-muted"}`}>
                    {szoveg}
                  </span>
                  <span className="hidden w-[120px] justify-end md:flex">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[15px] font-bold text-accent">
                      {ford(AKCIO[todo.action])}
                      <Icon name="arrow-right" size={15} aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
