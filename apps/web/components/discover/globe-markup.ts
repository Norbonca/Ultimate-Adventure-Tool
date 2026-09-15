/**
 * The Terepgömb container's inner markup.
 *
 * Source: handoff/globe/globe-markup.html (Claude Design, 2026-09-14). Turned
 * into a builder so every visible string comes from i18n and the attribution
 * follows the configured tile provider. Element ids carry the `tg-` prefix —
 * the renderer (`terepgomb.js`) looks them up with `#tg-<id>`.
 */

export interface GlobeMarkupStrings {
  loading: string;
  kicker: string;
  gyro: string;
  world: string;
  reset: string;
  tokenHint: string;
  hints: string;
  timeline: string;
}

export interface GlobeAttribution {
  text: string;
  href: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export function buildGlobeMarkup(s: GlobeMarkupStrings, attributions: GlobeAttribution[]): string {
  const credits = attributions
    .map((a) => `<a href="${esc(a.href)}" target="_blank" rel="noopener noreferrer">${esc(a.text)}</a>`)
    .join(' · ');
  return `
  <div id="tg-loading" class="mono" role="status">${esc(s.loading)}</div>
  <canvas id="tg-relief" aria-hidden="true"></canvas>
  <svg id="tg-globe" aria-hidden="true"></svg>
  <div id="tg-pins"></div>
  <div id="tg-card"></div>

  <div class="tg-topbar">
    <span class="tg-brand">tre<em>vu</em></span>
    <span class="mono tg-kicker">${esc(s.kicker)}</span>
    <span class="tg-spacer"></span>
    <button type="button" class="btn" id="tg-gyro" aria-pressed="false">${esc(s.gyro)}</button>
    <button type="button" class="btn" id="tg-world">${esc(s.world)}</button>
    <button type="button" class="btn" id="tg-reset">${esc(s.reset)}</button>
  </div>

  <div id="tg-tokens" role="group"></div>
  <div id="tg-tokhint">${esc(s.tokenHint)}</div>

  <div class="tg-bottom">
    <div class="tg-timehead">
      <span id="tg-now"></span>
      <span id="tg-nowsub" aria-live="polite"></span>
      <div id="tg-seasons"></div>
    </div>
    <div id="tg-track" role="slider" tabindex="0" aria-label="${esc(s.timeline)}" aria-valuemin="0" aria-valuemax="52" aria-valuenow="0"></div>
    <div class="tg-hints">${esc(s.hints)}</div>
    <div class="mono tg-attrib">${credits}</div>
  </div>`;
}
