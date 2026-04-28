import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";

interface Tier {
  key: "free" | "pro" | "business" | "enterprise";
  popular?: boolean;
  ctaHref: string;
}

const TIERS: Tier[] = [
  { key: "free",       ctaHref: "/get-started" },
  { key: "pro",        ctaHref: "/get-started?tier=pro", popular: true },
  { key: "business",   ctaHref: "/get-started?tier=business" },
  { key: "enterprise", ctaHref: "mailto:hello@ttvk.hu" },
];

export default async function PricingPage() {
  const { t } = await getServerT();

  const featuresByTier: Record<Tier["key"], string[]> = {
    free: [
      t("pricing.tiers.free.feature1"),
      t("pricing.tiers.free.feature2"),
      t("pricing.tiers.free.feature3"),
      t("pricing.tiers.free.feature4"),
      t("pricing.tiers.free.feature5"),
    ],
    pro: [
      t("pricing.tiers.pro.feature1"),
      t("pricing.tiers.pro.feature2"),
      t("pricing.tiers.pro.feature3"),
      t("pricing.tiers.pro.feature4"),
      t("pricing.tiers.pro.feature5"),
      t("pricing.tiers.pro.feature6"),
    ],
    business: [
      t("pricing.tiers.business.feature1"),
      t("pricing.tiers.business.feature2"),
      t("pricing.tiers.business.feature3"),
      t("pricing.tiers.business.feature4"),
      t("pricing.tiers.business.feature5"),
      t("pricing.tiers.business.feature6"),
    ],
    enterprise: [
      t("pricing.tiers.enterprise.feature1"),
      t("pricing.tiers.enterprise.feature2"),
      t("pricing.tiers.enterprise.feature3"),
      t("pricing.tiers.enterprise.feature4"),
      t("pricing.tiers.enterprise.feature5"),
      t("pricing.tiers.enterprise.feature6"),
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
          {t("pricing.title")}
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          {t("pricing.subtitle")}
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((tier) => {
            const name = t(`pricing.tiers.${tier.key}.name`);
            const tagline = t(`pricing.tiers.${tier.key}.tagline`);
            const price = t(`pricing.tiers.${tier.key}.price`);
            const cta = t(`pricing.tiers.${tier.key}.cta`);
            const yearly =
              tier.key === "pro" || tier.key === "business"
                ? t(`pricing.tiers.${tier.key}.yearlyPrice`)
                : null;
            const features = featuresByTier[tier.key];

            return (
              <div
                key={tier.key}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 transition-all ${
                  tier.popular
                    ? "border-emerald-500 shadow-lg ring-1 ring-emerald-500/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white bg-emerald-500 rounded-full">
                    {t("pricing.popularBadge")}
                  </span>
                )}

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
                  <p className="mt-1 text-sm text-slate-500 min-h-[40px]">{tagline}</p>
                </div>

                <div className="mt-5 mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">{price}</span>
                    {tier.key !== "free" && tier.key !== "enterprise" && (
                      <span className="text-sm text-slate-500">{t("pricing.perMonth")}</span>
                    )}
                  </div>
                  {yearly && (
                    <p className="mt-1 text-xs text-slate-400">
                      {t("pricing.yearlyHint").replace("{price}", yearly)}
                    </p>
                  )}
                </div>

                <ul className="flex-1 space-y-2.5 text-sm text-slate-700">
                  {features.map((feat, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.ctaHref}
                  className={`mt-6 block w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    tier.popular
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {cta}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-12 text-center text-xs text-slate-400">
          {t("pricing.footnote")}
        </p>
      </section>
    </main>
  );
}
