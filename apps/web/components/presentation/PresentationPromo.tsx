"use client";

/**
 * M211b — Promó blokk a nyitóoldalakon (Felfedezés `/` a hero alatt, kijelentkezve; Kezdés `/get-started`).
 * Design: design/D09_Search_Discover.pen „M211b — Promó blokk” 1440 (`JvYxg`) / MOBIL 390 (`Z9WwV`).
 * Jobbra a bemutató videós változata: néma, automatikusan induló, ismétlődő (Norbert 2026-11-02 19:34),
 * vezérlőkkel; mozgáscsökkentésnél nem indul magától. Szöveg: a jóváhagyott prezentáció borítója.
 */

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SLIDES, SLIDE_SECONDS } from "@/lib/presentation/content";

const VIDEO = "/videos/trevu-bemutato.mp4";
const POSTER = "/videos/trevu-bemutato-poster.jpg";

export function PresentationPromo({ className = "", eyebrow }: { className?: string; eyebrow?: string }) {
  const { t, locale } = useTranslation();
  const lang = locale === "en" ? "en" : "hu";
  const cover = SLIDES[0];
  const minutes = Math.max(1, Math.round((SLIDES.length * SLIDE_SECONDS) / 60));
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  return (
    <section data-surface="night" className={`bg-canvas px-4 py-8 md:px-[120px] md:py-12 ${className}`} data-testid="presentation-promo">
      <div className="mx-auto grid max-w-7xl items-center gap-6 md:grid-cols-[5fr_7fr] md:gap-12">
        <div className="order-2 flex flex-col gap-4 md:order-1 md:gap-5">
          <p className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{eyebrow ?? t("presentation.promoEyebrow")}</p>
          <h2 className="text-[36px] text-ink md:text-[56px]">{cover.title[lang]}</h2>
          {"lead" in cover && <p className="text-base leading-relaxed text-ink-secondary md:text-lg">{cover.lead[lang]}</p>}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <Link
              href="/presentation"
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-trevu bg-accent px-6 text-base font-bold text-accent-on transition-colors hover:bg-accent-hover focus-visible:shadow-(--focus-ring) focus-visible:outline-hidden"
              data-testid="presentation-promo-cta"
            >
              <Icon name="circle-play" size={20} aria-hidden />
              {t("presentation.promoCta")}
            </Link>
            <span className="text-sm text-ink-muted">{t("presentation.promoMeta", { count: SLIDES.length, minutes })}</span>
          </div>
        </div>
        <div className="order-1 overflow-hidden border border-line bg-canvas md:order-2">
          <video
            ref={videoRef}
            src={VIDEO}
            poster={POSTER}
            muted
            loop
            playsInline
            controls
            preload="metadata"
            aria-label={t("presentation.videoLabel")}
            className="block aspect-video h-auto w-full"
            data-testid="presentation-promo-video"
          />
        </div>
      </div>
    </section>
  );
}
