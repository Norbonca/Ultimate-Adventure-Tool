import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Button, StateTemplate } from "@/components/ui";

// Placeholder a Community (M06) elkészültéig — design: design/D06_Community.pen#S483v
export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getServerT();

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
        user={
          user
            ? { email: user.email ?? "", displayName: user.user_metadata?.full_name }
            : null
        }
      />

      <div className="max-w-3xl mx-auto px-6 py-16">
        <StateTemplate
          variant="empty"
          icon="users"
          title={t("nav.community")}
          description={t("community.comingSoonDesc")}
          actions={<Button href="/">{t("nav.discoverTrips")}</Button>}
        />
      </div>
    </main>
  );
}
