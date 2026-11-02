"use client";

/**
 * M211b — Promó blokk a nyitóoldalakon (Felfedezés `/`, Kezdés `/get-started`): a bemutató belépője.
 * Design: design/D09_Search_Discover.pen „M211b — Promó blokk” 1440 / MOBIL 390.
 * Szöveg: a jóváhagyott prezentáció borítója (SLIDES[0]).
 */

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SLIDES, SLIDE_SECONDS } from "@/lib/presentation/content";
import s from "./presentation.module.css";

export function PresentationPromo({ className = "" }: { className?: string }) {
  const { t, locale } = useTranslation();
  const lang = locale === "en" ? "en" : "hu";
  const cover = SLIDES[0];
  const minutes = Math.max(1, Math.round((SLIDES.length * SLIDE_SECONDS) / 60));

  return (
    <section data-surface="night" className={`bg-canvas px-4 py-10 md:px-[120px] md:py-16 ${className}`} data-testid="presentation-promo">
      <Link
        href="/presentation"
        className="group mx-auto grid max-w-7xl items-center gap-6 overflow-hidden rounded-[20px] border border-line p-6 [background:linear-gradient(135deg,var(--color-bg)_0%,var(--color-primary-subtle)_100%)] focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none md:grid-cols-[5fr_7fr] md:gap-14 md:rounded-3xl md:p-14"
      >
        <div className="order-2 flex flex-col gap-4 md:order-1 md:gap-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent md:text-sm">{t("presentation.promoEyebrow")}</p>
          <h2 className="text-[28px] font-extrabold leading-tight text-ink md:text-[40px]">{cover.title[lang]}</h2>
          {"lead" in cover && <p className="text-base leading-relaxed text-ink-secondary md:text-lg">{cover.lead[lang]}</p>}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <span className="inline-flex h-12 items-center justify-center gap-2.5 rounded-trevu bg-accent px-6 text-base font-bold text-accent-on transition-colors group-hover:bg-accent-hover">
              <Icon name="circle-play" size={20} aria-hidden />
              {t("presentation.promoCta")}
            </span>
            <span className="text-sm text-ink-muted">{t("presentation.promoMeta", { count: SLIDES.length, minutes })}</span>
          </div>
        </div>
        <div className="relative order-1 h-[200px] md:order-2 md:h-[400px]" aria-hidden>
          <div className={`${s.drift} absolute left-[14%] top-0 w-[78%] rotate-[4deg] overflow-hidden rounded-xl opacity-55`} style={{ animationDelay: "0.6s" }}>
            <Image src="/presentation/07-idovonal.jpg" alt="" width={1600} height={1000} sizes="(min-width: 768px) 520px, 270px" className="h-auto w-full" />
          </div>
          <div className={`${s.drift} absolute left-[7%] top-[10%] hidden w-[80%] -rotate-[3deg] overflow-hidden rounded-xl opacity-80 md:block`} style={{ animationDelay: "1.2s" }}>
            <Image src="/presentation/08a-koltsegek.jpg" alt="" width={1600} height={1000} sizes="540px" className="h-auto w-full" />
          </div>
          <div className="absolute left-0 top-[12%] w-[92%] overflow-hidden rounded-2xl border border-line shadow-2xl transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.02] md:top-[18%] md:w-[82%]">
            <Image src="/presentation/01-felfedezes.jpg" alt="" width={1600} height={1000} sizes="(min-width: 768px) 560px, 290px" className="h-auto w-full" />
          </div>
          <span className={`${s.glow} absolute left-[46%] top-[52%] inline-flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-on md:left-[41%] md:top-[60%] md:h-[88px] md:w-[88px]`}>
            <Icon name="play" size={32} aria-hidden />
          </span>
        </div>
      </Link>
    </section>
  );
}
