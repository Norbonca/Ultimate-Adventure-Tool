'use client';

/**
 * Felfedezés (/) — Brand Guide v2 „Éjszakai túra” (1b), Night felület.
 *
 * Design:
 *   design/D02_Trip_Management.pen#H1rRQE  Discover lista nézet, 1440
 *   design/D02_Trip_Management.pen#l87Il   Discover lista nézet, mobil 390
 *   design/D02_Trip_Management.pen#W9Kgy   szűrőpanel nyitva (asztali) + üres állapot
 *   design/D02_Trip_Management.pen#RTE9l   FilterSheet, mobil 390
 * Komponensek: components/ui/SearchPill, OptionChip, FilterSheet; components/discover/TripBand.
 * Nézetszerződés: components/discover/discover-view-toggle.md.
 *
 * A teljes oldal Night (data-surface="night"); az alsó CTA-sáv az egyetlen Day-régió
 * (Night→Day váltás felülről lefelé, v2 §2/2). Minden szín szemantikus tokenből jön.
 */

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
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
  List,
  SlidersHorizontal,
} from '@/lib/icons';
import type { LucideIcon } from '@/lib/icons';
import { SearchPill, OptionChip, FilterSheet } from '@/components/ui';
import { TripBand, CATEGORY_TEXT, type CategoryToken } from '@/components/discover/TripBand';
import {
  DEFAULT_DISCOVER_VIEW,
  rememberDiscoverView,
  type DiscoverView,
} from '@/lib/discover-view';
import { buildTripSearchText, createTripSearch } from '@/lib/trip-search';

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
  /** View remembered in the `trevu-discover-view` cookie; globe by default. */
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

const tripDurationDays = (trip: Trip): number => {
  if (!trip.start_date || !trip.end_date) return 0;
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

type Choice = 'all' | string;

interface AdvancedFilters {
  difficulty: Choice;
  price: Choice;
  duration: Choice;
  spots: Choice;
}

const NO_FILTERS: AdvancedFilters = { difficulty: 'all', price: 'all', duration: 'all', spots: 'all' };

function matchesAdvanced(trip: Trip, f: AdvancedFilters): boolean {
  if (f.difficulty !== 'all' && String(trip.difficulty) !== f.difficulty) return false;
  if (f.price !== 'all') {
    const price = trip.price_amount || 0;
    if (f.price === 'free' && price > 0) return false;
    if (f.price === 'under50' && (price === 0 || price >= 50)) return false;
    if (f.price === '50-200' && (price < 50 || price > 200)) return false;
    if (f.price === '200-500' && (price < 200 || price > 500)) return false;
    if (f.price === '500+' && price < 500) return false;
  }
  if (f.duration !== 'all') {
    const days = tripDurationDays(trip);
    if (f.duration === '1' && days > 1) return false;
    if (f.duration === '2-3' && (days < 2 || days > 3)) return false;
    if (f.duration === '4-7' && (days < 4 || days > 7)) return false;
    if (f.duration === '1-2w' && (days < 7 || days > 14)) return false;
    if (f.duration === '2w+' && days < 14) return false;
  }
  if (f.spots !== 'all') {
    const spots = trip.max_participants - (trip.current_participants || 0);
    if (f.spots === '1-3' && (spots < 1 || spots > 3)) return false;
    if (f.spots === '4-8' && (spots < 4 || spots > 8)) return false;
    if (f.spots === '9+' && spots < 9) return false;
  }
  return true;
}

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
  const intlLocale = locale === 'en' ? 'en-US' : 'hu-HU';

  const [viewMode, setViewMode] = useState<DiscoverView>(initialView);
  // Every switch is remembered for the next visit (see discover-view-toggle.md).
  const changeView = (next: DiscoverView) => {
    setViewMode(next);
    rememberDiscoverView(next);
  };

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

  // Lapozás: szűrés-/rendezésváltáskor újra az első oldal (állapot kulccsal, effekt nélkül).
  const pageKey = [query, activeCategory, sortBy, filters.difficulty, filters.price, filters.duration, filters.spots].join('|');
  const visibleCount = page.key === pageKey ? page.count : PAGE_SIZE;
  const visibleTrips = sortedTrips.slice(0, visibleCount);
  const remaining = sortedTrips.length - visibleTrips.length;

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

  const formatPrice = (trip: Trip) => {
    if (!trip.price_amount || trip.price_amount <= 0) return t('discover.free');
    try {
      return new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency: trip.price_currency || 'EUR',
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 0,
      }).format(trip.price_amount).replace(/[\u00a0\u2009\u202f]/g, ' ');
    } catch {
      return `${trip.price_amount} ${trip.price_currency}`;
    }
  };

  const setFilter = (key: keyof AdvancedFilters, value: Choice) =>
    setFilters((current) => ({ ...current, [key]: current[key] === value ? 'all' : value }));

  const clearFilters = () => {
    setFilters(NO_FILTERS);
    setActiveCategory('all');
  };

  const sortOptions: Array<[string, string]> = [
    ['recent', t('discover.sortRecent')],
    ['date', t('discover.sortSoonestLong')],
    ['price-low', t('discover.priceLowHigh')],
    ['price-high', t('discover.priceHighLow')],
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
        ['under50', t('discover.underPrice')],
        ['50-200', '€50–200'],
        ['200-500', '€200–500'],
        ['500+', '€500+'],
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

  const viewToggle = (
    <div
      role="group"
      aria-label={t('discover.viewToggleLabel')}
      className="flex shrink-0 gap-1 rounded-trevu border border-line bg-surface p-1"
    >
      {([
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
              'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              active ? 'bg-ghost text-ink' : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            <Icon size={16} aria-hidden className={active ? 'text-accent' : undefined} />
            <span className="hidden md:inline">{view === 'globe' ? t('discover.globeView') : t('discover.listView')}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div data-surface="night" className="min-h-screen bg-canvas text-ink">
      <AppHeader
        anchors={[
          { label: t('nav.discover'), href: '/' },
          { label: t('nav.pricing'), href: '/pricing' },
          { label: t('nav.community'), href: '/community' },
        ]}
      />

      {viewMode === 'globe' ? (
        <main id="discover-results">
          {/* A gömb a saját szűrőit adja (discover-view-toggle.md), ezért itt csak a darabszám és a váltó. */}
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
            <p className="text-sm font-medium text-ink" data-testid="discover-count">
              {trips.length === 0
                ? t('discover.noTripsYet')
                : t('discover.tripsAvailable').replace('{count}', String(trips.length))}
            </p>
            {viewToggle}
          </div>
          <GlobeDiscover />
        </main>
      ) : (
        <>
          {/* HERO — v2 §5; fotó-asset még nincs, ezért a fotó nélküli recept: Deep Navy + 12 %-os Trevu-derengés */}
          <section className="relative overflow-hidden bg-canvas">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[720px] rounded-full opacity-[0.12] blur-3xl [background:var(--gradient-trevu)]"
            />
            <div className="relative mx-auto flex min-h-[320px] max-w-7xl flex-col justify-end gap-3 px-5 pb-8 pt-16 md:min-h-[420px] md:gap-4 md:px-[120px] md:pb-12">
              <p className="text-sm font-medium text-ink-secondary">
                {t('discover.heroStats')
                  .replace('{trips}', String(trips.length))
                  .replace('{countries}', String(countryCount))}
              </p>
              <h1 className="max-w-[720px] text-hero-display-mobile text-ink [text-wrap:balance] md:text-hero-display">
                {t('discover.heroTitle')}
              </h1>
              <p className="max-w-[720px] text-base text-ink-body md:text-lg">{t('discover.heroSubtitle')}</p>
              <SearchPill
                className="mt-2 max-w-[720px] md:mt-4"
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
          </section>

          {/* TOOLBAR — asztali: kategória-pirulák | Szűrők + nézetváltó; mobil: Szűrők (n) + nézetváltó */}
          <div className="mx-auto max-w-7xl px-4 pb-2 pt-5 md:px-[120px] md:pb-5 md:pt-7">
            <div className="relative flex items-start justify-between gap-4">
              <div id="categories" className="hidden flex-wrap items-center gap-2.5 md:flex" data-testid="discover-category-pills">
                {categoryPills('category-pill')}
              </div>
              <div className="flex flex-1 items-center gap-3 md:flex-none">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={filtersOpen}
                  data-testid="discover-filters-open"
                  className="inline-flex h-11 items-center gap-2 rounded-trevu border border-line bg-ghost px-4 text-sm font-semibold text-ink hover:border-line-strong focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <SlidersHorizontal size={16} aria-hidden />
                  <span className="md:hidden">
                    {mobileFilterCount > 0 ? t('discover.filtersActive').replace('{count}', String(mobileFilterCount)) : t('discover.filters')}
                  </span>
                  <span className="hidden md:inline">
                    {advancedCount > 0 ? t('discover.filtersActive').replace('{count}', String(advancedCount)) : t('discover.filters')}
                  </span>
                </button>
                <span className="flex-1 md:hidden" />
                {viewToggle}
              </div>

              <FilterSheet
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                title={t('discover.filters')}
                closeLabel={t('discover.filtersClose')}
                clearLabel={t('discover.filtersClear')}
                onClear={clearFilters}
                applyLabel={t('discover.filtersApply').replace('{count}', String(filteredTrips.length))}
                testId="discover-filter-sheet"
              >
                <div className="flex flex-col gap-5 pb-2">
                  <FilterGroup label={t('discover.activityType')} className="md:hidden">
                    {categoryPills('sheet-category')}
                  </FilterGroup>
                  <FilterGroup label={t('discover.sortLabel')} className="md:hidden">
                    {sortOptions.map(([value, label]) => (
                      <OptionChip key={value} mode="radio" selected={sortBy === value} onClick={() => setSortBy(value)}>
                        {label}
                      </OptionChip>
                    ))}
                  </FilterGroup>
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
            <div className="flex items-center justify-between pb-3 md:pb-4">
              <p className="text-base font-medium text-ink md:text-lg" data-testid="discover-count">
                {filteredTrips.length === 0
                  ? t('discover.noTripsYet')
                  : t('discover.tripsAvailable').replace('{count}', String(filteredTrips.length))}
              </p>
              <label className="hidden items-center gap-2 text-sm text-ink-secondary md:flex">
                <span>{t('discover.sortLabel')}:</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  data-testid="discover-sort"
                  className="h-10 rounded-trevu border border-line bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none focus:shadow-[var(--focus-ring)]"
                >
                  {sortOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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
              </section>
            ) : (
              <>
                <ul className="flex flex-col gap-3 md:gap-4" data-testid="discover-trip-list">
                  {visibleTrips.map((trip) => {
                    const category = resolveJoin(trip.categories);
                    const meta = category ? categoryMeta(category.name) : null;
                    const spotsLeft = trip.max_participants - (trip.current_participants || 0);
                    return (
                      <li key={trip.id}>
                        <TripBand
                          href={`/trips/${trip.slug}`}
                          title={trip.title}
                          imageUrl={trip.card_image_url || trip.cover_image_url}
                          place={formatPlace(trip)}
                          details={[formatDates(trip), t('discover.spotsLeft').replace('{count}', String(spotsLeft))]}
                          category={category && meta ? { label: categoryLabel(category.name), token: meta.token, icon: meta.icon } : null}
                          price={formatPrice(trip)}
                          priceCaption={t('discover.priceCaption')}
                          ctaLabel={t('discover.viewDetails')}
                        />
                      </li>
                    );
                  })}
                </ul>

                {remaining > 0 && (
                  <div className="flex justify-center pt-6">
                    <button
                      type="button"
                      onClick={() => setPage({ key: pageKey, count: visibleCount + PAGE_SIZE })}
                      data-testid="discover-load-more"
                      className="h-12 rounded-trevu bg-ghost px-6 text-base font-semibold text-ink hover:bg-line focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      {t('discover.loadMoreCount').replace('{count}', String(Math.min(PAGE_SIZE, remaining)))}
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </>
      )}

      {/* CTA — az egyetlen Day-régió: Frost sáv, Dawn Gradient gomb (v2 §2/2) */}
      <section data-surface="day" className="bg-ghost text-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-[120px] md:py-14">
          <div className="flex flex-col gap-2">
            <h2 className="text-[22px] font-semibold text-ink md:text-[28px]">{t('discover.ctaTitle')}</h2>
            <p className="text-sm text-ink-secondary md:text-base">{t('discover.ctaSubtitle')}</p>
          </div>
          <Link
            href="/trips/new"
            className="inline-flex h-12 items-center justify-center rounded-trevu px-6 text-base font-semibold text-ink [background:var(--gradient-dawn)] hover:opacity-95 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {t('discover.createTrip')}
          </Link>
        </div>
      </section>
    </div>
  );
}
