import { getPlatformAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getPlatformAdmin();
  if (!user) redirect("/admin/login");
  const supabase = await createClient();

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
    <div data-surface="day" className="flex min-h-screen bg-slate-900">
      <AdminSidebar user={sidebarUser} />
      <main className="flex-1 bg-slate-50 overflow-auto">
        {children}
      </main>
    </div>
  );
}
