"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { redirect } from "next/navigation";
import { getPlatformAdmin } from "@/lib/admin-auth";

// ─── Admin jogosultság ellenőrzés ────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await getPlatformAdmin();
  if (!admin) redirect("/dashboard");
  return { supabase: createAdminClient(), user: admin };
}

// ─── Dashboard statisztikák ──────────────────────────────────────────────────

export async function getAdminStats() {
  const { supabase } = await requireAdmin();

  const [usersRes, tripsRes, activeTripsRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("trips").select("id", { count: "exact", head: true }),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
  ]);

  // Új regisztrációk (utolsó 30 nap)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { count: newSignups } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo.toISOString());

  return {
    totalUsers: usersRes.count ?? 0,
    totalTrips: tripsRes.count ?? 0,
    activeTrips: activeTripsRes.count ?? 0,
    newSignups: newSignups ?? 0,
    monthlyRevenue: 0, // M04 Payment modul fogja adni
    conversionRate: 0,
    openTickets: 0, // M15 Support modul fogja adni
  };
}

// ─── Felhasználók (M01) ──────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  subscription_tier: string | null;
  trip_count: number;
  is_banned: boolean;
  deleted_at: string | null;
}

export async function getAdminUsers(params: {
  page?: number;
  search?: string;
  status?: string;
  plan?: string;
} = {}): Promise<{ users: AdminUser[]; total: number }> {
  const { supabase } = await requireAdmin();
  const { page = 1, search = "", status, plan } = params;
  const limit = 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("profiles")
    .select(
      `id, display_name, first_name, last_name, email, created_at,
       subscription_tier, deleted_at`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `display_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }
  if (plan) {
    query = query.eq("subscription_tier", plan);
  }
  if (status === "banned") {
    query = query.not("deleted_at", "is", null);
  } else if (status === "active") {
    query = query.is("deleted_at", null);
  }

  const { data: profiles, count, error } = await query;

  if (error) {
    console.error("getAdminUsers error:", error);
    return { users: [], total: 0 };
  }

  const users: AdminUser[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email ?? "",
    display_name: p.display_name,
    first_name: p.first_name,
    last_name: p.last_name,
    created_at: p.created_at,
    subscription_tier: p.subscription_tier,
    trip_count: 0,
    is_banned: p.deleted_at != null,
    deleted_at: p.deleted_at,
  }));

  return { users, total: count ?? 0 };
}

export async function banUser(
  userId: string,
  reason: string,
  duration: "1d" | "7d" | "30d" | "permanent"
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user: adminUser } = await requireAdmin();

  // TODO: banUntil is computed but never passed to the ban call — the chosen
  // duration is currently ignored. See hubnote open questions (2026-08-29).
  const _banUntil =
    duration === "permanent"
      ? null
      : new Date(
          Date.now() +
            (duration === "1d" ? 86400 : duration === "7d" ? 604800 : 2592000) *
              1000
        ).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  // Audit log kísérlet (tábla még nem létezhet)
  try {
    await supabase.from("admin_audit_log").insert({
      admin_user_id: adminUser.id,
      admin_role: "operations_admin",
      action: "user.ban",
      target_type: "user",
      target_id: userId,
      details: { reason, duration },
      result: "success",
    });
  } catch {
    // Audit log tábla még nem létezik
  }

  return { success: true };
}

export async function unbanUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user: adminUser } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: null })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  try {
    await supabase.from("admin_audit_log").insert({
      admin_user_id: adminUser.id,
      admin_role: "operations_admin",
      action: "user.unban",
      target_type: "user",
      target_id: userId,
      result: "success",
    });
  } catch {
    // Audit log tábla még nem létezik
  }

  return { success: true };
}

// ─── Felhasználó részletei (D15 `CMUG6`) ─────────────────────────────────────

export interface AdminUserTripRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  /** "organizer", or the participation status (applied, approved, waitlisted…) */
  role: string;
}

export interface AdminUserDetail extends AdminUser {
  phone: string | null;
  location_city: string | null;
  country_code: string | null;
  reputation_points: number | null;
  last_sign_in_at: string | null;
  trips: AdminUserTripRow[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const { supabase } = await requireAdmin();
  if (!UUID_RE.test(userId)) return null;

  const { data: p, error } = await supabase
    .from("profiles")
    .select(
      `id, display_name, first_name, last_name, email, phone, location_city, country_code,
       created_at, subscription_tier, reputation_points, deleted_at`
    )
    .eq("id", userId)
    .maybeSingle();
  if (error || !p) {
    if (error) console.error("getAdminUserDetail error:", error);
    return null;
  }

  const [authRes, organizedRes, participationRes] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    supabase
      .from("trips")
      .select("id, title, slug, status, start_date, end_date")
      .eq("organizer_id", userId)
      .is("deleted_at", null),
    supabase
      .from("trip_participants")
      .select("status, trips!inner (id, title, slug, status, start_date, end_date, deleted_at, organizer_id)")
      .eq("user_id", userId),
  ]);

  type TripCols = Omit<AdminUserTripRow, "role"> & { deleted_at?: string | null; organizer_id?: string };
  const rows = new Map<string, AdminUserTripRow>();
  for (const t of (organizedRes.data ?? []) as TripCols[]) {
    rows.set(t.id, { id: t.id, title: t.title, slug: t.slug, status: t.status, start_date: t.start_date, end_date: t.end_date, role: "organizer" });
  }
  for (const part of participationRes.data ?? []) {
    const raw = (part as { trips: TripCols | TripCols[] }).trips;
    const t = Array.isArray(raw) ? raw[0] : raw;
    if (!t || t.deleted_at || rows.has(t.id)) continue;
    rows.set(t.id, { id: t.id, title: t.title, slug: t.slug, status: t.status, start_date: t.start_date, end_date: t.end_date, role: part.status as string });
  }
  const trips = [...rows.values()].sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));

  return {
    id: p.id,
    email: p.email ?? "",
    display_name: p.display_name,
    first_name: p.first_name,
    last_name: p.last_name,
    created_at: p.created_at,
    subscription_tier: p.subscription_tier,
    trip_count: trips.length,
    is_banned: p.deleted_at != null,
    deleted_at: p.deleted_at,
    phone: p.phone,
    location_city: p.location_city,
    country_code: p.country_code,
    reputation_points: p.reputation_points,
    last_sign_in_at: authRes.data?.user?.last_sign_in_at ?? null,
    trips,
  };
}

// ─── Túrák (M02) ─────────────────────────────────────────────────────────────

export interface AdminTrip {
  id: string;
  title: string;
  slug: string;
  status: string;
  organizer_id: string;
  organizer_name: string | null;
  category_id: string | null;
  difficulty: string | null;
  start_date: string | null;
  end_date: string | null;
  current_participants: number;
  max_participants: number | null;
  created_at: string;
  location_city: string | null;
}

export async function getAdminTrips(params: {
  page?: number;
  search?: string;
  status?: string;
} = {}): Promise<{ trips: AdminTrip[]; total: number; stats: Record<string, number> }> {
  const { supabase } = await requireAdmin();
  const { page = 1, search = "", status } = params;
  const limit = 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("trips")
    .select(
      `id, title, slug, status, organizer_id, category_id, difficulty,
       start_date, end_date, current_participants, max_participants, created_at,
       location_city,
       profiles!trips_organizer_id_fkey(display_name, first_name, last_name)`,
      { count: "exact" }
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,location_city.ilike.%${search}%`
    );
  }
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("getAdminTrips error:", error);
    return { trips: [], total: 0, stats: {} };
  }

  // Státusz-szerinti összesítők
  const { data: statusStats } = await supabase
    .from("trips")
    .select("status")
    .is("deleted_at", null);

  const stats: Record<string, number> = {};
  (statusStats ?? []).forEach((t) => {
    stats[t.status] = (stats[t.status] ?? 0) + 1;
  });

  const trips: AdminTrip[] = (data ?? []).map((t) => {
    const org = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
    return {
      id: t.id,
      title: t.title,
      slug: t.slug,
      status: t.status,
      organizer_id: t.organizer_id,
      organizer_name: org
        ? org.display_name || `${org.first_name ?? ""} ${org.last_name ?? ""}`.trim() || null
        : null,
      category_id: t.category_id,
      difficulty: t.difficulty,
      start_date: t.start_date,
      end_date: t.end_date,
      current_participants: t.current_participants ?? 0,
      max_participants: t.max_participants,
      created_at: t.created_at,
      location_city: t.location_city,
    };
  });

  return { trips, total: count ?? 0, stats };
}

export async function updateTripStatus(
  tripId: string,
  newStatus: "published" | "cancelled" | "draft"
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user: adminUser } = await requireAdmin();

  const { error } = await supabase
    .from("trips")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", tripId);

  if (error) return { success: false, error: error.message };

  try {
    await supabase.from("admin_audit_log").insert({
      admin_user_id: adminUser.id,
      admin_role: "content_moderator",
      action: `trip.status.${newStatus}`,
      target_type: "trip",
      target_id: tripId,
      result: "success",
    });
  } catch {
    // Audit log tábla még nem létezik
  }

  return { success: true };
}
