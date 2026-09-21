"use client";

import Link from "next/link";
import {
  CloudSun, Compass, Facebook, Instagram, Languages, Package, Plane, Shield,
  Twitter, Users, Wallet, WifiOff, Youtube, Zap,
} from "@/lib/icons";
import { AppHeader } from "@/components/AppHeader";
import { useTranslation } from "@/lib/i18n/useTranslation";

const SECTION = "mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28";
const TITLE = "font-display text-4xl font-bold leading-[0.92] text-ink sm:text-5xl lg:text-6xl";

export default function GetStartedPage() {
  const { t } = useTranslation();

  const categories = [
    { name: t("categories.hiking"), label: t("landing.categoryHikingLabel"), image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=900&q=85&fit=crop&auto=format" },
    { name: t("categories.mountaineering"), label: t("landing.categoryMountainLabel"), image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=85&fit=crop&auto=format" },
    { name: t("categories.waterSports"), label: t("landing.categoryWaterLabel"), image: "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=900&q=85&fit=crop&auto=format" },
    { name: t("categories.cycling"), label: t("landing.categoryCyclingLabel"), image: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=900&q=85&fit=crop&auto=format" },
    { name: t("categories.motorsport"), label: t("landing.categoryMotorsportLabel"), image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=85&fit=crop&auto=format" },
    { name: t("categories.running"), label: t("landing.categoryRunningLabel"), image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=900&q=85&fit=crop&auto=format" },
    { name: t("categories.winterSports"), label: t("landing.categoryWinterLabel"), image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=900&q=85&fit=crop&auto=format" },
    { name: t("categories.expedition"), label: t("landing.categoryExpeditionLabel"), image: "https://images.unsplash.com/photo-1486911278844-a81c5267e227?w=900&q=85&fit=crop&auto=format" },
  ];

  const primaryFeatures = [
    { title: t("landing.feature1Title"), description: t("landing.feature1Description"), icon: Zap },
    { title: t("landing.feature2Title"), description: t("landing.feature2Description"), icon: Wallet },
    { title: t("landing.feature3Title"), description: t("landing.feature3Description"), icon: WifiOff },
  ];

  const secondaryFeatures = [
    { name: t("landing.secondaryCommunity"), icon: Users, desc: t("landing.secondaryCommunityDesc") },
    { name: t("landing.secondarySafety"), icon: Shield, desc: t("landing.secondarySafetyDesc") },
    { name: t("landing.secondaryPacking"), icon: Package, desc: t("landing.secondaryPackingDesc") },
    { name: t("landing.secondaryWeather"), icon: CloudSun, desc: t("landing.secondaryWeatherDesc") },
    { name: t("landing.secondaryBooking"), icon: Plane, desc: t("landing.secondaryBookingDesc") },
    { name: t("landing.secondaryLanguages"), icon: Languages, desc: t("landing.secondaryLanguagesDesc") },
  ];

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="contents">
        <AppHeader anchors={[
          { label: t("nav.discover"), href: "/" },
          { label: t("nav.pricing"), href: "/pricing" },
          { label: t("nav.community"), href: "/community" },
        ]} />
      </div>

      <section className="border-b border-line bg-canvas" data-testid="landing-hero">
        <div className={`${SECTION} grid items-center gap-10 lg:min-h-[680px] lg:grid-cols-[1.12fr_0.88fr] lg:gap-20`}>
          <div>
            <h1 className="max-w-3xl font-display text-6xl font-bold leading-[0.88] text-ink sm:text-7xl lg:text-8xl">{t("landing.heroHeadline")}</h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-secondary">{t("landing.heroSubheadline")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center bg-accent px-7 font-semibold text-accent-on transition-colors hover:bg-accent-hover">{t("landing.heroCta")}</Link>
              <Link href="/" className="inline-flex min-h-12 items-center justify-center border border-line-strong px-7 font-semibold text-ink transition-colors hover:border-accent hover:text-accent">{t("landing.heroCtaSecondary")}</Link>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&q=90&fit=crop&auto=format" alt="" className="h-[420px] w-full object-cover sm:h-[520px] lg:h-[580px]" />
        </div>
      </section>

      <section className="border-b border-line bg-canvas">
        <div className={`${SECTION} grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24`}>
          <div>
            <h2 className={TITLE}>{t("landing.problemHeadline")}</h2>
            <p className="mt-6 max-w-lg leading-relaxed text-ink-secondary">{t("landing.problemDescription")}</p>
          </div>
          <div className="border-t border-line-strong">
            {[Compass, Users, WifiOff].map((ProblemIcon, index) => {
              const number = index + 1;
              return (
                <article key={number} className="grid gap-4 border-b border-line px-0 py-7 sm:grid-cols-[32px_1fr]">
                  <ProblemIcon size={21} aria-hidden className="mt-1 text-ink" />
                  <div>
                    <h3 className="text-lg font-bold text-ink">{t(`landing.problemCard${number}Title` as Parameters<typeof t>[0])}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{t(`landing.problemCard${number}Text` as Parameters<typeof t>[0])}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-line bg-canvas">
        <div className={SECTION}>
          <h2 className={TITLE}>{t("landing.featuresHeadline")}</h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-ink-secondary">{t("landing.featuresDescription")}</p>
          <div className="mt-12 grid gap-5 lg:grid-cols-[1.65fr_0.9fr]">
            <article>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=1400&q=90&fit=crop&auto=format" alt="" loading="lazy" className="h-[380px] w-full object-cover sm:h-[520px]" />
              <h3 className="mt-5 font-display text-3xl font-bold text-ink">{primaryFeatures[0].title}</h3>
              <p className="mt-3 max-w-3xl leading-relaxed text-ink-secondary">{primaryFeatures[0].description}</p>
            </article>
            <div className="grid gap-5">
              {primaryFeatures.slice(1).map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <article key={feature.title} className={`flex min-h-60 flex-col justify-between border border-line-strong p-7 ${index === 1 ? "bg-ink text-canvas" : "bg-surface text-ink"}`}>
                    <FeatureIcon size={25} aria-hidden />
                    <div className="mt-12">
                      <h3 className="font-display text-3xl font-bold">{feature.title}</h3>
                      <p className={`mt-3 text-sm leading-relaxed ${index === 1 ? "text-canvas" : "text-ink-secondary"}`}>{feature.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="border-b border-line bg-canvas">
        <div className={SECTION}>
          <h2 className={TITLE}>{t("landing.categoriesHeadline")}</h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-ink-secondary">{t("landing.categoriesDescription")}</p>
          <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {categories.map((category) => (
              <article key={category.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={category.image} alt={category.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <h3 className="mt-4 font-display text-2xl font-bold text-ink">{category.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{category.label}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-canvas">
        <div className={`${SECTION} grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24`}>
          <h2 className={TITLE}>{t("landing.moreHeadline")}</h2>
          <div className="grid sm:grid-cols-2">
            {secondaryFeatures.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <article key={feature.name} className="border-t border-line-strong py-6 sm:odd:pr-8 sm:even:pl-8">
                  <div className="flex items-center gap-3">
                    <FeatureIcon size={20} aria-hidden className="text-accent" />
                    <h3 className="font-bold text-ink">{feature.name}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{feature.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-canvas">
        <div className={`${SECTION} grid gap-10 lg:grid-cols-[1fr_320px] lg:items-end`}>
          <div>
            <h2 className="max-w-4xl font-display text-5xl font-bold leading-[0.92] text-ink sm:text-7xl">{t("landing.finalHeadline")}</h2>
            <p className="mt-6 max-w-2xl leading-relaxed text-ink-secondary">{t("landing.finalSubline")}</p>
          </div>
          <div>
            <Link href="/register" className="inline-flex min-h-14 w-full items-center justify-center bg-accent px-8 font-semibold text-accent-on transition-colors hover:bg-accent-hover">{t("landing.finalCta")}</Link>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t("landing.finalTrust")}</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-canvas text-ink">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-4 lg:px-12">
          <div>
            <div className="font-display text-2xl font-bold text-accent">trevu</div>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">{t("landing.footerTagline")}</p>
          </div>
          {[
            [t("landing.footerProduct"), [[t("landing.footerFeatures"), "#features"], [t("landing.footerCategories"), "#categories"], [t("landing.footerPricing"), "/pricing"], [t("landing.footerRoadmap"), "#"]]],
            [t("landing.footerCompany"), [[t("landing.footerAbout"), "#"], [t("landing.footerBlog"), "#"], [t("landing.footerCareers"), "#"], [t("landing.footerContact"), "#"]]],
            [t("landing.footerLegal"), [[t("landing.footerPrivacy"), "#"], [t("landing.footerTerms"), "#"], [t("landing.footerCookies"), "#"]]],
          ].map(([heading, links]) => (
            <div key={heading as string}>
              <h3 className="text-sm font-semibold text-ink">{heading as string}</h3>
              <ul className="mt-4 space-y-3 text-sm text-ink-muted">
                {(links as string[][]).map(([label, href]) => <li key={label}><a href={href} className="transition-colors hover:text-accent">{label}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-line px-5 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>{t("landing.footerCopyright")}</span>
          <div className="flex gap-4" aria-hidden><Instagram size={17} /><Twitter size={17} /><Facebook size={17} /><Youtube size={17} /></div>
        </div>
      </footer>
    </main>
  );
}
