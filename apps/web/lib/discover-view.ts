/**
 * Discover view mode — the single source of truth for the globe/grid/list
 * toggle. Shared by the server page (cookie read) and the client (cookie write).
 *
 * Contract: components/discover/discover-view-toggle.md
 */

/**
 * v2 (2026-09-16): a csempés nézet visszakerült és ez az alapértelmezés. A cookie neve új,
 * hogy a 1b-s átállás alatt mentett `list`/`globe` választás ne takarja el a csempéket.
 */
export const DISCOVER_VIEW_COOKIE = 'trevu-discover-view-v2';

/**
 * Nézetek: csempe (rács) — alapértelmezés, 3D gömb, lista (borítós sávok).
 * Norbert döntése 2026-09-16: „legyen az eredeti csempés a nyitónézet, választható a 3D és a lista”.
 */
export const DISCOVER_VIEWS = ['grid', 'globe', 'list'] as const;

export type DiscoverView = (typeof DISCOVER_VIEWS)[number];

/** A csempés nézet a Discover belépő nézete. */
export const DEFAULT_DISCOVER_VIEW: DiscoverView = 'grid';

/** One year — the choice is a lasting preference, not a session detail. */
export const DISCOVER_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isDiscoverView(value: unknown): value is DiscoverView {
  return typeof value === 'string' && (DISCOVER_VIEWS as readonly string[]).includes(value);
}

/** A cookie értékéből a megjelenítendő nézet; ismeretlen érték az alapértelmezésre esik. */
export function parseDiscoverView(value: unknown): DiscoverView {
  return isDiscoverView(value) ? value : DEFAULT_DISCOVER_VIEW;
}

/**
 * Persists the chosen view. Client-side only: the cookie is a UI preference,
 * so it is intentionally not httpOnly — the toggle writes it without a round
 * trip, and the server only ever reads it.
 */
export function rememberDiscoverView(view: DiscoverView): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${DISCOVER_VIEW_COOKIE}=${view}; path=/; max-age=${DISCOVER_VIEW_COOKIE_MAX_AGE}; SameSite=Lax`;
}
