import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { t } = await getServerT();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
        anchors={[
          { label: t('nav.myTrips'), href: '/trips' },
          { label: t('nav.newTrip'), href: '/trips/new' },
        ]}
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6">
          {t('dashboard.welcomeMessage', { name: user.user_metadata?.full_name || t('dashboard.welcomeDefault') })}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Quick Action Cards */}
          <Link
            href="/trips"
            className="p-6 bg-white rounded-2xl border border-navy-200 hover:border-trevu-400 hover:shadow-trevu-lg transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-trevu-50 flex items-center justify-center mb-4">
              <span className="text-2xl">🏔️</span>
            </div>
            <h3 className="font-semibold text-navy-900 group-hover:text-trevu-600 transition-colors">
              {t('dashboard.myTrips')}
            </h3>
            <p className="text-sm text-navy-500 mt-1">
              {t('dashboard.myTripsDescription')}
            </p>
          </Link>

          <Link
            href="/trips/new"
            className="p-6 bg-white rounded-2xl border border-navy-200 hover:border-trevu-400 hover:shadow-trevu-lg transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-trevu-50 flex items-center justify-center mb-4">
              <span className="text-2xl">➕</span>
            </div>
            <h3 className="font-semibold text-navy-900 group-hover:text-trevu-600 transition-colors">
              {t('dashboard.newTrip')}
            </h3>
            <p className="text-sm text-navy-500 mt-1">
              {t('dashboard.newTripDescription')}
            </p>
          </Link>

          <div className="p-6 bg-white rounded-2xl border border-navy-200 opacity-60">
            <div className="w-12 h-12 rounded-xl bg-navy-100 flex items-center justify-center mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="font-semibold text-navy-900">{t('dashboard.expenses')}</h3>
            <p className="text-sm text-navy-500 mt-1">
              {t('common.comingSoon')}
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-navy-200 opacity-60">
            <div className="w-12 h-12 rounded-xl bg-navy-100 flex items-center justify-center mb-4">
              <span className="text-2xl">🧭</span>
            </div>
            <h3 className="font-semibold text-navy-900">{t('dashboard.guides')}</h3>
            <p className="text-sm text-navy-500 mt-1">
              {t('common.comingSoon')}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="p-4 rounded-xl bg-trevu-50 border border-trevu-200">
          <p className="text-sm text-trevu-800">
            <span className="font-semibold">{t('dashboard.systemStatus')}:</span>{" "}
            {t('dashboard.systemStatusText')}
          </p>
        </div>
      </div>
    </main>
  );
}
