/**
 * A márka a megosztóképeken (next/og ImageResponse). Az ImageResponse nem ismeri a CSS-változókat,
 * ezért a színek a témakészletből, CSS nélkül jönnek (resolveToken, Night felület).
 * A képen nincs nyelvfüggő felirat: a szójel a logó része, nem szöveg (Norbert, 2026-11-09).
 */
import { DEFAULT_THEME, resolveToken } from "@uat/config";
import { HEAD, WORDMARK } from "./paths";

const tok = (name: string, fallback: string) => resolveToken(DEFAULT_THEME, "night", name) ?? fallback;

/** `#rrggbb` → `rgba(…)`: az ImageResponse a color-mixet nem ismeri. */
export function ogAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1]!, 16)}, ${parseInt(m[2]!, 16)}, ${parseInt(m[3]!, 16)}, ${alpha})`;
}

export const OG_NIGHT = {
  bg: tok("color-bg", "#222520"),
  text: tok("color-text", "#E9E7DE"),
  muted: tok("color-text-muted", "#B9B8AE"),
  primary: tok("color-primary", "#F15B2A"),
  onPrimary: tok("color-on-primary", "#222520"),
  /** Áttetsző alátét a fotó fölött (a háttérszín 85%-on). */
  plate: ogAlpha(tok("color-bg", "#222520"), 0.85),
};

/** Márkajel (fej a kiemelő színű négyzetben) + szójel, sötét alátéten. */
export function OgBrand() {
  const headH = 32;
  const headW = Math.round((headH * HEAD.width) / HEAD.height);
  const wmH = 30;
  const wmW = Math.round((wmH * WORDMARK.width) / WORDMARK.height);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 20px 10px 10px", background: OG_NIGHT.plate }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, background: OG_NIGHT.primary }}>
        <svg width={headW} height={headH} viewBox={HEAD.viewBox}>
          <path d={HEAD.d} fill={OG_NIGHT.onPrimary} fillRule={HEAD.fillRule} />
        </svg>
      </div>
      <svg width={wmW} height={wmH} viewBox={WORDMARK.viewBox}>
        <path d={WORDMARK.d} fill={OG_NIGHT.text} fillRule={WORDMARK.fillRule} />
      </svg>
    </div>
  );
}
