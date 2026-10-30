/**
 * Márkaikonok — az Ikon Bank egyetlen nem-lucide kivétele (Norbert, 2026-10-30, D11).
 * A lucide 1.x törölte a márkaikonokat (Facebook, Instagram, X/Twitter, YouTube); helyettük a Simple Icons
 * (CC0) React-csomagja. A Google „G” az egyetlen saját SVG: a Simple Icons Google-jele egyszínű, a bejelentkező
 * gomb a hivatalos négyszínű jelet használja (Google identity guidelines).
 *
 * Kulcsok (Icon Bank 0.6 „Márkaikonok”): brand.facebook · brand.instagram · brand.x · brand.youtube · brand.google
 * Használat: <BrandIcon name="brand.instagram" size={20} className="…" />
 */

import { SiFacebook, SiInstagram, SiX, SiYoutube, type IconType } from "@icons-pack/react-simple-icons";

export const BRAND_ICON_KEYS = ["brand.facebook", "brand.instagram", "brand.x", "brand.youtube", "brand.google"] as const;
export type BrandIconName = (typeof BRAND_ICON_KEYS)[number];

function GoogleMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" focusable="false">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

const SIMPLE: Record<Exclude<BrandIconName, "brand.google">, IconType> = {
  "brand.facebook": SiFacebook,
  "brand.instagram": SiInstagram,
  "brand.x": SiX,
  "brand.youtube": SiYoutube,
};

interface BrandIconProps {
  name: BrandIconName;
  size?: number;
  className?: string;
  /** Simple Icons: "default" = a márka saját színe; különben currentColor */
  color?: string;
  title?: string;
}

export function BrandIcon({ name, size = 20, className, color, title }: BrandIconProps) {
  if (name === "brand.google") return <GoogleMark size={size} className={className} />;
  const Cmp = SIMPLE[name];
  return <Cmp size={size} className={className} color={color ?? "currentColor"} title={title ?? ""} aria-hidden={title ? undefined : true} />;
}
