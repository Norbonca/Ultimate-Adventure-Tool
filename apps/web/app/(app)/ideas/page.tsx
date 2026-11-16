/**
 * M22 — Túraötletek `/ideas` (FR-M22-003).
 *
 * Design: design/claude/D22b_Turaotletek#Lista (1440), #Lista_390 (390), #Ures (üres találat),
 * #Szuro_390 (szűrőlap); archív: design/D22_Trip_Ideas.pen#EQOlq / #o7In2 („Éjszakai túra”).
 * Szerveroldalon renderelt, bejelentkezés nélkül is elérhető (NK-M22-001); a szűrők az URL-ben.
 *
 * B „Terep” (2026-11-16): a lap formanyelve a Felfedezésé (`/`) — osztott Night hero, mono verzál
 * szekciócímkék (01 / 02 / 03), Anton verzál címsorok, verzál kategória-fülsor két szén vonal
 * között, `FilterSheet`, négy oszlopos tömör rács, szögletes elsődleges gombok, 120 px-es asztali
 * margó. A tartalom és a logika nem változott: ugyanazok a szűrők, ugyanaz a kártyatartalom.
 */

import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { IdeasSearch, IdeasFilters, type IdeasFilterGroup } from "@/components/ideas/IdeasToolbar";
import { TutorialHelp } from "@/components/tutorials/TutorialHelp";
import { BOARD_PAGE_SIZE, listIdeas } from "@/lib/ideas/queries";
import { categoryChip, destinationsText, getCategoryCovers, membersText, ownerText, statusChip, windowText } from "@/lib/ideas/present";
import { fetchCategories } from "../trips/actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getServerT();
  return pageMeta({
    locale,
    title: t("metadata.pages.ideas.title"),
    description: t("metadata.pages.ideas.description"),
    path: "/ideas",
  });
}

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

  const pages = Math.max(1, Math.ceil(total / BOARD_PAGE_SIZE));
  const newIdeaHref = user ? `/ideas/new${filters.category ? `?category=${filters.category}` : ""}` : "/register?redirect=/ideas/new";

  /** A szűrőlap csoportjai — a kategória nem itt van, hanem a fülsorban. */
  const filterGroups: IdeasFilterGroup[] = [
    {
      key: "intent",
      label: t("ideas.board.intentFilter"),
      options: [
        { label: t("ideas.board.intentAll"), href: link({ intent: null, offer: null, page: null }), selected: !filters.intent && !filters.hasOffer, testId: "ideas-intent-all" },
        { label: t("ideas.intent.seeking_organizer"), href: link({ intent: "seeking_organizer", offer: null, page: null }), selected: filters.intent === "seeking_organizer", testId: "ideas-intent-seeking" },
        { label: t("ideas.board.hasOffer"), href: link({ intent: null, offer: filters.hasOffer ? null : "1", page: null }), selected: filters.hasOffer, testId: "ideas-has-offer" },
      ],
    },
    {
      key: "sort",
      label: t("ideas.board.sort"),
      options: (["members", "newest", "soonest"] as const).map((s) => ({
        label: t(`ideas.board.sort_${s}`),
        href: link({ sort: s === "members" ? null : s, page: null }),
        selected: filters.sort === s,
        testId: `ideas-sort-${s}`,
      })),
    },
    {
      key: "closed",
      label: t("ideas.board.closedFilter"),
      options: [
        { label: t("ideas.board.hideClosed"), href: link({ closed: null, page: null }), selected: !filters.includeClosed },
        { label: t("ideas.board.showClosed"), href: link({ closed: "1", page: null }), selected: filters.includeClosed },
      ],
    },
  ];
  const activeCount = [filters.intent, filters.hasOffer || null, filters.includeClosed || null, filters.sort !== "members" || null, filters.q].filter(Boolean).length;

  /** A „Szűrők (n)” gomb és a lapja — mobilon a fülrács mellett, asztalon a 02-es fejlécben. */
  const ideasFilters = (
    <IdeasFilters
      groups={filterGroups}
      activeCount={activeCount}
      clearHref="/ideas"
      filtersLabel={t("ideas.board.filters")}
      filtersActiveLabel={t("ideas.board.filtersActive")}
      closeLabel={t("ideas.board.filtersClose")}
      clearLabel={t("ideas.board.filtersClear")}
      applyLabel={t("ideas.board.filtersApply", { count: total })}
    />
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AppHeader user={user ? { email: user.email ?? "", displayName: user.user_metadata?.full_name } : null} />

      {/* HERO — osztott Night szakasz: balra a szöveg és az egyetlen elsődleges akció, jobbra a fotó
          (D22b #Lista; a Felfedezés hero-jának mintája). Mobilon a szöveg felül, a kép alatta. */}
      <section data-surface="night" className="bg-canvas text-ink" data-testid="ideas-hero">
        <div className="grid md:min-h-[520px] md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          <div className="relative order-2 h-[200px] md:h-auto">
            <Image src="/discover/hero.jpg" alt="" fill priority sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
          </div>
          <div className="order-1 flex flex-col justify-center gap-4 px-5 py-10 md:gap-6 md:py-16 md:pl-[max(120px,calc((100vw-1280px)/2+120px))] md:pr-12">
            <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-ink-muted">{t("ideas.board.stats", { count: total })}</p>
            <h1 className="text-hero-display-mobile text-ink text-balance md:text-hero-display">{t("ideas.board.title")}</h1>
            <p className="max-w-[560px] text-lg text-ink-body">{t("ideas.board.subtitle")}</p>
            <Link
              href={newIdeaHref}
              data-testid="ideas-new"
              className="mt-1 inline-flex h-14 w-full items-center justify-center gap-2 bg-accent px-6 text-base font-bold text-accent-on transition-colors hover:bg-accent-hover focus-visible:outline-hidden focus-visible:shadow-(--focus-ring) md:w-fit"
            >
              <Icon name="lightbulb" size={18} aria-hidden />
              {t("ideas.board.newIdea")}
            </Link>
          </div>
        </div>
      </section>

      {/* 01 / KERESD MEG — szabadszavas kereső a hero alatt (csont munkafelület) */}
      <IdeasSearch
        initialQuery={filters.q ?? ""}
        action={link({ q: null, page: null })}
        sectionLabel={t("ideas.board.sectionFind")}
        placeholder={t("ideas.board.searchPlaceholder")}
        submitLabel={t("common.search")}
        label={t("ideas.board.searchPlaceholder")}
        hint={t("ideas.board.searchHint")}
      />

      {/* KATEGÓRIA-FÜLSOR — verzál fülek két szén vonal között, asztalon a teljes szélességen
          elosztva, mobilon két oszlopban. Nincs „Összes” fül: a kiválasztott újrakattintva kikapcsol. */}
      <div className="mx-auto max-w-7xl px-4 pb-2 pt-5 md:px-[120px] md:pb-5 md:pt-7">
        <div className="flex items-start justify-between gap-4">
          <nav
            aria-label={t("ideas.board.categoriesLabel")}
            className="grid flex-1 grid-cols-2 gap-x-4 border-y border-ink md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-8"
            data-testid="ideas-category-tabs"
          >
            {categories.map((c) => {
              const chip = categoryChip({ id: c.id, name: c.name, name_localized: c.name_localized as Record<string, string> | null, icon_name: c.icon_name, color_hex: c.color_hex }, locale);
              const active = filters.category === c.id;
              return (
                <Link
                  key={c.id}
                  href={link({ category: active ? null : c.id, page: null })}
                  aria-current={active ? "true" : undefined}
                  data-testid={`ideas-category-${c.id}`}
                  className={`-mb-px inline-flex min-h-12 items-center border-b-2 text-[14px] font-bold uppercase tracking-[0.08em] transition-colors md:min-h-14 md:text-[15px] focus-visible:outline-hidden focus-visible:shadow-(--focus-ring) ${active ? "border-accent text-accent" : "border-transparent text-ink hover:text-accent"}`}
                >
                  {chip?.label ?? c.name}
                </Link>
              );
            })}
          </nav>

          {/* Mobilon a fülrács mellett marad; asztalon a 02-es fejlécbe kerül, mint a Felfedezésen. */}
          <div className="relative md:hidden">{ideasFilters}</div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 pb-10 md:px-[120px] md:pb-16" id="ideas-list">
        {/* 02 / ÖTLETEK — a találati szakasz fejléce (D22b #Lista) */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4 pt-6 md:pb-6 md:pt-10">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{t("ideas.board.sectionBoard")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[34px] text-ink md:text-[56px]">{t("ideas.board.boardTitle")}</h2>
              {/* M211 — súgó a címsor mellett (D21 elhelyezési szabály) */}
              <TutorialHelp anchor="ideas" />
            </div>
            <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-ink-muted" data-testid="ideas-count">
              {t("ideas.board.boardCount", { count: total })}
            </p>
          </div>
          <div className="relative hidden shrink-0 items-center gap-3 md:flex">{ideasFilters}</div>
        </div>

        {items.length === 0 ? (
          <section role="status" data-testid="ideas-empty" className="mt-6 flex flex-col items-center gap-3.5 rounded-trevu-2xl border border-line bg-surface px-6 py-14 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ghost"><Icon name="lightbulb" size={36} aria-hidden className="text-ink-muted" /></div>
            <h2 className="text-lg font-bold text-ink">{t("ideas.board.emptyTitle")}</h2>
            <p className="max-w-[420px] text-sm text-ink-muted">{t("ideas.board.emptyHint")}</p>
            <Link href={newIdeaHref} className="inline-flex h-12 items-center gap-2 bg-accent px-5 text-base font-bold text-accent-on hover:bg-accent-hover focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)">
              <Icon name="lightbulb" size={16} aria-hidden />{t("ideas.board.newIdea")}
            </Link>
          </section>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4" data-testid="ideas-grid">
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
                    detailsLabel={t("ideas.board.details")}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label={t("ideas.board.pagination")}>
            {filters.page > 1 && <Link href={link({ page: String(filters.page - 1) })} className="inline-flex h-12 items-center rounded-trevu bg-ghost px-4 text-sm font-semibold text-ink hover:bg-line">←</Link>}
            <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-ink-muted">{filters.page} / {pages}</span>
            {filters.page < pages && <Link href={link({ page: String(filters.page + 1) })} className="inline-flex h-12 items-center rounded-trevu bg-ghost px-4 text-sm font-semibold text-ink hover:bg-line">→</Link>}
          </nav>
        )}
      </main>

      {/* 03 / DOBD BE — szén sáv a halvány fej-ikonnal (D22b #Lista; a Felfedezés 03/04 mintája) */}
      <section data-surface="night" className="relative overflow-hidden border-t border-line bg-canvas text-ink" data-testid="ideas-cta">
        <div className="relative mx-auto flex max-w-7xl flex-col gap-5 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-[120px] md:py-16">
          <div className="flex max-w-[640px] flex-col gap-3">
            <p className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{t("ideas.board.sectionCta")}</p>
            <h2 className="text-[36px] text-ink md:text-[56px]">{t("ideas.board.ctaTitle")}</h2>
            <p className="text-base text-ink-secondary md:text-lg">{t("ideas.board.ctaSub")}</p>
          </div>
          <Link
            href={newIdeaHref}
            className="inline-flex h-14 shrink-0 items-center justify-center gap-2 bg-accent px-6 text-base font-bold text-accent-on hover:bg-accent-hover focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)"
          >
            <Icon name="lightbulb" size={18} aria-hidden />
            {t("ideas.board.newIdea")}
          </Link>
        </div>
      </section>
    </div>
  );
}
