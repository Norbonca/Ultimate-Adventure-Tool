'use client';

/**
 * GlobeDiscover — React shell around the Terepgömb renderer.
 *
 * Owns data loading, i18n, the tile-provider choice and accessibility; the
 * globe itself (d3-geo + Web Mercator tiles) lives in `terepgomb.js` and is
 * mounted into a container whose inner markup comes from `globe-markup.ts`.
 * Markers come from `/api/v1/trips/globe`, not from the page's own trip list,
 * because the globe needs coordinates and routes the card query does not fetch.
 *
 * The globe owns its own filtering (category tokens, time scrubber), so it
 * takes no filter props from the Discover page — see discover-view-toggle.md.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { StateTemplate } from '@/components/ui';
import { GLOBE_ATLAS_ATTRIBUTION, GLOBE_ATLAS_URL, getGlobeTileProvider } from '@/lib/globe-tiles';
import { buildGlobeMarkup } from './globe-markup';
import type { GlobeCategory, GlobeMarker, GlobePayload, GlobeRoutes, GlobeStrings, GlobeTrip, TerepgombInstance } from './terepgomb';
import './globe.css';

type LoadState = 'loading' | 'ready' | 'error';

type Translate = ReturnType<typeof useTranslation>['t'];

function formatPrice(marker: GlobeMarker, locale: string, t: Translate): string {
  if (marker.priceAmount === null || marker.priceAmount === 0) {
    return marker.isCostSharing ? t('discover.globe.costSharing') : t('discover.globe.free');
  }
  const intlLocale = locale === 'en' ? 'en-US' : 'hu-HU';
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: marker.priceCurrency,
      maximumFractionDigits: 0,
    }).format(marker.priceAmount);
  } catch {
    return `${marker.priceAmount} ${marker.priceCurrency}`;
  }
}

/**
 * "City, Region, Country" without repeating a part — city-states and
 * single-city regions (Split, Split, HR) would otherwise read twice.
 */
function formatPlace(marker: GlobeMarker): string {
  const parts: string[] = [];
  for (const part of [marker.city, marker.region, marker.country]) {
    const value = part?.trim();
    if (!value) continue;
    if (parts.some((p) => p.localeCompare(value, undefined, { sensitivity: 'base' }) === 0)) continue;
    parts.push(value);
  }
  return parts.join(', ');
}

function toGlobeTrip(marker: GlobeMarker, locale: string, t: Translate): GlobeTrip {
  return {
    id: marker.id,
    slug: marker.slug,
    title: marker.title,
    cat: marker.categoryId,
    place: formatPlace(marker),
    host: marker.host ?? '',
    week: marker.week,
    days: marker.days,
    price: formatPrice(marker, locale, t),
    spots: marker.spotsLeft,
    diff: marker.difficulty,
    ll: [marker.lng, marker.lat],
    approximate: marker.geocodeSource === 'country_centroid',
  };
}

export default function GlobeDiscover() {
  const { t, locale } = useTranslation();
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<TerepgombInstance | null>(null);

  const [payload, setPayload] = useState<GlobePayload | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  // ── data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch('/api/v1/trips/globe', { signal: controller.signal });
        if (!response.ok) throw new Error(`globe endpoint returned ${response.status}`);
        const data = (await response.json()) as GlobePayload;
        if (cancelled) return;
        setPayload({
          markers: Array.isArray(data.markers) ? data.markers : [],
          count: data.count ?? 0,
          week0: data.week0,
          routes: data.routes ?? {},
          categories: Array.isArray(data.categories) ? data.categories : [],
        });
        setState('ready');
      } catch (error) {
        if (cancelled || (error as Error).name === 'AbortError') return;
        console.error('[GlobeDiscover] failed to load markers:', error);
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const tiles = useMemo(() => getGlobeTileProvider(), []);

  const strings = useMemo<GlobeStrings>(
    () => ({
      autumn: t('discover.globe.seasonAutumn'),
      winter: t('discover.globe.seasonWinterName'),
      spring: t('discover.globe.seasonSpringName'),
      summer: t('discover.globe.seasonSummerName'),
      seasonNow: {
        autumn: t('discover.globe.chipNowAutumn'),
        winter: t('discover.globe.chipNowWinter'),
        spring: t('discover.globe.chipNowSpring'),
        summer: t('discover.globe.chipNowSummer'),
      },
      seasonWinter: t('discover.globe.chipWinter'),
      seasonSpring: t('discover.globe.chipNextSpring'),
      seasonSpringBreak: t('discover.globe.chipSpringBreak'),
      seasonSummer: t('discover.globe.chipSummer'),
      tokenHint: t('discover.globe.tokenHint'),
      tokenDropOn: t('discover.globe.tokenDropOn'),
      tokenDropOff: t('discover.globe.tokenDropOff'),
      inWindow: t('discover.globe.inWindow'),
      hiddenBehind: t('discover.globe.hiddenBehind'),
      tripsCount: t('discover.globe.tripsCount'),
      days: t('discover.globe.days'),
      spotsLeft: t('discover.spotsLeft'),
      details: t('discover.globe.details'),
      routePoints: t('discover.globe.routePoints'),
      fitRoute: t('discover.globe.fitRoute'),
      close: t('discover.globe.close'),
      approximate: t('discover.globe.approximate'),
      reliefFail: t('discover.globe.reliefFail'),
    }),
    [t]
  );

  const markup = useMemo(
    () =>
      buildGlobeMarkup(
        {
          loading: t('discover.globe.loading'),
          kicker: t('discover.globe.kicker'),
          gyro: t('discover.globe.gyro'),
          water: t('discover.globe.water'),
          world: t('discover.globe.worldView'),
          reset: t('discover.globe.resetView'),
          tokenHint: t('discover.globe.tokenHint'),
          hints: t('discover.globe.hints'),
        },
        [tiles.attribution, GLOBE_ATLAS_ATTRIBUTION]
      ),
    [t, tiles]
  );

  const categories = useMemo<GlobeCategory[]>(
    () =>
      (payload?.categories ?? []).map((category) => ({
        id: category.id,
        label: category.name_localized?.[locale] ?? category.name,
        color: category.color_hex ?? '#0D9488',
      })),
    [payload, locale]
  );

  const trips = useMemo<GlobeTrip[]>(
    () => (payload?.markers ?? []).map((marker) => toGlobeTrip(marker, locale, t)),
    [payload, locale, t]
  );

  const routes: GlobeRoutes = payload?.routes ?? {};

  // ── renderer lifecycle ──────────────────────────────────────────────────
  // Re-mounted on locale change: the container markup carries translated
  // strings, so a language switch rebuilds the globe (cheap, tiles are cached
  // by the browser).
  useEffect(() => {
    if (state !== 'ready' || !payload) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    container.innerHTML = markup;

    (async () => {
      try {
        const { mountGlobe } = await import('./terepgomb');
        if (cancelled) return;
        const instance = await mountGlobe(container, {
          trips,
          categories,
          routes,
          week0: payload.week0,
          tiles,
          atlasUrl: GLOBE_ATLAS_URL,
          locale,
          t: strings,
          onOpen: (slug: string) => router.push(`/trips/${slug}`),
        });
        if (cancelled) {
          instance.destroy();
          return;
        }
        globeRef.current = instance;
        // Development-only handle so E2E tests can aim at a trip instead of
        // guessing pixel positions from a screenshot. Never exposed in production.
        if (process.env.NODE_ENV !== 'production') {
          (window as Window & { __trevuGlobe?: unknown }).__trevuGlobe = instance;
        }
      } catch (error) {
        console.error('[GlobeDiscover] renderer failed to start:', error);
        if (!cancelled) setState('error');
      }
    })();

    return () => {
      cancelled = true;
      globeRef.current?.destroy();
      globeRef.current = null;
      container.innerHTML = '';
    };
    // The renderer is rebuilt only when the data or the language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, payload, locale, markup]);

  // ── render ──────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <StateTemplate
        variant="error"
        title={t('discover.globe.errorTitle')}
        description={t('discover.globe.errorHint')}
        className="my-8"
      />
    );
  }

  return (
    <section
      className="globe-discover"
      data-testid="globe-discover"
      aria-label={t('discover.globe.regionLabel')}
    >
      <div
        ref={containerRef}
        className="terepgomb"
        role="application"
        aria-label={t('discover.globe.canvasLabel')}
      />

      {state === 'loading' && (
        <div className="globe-status" role="status">
          {t('discover.globe.loading')}
        </div>
      )}

      {state === 'ready' && trips.length === 0 && (
        <div className="globe-status" role="status">
          {t('discover.globe.noMarkers')}
        </div>
      )}

      {/* Keyboard and screen-reader path to the same trips the globe shows. */}
      <ul className="globe-fallback-list">
        {(payload?.markers ?? []).map((marker) => (
          <li key={marker.id}>
            <a href={`/trips/${marker.slug}`}>
              {marker.title} — {formatPlace(marker)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
