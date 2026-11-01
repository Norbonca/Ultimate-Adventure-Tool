/**
 * M03 túrasáv (D04 fxd4X `TripBar EX` / 390 `TopBar M`): vissza a túrához, cím, meta, mód-chip, al-navigáció.
 * A túraoldalon (D02 KpgDv) nincs fülsor — a Költségek saját al-navigációt kap (DQA-016, NyK-10 „fül”).
 */
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getServerT } from "@/lib/i18n/server";
import { FX_MODE_KEY } from "@/lib/expenses/present";

interface Props {
  slug: string;
  title: string;
  heading: string;
  settlementCurrency: string;
  fxMode: string;
  locked: boolean;
  active: "expenses" | "settle";
  actions?: React.ReactNode;
}

export async function ExpensesTripBar({ slug, title, heading, settlementCurrency, fxMode, locked, active, actions }: Props) {
  const { t } = await getServerT();
  const tr = t as (k: string, p?: Record<string, string | number>) => string;
  const tabs = [
    { key: "overview", href: `/trips/${slug}`, label: t("expenses.tabOverview") },
    { key: "expenses", href: `/trips/${slug}/expenses`, label: t("expenses.title") },
    { key: "settle", href: `/trips/${slug}/expenses/settle`, label: t("expenses.settle") },
  ];
  return (
    <div className="border-b border-navy-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:px-12">
        <Link href={`/trips/${slug}`} className="inline-flex max-w-full items-center gap-2 text-sm font-semibold text-trevu-700">
          <Icon name="arrow-left" size={16} aria-hidden />
          <span className="truncate">{title}</span>
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-navy-900 sm:text-3xl">{heading}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-chip bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-600">
                <Icon name="banknote" size={14} aria-hidden />
                {tr("expenses.settlementCurrency", { currency: settlementCurrency })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-chip bg-trevu-50 px-2.5 py-1 text-xs font-semibold text-trevu-700" data-testid="expenses-mode-chip">
                <Icon name={locked ? "lock" : "unlock"} size={14} aria-hidden />
                {tr(`expenses.mode.${FX_MODE_KEY[fxMode] ?? "expenseDate"}`)} · {locked ? t("expenses.modeLocked") : t("expenses.modeOpen")}
              </span>
            </div>
          </div>
          {actions && <div className="hidden items-center gap-3 lg:flex">{actions}</div>}
        </div>
        <nav className="mt-4 flex gap-6" aria-label={t("expenses.title")}>
          {tabs.map((x) => (
            <Link
              key={x.key}
              href={x.href}
              aria-current={x.key === active ? "page" : undefined}
              className={`-mb-px border-b-2 pb-3 text-sm font-semibold ${x.key === active ? "border-trevu-600 text-trevu-700" : "border-transparent text-navy-500 hover:text-navy-700"}`}
            >
              {x.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
