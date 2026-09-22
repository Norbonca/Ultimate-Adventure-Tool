import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";

interface Tier {
  key: "free" | "pro" | "business" | "enterprise";
  popular?: boolean;
  ctaHref: string;
}

const PRIMARY_TIERS: Tier[] = [
  { key: "free", ctaHref: "/get-started" },
  { key: "pro", ctaHref: "/get-started?tier=pro", popular: true },
  { key: "business", ctaHref: "/get-started?tier=business" },
];

const ENTERPRISE_TIER: Tier = { key: "enterprise", ctaHref: "mailto:hello@ttvk.hu" };

export default async function PricingPage() {
  const { t } = await getServerT();

  const featuresByTier: Record<Tier["key"], string[]> = {
    free: [t("pricing.tiers.free.feature1"), t("pricing.tiers.free.feature2"), t("pricing.tiers.free.feature3"), t("pricing.tiers.free.feature4"), t("pricing.tiers.free.feature5")],
    pro: [t("pricing.tiers.pro.feature1"), t("pricing.tiers.pro.feature2"), t("pricing.tiers.pro.feature3"), t("pricing.tiers.pro.feature4"), t("pricing.tiers.pro.feature5"), t("pricing.tiers.pro.feature6")],
    business: [t("pricing.tiers.business.feature1"), t("pricing.tiers.business.feature2"), t("pricing.tiers.business.feature3"), t("pricing.tiers.business.feature4"), t("pricing.tiers.business.feature5"), t("pricing.tiers.business.feature6")],
    enterprise: [t("pricing.tiers.enterprise.feature1"), t("pricing.tiers.enterprise.feature2"), t("pricing.tiers.enterprise.feature3"), t("pricing.tiers.enterprise.feature4"), t("pricing.tiers.enterprise.feature5"), t("pricing.tiers.enterprise.feature6")],
  };

  return (
    <main className="min-h-[100dvh] bg-canvas text-ink">
      <AppHeader anchors={[
        { label: t("nav.discover"), href: "/" },
        { label: t("nav.pricing"), href: "/pricing" },
        { label: t("nav.community"), href: "/community" },
      ]} />

      <section className="mx-auto max-w-[1440px] px-5 pb-10 pt-14 sm:px-8 lg:px-10 lg:pt-20">
        <h1 className="max-w-4xl font-display text-5xl font-bold leading-[0.95] tracking-tight text-ink sm:text-6xl lg:text-7xl">
          {t("pricing.title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
          {t("pricing.subtitle")}
        </p>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-10">
        <div className="grid border-t border-line-strong lg:grid-cols-3">
          {PRIMARY_TIERS.map((tier) => {
            const yearly = tier.key === "pro" || tier.key === "business"
              ? t(`pricing.tiers.${tier.key}.yearlyPrice`)
              : null;
            return (
              <article
                key={tier.key}
                className={`relative flex min-h-[580px] flex-col border-b border-line-strong p-6 sm:p-8 lg:border-b-0 lg:border-r lg:last:border-r-0 ${tier.popular ? "bg-surface" : "bg-transparent"}`}
              >
                {tier.popular && (
                  <span className="mb-5 w-fit bg-accent px-3 py-1 text-xs font-semibold text-accent-on">
                    {t("pricing.popularBadge")}
                  </span>
                )}
                <h2 className="font-display text-3xl font-semibold text-ink">
                  {t(`pricing.tiers.${tier.key}.name`)}
                </h2>
                <p className="mt-2 min-h-[48px] max-w-[36ch] text-sm leading-relaxed text-ink-muted">
                  {t(`pricing.tiers.${tier.key}.tagline`)}
                </p>
                <div className="my-7 flex items-end gap-2">
                  <span className="font-display text-5xl font-bold leading-none text-ink">
                    {t(`pricing.tiers.${tier.key}.price`)}
                  </span>
                  {tier.key !== "free" && <span className="pb-1 text-sm text-ink-muted">{t("pricing.perMonth")}</span>}
                </div>
                {yearly && (
                  <p className="-mt-5 mb-5 text-xs text-ink-muted">
                    {t("pricing.yearlyHint").replace("{price}", yearly)}
                  </p>
                )}
                <Button href={tier.ctaHref} variant={tier.popular ? "primary" : "outline"} fullWidth>
                  {t(`pricing.tiers.${tier.key}.cta`)}
                </Button>
                <ul className="mt-7 flex-1 space-y-3 text-sm text-ink-body">
                  {featuresByTier[tier.key].map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent" strokeWidth={2.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] border-y border-line-strong bg-surface lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col justify-center px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          <h2 className="font-display text-4xl font-semibold text-ink sm:text-5xl">{t("pricing.tiers.enterprise.name")}</h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">{t("pricing.tiers.enterprise.tagline")}</p>
          <ul className="mt-7 grid gap-3 text-sm text-ink-body sm:grid-cols-2">
            {featuresByTier[ENTERPRISE_TIER.key].map((feature) => (
              <li key={feature} className="flex gap-2.5">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent" strokeWidth={2.5} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Button href={ENTERPRISE_TIER.ctaHref} variant="outline" className="mt-8 w-fit">
            {t("pricing.tiers.enterprise.cta")}
          </Button>
        </div>
        <div className="relative min-h-[300px] lg:min-h-[420px]">
          <Image
            src="https://images.unsplash.com/photo-1486911278844-a81c5267e227?w=1600&q=82&fit=crop&auto=format"
            alt=""
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
        </div>
      </section>

      <p className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-ink-muted sm:px-8 lg:px-10">
        {t("pricing.footnote")}
      </p>
    </main>
  );
}
