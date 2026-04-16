"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  fetchTripTimeline,
  fetchTimelineTemplates,
  initTimelineFromTemplate,
  createPhase,
  createMilestone,
  createTask,
  updateMilestone,
  updateTask,
  deletePhase,
  deleteMilestone,
  deleteTask,
  submitTask,
  verifyTask,
  rejectTask,
  type PhaseWithMilestones,
  type TimelineStats,
  type TimelineTemplate,
  type MilestoneWithTasks,
  type TimelineTask,
} from "@/app/(app)/trips/timeline-actions";

// ── Status colors ───────────────────────────

const STATUS_DOT: Record<string, string> = {
  not_started: "bg-slate-400",
  in_progress: "bg-amber-500",
  done: "bg-green-500",
};

const TASK_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-slate-100", text: "text-slate-600" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-600" },
  pending_verification: { bg: "bg-amber-50", text: "text-amber-600" },
  completed: { bg: "bg-green-50", text: "text-green-600" },
  rejected: { bg: "bg-red-50", text: "text-red-600" },
  skipped: { bg: "bg-slate-50", text: "text-slate-400" },
  blocked: { bg: "bg-orange-50", text: "text-orange-600" },
};

// ── Phase icons ─────────────────────────────

const PHASE_ICONS: Record<string, string> = {
  megaphone: "📢",
  "clipboard-list": "📋",
  package: "📦",
  plane: "✈️",
  compass: "🧭",
  sparkles: "✨",
  home: "���",
  flag: "🏁",
  circle: "⚪",
};

// ══════════════════════════════════════════════
// MAIN COMPONENT
// ══���════════════════���══════════════════════════

interface TripTimelineClientProps {
  tripId: string;
  isOrganizer: boolean;
}

export function TripTimelineClient({ tripId, isOrganizer }: TripTimelineClientProps) {
  const { t } = useTranslation();
  const [phases, setPhases] = useState<PhaseWithMilestones[]>([]);
  const [stats, setStats] = useState<TimelineStats>({ total_tasks: 0, completed_tasks: 0, progress_percent: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneWithTasks | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    const result = await fetchTripTimeline(tripId);
    if (!result.error) {
      setPhases(result.phases);
      setStats(result.stats);
      if (result.phases.length === 0 && isOrganizer) {
        setShowTemplateSelector(true);
      }
    }
    setLoading(false);
  }, [tripId, isOrganizer]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-teal-500 rounded-full animate-spin mr-3" />
        {t("common.loading")}
      </div>
    );
  }

  if (showTemplateSelector && phases.length === 0) {
    return (
      <TemplateSelector
        tripId={tripId}
        onInit={() => {
          setShowTemplateSelector(false);
          loadTimeline();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Timeline Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t("timeline.title")}</h2>
        {isOrganizer && (
          <AddPhaseButton tripId={tripId} onCreated={loadTimeline} />
        )}
      </div>

      {/* ── Progress Bar ── */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">
          {t("timeline.overallProgress")
            .replace("{completed}", String(stats.completed_tasks))
            .replace("{total}", String(stats.total_tasks))}
        </span>
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full">
          <div
            className="h-1.5 bg-teal-500 rounded-full transition-all"
            style={{ width: `${stats.progress_percent}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-teal-600">
          {t("timeline.progressPercent").replace("{percent}", String(stats.progress_percent))}
        </span>
      </div>

      {/* ── Phases (horizontal scroll) ── */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollSnapType: "x mandatory" }}>
        {phases.map((phase) => (
          <PhaseColumn
            key={phase.id}
            phase={phase}
            tripId={tripId}
            isOrganizer={isOrganizer}
            onMilestoneClick={setSelectedMilestone}
            onRefresh={loadTimeline}
          />
        ))}
      </div>

      {/* ── Milestone Modal ── */}
      {selectedMilestone && (
        <MilestoneModal
          milestone={selectedMilestone}
          tripId={tripId}
          isOrganizer={isOrganizer}
          onClose={() => setSelectedMilestone(null)}
          onRefresh={() => {
            setSelectedMilestone(null);
            loadTimeline();
          }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// TEMPLATE SELECTOR
// ═════════════════���════════════════════════════

function TemplateSelector({ tripId, onInit }: { tripId: string; onInit: () => void }) {
  const { t } = useTranslation();
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
      setError(result.error ?? "Unknown error");
    }
    setInitializing(false);
  };

  const handleEmpty = () => {
    onInit(); // just close and show empty timeline
  };

  if (loading) {
    return <div className="py-16 text-center text-slate-400">{t("common.loading")}</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{t("timeline.title")}</h2>
        <p className="text-slate-500">{t("timeline.noTimeline")}</p>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        <p className="text-sm font-semibold text-slate-700">{t("timeline.chooseTemplate")}</p>
        {templates.map((tpl) => {
          const nameKey = `template${tpl.key.charAt(0).toUpperCase()}${tpl.key.slice(1)}` as keyof typeof t;
          return (
            <button
              key={tpl.id}
              onClick={() => handleInit(tpl.id)}
              disabled={initializing}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all text-left disabled:opacity-50"
            >
              <span className="text-2xl">{PHASE_ICONS[tpl.icon] || "📋"}</span>
              <div>
                <span className="block text-sm font-semibold text-slate-800">
                  {(tpl.name_localized as Record<string, string>)?.hu || tpl.name}
                </span>
                {tpl.description && (
                  <span className="block text-xs text-slate-500 mt-0.5">{tpl.description}</span>
                )}
              </div>
            </button>
          );
        })}
        <button
          onClick={handleEmpty}
          disabled={initializing}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-dashed border-slate-300 hover:border-teal-300 hover:bg-teal-50/30 transition-all text-left disabled:opacity-50"
        >
          <span className="text-2xl">➕</span>
          <span className="text-sm font-medium text-slate-600">{t("timeline.emptyTemplate")}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 break-all">
          <strong>{t("timeline.initError")}:</strong> {error}
        </div>
      )}

      {initializing && (
        <div className="flex items-center justify-center gap-2 text-teal-600 text-sm">
          <div className="w-4 h-4 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
          {t("common.loading")}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// PHASE COLUMN
// ═════════════��════════════════════════════════

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
  const { t } = useTranslation();
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState("");

  const handleAddMilestone = async () => {
    if (!newMilestoneName.trim()) return;
    await createMilestone(phase.id, tripId, newMilestoneName.trim());
    setNewMilestoneName("");
    setAddingMilestone(false);
    onRefresh();
  };

  const milestoneCount = phase.milestones.length;
  const icon = PHASE_ICONS[phase.icon] || "⚪";

  return (
    <div
      className="flex-shrink-0 w-64 bg-slate-100 rounded-xl p-3 space-y-2.5"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Phase Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-bold text-slate-900">{phase.name}</span>
        </div>
        <span className="flex items-center justify-center w-6 h-6 text-xs font-semibold text-white bg-teal-500 rounded-full">
          {milestoneCount}
        </span>
      </div>

      {/* Milestone Cards */}
      {phase.milestones.map((ms) => (
        <MilestoneCard key={ms.id} milestone={ms} onClick={() => onMilestoneClick(ms)} />
      ))}

      {/* Add Milestone */}
      {isOrganizer && (
        addingMilestone ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newMilestoneName}
              onChange={(e) => setNewMilestoneName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddMilestone(); if (e.key === "Escape") setAddingMilestone(false); }}
              placeholder={t("timeline.milestoneName")}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleAddMilestone} className="flex-1 text-xs font-medium text-white bg-teal-500 rounded-lg py-1.5 hover:bg-teal-600">
                {t("common.save")}
              </button>
              <button onClick={() => setAddingMilestone(false)} className="flex-1 text-xs font-medium text-slate-500 bg-white rounded-lg py-1.5 border border-slate-200 hover:bg-slate-50">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingMilestone(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg hover:border-teal-300 hover:text-teal-500 transition-colors"
          >
            <span>+</span> {t("timeline.addMilestone")}
          </button>
        )
      )}
    </div>
  );
}

// ════════════════════���═════════════════════════
// MILESTONE CARD
// ════════��═════════════════════════════════════

function MilestoneCard({ milestone, onClick }: { milestone: MilestoneWithTasks; onClick: () => void }) {
  const { t, locale } = useTranslation();
  const progressPct = milestone.task_count > 0
    ? Math.round((milestone.completed_count / milestone.task_count) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg p-3 border border-slate-200 hover:border-teal-300 hover:shadow-sm transition-all space-y-2"
    >
      {/* Top row: status dot + name */}
      <div className="flex items-start gap-2">
        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${STATUS_DOT[milestone.status] || STATUS_DOT.not_started}`} />
        <span className="text-sm font-medium text-slate-800 leading-tight">{milestone.name}</span>
      </div>

      {/* Bottom row: due date + progress */}
      <div className="flex items-center justify-between">
        {milestone.due_date ? (
          <span className="text-xs text-slate-400">
            {new Date(milestone.due_date).toLocaleDateString(locale === "en" ? "en-US" : "hu-HU", { month: "short", day: "numeric" })}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <div className="w-12 h-1 bg-slate-200 rounded-full">
            <div className="h-1 bg-teal-500 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs text-slate-400">{milestone.completed_count}/{milestone.task_count}</span>
        </div>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════
// MILESTONE MODAL
// ══════════════════���═══════════════════════════

function MilestoneModal({
  milestone,
  tripId,
  isOrganizer,
  onClose,
  onRefresh,
}: {
  milestone: MilestoneWithTasks;
  tripId: string;
  isOrganizer: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { t, locale } = useTranslation();
  const [name, setName] = useState(milestone.name);
  const [status, setStatus] = useState(milestone.status);
  const [dueDate, setDueDate] = useState(milestone.due_date || "");
  const [notes, setNotes] = useState(milestone.description || "");
  const [newTaskName, setNewTaskName] = useState("");
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<TimelineTask[]>(milestone.tasks);

  const handleSave = async () => {
    setSaving(true);
    await updateMilestone(milestone.id, {
      name,
      status,
      due_date: dueDate || null,
      description: notes || undefined,
    });
    setSaving(false);
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm(t("timeline.milestoneDeleteConfirm"))) return;
    await deleteMilestone(milestone.id);
    onRefresh();
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;
    const result = await createTask(milestone.id, tripId, { name: newTaskName.trim() });
    if (result.task) {
      setTasks([...tasks, result.task]);
    }
    setNewTaskName("");
  };

  const handleToggleTask = async (task: TimelineTask) => {
    if (task.status === "completed") {
      await updateTask(task.id, { status: "pending" });
      setTasks(tasks.map((t) => t.id === task.id ? { ...t, status: "pending" } : t));
    } else if (task.status === "pending" || task.status === "rejected") {
      await submitTask(task.id);
      setTasks(tasks.map((t) => t.id === task.id ? { ...t, status: task.requires_verification ? "pending_verification" : "completed" } : t));
    }
  };

  const handleVerify = async (task: TimelineTask) => {
    await verifyTask(task.id);
    setTasks(tasks.map((t) => t.id === task.id ? { ...t, status: "completed" } : t));
  };

  const handleReject = async (task: TimelineTask) => {
    const note = prompt(t("timeline.rejectionNote"));
    if (note == null) return;
    await rejectTask(task.id, note);
    setTasks(tasks.map((t) => t.id === task.id ? { ...t, status: "rejected" } : t));
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  const statusOptions: { value: typeof status; label: string; color: string }[] = [
    { value: "not_started", label: t("timeline.statusNotStarted"), color: "bg-slate-100 text-slate-600" },
    { value: "in_progress", label: t("timeline.statusInProgress"), color: "bg-amber-100 text-amber-700" },
    { value: "done", label: t("timeline.statusDone"), color: "bg-green-100 text-green-700" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4">
        <div className="p-6 space-y-5">
          {/* Title */}
          {isOrganizer ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-lg font-bold text-slate-900 border-0 border-b-2 border-transparent focus:border-teal-400 outline-none pb-1"
            />
          ) : (
            <h3 className="text-lg font-bold text-slate-900">{name}</h3>
          )}

          {/* Status pills */}
          {isOrganizer && (
            <div className="flex gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    status === opt.value ? opt.color : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Due date */}
          {isOrganizer ? (
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">{t("timeline.milestoneDueDate")}</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none"
              />
            </div>
          ) : milestone.due_date ? (
            <p className="text-sm text-slate-500">
              {t("timeline.milestoneDueDate")}: {new Date(milestone.due_date).toLocaleDateString(locale === "en" ? "en-US" : "hu-HU")}
            </p>
          ) : null}

          {/* Tasks */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-2">
              {t("timeline.milestoneTasks")} ({tasks.filter((t) => t.status === "completed").length}/{tasks.length})
            </label>
            <div className="space-y-1.5">
              {tasks.map((task) => {
                const isCompleted = task.status === "completed" || task.status === "skipped";
                const isPendingVerification = task.status === "pending_verification";
                const statusStyle = TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS.pending;

                return (
                  <div key={task.id} className="flex items-center gap-2 group">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleTask(task)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs shrink-0 transition-colors ${
                        isCompleted
                          ? "border-green-500 bg-green-50 text-green-600"
                          : isPendingVerification
                          ? "border-amber-400 bg-amber-50 text-amber-600"
                          : "border-slate-300 hover:border-teal-400"
                      }`}
                    >
                      {isCompleted && "✓"}
                      {isPendingVerification && "⏳"}
                    </button>

                    {/* Task name */}
                    <span className={`flex-1 text-sm ${isCompleted ? "text-slate-400 line-through" : "text-slate-700"}`}>
                      {task.name}
                    </span>

                    {/* Status badge for non-standard */}
                    {isPendingVerification && isOrganizer && (
                      <div className="flex gap-1">
                        <button onClick={() => handleVerify(task)} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium hover:bg-green-200">
                          ���
                        </button>
                        <button onClick={() => handleReject(task)} className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded font-medium hover:bg-red-200">
                          ✗
                        </button>
                      </div>
                    )}

                    {task.status === "rejected" && (
                      <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                        {t("timeline.taskRejected")}
                      </span>
                    )}

                    {/* Delete */}
                    {isOrganizer && (
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add task */}
            {isOrganizer && (
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
                  placeholder={t("timeline.addTask")}
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-teal-400 outline-none"
                />
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskName.trim()}
                  className="px-3 py-1.5 text-xs font-semibold text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          {isOrganizer && (
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">{t("timeline.milestoneNotes")}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none resize-none"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {isOrganizer && (
              <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-600 font-medium">
                {t("timeline.milestoneDelete")}
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
                {t("common.cancel")}
              </button>
              {isOrganizer && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:opacity-50"
                >
                  {saving ? "..." : t("timeline.milestoneSave")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══���═══════════════════════════════════════════
// ADD PHASE BUTTON
// ═══════��════════════════════════════════���═════

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
        onClick={() => setAdding(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors"
      >
        <span>+</span> {t("timeline.addPhase")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
        placeholder={t("timeline.phaseName")}
        className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-teal-400 outline-none"
        autoFocus
      />
      <button onClick={handleAdd} className="px-3 py-1.5 text-xs font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600">
        {t("common.save")}
      </button>
      <button onClick={() => setAdding(false)} className="text-xs text-slate-400 hover:text-slate-600">
        ✕
      </button>
    </div>
  );
}
