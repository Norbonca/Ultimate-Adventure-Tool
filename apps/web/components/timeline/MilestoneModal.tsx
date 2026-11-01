"use client";

/**
 * Mérföldkő modál (asztali) / alsó lap (mobil) — M021 Menetrend v2.
 * Terv: D02 `NO5UX` (1440), `zNUB9` (390), feladat kinyitva `hCrxm`; Night tokenek.
 * Időpont: nap + opcionális óra a túra helyi idejében; helyszín: M121 (LocationField);
 * sorrend: „Fázis” választó + Feljebb/Lejjebb (a húzás egy kattintásos alternatívája, WCAG 2.5.7),
 * feladatok húzással vagy ↑ ↓ gombbal.
 */

import { useEffect, useId, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";
import { Dialog } from "@/components/ui/Dialog";
import { getLocalizedName } from "@/lib/i18n/localized";
import { formatDue, moveInList, normalizeTime } from "@/lib/timeline/format";
import {
  createTask,
  deleteMilestone,
  deleteTask,
  rejectTask,
  reorderTasks,
  submitTask,
  updateMilestone,
  updateTask,
  verifyTask,
  type MilestoneWithTasks,
  type TimelineTask,
} from "@/app/(app)/trips/timeline-actions";
import { clearTimelineLocation, saveTimelineLocation } from "@/app/(app)/trips/timeline-location-actions";
import { LocationField, TIMELINE_INPUT, locationChanged, type LocationDraft } from "@/components/timeline/LocationField";
import { placePayload, toDraft } from "@/components/timeline/location-payload";

export interface PhaseOption {
  id: string;
  name: string;
}

const LABEL = "block text-[13px] font-semibold text-ink-secondary";

/** Helyszín mentése vagy törlése egy célhoz (mérföldkő vagy feladat). */
async function persistLocation(
  tripId: string,
  target: { milestoneId: string } | { taskId: string },
  before: LocationDraft | null,
  after: LocationDraft | null,
): Promise<boolean> {
  if (!locationChanged(before, after)) return true;
  const res = after
    ? await saveTimelineLocation({ tripId, ...target, name: after.name, notes: after.notes, place: placePayload(after) })
    : await clearTimelineLocation({ tripId, ...target });
  return !res.error;
}

function DueFields({
  idPrefix,
  date,
  time,
  onDate,
  onTime,
  disabled,
}: {
  idPrefix: string;
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2 sm:gap-3">
      <div className="flex-1 sm:max-w-[220px]">
        <label htmlFor={`${idPrefix}-date`} className="sr-only">{t("timeline.dueDateLabel")}</label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          disabled={disabled}
          onChange={(e) => {
            onDate(e.target.value);
            if (!e.target.value) onTime("");
          }}
          className={TIMELINE_INPUT}
        />
      </div>
      <div className="w-[120px] sm:w-[140px]">
        <label htmlFor={`${idPrefix}-time`} className="sr-only">{t("timeline.dueTimeLabel")}</label>
        <input
          id={`${idPrefix}-time`}
          type="time"
          value={time}
          disabled={disabled || !date}
          title={!date ? t("timeline.timeNeedsDate") : undefined}
          onChange={(e) => onTime(e.target.value)}
          className={TIMELINE_INPUT}
        />
      </div>
    </div>
  );
}

// ── Feladatsor ──────────────────────────────────────────────

function TaskRow({
  task,
  tripId,
  index,
  count,
  isOrganizer,
  onToggle,
  onVerify,
  onReject,
  onDelete,
  onMove,
  onSaved,
}: {
  task: TimelineTask;
  tripId: string;
  index: number;
  count: number;
  isOrganizer: boolean;
  onToggle: () => void;
  onVerify: () => void;
  onReject: () => void;
  onDelete: () => void;
  onMove: (to: number) => void;
  onSaved: (patch: Partial<TimelineTask>) => void;
}) {
  const { t, locale } = useTranslation();
  const name = getLocalizedName(task, locale);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !isOrganizer,
  });
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(task.due_date ?? "");
  const [time, setTime] = useState(normalizeTime(task.due_time) ?? "");
  const [place, setPlace] = useState<LocationDraft | null>(toDraft(task.location));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const fid = useId();

  const isCompleted = task.status === "completed" || task.status === "skipped";
  const isPendingVerification = task.status === "pending_verification";
  const meta = [formatDue(task.due_date, task.due_time, locale), task.location?.name].filter(Boolean).join(" · ");

  const save = async () => {
    setBusy(true);
    setError(false);
    const res = await updateTask(task.id, { due_date: date || null, due_time: date ? time || null : null }).catch(() => ({ error: "network" }));
    const placeOk = res.error ? false : await persistLocation(tripId, { taskId: task.id }, toDraft(task.location), place).catch(() => false);
    setBusy(false);
    if (res.error || !placeOk) {
      setError(true);
      return;
    }
    onSaved({
      due_date: date || null,
      due_time: date && time ? `${time}:00` : null,
      location: place
        ? { binding_id: task.location?.binding_id ?? "", location_id: task.location?.location_id ?? "", name: place.name, address: place.address, lat: place.lat, lng: place.lng, notes: place.notes || null }
        : null,
    });
    setOpen(false);
  };

  const moveBtn = "flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-ghost hover:text-ink disabled:opacity-30";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-[10px] bg-ghost ${isDragging ? "relative z-10 ring-1 ring-accent shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        {isOrganizer && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={t("timeline.dragHandle").replace("{name}", name)}
            className="flex h-11 w-8 sm:h-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-ink-muted hover:text-ink active:cursor-grabbing"
          >
            <Icon name="grip-vertical" size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={name}
          aria-pressed={isPendingVerification ? "mixed" : isCompleted}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] text-xs transition-colors ${
            isCompleted
              ? "border-[var(--color-success)] text-[var(--color-success)]"
              : isPendingVerification
              ? "border-[var(--color-warning)] text-[var(--color-warning)]"
              : "border-line-strong hover:border-accent"
          }`}
        >
          {isCompleted && <Icon name="check" size={12} strokeWidth={3} />}
          {isPendingVerification && <Icon name="hourglass" size={12} />}
        </button>
        <button
          type="button"
          disabled={!isOrganizer}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={isOrganizer ? open : undefined}
          aria-label={isOrganizer ? t("timeline.taskDetails").replace("{name}", name) : undefined}
          className="min-w-0 flex-1 text-left disabled:cursor-default"
        >
          <span className={`block text-sm ${isCompleted ? "text-ink-muted line-through" : "text-ink"}`}>{name}</span>
          {meta && <span className="block text-xs text-ink-muted">{meta}</span>}
        </button>
        {isPendingVerification && isOrganizer && (
          <div className="flex gap-1">
            <button type="button" onClick={onVerify} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-success)] hover:bg-ghost" aria-label={t("timeline.verifyTask")}>
              <Icon name="check" size={14} strokeWidth={3} />
            </button>
            <button type="button" onClick={onReject} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-danger)] hover:bg-ghost" aria-label={t("timeline.rejectTask")}>
              <Icon name="x" size={14} strokeWidth={3} />
            </button>
          </div>
        )}
        {task.status === "rejected" && (
          <span className="rounded-md px-2 py-0.5 text-xs text-[var(--color-danger)] ring-1 ring-line">{t("timeline.taskRejected")}</span>
        )}
        {isOrganizer && (
          <div className="flex shrink-0 items-center">
            <button type="button" className={moveBtn} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={t("timeline.moveTaskUp").replace("{name}", name)}>
              <Icon name="arrow-up" size={16} />
            </button>
            <button type="button" className={moveBtn} disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={t("timeline.moveTaskDown").replace("{name}", name)}>
              <Icon name="arrow-down" size={16} />
            </button>
            <button type="button" className={moveBtn} onClick={onDelete} aria-label={`${t("common.delete")}: ${name}`}>
              <Icon name="x" size={14} />
            </button>
          </div>
        )}
      </div>

      {open && isOrganizer && (
        <div className="space-y-2.5 px-3 pb-3 sm:pl-12">
          <p className={LABEL}>{t("timeline.dueLabel")}</p>
          <DueFields idPrefix={fid} date={date} time={time} onDate={setDate} onTime={setTime} />
          <LocationField tripId={tripId} value={place} onChange={setPlace} showNotes={false} label={t("timeline.locationLabel")} />
          {error && <p role="alert" className="text-xs font-medium text-[var(--color-danger)]">{t("errors.saveFailed")}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-[10px] px-3.5 text-sm text-ink-secondary hover:text-ink">
              {t("common.cancel")}
            </button>
            <button type="button" onClick={save} disabled={busy} className="h-10 rounded-[10px] border border-accent px-4 text-sm font-semibold text-accent hover:bg-[var(--color-primary-subtle)] disabled:opacity-50">
              {busy ? "…" : t("timeline.taskSave")}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

// ── Modál ──────────────────────────────────────────────────

export function MilestoneModal({
  milestone,
  tripId,
  isOrganizer,
  timezone,
  phases,
  phaseId,
  index,
  count,
  onMove,
  onClose,
  onSaved,
}: {
  milestone: MilestoneWithTasks;
  tripId: string;
  isOrganizer: boolean;
  timezone: string;
  phases: PhaseOption[];
  phaseId: string;
  index: number;
  count: number;
  /** Áthelyezés a táblán (azonnal ment); true = sikerült. */
  onMove: (toPhaseId: string, toIndex: number) => Promise<boolean>;
  onClose: (changed: boolean) => void;
  onSaved: () => void;
}) {
  const { t, locale } = useTranslation();
  const displayName = getLocalizedName(milestone, locale);
  const [name, setName] = useState(displayName);
  const [status, setStatus] = useState(milestone.status);
  const [date, setDate] = useState(milestone.due_date || "");
  const [time, setTime] = useState(normalizeTime(milestone.due_time) ?? "");
  const [notes, setNotes] = useState(milestone.description || "");
  const [place, setPlace] = useState<LocationDraft | null>(toDraft(milestone.location));
  const [tasks, setTasks] = useState<TimelineTask[]>(milestone.tasks);
  const [newTaskName, setNewTaskName] = useState("");
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fid = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => onClose(changed);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmDelete) onClose(changed);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, changed, confirmDelete]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const saveTaskOrder = async (next: TimelineTask[], previous: TimelineTask[]) => {
    setTasks(next);
    setError(null);
    const res = await reorderTasks(milestone.id, next.map((x) => x.id)).catch(() => ({ error: "failed" as const }));
    if (res.error) {
      setTasks(previous);
      setError(t("timeline.reorderFailed"));
      return;
    }
    setChanged(true);
  };

  const moveTask = (from: number, to: number) => {
    if (to < 0 || to >= tasks.length) return;
    void saveTaskOrder(moveInList(tasks, from, to), tasks);
  };

  const onTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = tasks.findIndex((x) => x.id === active.id);
    const to = tasks.findIndex((x) => x.id === over.id);
    if (from < 0 || to < 0) return;
    moveTask(from, to);
  };

  const runTaskAction = async (action: () => Promise<{ error?: string }>, apply: (c: TimelineTask[]) => TimelineTask[]) => {
    setError(null);
    const result = await action().catch(() => ({ error: "network" }));
    if (result?.error) {
      setError(t("errors.saveFailed"));
      return;
    }
    setTasks(apply);
    setChanged(true);
  };

  const handleToggleTask = (task: TimelineTask) => {
    if (task.status === "completed") {
      void runTaskAction(() => updateTask(task.id, { status: "pending" }), (c) => c.map((x) => (x.id === task.id ? { ...x, status: "pending" } : x)));
    } else if (task.status === "pending" || task.status === "rejected") {
      const next = task.requires_verification ? "pending_verification" : "completed";
      void runTaskAction(() => submitTask(task.id), (c) => c.map((x) => (x.id === task.id ? { ...x, status: next } : x)));
    }
  };

  const handleReject = (task: TimelineTask) => {
    const note = prompt(t("timeline.rejectionNote"));
    if (note == null) return;
    void runTaskAction(() => rejectTask(task.id, note), (c) => c.map((x) => (x.id === task.id ? { ...x, status: "rejected" } : x)));
  };

  const handleAddTask = async () => {
    const value = newTaskName.trim();
    if (!value) return;
    setError(null);
    const result = await createTask(milestone.id, tripId, { name: value }).catch(() => ({ task: null, error: "network" }));
    if (!result.task) {
      setError(t("errors.saveFailed"));
      return;
    }
    const created = result.task;
    setTasks((c) => [...c, created]);
    setChanged(true);
    setNewTaskName("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const trimmed = name.trim();
    const res = await updateMilestone(milestone.id, {
      // Csak tényleges átnevezéskor küldjük a nevet — így a sablon fordítása megmarad.
      ...(trimmed && trimmed !== displayName ? { name: trimmed } : {}),
      status,
      due_date: date || null,
      due_time: date ? time || null : null,
      description: notes,
    }).catch(() => ({ error: "network" }));
    const placeOk = res.error ? false : await persistLocation(tripId, { milestoneId: milestone.id }, toDraft(milestone.location), place).catch(() => false);
    setSaving(false);
    if (res.error || !placeOk) {
      setError(t("errors.saveFailed"));
      return;
    }
    onSaved();
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteMilestone(milestone.id).catch(() => ({ error: "network" }));
    setDeleting(false);
    if (res.error) {
      setConfirmDelete(false);
      setError(t("errors.saveFailed"));
      return;
    }
    onSaved();
  };

  const statusOptions: { value: typeof status; label: string }[] = [
    { value: "not_started", label: t("timeline.statusNotStarted") },
    { value: "in_progress", label: t("timeline.statusInProgress") },
    { value: "done", label: t("timeline.statusDone") },
  ];
  const doneCount = tasks.filter((x) => x.status === "completed").length;
  const dueText = formatDue(milestone.due_date, milestone.due_time, locale);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/70 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${fid}-title`}
        className="flex max-h-[92vh] w-full flex-col rounded-t-[20px] border border-line bg-surface shadow-2xl sm:mx-4 sm:max-w-[600px] sm:rounded-2xl"
      >
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-strong)]" />
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-7">
          {/* Fej */}
          <div className="flex items-center gap-3">
            {isOrganizer ? (
              <input
                id={`${fid}-title`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label={t("timeline.milestoneName")}
                className={`${TIMELINE_INPUT} text-lg font-semibold`}
              />
            ) : (
              <h3 id={`${fid}-title`} className="flex-1 text-lg font-bold text-ink">{name}</h3>
            )}
            <button type="button" onClick={close} aria-label={t("common.close")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-ink-muted hover:bg-ghost hover:text-ink">
              <Icon name="x" size={20} />
            </button>
          </div>

          {/* Állapot */}
          {isOrganizer && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("timeline.milestoneStatus")}>
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={status === opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`min-h-9 rounded-md px-3 text-[13px] font-semibold transition-colors ${
                    status === opt.value
                      ? "bg-[var(--color-primary-subtle)] text-accent ring-1 ring-accent"
                      : "bg-ghost text-ink-secondary hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Fázis és sorrend — a húzás egy kattintásos alternatívája */}
          {isOrganizer && (
            <div className="flex items-end gap-2 sm:gap-3">
              <div className="flex-1">
                <label htmlFor={`${fid}-phase`} className={`${LABEL} mb-2`}>{t("timeline.phaseLabel")}</label>
                <select
                  id={`${fid}-phase`}
                  value={phaseId}
                  onChange={async (e) => {
                    // Másik fázisba: a lista végére kerül (a moveMilestone a túl nagy indexet a végére szorítja).
                    if (await onMove(e.target.value, Number.MAX_SAFE_INTEGER)) setChanged(true);
                  }}
                  className={TIMELINE_INPUT}
                >
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2" role="group" aria-label={t("timeline.orderLabel")}>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={async () => {
                    if (await onMove(phaseId, index - 1)) setChanged(true);
                  }}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] border border-line px-3 text-sm text-ink hover:bg-ghost disabled:opacity-40"
                >
                  <Icon name="arrow-up" size={16} /> <span className="hidden sm:inline">{t("timeline.moveUp")}</span>
                  <span className="sr-only sm:hidden">{t("timeline.moveUp")}</span>
                </button>
                <button
                  type="button"
                  disabled={index >= count - 1}
                  onClick={async () => {
                    if (await onMove(phaseId, index + 1)) setChanged(true);
                  }}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] border border-line px-3 text-sm text-ink hover:bg-ghost disabled:opacity-40"
                >
                  <Icon name="arrow-down" size={16} /> <span className="hidden sm:inline">{t("timeline.moveDown")}</span>
                  <span className="sr-only sm:hidden">{t("timeline.moveDown")}</span>
                </button>
              </div>
            </div>
          )}

          {/* Időpont */}
          {isOrganizer ? (
            <div className="space-y-2">
              <p className={LABEL}>{t("timeline.dueLabel")}</p>
              <DueFields idPrefix={fid} date={date} time={time} onDate={setDate} onTime={setTime} />
              <p className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                <Icon name="globe" size={14} /> {t("timeline.localTimeHint").replace("{zone}", timezone)}
              </p>
            </div>
          ) : dueText ? (
            <div className="space-y-1">
              <p className={LABEL}>{t("timeline.dueLabel")}</p>
              <p className="text-ink">{dueText} <span className="text-[13px] text-ink-muted">({timezone})</span></p>
            </div>
          ) : null}

          {/* Helyszín */}
          <LocationField tripId={tripId} value={place} onChange={setPlace} readOnly={!isOrganizer} label={t("timeline.locationLabel")} />

          {/* Megjegyzés */}
          {isOrganizer ? (
            <div className="space-y-2">
              <label htmlFor={`${fid}-notes`} className={LABEL}>{t("timeline.milestoneNotes")}</label>
              <textarea
                id={`${fid}-notes`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={`${TIMELINE_INPUT} h-auto min-h-[72px] resize-none py-2.5`}
              />
            </div>
          ) : milestone.description ? (
            <p className="text-sm text-ink-secondary">{milestone.description}</p>
          ) : null}

          {/* Feladatok */}
          <div className="space-y-2">
            <p className={LABEL}>
              {t("timeline.milestoneTasks")} ({doneCount}/{tasks.length})
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onTaskDragEnd}
              accessibility={{ screenReaderInstructions: { draggable: t("timeline.dndInstructions") } }}
            >
              <SortableContext items={tasks.map((x) => x.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1.5">
                  {tasks.map((task, i) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      tripId={tripId}
                      index={i}
                      count={tasks.length}
                      isOrganizer={isOrganizer}
                      onToggle={() => handleToggleTask(task)}
                      onVerify={() =>
                        void runTaskAction(() => verifyTask(task.id), (c) => c.map((x) => (x.id === task.id ? { ...x, status: "completed" } : x)))
                      }
                      onReject={() => handleReject(task)}
                      onDelete={() => void runTaskAction(() => deleteTask(task.id), (c) => c.filter((x) => x.id !== task.id))}
                      onMove={(to) => moveTask(i, to)}
                      onSaved={(patch) => {
                        setTasks((c) => c.map((x) => (x.id === task.id ? { ...x, ...patch } : x)));
                        setChanged(true);
                      }}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
            {isOrganizer && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAddTask();
                  }}
                  placeholder={t("timeline.addTask")}
                  aria-label={t("timeline.taskName")}
                  className={TIMELINE_INPUT}
                />
                <button
                  type="button"
                  onClick={() => void handleAddTask()}
                  disabled={!newTaskName.trim()}
                  aria-label={t("timeline.addTask")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-ghost text-ink hover:bg-[var(--color-primary-subtle)] disabled:opacity-40"
                >
                  <Icon name="plus" size={18} />
                </button>
              </div>
            )}
          </div>

          {error && <p role="alert" className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}
        </div>

        {/* Lábléc — mobilon ragadós alsó sáv */}
        <div className="flex flex-col-reverse gap-3 border-t border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-4">
          {isOrganizer ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 text-left text-sm font-medium text-[var(--color-danger)] hover:underline sm:min-h-0">
              {t("timeline.milestoneDelete")}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2.5">
            <button type="button" onClick={close} className="h-11 flex-1 rounded-[10px] border border-line px-4 text-[15px] text-ink-secondary hover:text-ink sm:flex-none sm:border-0">
              {t(changed ? "common.close" : "common.cancel")}
            </button>
            {isOrganizer && (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="h-11 flex-1 rounded-[10px] bg-accent px-5 text-[15px] font-semibold text-accent-on hover:bg-accent-hover disabled:opacity-50 sm:flex-none"
              >
                {saving ? "…" : t("timeline.milestoneSave")}
              </button>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        icon="trash-2"
        tone="danger"
        title={t("timeline.milestoneDelete")}
        description={t("timeline.milestoneDeleteConfirm")}
        busy={deleting}
        actions={
          <>
            <button type="button" onClick={() => void handleDelete()} disabled={deleting} className="h-11 rounded-[10px] bg-[var(--color-danger)] px-5 text-sm font-semibold text-white disabled:opacity-50">
              {t("timeline.milestoneDelete")}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="h-11 rounded-[10px] px-4 text-sm text-ink-secondary">
              {t("common.cancel")}
            </button>
          </>
        }
      />
    </div>
  );
}
