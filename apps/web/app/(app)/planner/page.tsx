import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Button, StateTemplate } from "@/components/ui";

// Placeholder a Travel Planner (M20) elkészültéig — design: design/D05_Maps_Planner_AI.pen#AS5NP
export default async function PlannerPage() {
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
          icon="compass"
          title={t("nav.travelPlanner")}
          description={t("planner.comingSoonDesc")}
          actions={<Button href="/trips">{t("nav.myTrips")}</Button>}
        />
      </div>
    </main>
  );
}
