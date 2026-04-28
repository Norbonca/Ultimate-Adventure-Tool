"use server";

import { createClient } from "@/lib/supabase/server";

// ============================================
// M021 — Trip Timeline Server Actions
// ============================================
// CRUD: phases, milestones, tasks
// Template init: sablonból timeline felépítése
// Task completion: önbevallásos + kétszintű flow
// ============================================

// ── Típusok ─────────────────────────────────

export interface TimelineTemplate {
  id: string;
  key: string;
  name: string;
  name_localized: Record<string, string>;
  description: string | null;
  category_id: string | null;
  icon: string;
}

export interface TimelinePhase {
  id: string;
  trip_id: string;
  name: string;
  icon: string;
  sort_order: number;
}

export interface TimelineMilestone {
  id: string;
  phase_id: string;
  trip_id: string;
  name: string;
  description: string | null;
  status: "not_started" | "in_progress" | "done";
  due_date: string | null;
  sort_order: number;
}

export interface TimelineTask {
  id: string;
  milestone_id: string;
  trip_id: string;
  name: string;
  status: string;
  task_type: string;
  assignee_type: string;
  assignee_id: string | null;
  is_required: boolean;
  is_blocking: boolean;
  requires_verification: boolean;
  due_date: string | null;
  sort_order: number;
}

export interface PhaseWithMilestones extends TimelinePhase {
  milestones: MilestoneWithTasks[];
}

export interface MilestoneWithTasks extends TimelineMilestone {
  tasks: TimelineTask[];
  assignees: { user_id: string; display_name: string | null; avatar_url: string | null }[];
  task_count: number;
  completed_count: number;
}

export interface TimelineStats {
  total_tasks: number;
  completed_tasks: number;
  progress_percent: number;
}

// ── Helper: auth check ──────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function verifyTripOrganizer(supabase: Awaited<ReturnType<typeof createClient>>, tripId: string, userId: string) {
  const { data: trip } = await supabase
    .from("trips")
    .select("id, organizer_id, start_date")
    .eq("id", tripId)
    .single();
  if (!trip || trip.organizer_id !== userId) return null;
  return trip;
}

// ══════════════════════════════════════════════
// SABLON LEKÉRDEZÉS
// ══════════════════════════════════════════════

export async function fetchTimelineTemplates(
  categoryId?: string
): Promise<{ templates: TimelineTemplate[]; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { templates: [], error: "Not authenticated" };

  let query = supabase
    .from("ref_timeline_templates")
    .select("id, key, name, name_localized, description, category_id, icon")
    .eq("is_active", true)
    .order("sort_order");

  if (categoryId) {
    query = query.or(`category_id.eq.${categoryId},category_id.is.null`);
  }

  const { data, error } = await query;
  if (error) return { templates: [], error: error.message };

  return { templates: (data ?? []) as TimelineTemplate[] };
}

export async function fetchTimelineTemplateDetail(templateId: string) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { template: null, error: "Not authenticated" };

  // Template + fázisok
  const { data: template } = await supabase
    .from("ref_timeline_templates")
    .select("id, key, name, name_localized, description, icon")
    .eq("id", templateId)
    .single();

  if (!template) return { template: null, error: "Template not found" };

  const { data: phases } = await supabase
    .from("ref_phase_templates")
    .select("id, key, name, name_localized, icon, sort_order")
    .eq("timeline_template_id", templateId)
    .eq("is_active", true)
    .order("sort_order");

  const phaseIds = (phases ?? []).map((p) => p.id);

  const { data: milestones } = await supabase
    .from("ref_milestone_templates")
    .select("id, phase_template_id, name, name_localized, default_offset_days, sort_order")
    .in("phase_template_id", phaseIds.length ? phaseIds : ["__none__"])
    .eq("is_active", true)
    .order("sort_order");

  const milestoneIds = (milestones ?? []).map((m) => m.id);

  const { data: tasks } = await supabase
    .from("ref_task_templates")
    .select("id, milestone_template_id, name, name_localized, task_type, assignee_type, is_required, is_blocking, sort_order")
    .in("milestone_template_id", milestoneIds.length ? milestoneIds : ["__none__"])
    .eq("is_active", true)
    .order("sort_order");

  // Összeállítás
  const phasesWithData = (phases ?? []).map((phase) => ({
    ...phase,
    milestones: (milestones ?? [])
      .filter((m) => m.phase_template_id === phase.id)
      .map((ms) => ({
        ...ms,
        tasks: (tasks ?? []).filter((t) => t.milestone_template_id === ms.id),
      })),
  }));

  return { template: { ...template, phases: phasesWithData }, error: null };
}

// ══════════════════════════════════════════════
// TIMELINE INICIALIZÁLÁS SABLONBÓL
// ══════════════════════════════════════════════

export async function initTimelineFromTemplate(
  tripId: string,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const trip = await verifyTripOrganizer(supabase, tripId, user.id);
  if (!trip) return { success: false, error: "Not authorized" };

  // Ellenőrzés: van-e már timeline
  const { count } = await supabase
    .from("trip_phases")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId);

  if (count && count > 0) {
    return { success: false, error: "Timeline already exists for this trip" };
  }

  // Sablon betöltése
  const { template, error: tplError } = await fetchTimelineTemplateDetail(templateId);
  if (!template || tplError) return { success: false, error: tplError ?? "Template not found" };

  const phaseCount = template.phases?.length ?? 0;
  if (phaseCount === 0) {
    return { success: false, error: `Template has no phases (templateId: ${templateId})` };
  }

  const tripStartDate = trip.start_date ? new Date(trip.start_date) : new Date();
  const errors: string[] = [];

  // Fázisok létrehozása
  for (const phase of template.phases) {
    const { data: newPhase, error: phaseError } = await supabase
      .from("trip_phases")
      .insert({
        trip_id: tripId,
        template_phase_id: phase.id,
        name: phase.name,
        icon: phase.icon,
        sort_order: phase.sort_order,
      })
      .select("id")
      .single();

    if (phaseError || !newPhase) {
      errors.push(`Phase "${phase.name}": ${phaseError?.message ?? "no data returned"}`);
      continue;
    }

    // Mérföldkövek
    for (const milestone of phase.milestones) {
      let dueDate: string | null = null;
      if (milestone.default_offset_days != null) {
        const d = new Date(tripStartDate);
        d.setDate(d.getDate() + milestone.default_offset_days);
        dueDate = d.toISOString().split("T")[0];
      }

      const { data: newMs, error: msError } = await supabase
        .from("trip_milestones")
        .insert({
          trip_id: tripId,
          phase_id: newPhase.id,
          template_milestone_id: milestone.id,
          name: milestone.name,
          due_date: dueDate,
          sort_order: milestone.sort_order,
        })
        .select("id")
        .single();

      if (msError || !newMs) {
        errors.push(`Milestone "${milestone.name}": ${msError?.message ?? "no data returned"}`);
        continue;
      }

      // Feladatok
      if (milestone.tasks && milestone.tasks.length > 0) {
        const taskInserts = milestone.tasks.map((task) => ({
          milestone_id: newMs.id,
          trip_id: tripId,
          template_task_id: task.id,
          name: task.name,
          task_type: task.task_type || "checklist",
          assignee_type: task.assignee_type || "organizer",
          is_required: task.is_required ?? true,
          is_blocking: task.is_blocking ?? false,
          sort_order: task.sort_order,
        }));

        const { error: taskError } = await supabase.from("trip_tasks").insert(taskInserts);
        if (taskError) {
          errors.push(`Tasks for "${milestone.name}": ${taskError.message}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(" | ") };
  }

  return { success: true };
}

// ══════════════════════════════════════════════
// TIMELINE LEKÉRDEZÉS (teljes fa)
// ══════════════════════════════════════════════

export async function fetchTripTimeline(
  tripId: string
): Promise<{ phases: PhaseWithMilestones[]; stats: TimelineStats; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { phases: [], stats: { total_tasks: 0, completed_tasks: 0, progress_percent: 0 }, error: "Not authenticated" };

  // Fázisok
  const { data: phases } = await supabase
    .from("trip_phases")
    .select("id, trip_id, name, icon, sort_order")
    .eq("trip_id", tripId)
    .order("sort_order");

  if (!phases || phases.length === 0) {
    return { phases: [], stats: { total_tasks: 0, completed_tasks: 0, progress_percent: 0 } };
  }

  const phaseIds = phases.map((p) => p.id);

  // Mérföldkövek
  const { data: milestones } = await supabase
    .from("trip_milestones")
    .select("id, phase_id, trip_id, name, description, status, due_date, sort_order")
    .in("phase_id", phaseIds)
    .order("sort_order");

  const milestoneIds = (milestones ?? []).map((m) => m.id);

  // Feladatok
  const { data: tasks } = await supabase
    .from("trip_tasks")
    .select("id, milestone_id, trip_id, name, status, task_type, assignee_type, assignee_id, is_required, is_blocking, requires_verification, due_date, sort_order")
    .eq("trip_id", tripId)
    .order("sort_order");

  // Assignee-k
  const { data: assignees } = await supabase
    .from("trip_milestone_assignees")
    .select("milestone_id, user_id, profiles(display_name, avatar_url)")
    .in("milestone_id", milestoneIds.length ? milestoneIds : ["__none__"]);

  // Stats
  const allTasks = tasks ?? [];
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "completed").length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Összeállítás
  const result: PhaseWithMilestones[] = phases.map((phase) => ({
    ...phase,
    milestones: (milestones ?? [])
      .filter((m) => m.phase_id === phase.id)
      .map((ms) => {
        const msTasks = allTasks.filter((t) => t.milestone_id === ms.id);
        const msAssignees = (assignees ?? [])
          .filter((a) => a.milestone_id === ms.id)
          .map((a) => ({
            user_id: a.user_id,
            display_name: (a.profiles as unknown as Record<string, unknown> | null)?.display_name as string | null,
            avatar_url: (a.profiles as unknown as Record<string, unknown> | null)?.avatar_url as string | null,
          }));

        return {
          ...ms,
          tasks: msTasks,
          assignees: msAssignees,
          task_count: msTasks.length,
          completed_count: msTasks.filter((t) => t.status === "completed").length,
        };
      }),
  }));

  return { phases: result, stats: { total_tasks: totalTasks, completed_tasks: completedTasks, progress_percent: progressPercent } };
}

// ══════════════════════════════════════════════
// FÁZIS CRUD
// ══════════════════════════════════════════════

export async function createPhase(
  tripId: string,
  name: string,
  icon?: string
): Promise<{ phase: TimelinePhase | null; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { phase: null, error: "Not authenticated" };

  const trip = await verifyTripOrganizer(supabase, tripId, user.id);
  if (!trip) return { phase: null, error: "Not authorized" };

  // Max sort_order
  const { data: existing } = await supabase
    .from("trip_phases")
    .select("sort_order")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("trip_phases")
    .insert({
      trip_id: tripId,
      name,
      icon: icon || "circle",
      sort_order: nextOrder,
    })
    .select("id, trip_id, name, icon, sort_order")
    .single();

  if (error) return { phase: null, error: error.message };
  return { phase: data as TimelinePhase };
}

export async function updatePhase(
  phaseId: string,
  data: { name?: string; icon?: string; sort_order?: number }
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("trip_phases")
    .update(data)
    .eq("id", phaseId);

  if (error) return { error: error.message };
  return {};
}

export async function deletePhase(phaseId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("trip_phases").delete().eq("id", phaseId);
  if (error) return { error: error.message };
  return {};
}

// ══════════════════════════════════════════════
// MÉRFÖLDKŐ CRUD
// ══════════════════════════════════════════════

export async function createMilestone(
  phaseId: string,
  tripId: string,
  name: string
): Promise<{ milestone: TimelineMilestone | null; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { milestone: null, error: "Not authenticated" };

  // Max sort_order
  const { data: existing } = await supabase
    .from("trip_milestones")
    .select("sort_order")
    .eq("phase_id", phaseId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("trip_milestones")
    .insert({
      trip_id: tripId,
      phase_id: phaseId,
      name,
      sort_order: nextOrder,
    })
    .select("id, phase_id, trip_id, name, description, status, due_date, sort_order")
    .single();

  if (error) return { milestone: null, error: error.message };
  return { milestone: data as TimelineMilestone };
}

export async function updateMilestone(
  milestoneId: string,
  data: {
    name?: string;
    description?: string;
    status?: "not_started" | "in_progress" | "done";
    due_date?: string | null;
    phase_id?: string;
    sort_order?: number;
  }
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("trip_milestones")
    .update(data)
    .eq("id", milestoneId);

  if (error) return { error: error.message };
  return {};
}

export async function deleteMilestone(milestoneId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("trip_milestones").delete().eq("id", milestoneId);
  if (error) return { error: error.message };
  return {};
}

// ══════════════════════════════════════════════
// FELADAT CRUD
// ══════════════════════════════════════════════

export async function createTask(
  milestoneId: string,
  tripId: string,
  data: {
    name: string;
    description?: string;
    task_type?: string;
    assignee_type?: string;
    is_required?: boolean;
    is_blocking?: boolean;
    due_date?: string;
  }
): Promise<{ task: TimelineTask | null; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { task: null, error: "Not authenticated" };

  // Max sort_order
  const { data: existing } = await supabase
    .from("trip_tasks")
    .select("sort_order")
    .eq("milestone_id", milestoneId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data: task, error } = await supabase
    .from("trip_tasks")
    .insert({
      milestone_id: milestoneId,
      trip_id: tripId,
      name: data.name,
      description: data.description || null,
      task_type: data.task_type || "checklist",
      assignee_type: data.assignee_type || "organizer",
      is_required: data.is_required ?? true,
      is_blocking: data.is_blocking ?? false,
      sort_order: nextOrder,
      due_date: data.due_date || null,
    })
    .select("id, milestone_id, trip_id, name, status, task_type, assignee_type, assignee_id, is_required, is_blocking, requires_verification, due_date, sort_order")
    .single();

  if (error) return { task: null, error: error.message };
  return { task: task as TimelineTask };
}

export async function updateTask(
  taskId: string,
  data: Partial<{
    name: string;
    description: string;
    status: string;
    assignee_type: string;
    assignee_id: string | null;
    is_required: boolean;
    is_blocking: boolean;
    due_date: string | null;
    task_type: string;
    task_result: Record<string, unknown>;
    notes: string;
    sort_order: number;
  }>
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("trip_tasks").update(data).eq("id", taskId);
  if (error) return { error: error.message };
  return {};
}

export async function deleteTask(taskId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("trip_tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };
  return {};
}

// ══════════════════════════════════════════════
// FELADAT TELJESÍTÉS (kétszintű flow)
// ══════════════════════════════════════════════

// Felelős jelzi: kész
export async function submitTask(
  taskId: string,
  result?: Record<string, unknown>
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  // Feladat lekérdezése
  const { data: task } = await supabase
    .from("trip_tasks")
    .select("requires_verification")
    .eq("id", taskId)
    .single();

  if (!task) return { error: "Task not found" };

  const newStatus = task.requires_verification ? "pending_verification" : "completed";
  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    status: newStatus,
    submitted_at: now,
    submitted_by: user.id,
  };

  if (newStatus === "completed") {
    updateData.completed_at = now;
    updateData.completed_by = user.id;
  }

  if (result) {
    updateData.task_result = result;
  }

  const { error } = await supabase.from("trip_tasks").update(updateData).eq("id", taskId);
  if (error) return { error: error.message };

  // Mérföldkő státusz auto-update
  await autoUpdateMilestoneStatus(supabase, taskId);

  return {};
}

// Szervező jóváhagyja
export async function verifyTask(taskId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("trip_tasks")
    .update({
      status: "completed",
      verified_at: now,
      verified_by: user.id,
      completed_at: now,
      completed_by: user.id,
    })
    .eq("id", taskId)
    .eq("status", "pending_verification");

  if (error) return { error: error.message };

  await autoUpdateMilestoneStatus(supabase, taskId);
  return {};
}

// Szervező elutasítja
export async function rejectTask(
  taskId: string,
  note: string
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("trip_tasks")
    .update({
      status: "rejected",
      rejection_note: note,
      verified_at: null,
      verified_by: null,
    })
    .eq("id", taskId)
    .eq("status", "pending_verification");

  if (error) return { error: error.message };

  await autoUpdateMilestoneStatus(supabase, taskId);
  return {};
}

// ── Auto milestone status ───────────────────

async function autoUpdateMilestoneStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string
) {
  // Task-ból milestone_id kiolvasása
  const { data: task } = await supabase
    .from("trip_tasks")
    .select("milestone_id")
    .eq("id", taskId)
    .single();

  if (!task) return;

  // Mérföldkő összes task-ja
  const { data: tasks } = await supabase
    .from("trip_tasks")
    .select("status")
    .eq("milestone_id", task.milestone_id);

  if (!tasks || tasks.length === 0) return;

  const allCompleted = tasks.every((t) => t.status === "completed" || t.status === "skipped");
  const anyCompleted = tasks.some((t) => t.status === "completed" || t.status === "in_progress" || t.status === "pending_verification");

  let newStatus: "not_started" | "in_progress" | "done" = "not_started";
  if (allCompleted) {
    newStatus = "done";
  } else if (anyCompleted) {
    newStatus = "in_progress";
  }

  await supabase
    .from("trip_milestones")
    .update({ status: newStatus })
    .eq("id", task.milestone_id);
}

// ══════════════════════════════════════════════
// FELELŐS KEZELÉS
// ══════════════════════════════════════════════

export async function assignMilestone(
  milestoneId: string,
  userId: string
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("trip_milestone_assignees")
    .upsert({ milestone_id: milestoneId, user_id: userId }, { onConflict: "milestone_id,user_id" });

  if (error) return { error: error.message };
  return {};
}

export async function unassignMilestone(
  milestoneId: string,
  userId: string
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("trip_milestone_assignees")
    .delete()
    .eq("milestone_id", milestoneId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  return {};
}

// ══════════════════════════════════════════════
// RÉSZTVEVŐ FELADATOK (participant dashboard)
// ══════════════════════════════════════════════

export async function fetchMyTasks(
  tripId: string
): Promise<{ tasks: Array<{
  task_id: string;
  task_name: string;
  task_type: string;
  status: string;
  is_required: boolean;
  milestone_name: string;
  phase_name: string;
  due_date: string | null;
  is_overdue: boolean;
}>; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { tasks: [], error: "Not authenticated" };

  // Milestones where user is assignee
  const { data: myAssignments } = await supabase
    .from("trip_milestone_assignees")
    .select("milestone_id")
    .eq("user_id", user.id);

  const myMilestoneIds = (myAssignments ?? []).map((a) => a.milestone_id);

  if (myMilestoneIds.length === 0) {
    // Also check direct task assignments
    const { data: directTasks } = await supabase
      .from("trip_tasks")
      .select("id, name, task_type, status, is_required, due_date, milestone_id, trip_tasks_milestone:trip_milestones(name, phase_id, trip_milestones_phase:trip_phases(name))")
      .eq("trip_id", tripId)
      .eq("assignee_id", user.id);

    const today = new Date().toISOString().split("T")[0];

    return {
      tasks: (directTasks ?? []).map((t) => {
        const ms = t.trip_tasks_milestone as unknown as Record<string, unknown> | null;
        const phase = ms?.trip_milestones_phase as unknown as Record<string, unknown> | null;
        return {
          task_id: t.id,
          task_name: t.name,
          task_type: t.task_type,
          status: t.status,
          is_required: t.is_required,
          milestone_name: (ms?.name as string) || "",
          phase_name: (phase?.name as string) || "",
          due_date: t.due_date,
          is_overdue: t.due_date != null && t.due_date < today && t.status !== "completed" && t.status !== "skipped",
        };
      }),
    };
  }

  // Tasks from assigned milestones
  const { data: tasks } = await supabase
    .from("trip_tasks")
    .select("id, name, task_type, status, is_required, due_date, milestone_id")
    .eq("trip_id", tripId)
    .in("milestone_id", myMilestoneIds)
    .order("sort_order");

  // Milestone + phase names
  const { data: milestones } = await supabase
    .from("trip_milestones")
    .select("id, name, phase_id")
    .in("id", myMilestoneIds);

  const phaseIds = [...new Set((milestones ?? []).map((m) => m.phase_id))];
  const { data: phases } = await supabase
    .from("trip_phases")
    .select("id, name")
    .in("id", phaseIds.length ? phaseIds : ["__none__"]);

  const milestoneMap = new Map((milestones ?? []).map((m) => [m.id, m]));
  const phaseMap = new Map((phases ?? []).map((p) => [p.id, p]));
  const today = new Date().toISOString().split("T")[0];

  return {
    tasks: (tasks ?? []).map((t) => {
      const ms = milestoneMap.get(t.milestone_id);
      const phase = ms ? phaseMap.get(ms.phase_id) : null;
      return {
        task_id: t.id,
        task_name: t.name,
        task_type: t.task_type,
        status: t.status,
        is_required: t.is_required,
        milestone_name: ms?.name || "",
        phase_name: phase?.name || "",
        due_date: t.due_date,
        is_overdue: t.due_date != null && t.due_date < today && t.status !== "completed" && t.status !== "skipped",
      };
    }),
  };
}
