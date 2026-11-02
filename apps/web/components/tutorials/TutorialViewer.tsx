"use client";

/**
 * M211 — lejátszó + kattintható lépések (D21 `TutorialStep` `lEbnQ`).
 * Elrendezés: `page` = adatlap (S2: videó + jobb oldali Lépések panel), `dialog` = súgóablak
 * (S3b: videó alatt két oszlop), `sheet` = mobil alsó lap (S3m: egy oszlop).
 * A lépésre kattintva a videó oda ugrik; lejátszás közben az aktuális lépés kiemelt.
 */

import { useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { activeStepIndex, formatTime, loc, type Tutorial } from "@/lib/tutorials";
import { VideoPlayer, type VideoPlayerHandle } from "./VideoPlayer";
import { SlidePlayer } from "./SlidePlayer";

interface TutorialViewerProps {
  tutorial: Tutorial;
  variant: "page" | "dialog" | "sheet";
  /** Az adatlapon a Lépések panel alján (pl. „Kipróbálom a túrámon”). */
  panelFooter?: ReactNode;
}

export function TutorialViewer({ tutorial, variant, panelFooter }: TutorialViewerProps) {
  const { t, locale } = useTranslation();
  const playerRef = useRef<VideoPlayerHandle>(null);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const [slide, setSlide] = useState(0);
  const slides = tutorial.hasSlides && !tutorial.hasVideo;
  const interactive = tutorial.hasVideo || slides;
  const active = slides ? slide : started ? activeStepIndex(tutorial, time) : -1;
  const compact = variant !== "page";

  const steps = (
    <ol className={variant === "dialog" ? "grid gap-2 sm:grid-cols-2" : "flex flex-col gap-2"} data-testid="tutorial-steps">
      {tutorial.steps.map((step, i) => {
        const isActive = i === active;
        const text = loc(step.text, locale);
        const inner = (
          <>
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${isActive ? "bg-accent text-accent-on" : "bg-ghost text-ink"}`}
              aria-hidden
            >
              {i + 1}
            </span>
            <span className={`min-w-0 flex-1 text-left leading-snug ${compact ? "text-sm" : "text-[15px]"} ${isActive ? "font-semibold text-ink" : "text-ink-body"}`}>{text}</span>
            {tutorial.hasVideo && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-[6px] bg-ghost px-2 py-0.5 text-xs font-semibold tabular-nums text-accent">
                <Icon name="play" size={10} aria-hidden />
                {formatTime(step.at)}
              </span>
            )}
          </>
        );
        const cls = `flex w-full items-center gap-3 rounded-trevu-lg border px-3 py-2.5 ${isActive ? "border-accent bg-[rgba(45,212,191,0.12)]" : "border-line"}`;
        return (
          <li key={step.at} aria-current={isActive ? "step" : undefined}>
            {interactive ? (
              <button
                type="button"
                className={`${cls} min-h-11 hover:bg-ghost focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
                onClick={() => (slides ? setSlide(i) : playerRef.current?.seek(step.at))}
                aria-label={slides ? `${i + 1}. ${text}` : `${i + 1}. ${text} — ${t("tutorials.jumpTo", { time: formatTime(step.at) })}`}
                data-testid={`tutorial-step-${i + 1}`}
              >
                {inner}
              </button>
            ) : (
              <div className={cls} data-testid={`tutorial-step-${i + 1}`}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );

  const player = slides ? (
    <SlidePlayer tutorial={tutorial} index={slide} onIndex={setSlide} compact={compact} priority={variant === "page"} />
  ) : (
    <VideoPlayer
      ref={playerRef}
      tutorial={tutorial}
      compact={compact}
      priority={variant === "page"}
      onTime={(s, st) => {
        setTime(s);
        if (st) setStarted(true);
      }}
    />
  );

  if (variant !== "page") {
    return (
      <div className="flex flex-col gap-4">
        {player}
        {steps}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      {player}
      <section className="flex flex-col gap-4 rounded-trevu-2xl border border-line bg-surface p-5" aria-labelledby="tutorial-steps-title" data-testid="tutorial-steps-panel">
        <div className="flex flex-col gap-1">
          <h2 id="tutorial-steps-title" className="text-lg font-bold text-ink">
            {t("tutorials.steps")}
          </h2>
          <p className="text-[13px] text-ink-muted">{tutorial.hasVideo ? t("tutorials.stepsHint") : slides ? t("tutorials.stepsHintSlides") : t("tutorials.stepsHintText")}</p>
        </div>
        {steps}
        {panelFooter}
      </section>
    </div>
  );
}
