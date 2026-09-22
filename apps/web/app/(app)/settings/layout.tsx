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
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <AppHeader
       
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:px-10 lg:py-14">
        <SettingsSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
