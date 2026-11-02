/**
 * M211 — Útmutatók `/tutorials` (S1). Design: D21 `bE4n6` (1440), `t09vs` (390).
 * Publikus, szerveroldalon renderelt; a keresés és a szerepszűrő az URL-ben (`?q=`, `?role=`).
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { TutorialCard } from "@/components/tutorials/TutorialCard";
import { filterTutorials, formatTime, listTutorials, loc, posterUrl, tutorialHref, type TutorialRole } from "@/lib/tutorials";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return { title: t("tutorials.metaTitle"), description: t("tutorials.metaDescription") };
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function TutorialsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { t, locale } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const q = one(sp.q).slice(0, 80);
  const roleParam = one(sp.role);
  const role: TutorialRole | null = roleParam === "organizer" || roleParam === "traveler" ? roleParam : null;
  const results = filterTutorials({ q, role }, locale);
  const featured = !q && role !== "traveler" ? listTutorials().find((x) => x.featured) ?? null : null;
  const rest = results.filter((x) => x.slug !== featured?.slug);
  const groups = (
    [
      { role: "organizer" as const, title: t("tutorials.roleOrganizer") },
      { role: "traveler" as const, title: t("tutorials.roleTraveler") },
    ]
  )
    .map((g) => ({ ...g, items: rest.filter((x) => x.role === g.role) }))
    .filter((g) => g.items.length > 0);

  const roleLabel = (r: TutorialRole) => (r === "organizer" ? t("tutorials.forOrganizers") : t("tutorials.forTravelers"));
  const captionsLabel = t("tutorials.captionLanguages", { languages: t(locale === "en" ? "tutorials.language.en" : "tutorials.language.hu") });
  const link = (patch: { q?: string | null; role?: string | null }) => {
    const p = new URLSearchParams();
    const next = { q: q || null, role: role as string | null, ...patch };
    if (next.q) p.set("q", next.q);
    if (next.role) p.set("role", next.role);
    const s = p.toString();
    return `/tutorials${s ? `?${s}` : ""}`;
  };
  const roles: { key: TutorialRole | null; label: string; short: string }[] = [
    { key: null, label: t("tutorials.roleAll"), short: t("tutorials.roleAll") },
    { key: "traveler", label: t("tutorials.roleTraveler"), short: t("tutorials.roleTravelerShort") },
    { key: "organizer", label: t("tutorials.roleOrganizer"), short: t("tutorials.roleOrganizerShort") },
  ];

  return (
    <div data-surface="night" className="min-h-screen bg-canvas text-ink">
      <AppHeader
        user={user ? { email: user.email ?? "", displayName: user.user_metadata?.full_name } : null}
        anchors={[
          { label: t("nav.discover"), href: "/" },
          { label: t("nav.pricing"), href: "/pricing" },
          { label: t("nav.community"), href: "/community" },
        ]}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-16 pt-8 md:gap-12 md:px-8 md:pt-14">
        {/* HERO — D21 S1 */}
        <section className="flex flex-col gap-4 md:gap-5" data-testid="tutorials-hero">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent md:text-xs">{t("tutorials.eyebrow")}</p>
          <h1 className="text-[32px] font-bold leading-[1.1] text-ink [text-wrap:balance] md:text-[56px]">{t("tutorials.title")}</h1>
          <p className="max-w-[720px] text-base leading-relaxed text-ink-body md:text-lg">{t("tutorials.lead")}</p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
            <form action="/tutorials" role="search" className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 md:w-[520px]">
              {role && <input type="hidden" name="role" value={role} />}
              <Icon name="search" size={18} aria-hidden className="shrink-0 text-ink-muted" />
              <input
                name="q"
                defaultValue={q}
                placeholder={t("tutorials.searchPlaceholder")}
                aria-label={t("tutorials.searchPlaceholder")}
                className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
                data-testid="tutorials-search"
              />
              <button type="submit" className="inline-flex h-9 shrink-0 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-on">
                {t("tutorials.search")}
              </button>
            </form>
            <nav className="inline-flex self-start rounded-trevu bg-ghost p-1" aria-label={t("tutorials.roleFilter")} data-testid="tutorials-role">
              {roles.map((r) => {
                const active = role === r.key;
                return (
                  <Link
                    key={r.key ?? "all"}
                    href={link({ role: r.key })}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex h-9 items-center rounded-[8px] px-3 text-sm font-semibold ${active ? "bg-surface text-ink" : "text-ink-secondary hover:text-ink"}`}
                  >
                    <span className="md:hidden">{r.short}</span>
                    <span className="hidden md:inline">{r.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        {/* KEZDD ITT — kiemelt útmutató */}
        {featured && (
          <section className="grid gap-5 rounded-trevu-2xl border border-line bg-surface p-4 md:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8" data-testid="tutorials-featured">
            <Link href={tutorialHref(featured.slug)} className="group relative block aspect-video overflow-hidden rounded-trevu-xl border border-line">
              <Image src={posterUrl(featured.slug)} alt="" fill priority sizes="(min-width: 1024px) 720px, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
              <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.1)_0%,rgba(15,23,42,0.6)_100%)]" />
              <span aria-hidden className="absolute left-1/2 top-1/2 inline-flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-on md:h-[72px] md:w-[72px]">
                <Icon name="play" size={28} className="translate-x-0.5" />
              </span>
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-chip bg-glass px-2 py-1 text-xs font-semibold text-ink">
                <Icon name="timer" size={14} aria-hidden />
                {formatTime(featured.duration)}
              </span>
              <span className="sr-only">{loc(featured.title, locale)}</span>
            </Link>
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">{t("tutorials.featured")}</p>
              <h2 className="text-2xl font-bold leading-tight text-ink md:text-[32px]">{loc(featured.title, locale)}</h2>
              <p className="text-[15px] leading-relaxed text-ink-secondary">{loc(featured.summary, locale)}</p>
              <ol className="hidden flex-col gap-2 md:flex">
                {featured.steps.slice(0, 4).map((s, i) => (
                  <li key={s.at} className="flex items-center gap-3 text-sm text-ink-body">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ghost text-xs font-bold text-ink" aria-hidden>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">{loc(s.text, locale)}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-auto flex flex-wrap gap-3 pt-2">
                <Link href={tutorialHref(featured.slug)} className="inline-flex h-11 items-center gap-2 rounded-trevu bg-accent px-5 text-sm font-semibold text-accent-on hover:bg-accent-hover">
                  <Icon name="circle-play" size={18} aria-hidden />
                  {t("tutorials.watch")}
                </Link>
                <Link href={`${tutorialHref(featured.slug)}#leiras`} className="inline-flex h-11 items-center gap-2 rounded-trevu border border-line-strong px-5 text-sm font-semibold text-ink hover:bg-ghost">
                  <Icon name="file-text" size={18} aria-hidden />
                  {t("tutorials.readText")}
                </Link>
              </div>
            </div>
          </section>
        )}

        {groups.length === 0 ? (
          <section role="status" className="flex flex-col items-center gap-3 rounded-trevu-2xl border border-line bg-surface px-6 py-14 text-center" data-testid="tutorials-empty">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ghost">
              <Icon name="search" size={28} aria-hidden className="text-ink-muted" />
            </span>
            <h2 className="text-lg font-bold text-ink">{t("tutorials.emptyTitle")}</h2>
            <p className="max-w-[420px] text-sm text-ink-muted">{t("tutorials.emptyHint")}</p>
            <Link href="/tutorials" className="inline-flex h-11 items-center rounded-trevu bg-accent px-5 text-sm font-semibold text-accent-on">
              {t("tutorials.showAll")}
            </Link>
          </section>
        ) : (
          groups.map((g) => (
            <section key={g.role} className="flex flex-col gap-4" aria-labelledby={`tutorials-${g.role}`} data-testid={`tutorials-group-${g.role}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 id={`tutorials-${g.role}`} className="text-xl font-bold text-ink md:text-2xl">
                  {g.title}
                </h2>
                <span className="text-sm text-ink-muted">{t("tutorials.count", { count: g.items.length })}</span>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
                {g.items.map((item) => (
                  <li key={item.slug}>
                    <TutorialCard tutorial={item} locale={locale} roleLabel={roleLabel(item.role)} captionsLabel={captionsLabel} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
