"use client";

/**
 * Közös lábléc — B „Terep” (vászon: design/claude/B_Komponensek, ZHO_B_Nyitooldal / ZHO_B_Mobil).
 * Szén (Night) sáv: márkajel + szójel + márkamondat, a fő menüpontok, nyelvváltó, szerzői jog.
 * A kabala FIX helye a lábléc jobb oldala (Norbert, 2026-11-14: „a kabalának olyan fix helyet
 * találni, ami minden aloldalon is érvényesül”): a figura a sávon áll, és a szójel felé lép;
 * mobilon a sáv tetején, jobbra igazítva. Oldalanként egy figura.
 *
 * Nem jelenik meg: admin, belépési és jelszó-oldalak, teljes képernyős bemutató, a saját lábléccel
 * bíró Kezdés oldal, és a teljes képernyős 3D térkép (body[data-fullscreen-view]).
 */
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@uat/config";
import { BrandHead, BrandWordmark } from "@/components/brand/BrandMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n/useTranslation";

const HIDDEN_PREFIXES = [
  "/admin",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/account-restore",
  "/callback",
  "/presentation",
  "/get-started",
];

const LINKS = [
  { key: "nav.discover", href: "/" },
  { key: "nav.tripIdeas", href: "/ideas" },
  { key: "nav.community", href: "/community" },
  { key: "nav.getStarted", href: "/get-started" },
  { key: "nav.pricing", href: "/pricing" },
] as const;

export function SiteFooter() {
  const pathname = usePathname() ?? "/";
  const { t } = useTranslation();
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <footer
      data-surface="night"
      data-site-footer
      aria-label={t("footer.label")}
      className="relative mt-auto bg-canvas text-ink"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-8 md:min-h-[232px] md:flex-row md:items-end md:justify-between md:gap-10 md:pb-10 md:pl-8 md:pr-[300px] md:pt-10">
        {/* Mobilon a figura a sáv tetején, jobbra */}
        <Image
          src="/brand/zho-kabala-sotet-alapra.webp"
          alt={t("footer.mascotAlt")}
          width={560}
          height={491}
          className="pointer-events-none -mb-2 mt-3 w-[168px] self-end md:absolute md:bottom-0 md:right-8 md:m-0 md:w-[248px]"
        />
        <div className="flex flex-col gap-3">
          <Link href="/" className="inline-flex items-center gap-3 text-ink" aria-label={BRAND.name}>
            <BrandHead height={40} />
            <BrandWordmark height={24} decorative />
          </Link>
          <p className="text-base text-ink-muted">{t("common.appTagline")}</p>
        </div>
        <div className="flex flex-col gap-4 md:items-end">
          <nav aria-label={t("footer.label")} className="flex flex-wrap gap-x-6 gap-y-1 text-base font-medium">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="flex min-h-11 items-center hover:text-accent">
                {t(l.key)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <span className="font-mono text-[13px] tracking-[0.06em] text-ink-muted">
              {t("landing.footerCopyright")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
