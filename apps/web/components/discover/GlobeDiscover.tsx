'use client';

/**
 * GlobeDiscover — React shell around the Terepgömb renderer.
 *
 * Owns data loading, the hover card, the empty/error states and accessibility;
 * the three.js work lives in `terepgomb.js`. Markers come from
 * `/api/v1/trips/globe`, not from the page's own trip list, because the globe
 * needs coordinates the card query does not fetch.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { StateTemplate } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { GlobeMarker, ScreenPosition } from './terepgomb';

interface GlobeDiscoverProps {
  /** Category filter shared with the grid view; 'all' shows everything. */
  activeCategory?: string;
  /** Restricts the globe to these trip ids when the page has active filters. */
  visibleTripIds?: string[] | null;
  className?: string;
}

type LoadState = 'loading' | 'ready' | 'error' | 'unsupported';

export default function GlobeDiscover({
  activeCategory = 'all',
  visibleTripIds = null,
  className = '',
}: GlobeDiscoverProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<{ setMarkers: (m: GlobeMarker[]) => void; destroy: () => void } | null>(null);
  // The renderer is created behind a dynamic import, so it can come up *after*
  // the markers are ready. This ref hands it the current set the moment it
  // exists — without it the globe stays empty until the next filter change.
  const pendingMarkersRef = useRef<GlobeMarker[]>([]);

  const [markers, setMarkers] = useState<GlobeMarker[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [hovered, setHovered] = useState<{ marker: GlobeMarker; position: ScreenPosition } | null>(null);

  // ── data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch('/api/v1/trips/globe', { signal: controller.signal });
        if (!response.ok) throw new Error(`globe endpoint returned ${response.status}`);
        const payload = (await response.json()) as { markers?: GlobeMarker[] };
        if (cancelled) return;
        setMarkers(Array.isArray(payload.markers) ? payload.markers : []);
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

  const filteredMarkers = useMemo(() => {
    let result = markers;
    if (activeCategory && activeCategory !== 'all') {
      result = result.filter((marker) => marker.categoryId === activeCategory);
    }
    if (visibleTripIds) {
      const allowed = new Set(visibleTripIds);
      result = result.filter((marker) => allowed.has(marker.id));
    }
    return result;
  }, [markers, activeCategory, visibleTripIds]);

  // ── renderer lifecycle ──────────────────────────────────────────────────
  const handleMarkerClick = useCallback(
    (marker: GlobeMarker) => {
      router.push(`/trips/${marker.slug}`);
    },
    [router]
  );

  const handleMarkerHover = useCallback(
    (marker: GlobeMarker | null, position: ScreenPosition | null) => {
      setHovered(marker && position ? { marker, position } : null);
    },
    []
  );

  useEffect(() => {
    if (state !== 'ready') return;
    const container = containerRef.current;
    if (!container) return;

    let instance: InstanceType<typeof import('./terepgomb').Terepgomb> | null = null;
    let cancelled = false;

    (async () => {
      const { Terepgomb, isWebGLAvailable } = await import('./terepgomb');
      if (cancelled) return;

      if (!isWebGLAvailable()) {
        setState('unsupported');
        return;
      }

      try {
        instance = new Terepgomb(container, {
          onMarkerClick: handleMarkerClick,
          onMarkerHover: handleMarkerHover,
        });
        globeRef.current = instance;
        instance.setMarkers(pendingMarkersRef.current);

        // Development-only handle so E2E tests can aim at a marker instead of
        // guessing pixel positions from a screenshot. Never exposed in production.
        if (process.env.NODE_ENV !== 'production') {
          (window as Window & { __trevuGlobe?: unknown }).__trevuGlobe = instance;
        }
      } catch (error) {
        console.error('[GlobeDiscover] renderer failed to start:', error);
        setState('unsupported');
      }
    })();

    return () => {
      cancelled = true;
      instance?.destroy();
      globeRef.current = null;
    };
  }, [state, handleMarkerClick, handleMarkerHover]);

  // Feed markers whenever the filtered set changes; the ref covers the case
  // where the renderer is not up yet.
  useEffect(() => {
    pendingMarkersRef.current = filteredMarkers;
    globeRef.current?.setMarkers(filteredMarkers);
  }, [filteredMarkers]);

  // ── helpers ─────────────────────────────────────────────────────────────
  const formatLocation = (marker: GlobeMarker) => {
    if (marker.geocodeSource === 'country_centroid') {
      return [marker.city, marker.region, marker.country].filter(Boolean).join(', ');
    }
    return [marker.city, marker.region].filter(Boolean).join(', ') || marker.country;
  };

  const formatDates = (marker: GlobeMarker) => {
    if (!marker.startDate) return null;
    const intlLocale = locale === 'en' ? 'en-US' : 'hu-HU';
    const formatter = new Intl.DateTimeFormat(intlLocale, { month: 'short', day: 'numeric' });
    const start = formatter.format(new Date(marker.startDate));
    if (!marker.endDate) return start;
    return `${start}–${formatter.format(new Date(marker.endDate))}`;
  };

  const categoryLabel = (marker: GlobeMarker) =>
    marker.categoryNameLocalized?.[locale] ?? marker.categoryName ?? '';

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

  if (state === 'unsupported') {
    return (
      <StateTemplate
        variant="empty"
        title={t('discover.globe.unsupportedTitle')}
        description={t('discover.globe.unsupportedHint')}
        className="my-8"
      />
    );
  }

  return (
    <section
      className={`globe-discover ${className}`.trim()}
      data-testid="globe-discover"
      aria-label={t('discover.globe.regionLabel')}
    >
      <div
        ref={containerRef}
        className="globe-canvas-host"
        role="application"
        aria-label={t('discover.globe.canvasLabel')}
      />

      {state === 'loading' && (
        <div className="globe-status" role="status">
          {t('discover.globe.loading')}
        </div>
      )}

      {state === 'ready' && filteredMarkers.length === 0 && (
        <div className="globe-status" role="status">
          {t('discover.globe.noMarkers')}
        </div>
      )}

      {hovered && (
        <article
          className="globe-tooltip"
          style={{ left: hovered.position.x, top: hovered.position.y }}
          aria-hidden="true"
        >
          <h3 className="globe-tooltip__title">{hovered.marker.title}</h3>
          <p className="globe-tooltip__meta">
            {[categoryLabel(hovered.marker), formatLocation(hovered.marker), formatDates(hovered.marker)]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {hovered.marker.geocodeSource === 'country_centroid' && (
            <p className="globe-tooltip__note">{t('discover.globe.approximate')}</p>
          )}
        </article>
      )}

      <footer className="globe-legend">
        <span className="globe-legend__count">
          {t('discover.globe.markerCount').replace('{count}', String(filteredMarkers.length))}
        </span>
        <span className="globe-legend__hint">
          <Icon name="compass" size={14} aria-hidden="true" />
          {t('discover.globe.dragHint')}
        </span>
      </footer>

      {/* Keyboard and screen-reader path to the same trips the globe shows. */}
      <ul className="globe-fallback-list">
        {filteredMarkers.map((marker) => (
          <li key={marker.id}>
            <a href={`/trips/${marker.slug}`}>
              {marker.title} — {formatLocation(marker)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
