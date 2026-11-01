/**
 * M03 Költségek — `/trips/[slug]/expenses` (D04 fxd4X 1440 · lgLnv 390 · xlpH8 üres/jog · JQ22A állapotok).
 * Csak a túra szervezője és jóváhagyott résztvevői látják (RLS + fetchExpensesView).
 */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { fetchExpensesView } from "../../expense-actions";
import { ExpensesTripBar } from "@/components/expenses/ExpensesTripBar";
import { ExpensesDashboard } from "@/components/expenses/ExpensesDashboard";

interface Props { params: Promise<{ slug: string }> }

export default async function TripExpensesPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/trips/${slug}/expenses`);
  const view = await fetchExpensesView(slug);
  if (!view) notFound();
  const { t } = await getServerT();
  const locale = await getServerLocale();
  const active = view.expenses.filter((e) => e.status === "active");

  return (
    <main className="min-h-screen bg-slate-50 pb-24 lg:pb-0">
      <div data-surface="night" className="contents">
        <AppHeader user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }} />
      </div>
      <ExpensesTripBar
        slug={slug}
        title={view.trip.title}
        heading={t("expenses.title")}
        settlementCurrency={view.trip.settlementCurrency}
        fxMode={view.trip.fxMode}
        locked={active.length > 0}
        active="expenses"
        actions={
          <Link href={`/trips/${slug}/expenses/settle`} className="inline-flex h-11 items-center gap-2 rounded-trevu bg-navy-100 px-5 text-sm font-semibold text-navy-900">
            <Icon name="scale" size={18} aria-hidden />
            {t("expenses.settle")}
          </Link>
        }
      />
      <ExpensesDashboard view={view} locale={locale} />
    </main>
  );
}
