"use client";

/**
 * Résztvevői menetrend (US-TL-007) — „Feladataim” (saját feladatok, kész-re jelölhetők) és a
 * csak olvasható Menetrend: fázisonként a mérföldkövek időponttal, hellyel, térképlinkkel.
 * Terv: D02 `pSwuh` (1440), `YbL0h` (390); Night tokenek.
 */

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";
import { getLocalizedName } from "@/lib/i18n/localized";
import { formatDue, mapsDirectionsUrl, nextMilestoneId, normalizeTime, todayIn } from "@/lib/timeline/format";
import {
  setMyTaskDone,
  type MilestoneWithTasks,
  type PhaseWithMilestones,
  type TimelineStats,
  type TimelineTask,
} from "@/app/(app)/trips/timeline-actions";

const PHASE_ICON_FALLBACK = "circle";

const isDone = (t: TimelineTask) => t.status === "completed" || t.status === "skipped";

export function ParticipantTimeline({
  phases,
  stats,
  timezone,
  myTaskIds,
}: {
  phases: PhaseWithMilestones[];
  stats: TimelineStats;
  timezone: string;
  myTaskIds: string[];
}) {
  const { t, locale } = useTranslation();
  const today = todayIn(timezone);
  const nextId = nextMilestoneId(phases, today);

  const milestoneOf = new Map<string, MilestoneWithTasks>(phases.flatMap((p) => p.milestones.map((m) => [m.id, m] as const)));
  const allTasks = phases.flatMap((p) => p.milestones.flatMap((m) => m.tasks));
  const mine = new Set(myTaskIds);
  const [tasks, setTasks] = useState<TimelineTask[]>(() => allTasks.filter((x) => mine.has(x.id)));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (task: TimelineTask) => {
    if (task.status === "pending_verification") return;
    setBusy(task.id);
    setError(null);
    const res = await setMyTaskDone(task.id, !isDone(task)).catch(() => ({ error: "failed" as const, status: undefined }));
    setBusy(null);
    if (res.error || !res.status) {
      setError(t("errors.saveFailed"));
      return;
    }
    setTasks((c) => c.map((x) => (x.id === task.id ? { ...x, status: res.status as string } : x)));
  };

  const doneCount = tasks.filter(isDone).length;

  return (
    <div className="space-y-6">
      {/* ── Feladataim ── */}
      <section aria-labelledby="pt-tasks" className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 id="pt-tasks" className="text-lg font-semibold text-ink sm:text-xl">{t("timeline.myTasks")}</h2>
          {tasks.length > 0 && (
            <span className="text-[13px] text-ink-muted">
              {t("timeline.doneOf").replace("{done}", String(doneCount)).replace("{total}", String(tasks.length))}
            </span>
          )}
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("timeline.noTasksAssigned")}</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => {
              const done = isDone(task);
              const waiting = task.status === "pending_verification";
              const overdue = !done && !waiting && !!task.due_date && task.due_date < today;
              const ms = milestoneOf.get(task.milestone_id);
              const due = formatDue(task.due_date, task.due_time, locale);
              const meta = [
                ms ? getLocalizedName(ms, locale) : null,
                overdue && due ? t("timeline.dueBy").replace("{date}", due) : due,
                task.location?.name,
                waiting ? t("timeline.taskPendingVerification") : null,
              ]
                .filter(Boolean)
                .join(" · ");
              const name = getLocalizedName(task, locale);
              return (
                <li
                  key={task.id}
                  className={`flex items-center gap-2 rounded-[10px] bg-ghost py-1 pr-3 ${overdue ? "ring-1 ring-[var(--color-danger)]" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => void toggle(task)}
                    disabled={busy === task.id || waiting}
                    aria-pressed={waiting ? "mixed" : done}
                    aria-label={name}
                    className="flex h-11 w-11 shrink-0 items-center justify-center disabled:cursor-default"
                  >
                    <span
                      className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border-[1.5px] ${
                        done
                          ? "border-[var(--color-success)] text-[var(--color-success)]"
                          : waiting
                          ? "border-[var(--color-warning)] text-[var(--color-warning)]"
                          : "border-line-strong"
                      }`}
                    >
                      {done && <Icon name="check" size={14} strokeWidth={3} />}
                      {waiting && <Icon name="hourglass" size={12} />}
                    </span>
                  </button>
                  <div className="min-w-0 flex-1 py-1.5">
                    <p className={`text-[15px] ${done ? "text-ink-muted line-through" : "text-ink"}`}>{name}</p>
                    {meta && <p className={`text-[13px] ${overdue ? "text-[var(--color-danger)]" : "text-ink-muted"}`}>{meta}</p>}
                  </div>
                  {overdue && (
                    <span className="hidden shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-danger)] ring-1 ring-[var(--color-danger)] sm:inline">
                      {t("timeline.overdueWarning")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {error && <p role="alert" className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}
      </section>

      {/* ── Menetrend (csak olvasható) ── */}
      <section aria-labelledby="pt-timeline" className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 id="pt-timeline" className="text-lg font-semibold text-ink sm:text-xl">{t("timeline.title")}</h2>
            <p className="text-[13px] text-ink-muted">{t("timeline.participantIntro").replace("{zone}", timezone)}</p>
          </div>
          {stats.total_tasks > 0 && (
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-28 rounded-full bg-[var(--color-border)]">
                <span className="block h-1.5 rounded-full bg-accent" style={{ width: `${stats.progress_percent}%` }} />
              </span>
              <span className="text-[13px] font-semibold text-accent">{stats.progress_percent}%</span>
            </div>
          )}
        </div>

        {phases.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("timeline.participantEmpty")}</p>
        ) : (
          phases.map((phase) => {
            const done = phase.milestones.filter((m) => m.status === "done").length;
            return (
              <div key={phase.id} className="space-y-2.5">
                <h3 className="flex items-center gap-2.5 pt-2">
                  <Icon name={phase.icon || PHASE_ICON_FALLBACK} size={18} className="text-ink" />
                  <span className="flex-1 text-[15px] font-semibold text-ink">{getLocalizedName(phase, locale)}</span>
                  <span className="text-[13px] font-normal text-ink-muted">
                    {t("timeline.doneOf").replace("{done}", String(done)).replace("{total}", String(phase.milestones.length))}
                  </span>
                </h3>
                <ol className="space-y-2.5">
                  {phase.milestones.map((m) => (
                    <MilestoneRow key={m.id} milestone={m} isNext={m.id === nextId} />
                  ))}
                </ol>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function MilestoneRow({ milestone, isNext }: { milestone: MilestoneWithTasks; isNext: boolean }) {
  const { t, locale } = useTranslation();
  const done = milestone.status === "done";
  const dayLabel = formatDue(milestone.due_date, null, locale);
  const time = normalizeTime(milestone.due_time);
  const due = formatDue(milestone.due_date, milestone.due_time, locale);
  const place = milestone.location;
  const mapUrl = place ? mapsDirectionsUrl(place.lat, place.lng) : null;
  const notes = [milestone.description, place?.notes].filter(Boolean).join(" · ");

  return (
    <li
      aria-current={isNext ? "step" : undefined}
      className={`flex gap-4 rounded-[10px] border p-3.5 sm:px-4 ${
        isNext ? "border-accent bg-[var(--color-primary-subtle)]" : "border-line"
      } ${done ? "opacity-70" : ""}`}
    >
      {/* Asztali: dátumoszlop */}
      <div className="hidden w-16 shrink-0 flex-col items-center gap-0.5 sm:flex">
        <span className={`text-[13px] font-semibold ${isNext ? "text-accent" : "text-ink-secondary"}`}>{dayLabel ?? "—"}</span>
        <span className={`text-lg font-bold ${time ? "text-ink" : "text-ink-muted"}`}>{time ?? "—"}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Mobil: időpont-sor */}
        {due && <p className={`text-sm font-bold sm:hidden ${isNext ? "text-accent" : "text-ink-secondary"}`}>{due}</p>}
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              done ? "bg-[var(--color-success)]" : milestone.status === "in_progress" ? "bg-[var(--color-warning)]" : "bg-[var(--color-text-muted)]"
            }`}
          />
          <span className="flex-1 text-[15px] font-semibold text-ink">{getLocalizedName(milestone, locale)}</span>
          {isNext && (
            <span className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-on">{t("timeline.nextBadge")}</span>
          )}
          {done && <span className="shrink-0 text-xs font-semibold text-[var(--color-success)]">{t("timeline.statusDone")}</span>}
        </div>
        {place && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5 text-sm text-ink-secondary">
              <Icon name="map-pin" size={15} className="shrink-0 text-accent" />
              {place.name}
            </span>
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1 text-[13px] font-medium text-accent hover:underline sm:inline-flex"
              >
                <Icon name="external-link" size={13} /> {t("timeline.locationOpenMap")}
              </a>
            )}
          </div>
        )}
        {notes && <p className="text-[13px] text-ink-muted">{notes}</p>}
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex h-11 items-center justify-center gap-1.5 rounded-[10px] border border-accent text-sm font-semibold text-accent sm:hidden"
          >
            <Icon name="external-link" size={15} /> {t("timeline.locationOpenMap")}
          </a>
        )}
      </div>
    </li>
  );
}
