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
    // table may not exist yet
  }

  return user;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminRoleEntry {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

// ─── Read + auto-sync env admin ───────────────────────────────────────────────

export async function getAdminRoles(): Promise<{
  admins: AdminRoleEntry[];
  currentUserId: string;
}> {
  const currentUser = await requireAdmin();
  const adminClient = createAdminClient();

  // ADMIN_EMAIL env alapján auto-sync: ha még nincs DB-ben, beírjuk super_admin-ként
  const envAdminEmail = process.env.ADMIN_EMAIL;
  if (envAdminEmail) {
    const { data: envProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", envAdminEmail)
      .single();

    if (envProfile) {
      const { data: existing } = await adminClient
        .from("admin_roles")
        .select("id")
        .eq("user_id", envProfile.id)
        .single();

      if (!existing) {
        await adminClient.from("admin_roles").insert({
          user_id: envProfile.id,
          role: "super_admin",
          is_active: true,
          notes: "Auto-sync from ADMIN_EMAIL env var",
        });
      }
    }
  }

  const { data: rolesData, error } = await adminClient
    .from("admin_roles")
    .select("id, user_id, role, is_active, notes, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return { admins: [], currentUserId: currentUser.id };
  }

  // Profil adatok külön lekérdezéssel (FK join nem megbízható service_role-lal)
  const userIds = (rolesData ?? []).map((r) => r.user_id);
  const profileMap: Record<string, { email: string; display_name: string | null; first_name: string | null; last_name: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, email, display_name, first_name, last_name")
      .in("id", userIds);

    (profiles ?? []).forEach((p) => {
      profileMap[p.id] = {
        email: p.email ?? "",
        display_name: p.display_name,
        first_name: p.first_name,
        last_name: p.last_name,
      };
    });
  }

  const admins: AdminRoleEntry[] = (rolesData ?? []).map((row) => {
    const p = profileMap[row.user_id];
    return {
      id: row.id,
      user_id: row.user_id,
      email: p?.email ?? "",
      display_name: p?.display_name ?? (`${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || null),
      role: row.role,
      is_active: row.is_active,
      notes: row.notes,
      created_at: row.created_at,
    };
  });

  return { admins, currentUserId: currentUser.id };
}

// ─── Grant admin ──────────────────────────────────────────────────────────────

export async function grantAdmin(formData: {
  email: string;
  role: string;
  notes?: string;
  createNewUser?: boolean;
  displayName?: string;
  password?: string;
}): Promise<{ success: boolean; error?: string }> {
  const currentUser = await requireAdmin();
  const adminClient = createAdminClient();
  const email = formData.email.toLowerCase().trim();

  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  // ── Új felhasználó létrehozása ──
  if (formData.createNewUser) {
    if (existingProfile) {
      return { success: false, error: "userAlreadyExists" };
    }
    if (!formData.password || formData.password.length < 8) {
      return { success: false, error: "passwordTooShort" };
    }

    const displayName = (formData.displayName ?? "").trim();
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName || email,
        display_name: displayName || email,
      },
    });

    if (createErr || !created.user) {
      return { success: false, error: createErr?.message ?? "createUserFailed" };
    }

    // handle_new_user trigger létrehoz profile-t; biztos ami biztos: display_name update
    if (displayName) {
      await adminClient
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", created.user.id);
    }

    const { error: roleErr } = await adminClient.from("admin_roles").insert({
      user_id: created.user.id,
      role: formData.role,
      is_active: true,
      granted_by: currentUser.id,
      notes: formData.notes ?? null,
    });

    if (roleErr) return { success: false, error: roleErr.message };
    return { success: true };
  }

  // ── Meglévő felhasználó admin-ná tétele ──
  if (!existingProfile) {
    return { success: false, error: "userNotFound" };
  }

  const { data: existing } = await adminClient
    .from("admin_roles")
    .select("id, is_active")
    .eq("user_id", existingProfile.id)
    .maybeSingle();

  if (existing) {
    if (existing.is_active) {
      return { success: false, error: "alreadyAdmin" };
    }
    const { error } = await adminClient
      .from("admin_roles")
      .update({
        is_active: true,
        role: formData.role,
        notes: formData.notes ?? null,
        granted_by: currentUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  const { error } = await adminClient.from("admin_roles").insert({
    user_id: existingProfile.id,
    role: formData.role,
    is_active: true,
    granted_by: currentUser.id,
    notes: formData.notes ?? null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Update role ──────────────────────────────────────────────────────────────

export async function updateAdminRole(
  adminRoleId: string,
  role: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("admin_roles")
    .update({ role, notes: notes ?? null, updated_at: new Date().toISOString() })
    .eq("id", adminRoleId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Revoke admin ─────────────────────────────────────────────────────────────

export async function revokeAdmin(
  adminRoleId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const adminClient = createAdminClient();

  // Megakadályozzuk az utolsó aktív admin törlését
  const { count } = await adminClient
    .from("admin_roles")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if ((count ?? 0) <= 1) {
    return { success: false, error: "lastAdmin" };
  }

  const { error } = await adminClient
    .from("admin_roles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", adminRoleId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
