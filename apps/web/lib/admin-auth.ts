import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * The signed-in platform admin, or null. Never redirects — callers decide
 * (admin actions redirect, public pages merely widen what an admin may see).
 * The confirmed ADMIN_EMAIL is the bootstrap super-admin; otherwise an active admin_roles row is required.
 * Role management passes requiredRole to exclude every lower administrative role.
 */
export async function getPlatformAdmin(requiredRole?: "super_admin"): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase() && user.email_confirmed_at) return user;

  const { data: role, error } = await supabase
    .from("admin_roles")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  return error || !role || (requiredRole && role.role !== requiredRole) ? null : user;
}

/**
 * A trip the public RLS hides (draft, private, followers-only) — for platform admins only,
 * so the admin trip list's "View" link opens every trip instead of a 404. Deleted trips stay hidden.
 * Same select shape as `fetchTripBySlug`.
 */
export async function fetchTripBySlugForAdmin(slug: string) {
  if (!(await getPlatformAdmin())) return null;
  const { data, error } = await createAdminClient()
    .from("trips")
    .select(
      `
      *,
      categories (id, name, name_localized, icon_name, color_hex),
      sub_disciplines (id, name, name_localized),
      profiles!trips_organizer_id_fkey (id, display_name, avatar_url, slug, subscription_tier)
    `
    )
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) console.error("Admin trip fetch error:", error);
  return data ?? null;
}
