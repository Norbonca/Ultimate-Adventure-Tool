/**
 * M211 — Útmutató adatlap `/tutorials/[slug]` (S2). Design: D21 `q66Ci` (1440), `N3aUG` (390).
 * Videó felirattal + kattintható lépések, szöveges leírás, „Jó tudni”, a felirat teljes szövege,
 * kapcsolódó útmutatók; mobilon ragadós „Kipróbálom” sáv.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { TutorialCard } from "@/components/tutorials/TutorialCard";
import { TutorialViewer } from "@/components/tutorials/TutorialViewer";
import { asTutorialLocale, formatTime, getTutorial, listTutorials, loc, posterUrl, relatedTutorials, type Tutorial } from "@/lib/tutorials";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listTutorials().map((x) => ({ slug: x.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tutorial = getTutorial(slug);
  if (!tutorial) return {};
  const { locale } = await getServerT();
  const title = loc(tutorial.title, locale);
  const description = loc(tutorial.summary, locale);
  return { title, description, openGraph: { title, description, images: [posterUrl(tutorial.slug)] } };
}

export default async function TutorialDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const tutorial = getTutorial(slug);
  if (!tutorial) notFound();

  const { t, locale } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const lang = asTutorialLocale(locale);
  const roleLabel = (r: string) => (r === "organizer" ? t("tutorials.forOrganizers") : t("tutorials.forTravelers"));
  const languages = [t("tutorials.language.hu"), t("tutorials.language.en")].join(", ");
  const updated = new Date(`${tutorial.updated}-01T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-GB" : "hu-HU", { year: "numeric", month: "long" });
  const tryLabel = tutorial.role === "organizer" ? t("tutorials.tryIt") : t("tutorials.tryItTraveler");
  const related = relatedTutorials(tutorial);
  const captionsLabel = t("tutorials.captionLanguages", { languages: t(lang === "en" ? "tutorials.language.en" : "tutorials.language.hu") });
  const badgeFor = (x: Tutorial) => (x.hasVideo ? { icon: "captions", label: captionsLabel } : { icon: "presentation", label: t("tutorials.slidesLabel") });
  const lengthFor = (x: Tutorial) => (x.hasVideo ? formatTime(x.duration) : t("tutorials.stepsCount", { count: x.steps.length }));

  const tryButton = (extra: string) => (
    <Link href={tutorial.tryHref} className={`inline-flex h-12 items-center justify-center gap-2 rounded-trevu bg-accent px-5 text-[15px] font-semibold text-accent-on hover:bg-accent-hover ${extra}`} data-testid="tutorial-try">
      {tryLabel}
      <Icon name="arrow-right" size={18} aria-hidden />
    </Link>
  );

  return (
    <div data-surface="night" className="min-h-screen bg-canvas pb-24 text-ink lg:pb-0">
      <AppHeader
        user={user ? { email: user.email ?? "", displayName: user.user_metadata?.full_name } : null}
        anchors={[
          { label: t("nav.discover"), href: "/" },
          { label: t("nav.pricing"), href: "/pricing" },
          { label: t("nav.community"), href: "/community" },
        ]}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-16 pt-5 md:px-8 md:pt-8">
        <nav aria-label="breadcrumb" className="text-sm text-ink-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/tutorials" className="inline-flex items-center gap-1 font-semibold text-ink-secondary hover:text-accent">
                <Icon name="chevron-left" size={16} aria-hidden className="md:hidden" />
                {t("tutorials.eyebrow")}
              </Link>
            </li>
            <li aria-hidden className="hidden md:inline">
              /
            </li>
            <li className="hidden truncate md:inline" aria-current="page">
              {loc(tutorial.title, locale)}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent md:text-xs">
            {roleLabel(tutorial.role)} · {loc(tutorial.topic, locale)}
          </p>
          <h1 className="text-[26px] font-bold leading-tight text-ink md:text-[44px]">{loc(tutorial.title, locale)}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-ink-muted md:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Icon name={tutorial.hasVideo ? "timer" : "presentation"} size={15} aria-hidden />
              {tutorial.hasVideo ? formatTime(tutorial.duration) : t("tutorials.slidesLabel")}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name={tutorial.hasVideo ? "captions" : "file-text"} size={15} aria-hidden />
              {tutorial.hasVideo ? t("tutorials.captionLanguages", { languages }) : t("tutorials.stepsCount", { count: tutorial.steps.length })}
            </span>
            <span aria-hidden className="hidden md:inline">
              ·
            </span>
            <span className="hidden md:inline">{t("tutorials.updated", { date: updated })}</span>
          </p>
        </div>

        <TutorialViewer tutorial={tutorial} variant="page" panelFooter={tryButton("mt-1 hidden w-full lg:inline-flex")} />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-6">
            <section id="leiras" className="flex scroll-mt-24 flex-col gap-3" aria-labelledby="tutorial-details">
              <h2 id="tutorial-details" className="text-lg font-bold text-ink md:text-xl">
                {t("tutorials.details")}
              </h2>
              {tutorial.body[lang].map((p) => (
                <p key={p.slice(0, 32)} className="max-w-[720px] text-base leading-relaxed text-ink-body">
                  {p}
                </p>
              ))}
            </section>

            {tutorial.tip && (
              <aside className="flex max-w-[720px] gap-3 rounded-trevu-lg border border-[rgba(45,212,191,0.3)] bg-[rgba(45,212,191,0.08)] p-4" data-testid="tutorial-tip">
                <Icon name="lightbulb" size={20} aria-hidden className="mt-0.5 shrink-0 text-accent" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-ink">{t("tutorials.tip")}</p>
                  <p className="text-sm leading-relaxed text-ink-secondary">{loc(tutorial.tip, locale)}</p>
                </div>
              </aside>
            )}

            <details className="group max-w-[720px] rounded-trevu-lg border border-line" data-testid="tutorial-transcript">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2.5">
                  <Icon name="file-text" size={18} aria-hidden className="text-ink-secondary" />
                  {t("tutorials.transcript")}
                </span>
                <Icon name="chevron-down" size={20} aria-hidden className="text-ink-muted transition-transform group-open:rotate-180" />
              </summary>
              <ol className="flex flex-col gap-2 border-t border-line px-4 py-3 text-sm text-ink-body">
                {tutorial.steps.map((s) => (
                  <li key={s.at} className="flex gap-3">
                    <span className="w-10 shrink-0 font-semibold tabular-nums text-ink-muted">{formatTime(s.at)}</span>
                    <span>{loc(s.text, locale)}</span>
                  </li>
                ))}
              </ol>
            </details>
          </div>

          {related.length > 0 && (
            <section className="flex flex-col gap-4" aria-labelledby="tutorial-related">
              <h2 id="tutorial-related" className="text-lg font-bold text-ink md:text-xl">
                {t("tutorials.related")}
              </h2>
              <ul className="flex flex-col gap-4">
                {related.map((r) => (
                  <li key={r.slug}>
                    <TutorialCard tutorial={r} locale={locale} roleLabel={roleLabel(r.role)} badge={badgeFor(r)} lengthLabel={lengthFor(r)} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      {/* Mobil: ragadós „Kipróbálom” — D21 N3aUG Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 pb-5 pt-3 lg:hidden">{tryButton("w-full")}</div>
    </div>
  );
}
