import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { t } = await getServerT();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-[100dvh] bg-canvas text-ink">
      <AppHeader
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="mb-8 border-l-4 border-accent pl-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">
            {t('dashboard.systemStatus')}
          </p>
          <h1 className="max-w-4xl font-display text-4xl font-extrabold leading-none tracking-tight text-ink sm:text-5xl">
          {t('dashboard.welcomeMessage', { name: user.user_metadata?.full_name || t('dashboard.welcomeDefault') })}
          </h1>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-px bg-line lg:grid-cols-12">
          <Link
            href="/trips"
            className="group flex min-h-64 flex-col justify-between bg-surface p-7 transition-colors hover:bg-[var(--color-primary-subtle)] lg:col-span-7 lg:p-9"
          >
            <div className="flex h-12 w-12 items-center justify-center border border-accent text-accent">
              <Icon name="backpack" size={24} />
            </div>
            <div>
              <h2 className="font-display text-4xl font-extrabold leading-none text-ink transition-colors group-hover:text-accent">
                {t('dashboard.myTrips')}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
                {t('dashboard.myTripsDescription')}
              </p>
            </div>
          </Link>

          <Link
            href="/trips/new"
            className="group flex min-h-64 flex-col justify-between bg-ink p-7 text-canvas transition-colors hover:bg-accent hover:text-accent-on lg:col-span-5 lg:p-9"
          >
            <div className="flex h-12 w-12 items-center justify-center border border-current">
              <Icon name="plus" size={24} />
            </div>
            <div>
              <h2 className="font-display text-4xl font-extrabold leading-none">
                {t('dashboard.newTrip')}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 opacity-75">
                {t('dashboard.newTripDescription')}
              </p>
            </div>
          </Link>

          <div className="bg-surface p-7 opacity-60 lg:col-span-6">
            <div className="mb-8 flex h-10 w-10 items-center justify-center border border-line-strong text-ink-muted">
              <Icon name="wallet" size={20} />
            </div>
            <h3 className="font-display text-2xl font-extrabold text-ink">{t('dashboard.expenses')}</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
              {t('common.comingSoon')}
            </p>
          </div>

          <div className="bg-surface p-7 opacity-60 lg:col-span-6">
            <div className="mb-8 flex h-10 w-10 items-center justify-center border border-line-strong text-ink-muted">
              <Icon name="compass" size={20} />
            </div>
            <h3 className="font-display text-2xl font-extrabold text-ink">{t('dashboard.guides')}</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
              {t('common.comingSoon')}
            </p>
          </div>
        </div>

        <div className="border-l-4 border-accent bg-[var(--color-primary-subtle)] px-5 py-4">
          <p className="text-sm text-ink">
            <span className="font-semibold">{t('dashboard.systemStatus')}:</span>{" "}
            {t('dashboard.systemStatusText')}
          </p>
        </div>
      </div>
    </main>
  );
}
