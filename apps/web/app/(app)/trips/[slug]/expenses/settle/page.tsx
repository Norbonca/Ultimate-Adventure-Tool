/**
 * M03 Kiegyenlítés — `/trips/[slug]/expenses/settle` (D04 EzvWI 1440 · podMm 390 + megerősítő lap · JQ22A „nem értek egyet”).
 */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { fetchExpensesView } from "../../../expense-actions";
import { ExpensesTripBar } from "@/components/expenses/ExpensesTripBar";
import { SettleBoard } from "@/components/expenses/SettleBoard";

interface Props { params: Promise<{ slug: string }> }

export default async function TripSettlePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/trips/${slug}/expenses/settle`);
  const view = await fetchExpensesView(slug);
  if (!view) notFound();
  const { t } = await getServerT();
  const locale = await getServerLocale();
  const { data: disputeDays } = await supabase.from("system_settings").select("value").eq("key", "fx_settlement_dispute_days").maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <div data-surface="night" className="contents">
        <AppHeader user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }} />
      </div>
      <ExpensesTripBar
        slug={slug}
        title={view.trip.title}
        heading={t("expenses.settlePage.title")}
        settlementCurrency={view.trip.settlementCurrency}
        fxMode={view.trip.fxMode}
        locked={view.expenses.some((e) => e.status === "active")}
        active="settle"
        actions={
          <Link href={`/trips/${slug}/expenses`} className="inline-flex h-11 items-center gap-2 rounded-trevu bg-navy-100 px-5 text-sm font-semibold text-navy-900">
            <Icon name="arrow-left" size={18} aria-hidden />
            {t("expenses.backToExpenses")}
          </Link>
        }
      />
      <SettleBoard view={view} locale={locale} disputeDays={Number(disputeDays?.value ?? 30) || 30} />
    </main>
  );
}
