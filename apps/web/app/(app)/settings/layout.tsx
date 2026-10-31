import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SettingsSidebar } from "./settings-sidebar";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
       
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      {/* Body */}
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:flex-row lg:gap-8 max-w-7xl mx-auto">
        <SettingsSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
