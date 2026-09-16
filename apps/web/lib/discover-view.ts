/**
 * Discover view mode — the single source of truth for the globe/grid/list
 * toggle. Shared by the server page (cookie read) and the client (cookie write).
 *
 * Contract: components/discover/discover-view-toggle.md
 */

export const DISCOVER_VIEW_COOKIE = 'trevu-discover-view';

/**
 * 2026-09-15 (Brand Guide v2 „Éjszakai túra”): a kártyarács megszűnt, a lista
 * borítós sávokból áll — a nézetváltó „3D gömb | Lista” (design/D02_Trip_Management.pen#H1rRQE).
 */
export const DISCOVER_VIEWS = ['globe', 'list'] as const;

export type DiscoverView = (typeof DISCOVER_VIEWS)[number];

/** The globe is the default entry point to Discover. */
export const DEFAULT_DISCOVER_VIEW: DiscoverView = 'globe';

/** One year — the choice is a lasting preference, not a session detail. */
export const DISCOVER_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isDiscoverView(value: unknown): value is DiscoverView {
  return typeof value === 'string' && (DISCOVER_VIEWS as readonly string[]).includes(value);
}

/**
 * A cookie értékéből a megjelenítendő nézet. A korábbi `grid` választás a lista
 * nézetre esik (az a rács utódja), minden más ismeretlen érték az alapértelmezésre.
 */
export function parseDiscoverView(value: unknown): DiscoverView {
  if (value === 'grid') return 'list';
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
