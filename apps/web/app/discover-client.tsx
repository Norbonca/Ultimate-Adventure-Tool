'use client';

/**
 * Felfedezés (/) — Brand Guide v2 „Éjszakai túra” (1b), Night felület.
 *
 * Design:
 *   design/D02_Trip_Management.pen#H1rRQE  Discover lista nézet, 1440
 *   design/D02_Trip_Management.pen#l87Il   Discover lista nézet, mobil 390
 *   design/D02_Trip_Management.pen#W9Kgy   szűrőpanel nyitva (asztali) + üres állapot
 *   design/D02_Trip_Management.pen#RTE9l   FilterSheet, mobil 390
 * Komponensek: components/ui/SearchPill, OptionChip, FilterSheet; components/discover/TripRow (listanézet), TripTile (csempe).
 * M024 (design/D09_Search_Discover.pen#ZD6Bo, #c57jCF, #SFkdK, #Kx86J): az azonos sorozat időpontjai
 * egy kártyára vonódnak (lib/trip-series.ts groupTripsForDiscover, spec K-1…K-11); a találatszám kártyát számol.
 * Nézetszerződés: components/discover/discover-view-toggle.md.
 *
 * B „Terep” (2026-11-14): a munkafelület csont (Day); a fejléc és a hero Night. A teljes képernyős
 * 3D térkép alatt nincs lábléc (body[data-fullscreen-view]). Minden szín szemantikus tokenből jön.
 */

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AppHeader } from '@/components/AppHeader';
import {
  Compass,
  Mountain,
  Triangle,
  Waves,
  Gauge,
  Bike,
  Timer,
  Snowflake,
  Sparkles,
  Globe,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Lightbulb,
  ArrowRight,
} from '@/lib/icons';
import type { LucideIcon } from '@/lib/icons';
import { SearchPill, OptionChip, FilterSheet } from '@/components/ui';
import { CATEGORY_TEXT, type CategoryToken } from '@/components/discover/TripBand';
import { TripRow } from '@/components/discover/TripRow';
import { TripTile } from '@/components/discover/TripTile';
import {
  DEFAULT_DISCOVER_VIEW,
  rememberDiscoverView,
  type DiscoverView,
} from '@/lib/discover-view';
import { buildTripSearchText, createTripSearch } from '@/lib/trip-search';
import { matchesAdvanced, NO_FILTERS, type AdvancedFilters, type Choice } from '@/lib/discover-filters';
import { groupTripsForDiscover, todayUtc, type DiscoverCard } from '@/lib/trip-series';
import { TutorialHelp } from '@/components/tutorials/TutorialHelp';
import { PresentationPromo } from '@/components/presentation/PresentationPromo';
import { useAuthState } from '@/lib/auth/useAuthState';

// The globe (d3-geo + tiles) only runs in the browser and is a large chunk —
// load it on demand so the list view never pays for it.
const GlobeDiscover = dynamic(() => import('@/components/discover/GlobeDiscover'), {
  ssr: false,
});

type Joined<T> = T | T[] | null;

// Types matching Supabase query results exactly
interface Trip {
  id: string;
  slug: string;
  title: string;
  /** M024: a túrasorozat; azonos sorozat időpontjai egy kártyán (K-1). */
  series_id?: string | null;
  short_description: string | null;
  description: string;
  location_country: string;
  location_region: string | null;
  location_city: string | null;
  cover_image_url: string | null;
  cover_image_source: string | null;
  card_image_url: string | null;
  card_image_source: string | null;
  start_date: string | null;
  end_date: string | null;
  price_amount: number | null;
  price_currency: string;
  is_cost_sharing: boolean;
  difficulty: number;
  category_id: string;
  max_participants: number;
  current_participants: number;
  status: string;
  visibility: string;
  categories: Joined<{ id: string; name: string; name_localized: Record<string, string>; icon_name: string; color_hex: string }>;
  sub_disciplines: Joined<{ id: string; name: string; name_localized: Record<string, string> }>;
  profiles: Joined<{ id: string; display_name: string; avatar_url: string | null; slug: string; subscription_tier: string }>;
}

interface Category {
  id: string;
  name: string;
  name_localized: Record<string, string>;
  icon_name: string;
  color_hex: string;
  display_order: number;
}

interface DifficultyLevel {
  value: number;
  label: string;
  labelEn: string;
  color: string;
}

interface CategoryDisplayItem {
  name: string;
  nameHu: string;
  emoji: string;
  colorHex: string;
  icon: string;
  colorBg: string;
  colorText: string;
}

interface CategoryDisplay {
  [key: string]: CategoryDisplayItem;
}

interface CurrentUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  slug: string;
  initials: string;
}

interface DiscoverClientProps {
  trips: Trip[];
  categories: Category[];
  categoryDisplay: CategoryDisplay;
  difficultyLevels: DifficultyLevel[];
  currentUser: CurrentUser | null;
  /** A `trevu-discover-view-v2` cookie-ban megjegyzett nézet; alapból csempe. */
  initialView?: DiscoverView;
}

/** DB kategórianév → ikon és --cat-* token. */
const CATEGORY_META: Record<string, { icon: LucideIcon; token: CategoryToken }> = {
  Hiking: { icon: Mountain, token: 'hiking' },
  Mountaineering: { icon: Triangle, token: 'climbing' },
  Mountain: { icon: Triangle, token: 'climbing' },
  Climbing: { icon: Triangle, token: 'climbing' },
  'Water Sports': { icon: Waves, token: 'water' },
  Cycling: { icon: Bike, token: 'cycling' },
  Motorsport: { icon: Gauge, token: 'motorsport' },
  Running: { icon: Timer, token: 'running' },
  'Winter Sports': { icon: Snowflake, token: 'winter' },
  Expedition: { icon: Compass, token: 'expedition' },
};
const categoryMeta = (name: string) => CATEGORY_META[name] ?? { icon: Mountain, token: 'hiking' as const };

const PAGE_SIZE = 10;

const resolveJoin = <T,>(val: Joined<T>): T | null => {
  if (!val) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
};


function FilterGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={`flex flex-col gap-2.5 ${className ?? ''}`}>
      <legend className="mb-2.5 text-sm font-semibold text-ink-secondary">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {children}
      </div>
    </fieldset>
  );
}

export default function DiscoverClient({
  trips,
  categories,
  categoryDisplay,
  difficultyLevels,
  currentUser: _currentUser,
  initialView = DEFAULT_DISCOVER_VIEW,
}: DiscoverClientProps) {
  const { t, locale } = useTranslation();
  const auth = useAuthState(); // M211b: a promó blokk csak kijelentkezve
  const intlLocale = locale === 'en' ? 'en-US' : 'hu-HU';

  const [viewMode, setViewMode] = useState<DiscoverView>(initialView);
  // Every switch is remembered for the next visit (see discover-view-toggle.md).
  const changeView = (next: DiscoverView) => {
    setViewMode(next);
    rememberDiscoverView(next);
  };
  // A 3D térkép teljes képernyős: alatta a közös lábléc nem jelenik meg.
  useEffect(() => {
    if (viewMode === 'globe') document.body.dataset.fullscreenView = '';
    else delete document.body.dataset.fullscreenView;
    return () => { delete document.body.dataset.fullscreenView; };
  }, [viewMode]);

  // Pirula-kereső (lib/trip-search.ts createTripSearch): a beírt szöveg Enterre vagy a
  // Keresés gombra érvényesül; a mező kiürítése azonnal visszaállítja a listát.
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Choice>('all');
  const [filters, setFilters] = useState<AdvancedFilters>(NO_FILTERS);
  const [sortBy, setSortBy] = useState('recent');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState({ key: '', count: PAGE_SIZE });

  const submitSearch = () => {
    setQuery(queryInput.trim());
    document.getElementById('discover-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const categoryLabel = (name: string) =>
    locale === 'en' ? name : categoryDisplay[name]?.nameHu || name;

  const searchTexts = useMemo(
    () =>
      new Map(
        trips.map((trip) => {
          const category = resolveJoin(trip.categories);
          const display = category ? categoryDisplay[category.name]?.nameHu : undefined;
          return [trip.id, buildTripSearchText(trip, display ? [display] : [])] as const;
        })
      ),
    [trips, categoryDisplay]
  );

  const search = useMemo(() => createTripSearch(query), [query]);

  const filteredTrips = trips.filter(
    (trip) =>
      (activeCategory === 'all' || trip.category_id === activeCategory) &&
      search(searchTexts.get(trip.id) ?? trip.title, trip.start_date, trip.end_date) &&
      matchesAdvanced(trip, filters)
  );

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    if (sortBy === 'price-low') return (a.price_amount || 0) - (b.price_amount || 0);
    if (sortBy === 'price-high') return (b.price_amount || 0) - (a.price_amount || 0);
    if (sortBy === 'date') {
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    }
    return 0; // recent: published order, as Supabase returns it
  });

  // M024: a sorozatok egy kártyára vonódnak; a lapozás és a darabszám kártyát számol (K-9).
  const today = todayUtc();
  const cards: DiscoverCard<Trip>[] = groupTripsForDiscover(sortedTrips, trips, today);
  const allCardCount = groupTripsForDiscover(trips, trips, today).length;

  // Lapozás: szűrés-/rendezésváltáskor újra az első oldal (állapot kulccsal, effekt nélkül).
  const pageKey = [query, activeCategory, sortBy, filters.difficulty, filters.price, filters.currency, filters.duration, filters.spots].join('|');
  const visibleCount = page.key === pageKey ? page.count : PAGE_SIZE;
  const visibleCards = cards.slice(0, visibleCount);
  const remaining = cards.length - visibleCards.length;

  const advancedCount = Object.values(filters).filter((v) => v !== 'all').length;
  const mobileFilterCount = advancedCount + (activeCategory === 'all' ? 0 : 1);

  const countryCount = useMemo(() => new Set(trips.map((trip) => trip.location_country).filter(Boolean)).size, [trips]);

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([intlLocale], { type: 'region' });
    } catch {
      return null;
    }
  }, [intlLocale]);

  const formatPlace = (trip: Trip) => {
    const local = trip.location_city || trip.location_region;
    let country = trip.location_country;
    try {
      country = (trip.location_country && regionNames?.of(trip.location_country.toUpperCase())) || trip.location_country;
    } catch {
      // not a region code — keep as stored
    }
    return [local, country].filter(Boolean).join(', ');
  };

  const formatDates = (trip: Trip) => {
    if (!trip.start_date) return '';
    // A dátum napként értendő (UTC), és a Node és a böngésző ICU-ja eltérő szóközt
    // (keskeny / nem törhető) tehet a tartományba — egységesítve, különben hidratálási hiba.
    const fmt = new Intl.DateTimeFormat(intlLocale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    const text = trip.end_date
      ? fmt.formatRange(new Date(trip.start_date), new Date(trip.end_date))
      : fmt.format(new Date(trip.start_date));
    return text.replace(/[\u00a0\u2009\u202f]/g, ' ');
  };

  const formatAmount = (amount: number | null, currency: string) => {
    if (!amount || amount <= 0) return t('discover.free');
    try {
      return new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency: currency || 'EUR',
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 0,
      }).format(amount).replace(/[\u00a0\u2009\u202f]/g, ' ');
    } catch {
      return `${amount} ${currency}`;
    }
  };
  const formatPrice = (trip: Trip) => formatAmount(trip.price_amount, trip.price_currency);

  // M024 — rövid dátumtartomány az időpontsorokhoz („máj. 10–17.”); más évben az évvel együtt.
  const thisYear = today.slice(0, 4);
  const formatShortDates = (trip: Trip) => {
    if (!trip.start_date) return '';
    const withYear = trip.start_date.slice(0, 4) !== thisYear;
    const fmt = new Intl.DateTimeFormat(intlLocale, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' });
    const text = trip.end_date && trip.end_date !== trip.start_date
      ? fmt.formatRange(new Date(trip.start_date), new Date(trip.end_date))
      : fmt.format(new Date(trip.start_date));
    return text.replace(/[\u00a0\u2009\u202f]/g, ' ');
  };
  const spotsLeftOf = (trip: Trip) => Math.max(0, trip.max_participants - (trip.current_participants || 0));
  const seriesStatus = (trip: Trip) =>
    spotsLeftOf(trip) > 0 ? t('series.spots', { count: spotsLeftOf(trip) }) : t('series.full');
  const cardPrice = (card: DiscoverCard<Trip>) => {
    if (card.kind === 'single') return formatPrice(card.trip);
    const text = formatAmount(card.price.amount, card.price.currency);
    return card.price.from && card.price.amount ? t('series.priceFrom', { price: text }) : text;
  };

  const priceCurrency = filters.currency === 'all' ? 'EUR' : filters.currency;
  const currencyOptions = [...new Set(['EUR', ...trips.map((trip) => trip.price_currency).filter(Boolean)])].sort();
  const changeSort = (value: string) => {
    if (value.startsWith('price-')) {
      setFilters((current) => ({ ...current, currency: current.currency === 'all' ? 'EUR' : current.currency }));
    }
    setSortBy(value);
  };
  const changeCurrency = (currency: string) => {
    setFilters((current) => ({ ...current, currency,
      price: currency === 'all' && current.price !== 'free' ? 'all' : current.price,
    }));
    if (currency === 'all' && sortBy.startsWith('price-')) setSortBy('recent');
  };
  const setFilter = (key: keyof AdvancedFilters, value: Choice) =>
    setFilters((current) => ({ ...current,
      [key]: current[key] === value ? 'all' : value,
      currency: key === 'price' && value !== 'free' && value !== current.price && current.currency === 'all'
        ? 'EUR' : current.currency,
    }));

  const clearFilters = () => {
    setFilters(NO_FILTERS);
    setActiveCategory('all');
    if (sortBy.startsWith('price-')) setSortBy('recent');
  };

  const sortOptions: Array<[string, string]> = [
    ['recent', t('discover.sortRecent')],
    ['date', t('discover.sortSoonestLong')],
    ['price-low', `${t('discover.priceLowHigh')} (${priceCurrency})`],
    ['price-high', `${t('discover.priceHighLow')} (${priceCurrency})`],
  ];

  const filterGroups: Array<{ key: keyof AdvancedFilters; label: string; options: Array<[string, string]> }> = [
    {
      key: 'difficulty',
      label: t('discover.difficulty'),
      options: difficultyLevels.map((level) => [String(level.value), locale === 'en' ? level.labelEn : level.label]),
    },
    {
      key: 'price',
      label: t('discover.priceRange'),
      options: [
        ['free', t('discover.free')],
        ['under50', t('discover.underAmount').replace('{amount}', `50 ${priceCurrency}`)],
        ['50-200', `50–200 ${priceCurrency}`],
        ['200-500', `200–500 ${priceCurrency}`],
        ['500+', `500+ ${priceCurrency}`],
      ],
    },
    {
      key: 'duration',
      label: t('discover.duration'),
      options: [
        ['1', t('discover.oneDay')],
        ['2-3', t('discover.twoDays')],
        ['4-7', t('discover.fourDays')],
        ['1-2w', t('discover.oneWeek')],
        ['2w+', t('discover.twoWeeks')],
      ],
    },
    {
      key: 'spots',
      label: t('discover.availableSpots'),
      options: [
        ['1-3', t('discover.spots13')],
        ['4-8', t('discover.spots48')],
        ['9+', t('discover.spots9')],
      ],
    },
  ];

  const categoryPills = (testIdPrefix: string) => (
    <>
      <OptionChip
        selected={activeCategory === 'all'}
        onClick={() => setActiveCategory('all')}
        icon={<Sparkles size={16} aria-hidden />}
        testId={`${testIdPrefix}-all`}
      >
        {t('discover.allTrips')}
      </OptionChip>
      {categories.map((category) => {
        const meta = categoryMeta(category.name);
        const Icon = meta.icon;
        const selected = activeCategory === category.id;
        return (
          <OptionChip
            key={category.id}
            selected={selected}
            onClick={() => setActiveCategory(selected ? 'all' : category.id)}
            icon={<Icon size={16} aria-hidden className={selected ? undefined : CATEGORY_TEXT[meta.token]} />}
            testId={`${testIdPrefix}-${category.id}`}
          >
            {categoryLabel(category.name)}
          </OptionChip>
        );
      })}
    </>
  );

  const filtersButton = (
  <button
    type="button"
    onClick={() => setFiltersOpen(true)}
    aria-haspopup="dialog"
    aria-expanded={filtersOpen}
    data-testid="discover-filters-open"
    className="inline-flex h-11 items-center gap-2 rounded-trevu border border-line bg-ghost px-4 text-sm font-semibold text-ink hover:border-line-strong focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)"
  >
    <SlidersHorizontal size={16} aria-hidden />
    <span className="md:hidden">
      {mobileFilterCount > 0 ? t('discover.filtersActive').replace('{count}', String(mobileFilterCount)) : t('discover.filters')}
    </span>
    <span className="hidden md:inline">
      {advancedCount > 0 ? t('discover.filtersActive').replace('{count}', String(advancedCount)) : t('discover.filters')}
    </span>
  </button>
  );

  // B „Terep”: asztalon a kategóriák verzál fülsorként két vonal között (a mobil szűrőlapon OptionChip marad).
  const categoryTabs = (testIdPrefix: string) => (
    <>
      {[{ id: 'all', label: t('discover.allTrips') }, ...categories.map((c) => ({ id: c.id, label: categoryLabel(c.name) }))].map((item) => {
        const selected = activeCategory === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            onClick={() => setActiveCategory(selected && item.id !== 'all' ? 'all' : item.id)}
            data-testid={`${testIdPrefix}-${item.id}`}
            className={[
              '-mb-px inline-flex min-h-12 items-center border-b-2 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors',
              'focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)',
              selected ? 'border-accent text-accent' : 'border-transparent text-ink-secondary hover:text-ink',
            ].join(' ')}
          >
            {item.label}
          </button>
        );
      })}
    </>
  );

  const viewToggle = (
    <div className="flex shrink-0 items-center gap-2">
    <div
      role="group"
      aria-label={t('discover.viewToggleLabel')}
      className="flex shrink-0 gap-1 rounded-trevu border border-line bg-surface p-1"
    >
      {([
        ['grid', LayoutGrid, t('discover.gridView')],
        ['globe', Globe, t('discover.globeView')],
        ['list', List, t('discover.listView')],
      ] as const).map(([view, Icon, label]) => {
        const active = viewMode === view;
        return (
          <button
            key={view}
            type="button"
            onClick={() => changeView(view)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            data-testid={`view-toggle-${view}`}
            className={[
              'inline-flex h-9 min-w-10 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-semibold transition-colors md:px-3.5',
              'focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)',
              active ? 'bg-ghost text-ink' : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            <Icon size={16} aria-hidden className={active ? 'text-accent' : undefined} />
            <span className="hidden md:inline">{label}</span>
          </button>
        );
      })}
    </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AppHeader
      />

      {viewMode === 'globe' ? (
        <main id="discover-results">
          {/* A gömb a saját szűrőit adja (discover-view-toggle.md), ezért itt csak a darabszám és a váltó. */}
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-ink" data-testid="discover-count">
                {trips.length === 0
                  ? t('discover.noTripsYet')
                  : t('discover.tripsAvailable').replace('{count}', String(trips.length))}
              </p>
              {/* M211 — súgó a címsor mellett (D21 elhelyezési szabály) */}
              <TutorialHelp anchor="discover.map" />
            </div>
            {viewToggle}
          </div>
          <GlobeDiscover />
        </main>
      ) : (
        <>
          {/* HERO — v2 §5: Deep Navy alapon a terv panorámafotója (D02 #H1rRQE / #l87Il, ugyanaz a kép
              asztalin és mobilon), alulról kötelező olvashatósági gradienssel (--hero-scrim).
              Fotó: Unsplash photo-1504681869696 (D03 Landing hero, @hdbernd) — public/discover/hero.jpg; Norbert választása 2026-09-16 */}
          <section data-surface="night" className="bg-canvas text-ink">
            {/* B „Terep” (ZHO_B_Nyitooldal): osztott hero — balra a cím, jobbra a panorámafotó; mobilon a kép felül. */}
            <div className="grid md:min-h-[520px] md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
              <div className="relative order-1 h-[220px] md:order-2 md:h-auto">
                <Image src="/discover/hero.jpg" alt="" fill priority sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
              </div>
              <div className="order-2 flex flex-col justify-center gap-4 px-5 py-10 md:order-1 md:gap-6 md:py-16 md:pl-[max(120px,calc((100vw-1280px)/2+120px))] md:pr-12">
                <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-ink-muted">
                  {t('discover.heroStats')
                    .replace('{trips}', String(allCardCount))
                    .replace('{countries}', String(countryCount))}
                </p>
                <h1 className="text-hero-display-mobile text-ink text-balance md:text-hero-display">
                  {t('discover.heroTitle')}
                </h1>
                <p className="max-w-[560px] text-lg text-ink-body">{t('discover.heroSubtitle')}</p>
              </div>
            </div>
          </section>

          {/* 01 / TALÁLD MEG — kereső sáv a hero alatt (csont munkafelület) */}
          <div className="mx-auto max-w-7xl px-4 pt-6 md:px-[120px] md:pt-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-8">
              <p className="shrink-0 font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{t('discover.sectionFind')}</p>
              <SearchPill
                className="w-full"
                value={queryInput}
                onChange={(value) => {
                  setQueryInput(value);
                  if (!value.trim()) setQuery('');
                }}
                onSubmit={submitSearch}
                placeholder={t('discover.searchPill')}
                submitLabel={t('common.search')}
                label={t('discover.searchPillHint')}
                testId="discover-hero-search"
                inputTestId="discover-search-query"
                submitTestId="discover-search-submit"
              />
            </div>
          </div>

          {/* TOOLBAR — asztali: kategória-pirulák | Szűrők + nézetváltó; mobil: Szűrők (n) + nézetváltó */}
          <div className="mx-auto max-w-7xl px-4 pb-2 pt-5 md:px-[120px] md:pb-5 md:pt-7">
            <div className="relative flex items-start justify-between gap-4">
              <div id="categories" className="hidden flex-1 flex-wrap items-center gap-x-6 gap-y-1 border-y border-line md:flex" data-testid="discover-category-pills">
                {categoryTabs('category-pill')}
              </div>

              <FilterSheet
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                title={t('discover.filters')}
                closeLabel={t('discover.filtersClose')}
                clearLabel={t('discover.filtersClear')}
                onClear={clearFilters}
                applyLabel={t('discover.filtersApply').replace('{count}', String(cards.length))}
                testId="discover-filter-sheet"
              >
                <div className="flex flex-col gap-5 pb-2">
                  <FilterGroup label={t('discover.activityType')} className="md:hidden">
                    {categoryPills('sheet-category')}
                  </FilterGroup>
                  <FilterGroup label={t('discover.sortLabel')} className="md:hidden">
                    {sortOptions.map(([value, label]) => (
                      <OptionChip key={value} mode="radio" selected={sortBy === value} onClick={() => changeSort(value)} testId={`sort-${value}`}>
                        {label}
                      </OptionChip>
                    ))}
                  </FilterGroup>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="discover-currency" className="text-sm font-semibold text-ink-secondary">{t('discover.currency')}</label>
                    <select id="discover-currency" data-testid="filter-currency" value={filters.currency}
                      onChange={(event) => changeCurrency(event.target.value)}
                      className="h-10 rounded-trevu border border-line bg-surface px-3 text-sm text-ink">
                      <option value="all">{t('discover.allCurrencies')}</option>
                      {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>
                    <p className="text-xs text-ink-muted">{t('discover.currencyHint')}</p>
                  </div>
                  {filterGroups.map((group) => (
                    <FilterGroup key={group.key} label={group.label}>
                      {group.options.map(([value, label]) => (
                        <OptionChip
                          key={value}
                          mode="radio"
                          selected={filters[group.key] === value}
                          onClick={() => setFilter(group.key, value)}
                          testId={`filter-${group.key}-${value}`}
                        >
                          {label}
                        </OptionChip>
                      ))}
                    </FilterGroup>
                  ))}
                </div>
              </FilterSheet>
            </div>

            {/* mobil: aktív kategória chipként */}
            {activeCategory !== 'all' && (
              <div className="mt-3 flex md:hidden">
                {(() => {
                  const category = categories.find((c) => c.id === activeCategory);
                  if (!category) return null;
                  const meta = categoryMeta(category.name);
                  const Icon = meta.icon;
                  return (
                    <OptionChip selected onClick={() => setActiveCategory('all')} icon={<Icon size={16} aria-hidden />}>
                      {categoryLabel(category.name)}
                    </OptionChip>
                  );
                })()}
              </div>
            )}
          </div>

          <main id="discover-results" className="mx-auto max-w-7xl px-4 pb-10 md:px-[120px] md:pb-16">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4 pt-6 md:pb-6 md:pt-10">
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{t('discover.sectionDepartures')}</p>
                <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[34px] text-ink md:text-[56px]" data-testid="discover-count">
                  {filteredTrips.length === 0
                    ? t('discover.noTripsYet')
                    : t('discover.tripsAvailable').replace('{count}', String(cards.length))}
                </h2>
                {/* M211 — súgó a címsor mellett (D21 elhelyezési szabály) */}
                <TutorialHelp anchor="discover" />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
              {filtersButton}
              {viewToggle}
              <label className="hidden items-center gap-2 text-sm text-ink-secondary md:flex">
                <span>{t('discover.sortLabel')}:</span>
                <select
                  value={sortBy}
                  onChange={(event) => changeSort(event.target.value)}
                  data-testid="discover-sort"
                  className="h-10 rounded-trevu border border-line bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-hidden focus:shadow-(--focus-ring)"
                >
                  {sortOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              </div>
            </div>

            {filters.currency !== 'all' && (
              <p data-testid="discover-currency-notice" className="pb-4 text-sm text-ink-secondary">
                {t('discover.currency')}: {filters.currency}. {t('discover.currencyHint')}
              </p>
            )}
            {filteredTrips.length === 0 ? (
              <section
                role="status"
                data-testid="discover-empty"
                className="flex flex-col items-center gap-3.5 rounded-trevu-2xl border border-line bg-surface px-6 py-14 text-center"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ghost">
                  <Compass size={36} aria-hidden className="text-ink-muted" />
                </div>
                <h2 className="text-lg font-bold text-ink">
                  {trips.length === 0 ? t('discover.noTrips') : t('discover.noMatchTitle')}
                </h2>
                <p className="max-w-[420px] text-sm text-ink-muted">{t('discover.noTripsHint')}</p>
                {/* M22 FR-M22-009 — gyors kitűzés az üres találati állapotból (D22 `XXcOv`). Csak aktív szűrő
                    mellett: a szűrők előtöltik az ötlet-űrlapot (kategória). A szöveg kimondja: érdeklődés, nem foglalás. */}
                {trips.length > 0 && (
                  <div
                    className="mt-3 flex w-full max-w-[520px] flex-col items-center gap-3 rounded-trevu-2xl border border-line bg-canvas p-5"
                    data-testid="discover-quick-pin"
                  >
                    <p className="text-sm font-semibold text-ink">{t('ideas.discover.emptyTitle')}</p>
                    <Link
                      href={`/ideas/new?via=discover_empty${activeCategory !== 'all' ? `&category=${activeCategory}` : ''}`}
                      className="inline-flex h-11 items-center gap-2 rounded-trevu bg-accent px-5 text-sm font-semibold text-accent-on hover:opacity-95 focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)"
                    >
                      <Lightbulb size={16} aria-hidden />
                      {t('ideas.discover.pin')}
                    </Link>
                    <p className="text-xs text-ink-muted">{t('ideas.discover.note')}</p>
                  </div>
                )}
              </section>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <ul className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6" data-testid="discover-trip-grid">
                    {visibleCards.map((card) => {
                      const trip = card.kind === 'single' ? card.trip : card.representative;
                      const category = resolveJoin(trip.categories);
                      const meta = category ? categoryMeta(category.name) : null;
                      const level = difficultyLevels.find((d) => d.value === trip.difficulty);
                      return (
                        <li key={card.key}>
                          <TripTile
                            href={`/trips/${trip.slug}`}
                            title={trip.title}
                            imageUrl={trip.card_image_url || trip.cover_image_url}
                            place={formatPlace(trip)}
                            dates={formatDates(trip)}
                            spots={
                              card.kind === 'series'
                                ? t('series.dateCount', { count: card.dateCount })
                                : t('discover.spotsLeft').replace('{count}', String(spotsLeftOf(trip)))
                            }
                            host={resolveJoin(trip.profiles)?.display_name ?? null}
                            difficulty={level ? (locale === 'en' ? level.labelEn : level.label) : null}
                            category={category && meta ? { label: categoryLabel(category.name), token: meta.token, icon: meta.icon } : null}
                            price={cardPrice(card)}
                            priceCaption={t('discover.perPerson')}
                            series={
                              card.kind === 'series'
                                ? {
                                    title: t('series.datesTitle'),
                                    rows: card.rows.map((row) => ({
                                      key: row.id,
                                      href: `/trips/${row.slug}`,
                                      label: formatShortDates(row),
                                      status: seriesStatus(row),
                                      full: spotsLeftOf(row) === 0,
                                    })),
                                    more: card.moreCount > 0
                                      ? { href: `/trips/${trip.slug}#idopontok`, label: t('series.moreDates', { count: card.moreCount }) }
                                      : null,
                                  }
                                : null
                            }
                          />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                <ul className="flex flex-col border-t border-line" data-testid="discover-trip-list">
                  {/* B „Terep”: tömör sorok (TripRow) — egy túra egy sor; az időpontok a túraoldalon választhatók */}
                  {visibleCards.map((card) => {
                    const trip = card.kind === 'single' ? card.trip : card.representative;
                    const category = resolveJoin(trip.categories);
                    const meta = category ? categoryMeta(category.name) : null;
                    const level = difficultyLevels.find((d) => d.value === trip.difficulty);
                    const next = card.kind === 'series' ? card.rows[0] : null;
                    return (
                      <li key={card.key}>
                        <TripRow
                          href={`/trips/${trip.slug}`}
                          title={trip.title}
                          imageUrl={trip.card_image_url || trip.cover_image_url}
                          category={category && meta ? { label: categoryLabel(category.name), token: meta.token, icon: meta.icon } : null}
                          meta={[
                            formatPlace(trip),
                            card.kind === 'series' && next
                              ? `${t('series.dateCount', { count: card.dateCount })} · ${t('series.nextDate', { date: formatShortDates(next) })}`
                              : formatDates(trip),
                            level ? (locale === 'en' ? level.labelEn : level.label) : null,
                            card.kind === 'series' ? null : t('discover.spotsLeft').replace('{count}', String(spotsLeftOf(trip))),
                          ]}
                          price={cardPrice(card)}
                          priceCaption={t('discover.perPerson')}
                        />
                      </li>
                    );
                  })}
                </ul>
                )}

                {remaining > 0 && (
                  <div className="flex justify-center pt-6">
                    <button
                      type="button"
                      onClick={() => setPage({ key: pageKey, count: visibleCount + PAGE_SIZE })}
                      data-testid="discover-load-more"
                      className="h-12 rounded-trevu bg-ghost px-6 text-base font-semibold text-ink hover:bg-line focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)"
                    >
                      {t('discover.loadMoreCount').replace('{count}', String(Math.min(PAGE_SIZE, remaining)))}
                    </button>
                  </div>
                )}
                {/* M22 FR-M22-009 — egysoros lista-végi belépő az Ötletbörzébe (D22 `XXcOv` lista-vég). */}
                <p className="pt-6 text-center text-sm text-ink-secondary" data-testid="discover-list-end-idea">
                  <Link href="/ideas/new" className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline">
                    <Lightbulb size={14} aria-hidden />
                    {t('ideas.discover.listEnd')}
                  </Link>
                </p>
              </>
            )}
          </main>
        </>
      )}

      {viewMode !== 'globe' && (
        <>
          {/* 03 / ÍGY MEGY — szén sáv három lépéssel (ZHO_B_Nyitooldal) */}
          <section data-surface="night" className="bg-canvas text-ink" data-testid="discover-how">
            <div className="mx-auto max-w-7xl px-5 py-12 md:px-[120px] md:py-20">
              <p className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{t('discover.sectionHow')}</p>
              <h2 className="mt-2 text-[44px] text-ink md:text-[66px]">{t('discover.howTitle')}</h2>
              <ol className="mt-8 grid gap-6 md:mt-10 md:grid-cols-3 md:gap-0">
                {([1, 2, 3] as const).map((n) => (
                  <li key={n} className="flex flex-col gap-2 border-l border-line pl-5 md:pr-8">
                    <span className="font-mono text-[13px] tracking-[0.06em] text-accent">03.{n}</span>
                    <h3 className="font-[family-name:var(--font-family-heading)] text-[30px] uppercase leading-[1.1] text-ink md:text-[36px]">
                      {t(`discover.howStep${n}Title`)}
                    </h3>
                    <p className="text-base text-ink-body">{t(`discover.howStep${n}Text`)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* 04 / SZERVEZŐKNEK — kijelentkezve a bemutatóvideós blokk (M211b, D09 `JvYxg`), utána a túraindítás */}
          {auth === 'out' && <PresentationPromo eyebrow={t('discover.sectionOrganizers')} className="border-t border-line md:py-16" />}
          <section className="border-t border-line bg-canvas text-ink" data-testid="discover-cta">
            <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-[120px] md:py-16">
              <div className="flex max-w-[640px] flex-col gap-3">
                {auth !== 'out' && (
                  <p className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{t('discover.sectionOrganizers')}</p>
                )}
                <h2 className="text-[36px] text-ink md:text-[56px]">{t('discover.ctaTitle')}</h2>
                <p className="text-base text-ink-secondary md:text-lg">{t('discover.ctaSubtitle')}</p>
              </div>
              <Link
                href="/trips/new"
                className="inline-flex h-14 shrink-0 items-center justify-center gap-2 bg-accent px-6 text-base font-bold text-accent-on hover:bg-accent-hover focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)"
              >
                {t('discover.createTrip')}
                <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
