"use client";

import Link from "next/link";
import {
  Bike, CloudSun, Compass, Facebook, Gauge, Instagram, Languages, MapPin, Mountain,
  Package, Plane, Shield, Snowflake, Timer, Triangle, Twitter, Users, Wallet, Waves,
  WifiOff, Youtube, Zap,
} from "@/lib/icons";
import { AppHeader } from "@/components/AppHeader";
import { useTranslation } from "@/lib/i18n/useTranslation";

const SECTION = "mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28";
const KICKER = "mb-4 inline-flex border border-accent px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-accent";
const TITLE = "max-w-3xl font-display text-4xl font-bold leading-none text-ink sm:text-5xl lg:text-6xl";

export default function GetStartedPage() {
  const { t } = useTranslation();

  const categories = [
    { name: t("categories.hiking"), icon: Mountain, label: t("landing.categoryHikingLabel"), tone: "text-cat-hiking" },
    { name: t("categories.mountaineering"), icon: Triangle, label: t("landing.categoryMountainLabel"), tone: "text-orange" },
    { name: t("categories.waterSports"), icon: Waves, label: t("landing.categoryWaterLabel"), tone: "text-cat-water" },
    { name: t("categories.cycling"), icon: Bike, label: t("landing.categoryCyclingLabel"), tone: "text-cat-cycling" },
    { name: t("categories.motorsport"), icon: Gauge, label: t("landing.categoryMotorsportLabel"), tone: "text-cat-motorsport" },
    { name: t("categories.running"), icon: Timer, label: t("landing.categoryRunningLabel"), tone: "text-cat-running" },
    { name: t("categories.winterSports"), icon: Snowflake, label: t("landing.categoryWinterLabel"), tone: "text-cat-winter" },
    { name: t("categories.expedition"), icon: Compass, label: t("landing.categoryExpeditionLabel"), tone: "text-cat-expedition" },
  ];

  const primaryFeatures = [
    { title: t("landing.feature1Title"), description: t("landing.feature1Description"), icon: Zap, image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&q=85&fit=crop&auto=format" },
    { title: t("landing.feature2Title"), description: t("landing.feature2Description"), icon: Wallet, image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=85&fit=crop&auto=format" },
    { title: t("landing.feature3Title"), description: t("landing.feature3Description"), icon: WifiOff, image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=85&fit=crop&auto=format" },
  ];

  const secondaryFeatures = [
    { name: t("landing.secondaryCommunity"), icon: Users, desc: t("landing.secondaryCommunityDesc") },
    { name: t("landing.secondarySafety"), icon: Shield, desc: t("landing.secondarySafetyDesc") },
    { name: t("landing.secondaryPacking"), icon: Package, desc: t("landing.secondaryPackingDesc") },
    { name: t("landing.secondaryWeather"), icon: CloudSun, desc: t("landing.secondaryWeatherDesc") },
    { name: t("landing.secondaryBooking"), icon: Plane, desc: t("landing.secondaryBookingDesc") },
    { name: t("landing.secondaryLanguages"), icon: Languages, desc: t("landing.secondaryLanguagesDesc") },
  ];

  const testimonials = [
    { text: t("landing.testimonial1Text"), author: t("landing.testimonial1Author"), role: t("landing.testimonial1Role") },
    { text: t("landing.testimonial2Text"), author: t("landing.testimonial2Author"), role: t("landing.testimonial2Role") },
    { text: t("landing.testimonial3Text"), author: t("landing.testimonial3Author"), role: t("landing.testimonial3Role") },
  ];

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div data-surface="night">
        <AppHeader anchors={[
          { label: t("nav.discover"), href: "/" },
          { label: t("nav.pricing"), href: "/pricing" },
          { label: t("nav.community"), href: "/community" },
        ]} />
      </div>

      <section data-surface="night" className="relative isolate overflow-hidden bg-canvas text-ink" data-testid="landing-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/discover/hero.jpg" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-hero-scrim-mobile md:bg-hero-scrim" />
        <div className="mx-auto flex min-h-[620px] max-w-7xl flex-col justify-end gap-6 px-5 pb-12 pt-28 sm:px-8 lg:min-h-[720px] lg:px-12 lg:pb-20">
          <span className="inline-flex w-fit items-center gap-2 border border-line-strong bg-glass px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ink">
            <span aria-hidden className="h-2 w-2 bg-accent" />{t("landing.heroBadge")}
          </span>
          <h1 className="max-w-4xl font-display text-5xl font-bold leading-[0.92] text-ink sm:text-7xl lg:text-8xl">{t("landing.heroHeadline")}</h1>
          <p className="max-w-2xl text-base leading-relaxed text-ink-body sm:text-lg">{t("landing.heroSubheadline")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center bg-accent px-7 font-semibold text-accent-on transition-colors hover:bg-accent-hover">{t("landing.heroCta")}</Link>
            <Link href="/" className="inline-flex min-h-12 items-center justify-center border border-line-strong bg-glass px-7 font-semibold text-ink transition-colors hover:border-accent hover:text-accent">
              <Compass size={18} aria-hidden className="mr-2" />{t("landing.heroCtaSecondary")}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-5 text-sm text-ink-secondary">
            <span className="font-semibold text-ink">{t("landing.heroTrust")}</span>
            {(["heroCountryHungary", "heroCountrySlovakia", "heroCountryCroatia", "heroCountryGermany"] as const).map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5"><MapPin size={16} aria-hidden />{t(`landing.${key}`)}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface">
        <div className={SECTION}>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <span className={KICKER}>{t("landing.problemTag")}</span>
            <h2 className={`${TITLE} mx-auto`}>{t("landing.problemHeadline")}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-secondary">{t("landing.problemDescription")}</p>
          </div>
          <div className="grid border-l border-t border-line md:grid-cols-3">
            {[1, 2, 3].map((number) => (
              <article key={number} className="border-b border-r border-line bg-surface p-7 lg:p-9">
                <span className="mb-10 block font-mono text-xs text-accent">0{number}</span>
                <h3 className="font-display text-2xl font-bold leading-none text-ink">{t(`landing.problemCard${number}Title` as Parameters<typeof t>[0])}</h3>
                <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{t(`landing.problemCard${number}Text` as Parameters<typeof t>[0])}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-line bg-canvas">
        <div className={SECTION}>
          <span className={KICKER}>{t("landing.featuresTag")}</span>
          <h2 className={TITLE}>{t("landing.featuresHeadline")}</h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-secondary">{t("landing.featuresDescription")}</p>
          <div className="mt-16 space-y-16 lg:space-y-24">
            {primaryFeatures.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <article key={feature.title} className="grid items-stretch border border-line bg-surface lg:grid-cols-2">
                  <div className={`flex min-h-[360px] flex-col justify-between p-8 lg:p-12 ${index % 2 ? "lg:order-2" : ""}`}>
                    <span className="flex h-12 w-12 items-center justify-center border border-accent text-accent"><FeatureIcon size={24} aria-hidden /></span>
                    <div className="mt-16">
                      <span className="font-mono text-xs text-ink-muted">0{index + 1}</span>
                      <h3 className="mt-3 font-display text-4xl font-bold leading-none text-ink">{feature.title}</h3>
                      <p className="mt-5 max-w-xl leading-relaxed text-ink-secondary">{feature.description}</p>
                    </div>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={feature.image} alt="" loading="lazy" className={`h-full min-h-[360px] w-full object-cover ${index % 2 ? "lg:order-1" : ""}`} />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="categories" data-surface="night" className="border-b border-line bg-canvas text-ink">
        <div className={SECTION}>
          <span className={KICKER}>{t("landing.categoriesTag")}</span>
          <h2 className={TITLE}>{t("landing.categoriesHeadline")}</h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-secondary">{t("landing.categoriesDescription")}</p>
          <div className="mt-12 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <article key={category.name} className="border-b border-r border-line bg-surface p-6 transition-colors hover:bg-ghost">
                  <CategoryIcon size={28} aria-hidden className={category.tone} />
                  <h3 className="mt-10 font-display text-2xl font-bold text-ink">{category.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{category.label}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface">
        <div className={SECTION}>
          <span className={KICKER}>{t("landing.moreTag")}</span>
          <h2 className={TITLE}>{t("landing.moreHeadline")}</h2>
          <div className="mt-12 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {secondaryFeatures.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <article key={feature.name} className="border-b border-r border-line p-7">
                  <FeatureIcon size={24} aria-hidden className="text-accent" />
                  <h3 className="mt-8 font-display text-2xl font-bold text-ink">{feature.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{feature.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-canvas">
        <div className={SECTION}>
          <div className="grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
            {[["8", t("landing.statCategories")], ["100%", t("landing.statOffline")], ["16+", t("landing.statServices")], ["7", t("landing.statLanguages")]].map(([value, label]) => (
              <div key={label} className="border-b border-r border-line bg-surface p-8 text-center">
                <div className="font-display text-5xl font-bold text-accent">{value}</div>
                <div className="mt-2 text-sm text-ink-muted">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-12 grid border-l border-t border-line lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.author} className="flex min-h-64 flex-col justify-between border-b border-r border-line bg-surface p-8">
                <blockquote className="text-base leading-relaxed text-ink-secondary">“{testimonial.text}”</blockquote>
                <figcaption className="mt-8 border-t border-line pt-4">
                  <div className="font-semibold text-ink">{testimonial.author}</div>
                  <div className="text-xs text-ink-muted">{testimonial.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section data-surface="night" className="bg-canvas text-ink">
        <div className={`${SECTION} grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end`}>
          <div>
            <span className={KICKER}>{t("landing.heroBadge")}</span>
            <h2 className="max-w-4xl font-display text-5xl font-bold leading-none text-ink sm:text-7xl">{t("landing.finalHeadline")}</h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-secondary">{t("landing.finalSubline")}</p>
          </div>
          <div className="lg:text-right">
            <Link href="/register" className="inline-flex min-h-14 items-center justify-center bg-accent px-8 font-semibold text-accent-on transition-colors hover:bg-accent-hover">{t("landing.finalCta")}</Link>
            <p className="mt-3 text-xs text-ink-muted">{t("landing.finalTrust")}</p>
          </div>
        </div>
      </section>

      <footer data-surface="night" className="border-t border-line bg-surface text-ink">
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
