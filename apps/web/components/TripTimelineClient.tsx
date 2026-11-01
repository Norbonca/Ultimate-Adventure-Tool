"use client";

/**
 * M021 Menetrend — tábla (fázisoszlopok, mérföldkő-kártyák) húzással, időponttal, helyszínnel.
 * Terv: D02 „M021 v2” — tábla 1440 `UDerj`, 390 `PbOhz`; modál `NO5UX` / alsó lap `zNUB9`; folyamat `DngVH`.
 * Átrendezés: @dnd-kit (egér, érintés hosszú nyomással, billentyűzet); mentés egy RPC-vel (071), hibánál visszaáll.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  fetchTripTimeline,
  fetchTimelineTemplates,
  initTimelineFromTemplate,
  createPhase,
  createMilestone,
  reorderMilestones,
  reorderPhases,
  type PhaseWithMilestones,
  type TimelineStats,
  type TimelineTemplate,
  type MilestoneWithTasks,
} from "@/app/(app)/trips/timeline-actions";
import { Icon } from "@/components/Icon";
import { getLocalizedName, getLocalizedText } from "@/lib/i18n/localized";
import { formatDue, moveInList, moveMilestone, type MilestoneLayoutEntry } from "@/lib/timeline/format";
import { MilestoneModal } from "@/components/timeline/MilestoneModal";
import { TIMELINE_INPUT } from "@/components/timeline/LocationField";

const STATUS_DOT: Record<string, string> = {
  not_started: "bg-[var(--color-text-muted)]",
  in_progress: "bg-[var(--color-warning)]",
  done: "bg-[var(--color-success)]",
};

// Phase icons are Icon Bank keys (03_Icon_Bank.md §6.2) stored in trip_phases.icon.
const PHASE_ICON_FALLBACK = "circle";

const P = (id: string) => `p:${id}`;
const M = (id: string) => `m:${id}`;
const COL = (id: string) => `col:${id}`;
const raw = (id: UniqueIdentifier) => String(id).replace(/^(p|m|col):/, "");
const kind = (id: UniqueIdentifier) => String(id).split(":")[0];

function layoutOf(phases: PhaseWithMilestones[]): MilestoneLayoutEntry[] {
  return phases.map((p) => ({ phase_id: p.id, milestone_ids: p.milestones.map((m) => m.id) }));
}

function applyLayout(phases: PhaseWithMilestones[], layout: MilestoneLayoutEntry[]): PhaseWithMilestones[] {
  const byId = new Map(phases.flatMap((p) => p.milestones).map((m) => [m.id, m]));
  const phaseById = new Map(phases.map((p) => [p.id, p]));
  return layout.flatMap((e) => {
    const phase = phaseById.get(e.phase_id);
    if (!phase) return [];
    return [
      {
        ...phase,
        milestones: e.milestone_ids.flatMap((id) => {
          const m = byId.get(id);
          return m ? [{ ...m, phase_id: e.phase_id }] : [];
        }),
      },
    ];
  });
}

const sameLayout = (a: MilestoneLayoutEntry[], b: MilestoneLayoutEntry[]) => JSON.stringify(a) === JSON.stringify(b);

// ══════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════

interface TripTimelineClientProps {
  tripId: string;
  isOrganizer: boolean;
}

type Toast = { tone: "ok" | "error"; text: string } | null;

export function TripTimelineClient({ tripId, isOrganizer }: TripTimelineClientProps) {
  const { t, locale } = useTranslation();
  const [phases, setPhases] = useState<PhaseWithMilestones[]>([]);
  const [stats, setStats] = useState<TimelineStats>({ total_tasks: 0, completed_tasks: 0, progress_percent: 0 });
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const snapshot = useRef<PhaseWithMilestones[] | null>(null);

  // Betöltés (D12, 2026-10-30): az effect nem állít szinkron state-et — az eredmény a válasz után érkezik.
  const applyTimeline = useCallback(
    (result: Awaited<ReturnType<typeof fetchTripTimeline>>) => {
      if (result.error) {
        setLoadError(true);
      } else {
        setLoadError(false);
        setPhases(result.phases);
        setStats(result.stats);
        setTimezone(result.timezone);
        if (result.phases.length === 0 && isOrganizer) setShowTemplateSelector(true);
      }
      setLoading(false);
    },
    [isOrganizer],
  );

  useEffect(() => {
    let alive = true;
    fetchTripTimeline(tripId)
      .then((result) => {
        if (alive) applyTimeline(result);
      })
      .catch(() => {
        if (alive) {
          setLoadError(true);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [tripId, applyTimeline]);

  useEffect(() => {
    if (toast?.tone !== "ok") return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const reloadTimeline = useCallback(() => {
    setLoading(true);
    fetchTripTimeline(tripId)
      .then(applyTimeline)
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  }, [tripId, applyTimeline]);

  /** Mérföldkő-elrendezés mentése; hibánál visszaáll a `previous` állapotra. */
  const persistLayout = useCallback(
    async (next: PhaseWithMilestones[], previous: PhaseWithMilestones[]): Promise<boolean> => {
      setPhases(next);
      if (sameLayout(layoutOf(next), layoutOf(previous))) return true;
      const res = await reorderMilestones(tripId, layoutOf(next)).catch(() => ({ error: "failed" as const }));
      if (res.error) {
        setPhases(previous);
        setToast({ tone: "error", text: t("timeline.reorderFailed") });
        return false;
      }
      setToast({ tone: "ok", text: t("timeline.reorderSaved") });
      return true;
    },
    [tripId, t],
  );

  const persistPhaseOrder = useCallback(
    async (next: PhaseWithMilestones[], previous: PhaseWithMilestones[]) => {
      setPhases(next);
      const res = await reorderPhases(tripId, next.map((p) => p.id)).catch(() => ({ error: "failed" as const }));
      if (res.error) {
        setPhases(previous);
        setToast({ tone: "error", text: t("timeline.reorderFailed") });
        return;
      }
      setToast({ tone: "ok", text: t("timeline.reorderSaved") });
    },
    [tripId, t],
  );

  // ── Húzás ──────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const phaseOfMilestone = (list: PhaseWithMilestones[], milestoneId: string) =>
    list.find((p) => p.milestones.some((m) => m.id === milestoneId))?.id ?? null;

  const collision: CollisionDetection = useCallback((args) => {
    const activeKind = kind(args.active.id);
    const allowed = args.droppableContainers.filter((c) =>
      activeKind === "p" ? kind(c.id) === "p" : kind(c.id) === "m" || kind(c.id) === "col",
    );
    return activeKind === "p"
      ? closestCenter({ ...args, droppableContainers: allowed })
      : closestCorners({ ...args, droppableContainers: allowed });
  }, []);

  const onDragStart = () => {
    snapshot.current = phases;
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || kind(active.id) !== "m") return;
    const id = raw(active.id);
    const fromPhase = phaseOfMilestone(phases, id);
    const toPhase =
      kind(over.id) === "col" ? raw(over.id) : kind(over.id) === "m" ? phaseOfMilestone(phases, raw(over.id)) : null;
    if (!fromPhase || !toPhase || fromPhase === toPhase) return;
    const target = phases.find((p) => p.id === toPhase);
    if (!target) return;
    const overIndex = kind(over.id) === "m" ? target.milestones.findIndex((m) => m.id === raw(over.id)) : -1;
    const toIndex = overIndex < 0 ? target.milestones.length : overIndex;
    setPhases((current) => applyLayout(current, moveMilestone(layoutOf(current), id, toPhase, toIndex)));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const previous = snapshot.current ?? phases;
    snapshot.current = null;
    if (!over) {
      setPhases(previous);
      return;
    }
    if (kind(active.id) === "p") {
      const from = phases.findIndex((p) => p.id === raw(active.id));
      const to = phases.findIndex((p) => p.id === raw(over.id));
      if (from < 0 || to < 0 || from === to) return;
      void persistPhaseOrder(moveInList(phases, from, to), previous);
      return;
    }
    const id = raw(active.id);
    const phaseId = phaseOfMilestone(phases, id);
    let next = phases;
    if (phaseId && kind(over.id) === "m") {
      const phase = phases.find((p) => p.id === phaseId);
      const from = phase ? phase.milestones.findIndex((m) => m.id === id) : -1;
      const to = phase ? phase.milestones.findIndex((m) => m.id === raw(over.id)) : -1;
      if (to >= 0 && from !== to) next = applyLayout(phases, moveMilestone(layoutOf(phases), id, phaseId, to));
    }
    void persistLayout(next, previous);
  };

  const onDragCancel = () => {
    if (snapshot.current) setPhases(snapshot.current);
    snapshot.current = null;
  };

  const nameOf = (id: UniqueIdentifier) => {
    const r = raw(id);
    if (kind(id) === "p" || kind(id) === "col") {
      const p = phases.find((x) => x.id === r);
      return p ? getLocalizedName(p, locale) : "";
    }
    const m = phases.flatMap((p) => p.milestones).find((x) => x.id === r);
    return m ? getLocalizedName(m, locale) : "";
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => t("timeline.dndPickedUp").replace("{name}", nameOf(active.id)),
    onDragOver: ({ active, over }) =>
      over ? t("timeline.dndMovedOver").replace("{name}", nameOf(active.id)).replace("{target}", nameOf(over.id)) : undefined,
    onDragEnd: ({ active }) => t("timeline.dndDropped").replace("{name}", nameOf(active.id)),
    onDragCancel: () => t("timeline.dndCancelled"),
  };

  // ── Modál ──────────────────────────────────
  const selected = (() => {
    if (!selectedId) return null;
    for (const p of phases) {
      const index = p.milestones.findIndex((m) => m.id === selectedId);
      if (index >= 0) return { milestone: p.milestones[index], phaseId: p.id, index, count: p.milestones.length };
    }
    return null;
  })();

  const moveSelected = async (toPhaseId: string, toIndex: number) => {
    if (!selectedId) return false;
    const next = applyLayout(phases, moveMilestone(layoutOf(phases), selectedId, toPhaseId, toIndex));
    return persistLayout(next, phases);
  };

  // ── Állapotok ──────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-ink-muted" role="status">
        <span className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
        {t("common.loading")}
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="mb-4 text-ink-secondary">{t("timeline.loadFailed")}</p>
        <button type="button" onClick={reloadTimeline} className="h-11 rounded-[10px] border border-line px-4 text-sm font-medium text-ink hover:bg-ghost">
          {t("timeline.retry")}
        </button>
      </div>
    );
  }

  if (showTemplateSelector && phases.length === 0) {
    return (
      <TemplateSelector
        tripId={tripId}
        onEmpty={() => setShowTemplateSelector(false)}
        onInit={() => {
          setShowTemplateSelector(false);
          reloadTimeline();
        }}
      />
    );
  }

  const board = (
    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-4 sm:gap-4">
      {phases.map((phase) => (
        <PhaseColumn
          key={phase.id}
          phase={phase}
          tripId={tripId}
          isOrganizer={isOrganizer}
          onMilestoneClick={(ms) => setSelectedId(ms.id)}
          onRefresh={reloadTimeline}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Fej ── */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-ink">{t("timeline.title")}</h2>
          {isOrganizer && (
            <>
              <p className="hidden text-[13px] text-ink-muted sm:block">{t("timeline.dragHint").replace("{zone}", timezone)}</p>
              <p className="text-[13px] text-ink-muted sm:hidden">{t("timeline.dragHintMobile")}</p>
            </>
          )}
        </div>
        {isOrganizer && <AddPhaseButton tripId={tripId} onCreated={reloadTimeline} />}
      </div>

      {/* ── Haladás ── */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-ink-muted">
          {t("timeline.overallProgress")
            .replace("{completed}", String(stats.completed_tasks))
            .replace("{total}", String(stats.total_tasks))}
        </span>
        <div className="h-1.5 flex-1 rounded-full bg-[var(--color-border)]">
          <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${stats.progress_percent}%` }} />
        </div>
        <span className="text-[13px] font-semibold text-accent">
          {t("timeline.progressPercent").replace("{percent}", String(stats.progress_percent))}
        </span>
      </div>

      {/* ── Oszlopok ── */}
      {isOrganizer ? (
        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
          accessibility={{ announcements, screenReaderInstructions: { draggable: t("timeline.dndInstructions") } }}
        >
          <SortableContext items={phases.map((p) => P(p.id))} strategy={horizontalListSortingStrategy}>
            {board}
          </SortableContext>
        </DndContext>
      ) : (
        board
      )}

      {/* ── Visszajelzés ── */}
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          className="fixed bottom-28 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2.5 rounded-[10px] border border-[var(--color-border-strong)] bg-surface px-4 py-3 text-sm font-medium text-ink shadow-lg sm:left-auto sm:right-8 sm:translate-x-0"
        >
          <Icon
            name={toast.tone === "ok" ? "check" : "alert-triangle"}
            size={18}
            className={toast.tone === "ok" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}
          />
          {toast.text}
          {toast.tone === "error" && (
            <button type="button" onClick={() => setToast(null)} aria-label={t("common.close")} className="ml-1 text-ink-muted hover:text-ink">
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      )}

      {/* ── Mérföldkő modál ── */}
      {selected && (
        <MilestoneModal
          key={selected.milestone.id}
          milestone={selected.milestone}
          tripId={tripId}
          isOrganizer={isOrganizer}
          timezone={timezone}
          phases={phases.map((p) => ({ id: p.id, name: getLocalizedName(p, locale) }))}
          phaseId={selected.phaseId}
          index={selected.index}
          count={selected.count}
          onMove={moveSelected}
          onClose={(changed) => {
            setSelectedId(null);
            if (changed) reloadTimeline();
          }}
          onSaved={() => {
            setSelectedId(null);
            setToast({ tone: "ok", text: t("timeline.milestoneSaved") });
            reloadTimeline();
          }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// TEMPLATE SELECTOR (üres állapot)
// ══════════════════════════════════════════════

function TemplateSelector({ tripId, onInit, onEmpty }: { tripId: string; onInit: () => void; onEmpty: () => void }) {
  const { t, locale } = useTranslation();
  const [templates, setTemplates] = useState<TimelineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimelineTemplates().then((result) => {
      setTemplates(result.templates);
      setLoading(false);
    });
  }, []);

  const handleInit = async (templateId: string) => {
    setInitializing(true);
    setError(null);
    const result = await initTimelineFromTemplate(tripId, templateId);
    if (result.success) {
      onInit();
    } else {
      setError(result.error ?? t("timeline.initError"));
    }
    setInitializing(false);
  };

  if (loading) {
    return <div className="py-16 text-center text-ink-muted">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6 rounded-2xl border border-line bg-surface p-8 text-center">
      <div>
        <h2 className="mb-2 text-xl font-semibold text-ink">{t("timeline.title")}</h2>
        <p className="text-ink-muted">{t("timeline.noTimeline")}</p>
      </div>

      <div className="mx-auto max-w-md space-y-3">
        <p className="text-sm font-semibold text-ink-secondary">{t("timeline.chooseTemplate")}</p>
        {templates.map((tpl) => {
          const description = getLocalizedText(tpl.description, tpl.description_localized, locale);
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleInit(tpl.id)}
              disabled={initializing}
              className="flex w-full items-center gap-4 rounded-xl border border-line px-5 py-4 text-left transition-all hover:border-accent hover:bg-ghost disabled:opacity-50"
            >
              <span className="text-accent">
                <Icon name={tpl.icon || "clipboard-list"} size={24} />
              </span>
              <div>
                <span className="block text-sm font-semibold text-ink">{getLocalizedName(tpl, locale)}</span>
                {description && <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>}
              </div>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onEmpty}
          disabled={initializing}
          className="flex w-full items-center gap-4 rounded-xl border border-dashed border-line-strong px-5 py-4 text-left transition-all hover:border-accent hover:bg-ghost disabled:opacity-50"
        >
          <span className="text-ink-muted">
            <Icon name="plus" size={24} />
          </span>
          <span className="text-sm font-medium text-ink-secondary">{t("timeline.emptyTemplate")}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="break-all rounded-xl border border-line bg-ghost p-4 text-sm text-[var(--color-danger)]">
          <strong>{t("timeline.initError")}:</strong> {error}
        </div>
      )}

      {initializing && (
        <div className="flex items-center justify-center gap-2 text-sm text-accent" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
          {t("common.loading")}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// PHASE COLUMN
// ══════════════════════════════════════════════

function PhaseColumn({
  phase,
  tripId,
  isOrganizer,
  onMilestoneClick,
  onRefresh,
}: {
  phase: PhaseWithMilestones;
  tripId: string;
  isOrganizer: boolean;
  onMilestoneClick: (ms: MilestoneWithTasks) => void;
  onRefresh: () => void;
}) {
  const { t, locale } = useTranslation();
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: P(phase.id),
    disabled: !isOrganizer,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: COL(phase.id), disabled: !isOrganizer });
  const name = getLocalizedName(phase, locale);

  const handleAddMilestone = async () => {
    if (!newMilestoneName.trim()) return;
    await createMilestone(phase.id, tripId, newMilestoneName.trim());
    setNewMilestoneName("");
    setAddingMilestone(false);
    onRefresh();
  };

  const cards: ReactNode = phase.milestones.map((ms) => (
    <MilestoneCard key={ms.id} milestone={ms} isOrganizer={isOrganizer} onClick={() => onMilestoneClick(ms)} />
  ));

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-label={name}
      className={`w-[300px] shrink-0 snap-start space-y-2.5 rounded-2xl bg-ghost p-3 ${
        isDragging || isOver ? "relative z-10 ring-1 ring-accent" : ""
      }`}
    >
      {/* Fázis fej */}
      <div className="flex items-center gap-2 px-0.5">
        {isOrganizer && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={t("timeline.dragHandle").replace("{name}", name)}
            className="-ml-1 flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-ink-muted hover:text-ink active:cursor-grabbing sm:h-8"
          >
            <Icon name="grip-vertical" size={16} />
          </button>
        )}
        <Icon name={phase.icon || PHASE_ICON_FALLBACK} size={18} className="text-ink" />
        <h3 className="flex-1 text-[15px] font-semibold text-ink">{name}</h3>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-on">
          {phase.milestones.length}
        </span>
      </div>

      {/* Kártyák */}
      <div ref={setDropRef} className="min-h-2 space-y-2.5">
        {isOrganizer ? (
          <SortableContext items={phase.milestones.map((m) => M(m.id))} strategy={verticalListSortingStrategy}>
            {cards}
          </SortableContext>
        ) : (
          cards
        )}
      </div>

      {/* Új mérföldkő */}
      {isOrganizer &&
        (addingMilestone ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newMilestoneName}
              onChange={(e) => setNewMilestoneName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddMilestone();
                if (e.key === "Escape") setAddingMilestone(false);
              }}
              placeholder={t("timeline.milestoneName")}
              aria-label={t("timeline.milestoneName")}
              className={TIMELINE_INPUT}
              autoFocus
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleAddMilestone()} className="h-10 flex-1 rounded-[10px] bg-accent text-sm font-semibold text-accent-on hover:bg-accent-hover">
                {t("common.save")}
              </button>
              <button type="button" onClick={() => setAddingMilestone(false)} className="h-10 flex-1 rounded-[10px] border border-line text-sm text-ink-secondary hover:text-ink">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingMilestone(true)}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] border border-line text-[13px] text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Icon name="plus" size={14} /> {t("timeline.addMilestone")}
          </button>
        ))}
    </section>
  );
}

// ══════════════════════════════════════════════
// MILESTONE CARD
// ══════════════════════════════════════════════

function MilestoneCard({ milestone, isOrganizer, onClick }: { milestone: MilestoneWithTasks; isOrganizer: boolean; onClick: () => void }) {
  const { t, locale } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: M(milestone.id),
    disabled: !isOrganizer,
  });
  const name = getLocalizedName(milestone, locale);
  const due = formatDue(milestone.due_date, milestone.due_time, locale);
  const progressPct = milestone.task_count > 0 ? Math.round((milestone.completed_count / milestone.task_count) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex rounded-[10px] border bg-surface transition-colors ${
        isDragging ? "relative z-10 border-accent shadow-lg" : "border-line hover:border-[var(--color-border-strong)]"
      }`}
    >
      {isOrganizer && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={t("timeline.dragHandle").replace("{name}", name)}
          className="flex w-8 shrink-0 cursor-grab touch-none items-start justify-center pt-3 text-ink-muted hover:text-ink active:cursor-grabbing"
        >
          <Icon name="grip-vertical" size={16} />
        </button>
      )}
      <button type="button" onClick={onClick} className={`min-w-0 flex-1 space-y-2 py-3 pr-3 text-left ${isOrganizer ? "" : "pl-3"}`}>
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[milestone.status] || STATUS_DOT.not_started}`} />
          <span className="text-sm font-semibold leading-tight text-ink">{name}</span>
        </span>
        {(due || milestone.location) && (
          <span className="block space-y-1 pl-4">
            {due && (
              <span className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
                <Icon name="clock" size={14} className="text-ink-muted" /> {due}
              </span>
            )}
            {milestone.location && (
              <span className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
                <Icon name="map-pin" size={14} className="shrink-0 text-ink-muted" />
                <span className="truncate">{milestone.location.name}</span>
              </span>
            )}
          </span>
        )}
        <span className="flex items-center gap-2 pl-4">
          <span className="h-1 flex-1 rounded-full bg-[var(--color-border)]">
            <span className="block h-1 rounded-full bg-accent" style={{ width: `${progressPct}%` }} />
          </span>
          <span className="text-xs text-ink-muted">
            {milestone.completed_count}/{milestone.task_count}
          </span>
        </span>
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════
// ADD PHASE BUTTON
// ══════════════════════════════════════════════

function AddPhaseButton({ tripId, onCreated }: { tripId: string; onCreated: () => void }) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const handleAdd = async () => {
    if (!name.trim()) return;
    await createPhase(tripId, name.trim());
    setName("");
    setAdding(false);
    onCreated();
  };

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] border border-line px-3.5 text-sm font-medium text-ink hover:bg-ghost"
      >
        <Icon name="plus" size={16} /> {t("timeline.addPhase")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleAdd();
          if (e.key === "Escape") setAdding(false);
        }}
        placeholder={t("timeline.phaseName")}
        aria-label={t("timeline.phaseName")}
        className={`${TIMELINE_INPUT} w-48`}
        autoFocus
      />
      <button type="button" onClick={() => void handleAdd()} className="h-11 rounded-[10px] bg-accent px-3.5 text-sm font-semibold text-accent-on hover:bg-accent-hover">
        {t("common.save")}
      </button>
      <button type="button" onClick={() => setAdding(false)} className="flex h-11 w-11 items-center justify-center text-ink-muted hover:text-ink" aria-label={t("common.cancel")}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
