/**
 * M22 — Ötletbörze `/ideas` (FR-M22-003). Design: D22 `EQOlq` (1440), `o7In2` (390).
 * Szerveroldalon renderelt, bejelentkezés nélkül is elérhető (NK-M22-001); a szűrők az URL-ben.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { CoverImage } from "@/components/ui/CoverImage";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { BOARD_PAGE_SIZE, listIdeas } from "@/lib/ideas/queries";
import { categoryChip, destinationsText, getCategoryCovers, membersText, ownerText, statusChip, windowText } from "@/lib/ideas/present";
import { fetchCategories } from "../trips/actions";
import { CATEGORY_DISPLAY } from "@/lib/categories";
import { CATEGORY_TEXT } from "@/components/discover/TripBand";

export const metadata: Metadata = { title: "Ötletbörze · Trevu" };

interface PageProps { searchParams: Promise<Record<string, string | string[] | undefined>> }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function IdeasBoardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { t, locale } = await getServerT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const filters = {
    category: one(sp.category) || null,
    country: one(sp.country) || null,
    continent: one(sp.continent) || null,
    month: Number(one(sp.month)) || null,
    intent: one(sp.intent) || null,
    hasOffer: one(sp.offer) === "1",
    includeClosed: one(sp.closed) === "1",
    q: one(sp.q) || null,
    sort: (["members", "newest", "soonest"].includes(one(sp.sort)) ? one(sp.sort) : "members") as "members" | "newest" | "soonest",
    page: Math.max(1, Number(one(sp.page)) || 1),
  };

  const [{ items, total }, categories, covers] = await Promise.all([listIdeas(filters), fetchCategories(), getCategoryCovers()]);
  const tr = t as (k: string, p?: Record<string, string | number>) => string;

  const link = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const cur: Record<string, string | null> = { category: filters.category, country: filters.country, continent: filters.continent, month: filters.month ? String(filters.month) : null, intent: filters.intent, offer: filters.hasOffer ? "1" : null, closed: filters.includeClosed ? "1" : null, q: filters.q, sort: filters.sort === "members" ? null : filters.sort };
    for (const [k, v] of Object.entries({ ...cur, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return `/ideas${s ? `?${s}` : ""}`;
  };

  const intents = [
    { key: null, label: t("ideas.board.intentAll"), icon: "lightbulb" },
    { key: "seeking_organizer", label: t("ideas.intent.seeking_organizer"), icon: "clipboard-check" },
  ];
  const pages = Math.max(1, Math.ceil(total / BOARD_PAGE_SIZE));

  return (
    <div data-surface="night" className="min-h-screen bg-canvas text-ink">
      <AppHeader user={user ? { email: user.email ?? "", displayName: user.user_metadata?.full_name } : null} anchors={[{ label: t("nav.discover"), href: "/" }, { label: t("nav.pricing"), href: "/pricing" }, { label: t("nav.community"), href: "/community" }]} />

      {/* HERO — D22 EQOlq R7kD1o */}
      <section className="relative overflow-hidden bg-canvas" data-testid="ideas-hero">
        <CoverImage src="/discover/hero.jpg" sizes="100vw" priority />
        <div aria-hidden className="absolute inset-0 bg-hero-scrim-mobile md:bg-hero-scrim" />
        <div className="relative mx-auto flex min-h-[320px] max-w-7xl flex-col justify-end gap-4 px-5 pb-8 pt-24 md:min-h-[420px] md:px-8 md:pb-10">
          <p className="text-sm font-medium text-ink-secondary">{t("ideas.board.stats", { count: total })}</p>
          <h1 className="max-w-[720px] text-hero-display-mobile text-ink [text-wrap:balance] md:text-hero-display">{t("ideas.board.title")}</h1>
          <p className="hidden max-w-[720px] text-lg text-ink-body md:block">{t("ideas.board.subtitle")}</p>
          <form action="/ideas" className="flex max-w-[720px] items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-2 backdrop-blur" role="search">
            {filters.category && <input type="hidden" name="category" value={filters.category} />}
            <Icon name="search" size={18} className="shrink-0 text-ink-muted" aria-hidden />
            <input name="q" defaultValue={filters.q ?? ""} placeholder={t("ideas.board.searchPlaceholder")} aria-label={t("ideas.board.searchPlaceholder")} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted" />
            <button type="submit" className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-on">{t("common.search")}</button>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-6 md:px-8" id="ideas-list">
        {/* Toolbar — kategória-pillek · szándék-váltó · elsődleges „Dobd be ötletként” */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" data-testid="ideas-category-pills">
            <Link href={link({ category: null, page: null })} className={`inline-flex h-10 items-center gap-2 rounded-trevu px-4 text-sm font-semibold ${!filters.category ? "bg-accent text-accent-on" : "bg-ghost text-ink hover:bg-ghost-strong"}`}>
              <Icon name="lightbulb" size={16} aria-hidden />{t("ideas.board.allCategories")}
            </Link>
            {categories.map((c) => {
              const chip = categoryChip({ id: c.id, name: c.name, name_localized: c.name_localized as Record<string, string> | null, icon_name: c.icon_name, color_hex: c.color_hex }, locale);
              const active = filters.category === c.id;
              return (
                <Link key={c.id} href={link({ category: active ? null : c.id, page: null })} className={`inline-flex h-10 items-center gap-2 rounded-trevu px-4 text-sm font-semibold ${active ? "bg-accent text-accent-on" : "bg-ghost text-ink hover:bg-ghost-strong"}`}>
                  <Icon name={chip?.icon ?? CATEGORY_DISPLAY[c.name]?.icon ?? "mountain"} size={16} aria-hidden className={active ? "" : CATEGORY_TEXT[chip?.token ?? "hiking"]} />
                  {chip?.label ?? c.name}
                </Link>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-trevu bg-ghost p-1" role="group" aria-label={t("ideas.board.intentFilter")}>
              {intents.map((i) => (
                <Link key={i.key ?? "all"} href={link({ intent: i.key, offer: null, page: null })} className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-xs font-semibold ${filters.intent === i.key && !filters.hasOffer ? "bg-surface text-ink" : "text-ink-secondary"}`}>
                  <Icon name={i.icon} size={14} aria-hidden />{i.label}
                </Link>
              ))}
              <Link href={link({ intent: null, offer: filters.hasOffer ? null : "1", page: null })} className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-xs font-semibold ${filters.hasOffer ? "bg-surface text-ink" : "text-ink-secondary"}`}>
                <Icon name="hand" size={14} aria-hidden />{t("ideas.board.hasOffer")}
              </Link>
            </div>
            <Link href={user ? "/ideas/new" : "/register?redirect=/ideas/new"} className="inline-flex h-10 items-center gap-2 rounded-trevu bg-accent px-4 text-sm font-semibold text-accent-on" data-testid="ideas-new">
              <Icon name="lightbulb" size={16} aria-hidden />{t("ideas.board.newIdea")}
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t("ideas.board.resultHead", { count: total })}</p>
          <div className="flex items-center gap-3 text-sm text-ink-secondary">
            <Link href={link({ closed: filters.includeClosed ? null : "1", page: null })} className="underline-offset-2 hover:underline">{filters.includeClosed ? t("ideas.board.hideClosed") : t("ideas.board.showClosed")}</Link>
            <span aria-hidden>·</span>
            <label className="inline-flex items-center gap-2">
              {t("ideas.board.sort")}
              <span className="inline-flex gap-1">
                {(["members", "newest", "soonest"] as const).map((s) => (
                  <Link key={s} href={link({ sort: s === "members" ? null : s, page: null })} className={`rounded-chip px-2 py-0.5 ${filters.sort === s ? "bg-ghost font-semibold text-ink" : ""}`}>{t(`ideas.board.sort_${s}`)}</Link>
                ))}
              </span>
            </label>
          </div>
        </div>

        {items.length === 0 ? (
          <section role="status" data-testid="ideas-empty" className="mt-6 flex flex-col items-center gap-3.5 rounded-trevu-2xl border border-line bg-surface px-6 py-14 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ghost"><Icon name="lightbulb" size={36} aria-hidden className="text-ink-muted" /></div>
            <h2 className="text-lg font-bold text-ink">{t("ideas.board.emptyTitle")}</h2>
            <p className="max-w-[420px] text-sm text-ink-muted">{t("ideas.board.emptyHint")}</p>
            <Link href={user ? `/ideas/new${filters.category ? `?category=${filters.category}` : ""}` : "/register?redirect=/ideas/new"} className="inline-flex h-10 items-center gap-2 rounded-trevu bg-accent px-4 text-sm font-semibold text-accent-on"><Icon name="lightbulb" size={16} aria-hidden />{t("ideas.board.newIdea")}</Link>
          </section>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6" data-testid="ideas-grid">
            {items.map((idea) => {
              const st = statusChip(idea, tr);
              return (
                <li key={idea.id}>
                  <IdeaCard
                    href={`/ideas/${idea.slug}`}
                    title={idea.title}
                    imageUrl={covers[idea.category_id] ?? null}
                    category={categoryChip(idea.category, locale)}
                    members={membersText(idea, tr)}
                    destinations={destinationsText(idea, tr)}
                    window={windowText(idea, tr, locale)}
                    owner={ownerText(idea, tr)}
                    statusLabel={st.label}
                    statusTone={st.tone}
                    avatarCount={idea.member_count}
                    detailsLabel={t("ideas.board.details")}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label={t("ideas.board.pagination")}>
            {filters.page > 1 && <Link href={link({ page: String(filters.page - 1) })} className="rounded-trevu bg-ghost px-4 py-2 text-sm font-semibold text-ink">←</Link>}
            <span className="text-sm text-ink-secondary">{filters.page} / {pages}</span>
            {filters.page < pages && <Link href={link({ page: String(filters.page + 1) })} className="rounded-trevu bg-ghost px-4 py-2 text-sm font-semibold text-ink">→</Link>}
          </nav>
        )}

        {/* CTA — D22 EfmFE */}
        <section className="mt-10 flex flex-col items-start justify-between gap-4 rounded-trevu-2xl border border-line bg-surface px-6 py-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-ink">{t("ideas.board.ctaTitle")}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t("ideas.board.ctaSub")}</p>
          </div>
          <Link href={user ? "/ideas/new" : "/register?redirect=/ideas/new"} className="inline-flex h-11 items-center gap-2 rounded-trevu bg-accent px-5 text-sm font-semibold text-accent-on"><Icon name="lightbulb" size={16} aria-hidden />{t("ideas.board.newIdea")}</Link>
        </section>
      </main>
    </div>
  );
}
