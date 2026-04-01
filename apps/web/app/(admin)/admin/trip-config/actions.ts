"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { redirect } from "next/navigation";

// ─── Auth ────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail) return user;

  try {
    const { data: role } = await supabase
      .from("admin_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();
    if (!role) redirect("/admin/login");
  } catch {
    // table may not exist yet in dev
  }

  return user;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminCategory {
  id: string;
  name: string;
  name_localized: { hu?: string; en?: string };
  icon_name: string;
  color_hex: string;
  status: string;
  display_order: number;
}

export interface AdminSubDiscipline {
  id: string;
  category_id: string;
  name: string;
  name_localized: { hu?: string; en?: string };
  status: string;
  display_order: number;
}

export interface AdminParameter {
  id: string;
  category_id: string;
  sub_discipline_id: string | null;
  parameter_key: string;
  label: string;
  label_localized: { hu?: string; en?: string };
  field_type: string;
  is_required: boolean;
  is_filterable: boolean;
  display_order: number;
  group_key: string | null;
  status: string;
  options_count?: number;
}

export interface AdminParameterOption {
  id: string;
  parameter_id: string;
  value: string;
  label: string;
  label_localized: { hu?: string; en?: string };
  icon_name: string | null;
  is_default: boolean;
  sort_order: number;
  status: string;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getTripConfigData(): Promise<{
  categories: AdminCategory[];
  subDisciplines: AdminSubDiscipline[];
  parameters: AdminParameter[];
}> {
  await requireAdmin();
  const admin = createAdminClient();

  const [catRes, sdRes, paramRes] = await Promise.all([
    admin
      .from("categories")
      .select("id, name, name_localized, icon_name, color_hex, status, display_order")
      .order("display_order"),
    admin
      .from("sub_disciplines")
      .select("id, category_id, name, name_localized, status, display_order")
      .order("display_order"),
    admin
      .from("ref_category_parameters")
      .select(
        "id, category_id, sub_discipline_id, parameter_key, label, label_localized, field_type, is_required, is_filterable, display_order, group_key, status"
      )
      .order("display_order"),
  ]);

  // Fetch options counts per parameter
  const paramIds = (paramRes.data ?? []).map((p: { id: string }) => p.id);
  let optionsCounts: Record<string, number> = {};
  if (paramIds.length > 0) {
    const { data: optRows } = await admin
      .from("ref_parameter_options")
      .select("parameter_id")
      .in("parameter_id", paramIds);
    if (optRows) {
      for (const row of optRows) {
        optionsCounts[row.parameter_id] = (optionsCounts[row.parameter_id] ?? 0) + 1;
      }
    }
  }

  const parameters = (paramRes.data ?? []).map((p: AdminParameter) => ({
    ...p,
    options_count: optionsCounts[p.id] ?? 0,
  }));

  return {
    categories: (catRes.data ?? []) as AdminCategory[],
    subDisciplines: (sdRes.data ?? []) as AdminSubDiscipline[],
    parameters: parameters as AdminParameter[],
  };
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function upsertCategory(data: {
  id?: string;
  name: string;
  name_hu: string;
  name_en: string;
  icon_name: string;
  color_hex: string;
  status: string;
  display_order: number;
}): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const payload = {
    name: data.name || data.name_en || data.name_hu,
    name_localized: { hu: data.name_hu, en: data.name_en },
    icon_name: data.icon_name,
    color_hex: data.color_hex,
    status: data.status,
    display_order: data.display_order,
    updated_at: new Date().toISOString(),
  };

  const { error } = data.id
    ? await admin.from("categories").update(payload).eq("id", data.id)
    : await admin.from("categories").insert({ ...payload, id: undefined });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Sub-disciplines ──────────────────────────────────────────────────────────

export async function upsertSubDiscipline(data: {
  id?: string;
  category_id: string;
  name_hu: string;
  name_en: string;
  status: string;
  display_order: number;
}): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const payload = {
    category_id: data.category_id,
    name: data.name_en || data.name_hu,
    name_localized: { hu: data.name_hu, en: data.name_en },
    status: data.status,
    display_order: data.display_order,
    updated_at: new Date().toISOString(),
  };

  const { error } = data.id
    ? await admin.from("sub_disciplines").update(payload).eq("id", data.id)
    : await admin.from("sub_disciplines").insert(payload);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteSubDiscipline(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("sub_disciplines").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Parameters ──────────────────────────────────────────────────────────────

export async function upsertParameter(data: {
  id?: string;
  category_id: string;
  sub_discipline_id?: string | null;
  parameter_key: string;
  label_hu: string;
  label_en: string;
  field_type: string;
  is_required: boolean;
  is_filterable: boolean;
  display_order: number;
  group_key?: string | null;
  status: string;
}): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const payload = {
    category_id: data.category_id,
    sub_discipline_id: data.sub_discipline_id || null,
    parameter_key: data.parameter_key,
    label: data.label_hu || data.label_en,
    label_localized: { hu: data.label_hu, en: data.label_en },
    field_type: data.field_type,
    is_required: data.is_required,
    is_filterable: data.is_filterable,
    display_order: data.display_order,
    group_key: data.group_key || null,
    status: data.status,
    updated_at: new Date().toISOString(),
  };

  const { error } = data.id
    ? await admin.from("ref_category_parameters").update(payload).eq("id", data.id)
    : await admin.from("ref_category_parameters").insert(payload);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteParameter(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("ref_category_parameters").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Parameter Options ──────────────────────────────────────────────────────

export async function getParameterOptions(
  parameterId: string
): Promise<AdminParameterOption[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("ref_parameter_options")
    .select(
      "id, parameter_id, value, label, label_localized, icon_name, is_default, sort_order, status"
    )
    .eq("parameter_id", parameterId)
    .order("sort_order");
  return (data ?? []) as AdminParameterOption[];
}

export async function upsertParameterOption(data: {
  id?: string;
  parameter_id: string;
  value: string;
  label_hu: string;
  label_en: string;
  icon_name?: string | null;
  is_default: boolean;
  sort_order: number;
  status: string;
}): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const payload = {
    parameter_id: data.parameter_id,
    value: data.value,
    label: data.label_en || data.label_hu,
    label_localized: { hu: data.label_hu, en: data.label_en },
    icon_name: data.icon_name || null,
    is_default: data.is_default,
    sort_order: data.sort_order,
    status: data.status,
  };

  const { error } = data.id
    ? await admin.from("ref_parameter_options").update(payload).eq("id", data.id)
    : await admin.from("ref_parameter_options").insert(payload);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteParameterOption(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("ref_parameter_options").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
