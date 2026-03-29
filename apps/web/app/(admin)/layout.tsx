import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Admin role ellenőrzés — admin_roles táblából vagy env alapján
  let isAdmin = false;

  // 1. Env alapú super admin (fejlesztéshez)
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail) {
    isAdmin = true;
  }

  // 2. admin_roles táblából (production)
  if (!isAdmin) {
    try {
      const { data: adminRole } = await supabase
        .from("admin_roles")
        .select("id, role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      if (adminRole) isAdmin = true;
    } catch {
      // Tábla még nem létezik — dev módban folytatjuk
    }
  }

  if (!isAdmin) {
    redirect("/admin/login");
  }

  // Profile adatok a sidebarhoz
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, display_name")
    .eq("id", user.id)
    .single();

  const sidebarUser = {
    email: user.email ?? "",
    displayName: profile?.display_name ?? user.user_metadata?.full_name,
    firstName: profile?.first_name ?? undefined,
    lastName: profile?.last_name ?? undefined,
  };

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <AdminSidebar user={sidebarUser} />
      <main className="flex-1 bg-[#F8FAFC] overflow-auto">
        {children}
      </main>
    </div>
  );
}
