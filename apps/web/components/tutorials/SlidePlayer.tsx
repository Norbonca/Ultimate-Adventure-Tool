"use client";

/**
 * M211 — képes bemutató a videó helyett (Norbert, 2026-11-02). Design: D21 `NqDwB` Component/TutorialSlides.
 * Lépésenként egy képernyőkép a valódi felületről, a magyarázott elem kiemelve; alul a lépés szövege.
 * Előre/hátra gomb, ←/→ billentyű, pontok; nem lapoz magától. Az aktuális diát a szülő tartja
 * (TutorialViewer), így a lépéslistára kattintva is oda lapoz.
 */

import Image from "next/image";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { loc, slideUrl, type Tutorial } from "@/lib/tutorials";

interface SlidePlayerProps {
  tutorial: Tutorial;
  index: number;
  onIndex: (index: number) => void;
  compact?: boolean;
  priority?: boolean;
}

export function SlidePlayer({ tutorial, index, onIndex, compact = false, priority = false }: SlidePlayerProps) {
  const { t, locale } = useTranslation();
  const tr = t as (key: string, params?: Record<string, string | number>) => string;
  const total = tutorial.steps.length;
  const step = tutorial.steps[index];
  const go = (i: number) => onIndex(Math.max(0, Math.min(total - 1, i)));
  const navBtn =
    "absolute inline-flex h-11 w-11 items-center justify-center rounded-full bg-glass text-ink backdrop-blur-sm hover:bg-surface disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-accent";

  return (
    <div
      role="region"
      aria-roledescription={tr("tutorials.slides.carousel")}
      aria-label={loc(tutorial.title, locale)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(index + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(index - 1);
        }
      }}
      className={`relative aspect-video w-full overflow-hidden border border-line bg-canvas focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-accent ${compact ? "rounded-trevu-lg" : "rounded-trevu-2xl"}`}
      data-testid="tutorial-slides"
      data-index={index}
    >
      <Image
        key={index}
        src={slideUrl(tutorial.slug, index)}
        alt={loc(step.text, locale)}
        fill
        sizes="(min-width: 1024px) 820px, 100vw"
        className="object-cover"
        priority={priority && index === 0}
      />

      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-chip bg-glass px-2 py-1 text-xs font-semibold text-ink backdrop-blur-sm" data-testid="tutorial-slides-counter">
        <Icon name="presentation" size={14} aria-hidden />
        {index + 1} / {total}
      </span>

      <div className={`absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-[rgba(15,23,42,0.9)] text-center ${compact ? "px-14 pb-2.5 pt-2" : "px-16 pb-3 pt-3"}`}>
        <p aria-live="polite" className={`font-semibold leading-snug text-white ${compact ? "text-sm" : "text-base md:text-lg"}`} data-testid="tutorial-slides-caption">
          {loc(step.text, locale)}
        </p>
        <div className="flex items-center gap-1.5" aria-hidden>
          {tutorial.steps.map((s, i) => (
            <span key={s.at} className={`h-1.5 rounded-full transition-all ${i === index ? "w-[18px] bg-accent" : "w-1.5 bg-white/40"}`} />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => go(index - 1)}
        disabled={index === 0}
        aria-label={tr("tutorials.slides.prev")}
        className={`${navBtn} bottom-3 left-3`}
        data-testid="tutorial-slides-prev"
      >
        <Icon name="chevron-left" size={20} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        disabled={index === total - 1}
        aria-label={tr("tutorials.slides.next")}
        className={`${navBtn} bottom-3 right-3`}
        data-testid="tutorial-slides-next"
      >
        <Icon name="chevron-right" size={20} aria-hidden />
      </button>
    </div>
  );
}
