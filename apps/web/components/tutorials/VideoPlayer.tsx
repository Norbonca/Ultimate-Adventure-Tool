"use client";

/**
 * M211 — VideoPlayer. Design: D21 `JNQS9` (plakát), `u5dVow` (lejátszás felirattal), `LFnrp` (hiba).
 *
 * - Nem indul magától: a plakát nagy lejátszás-gombja indítja (spec K-3).
 * - A felirat alapból be van kapcsolva; a feliratot a lépésekből rajzoljuk a videó fölé (a design
 *   dobozával), a WebVTT sávok (hu, en) a böngésző és a kisegítő eszközök számára is ott vannak.
 * - Hibánál és amíg nincs videó, a plakát + üzenet látszik; a lépések szövege a szülőben marad.
 * - `ref`-en át `seek(sec)`: a lépésre kattintva oda ugrik és elindul.
 */

import Image from "next/image";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  activeStepIndex,
  asTutorialLocale,
  CAPTION_LOCALES,
  captionsUrl,
  formatTime,
  loc,
  posterUrl,
  videoUrl,
  type Tutorial,
  type TutorialLocale,
} from "@/lib/tutorials";

export interface VideoPlayerHandle {
  seek: (seconds: number) => void;
}

interface VideoPlayerProps {
  ref?: Ref<VideoPlayerHandle>;
  tutorial: Tutorial;
  onTime?: (seconds: number, started: boolean) => void;
  /** Kisebb vezérlők (súgóablak, mobil). */
  compact?: boolean;
  /** Képbetöltés elsőbbsége (az oldal fő videója). */
  priority?: boolean;
}

type Phase = "poster" | "video" | "error";
const SPEEDS = [1, 1.5, 0.75];

export function VideoPlayer({ ref, tutorial, onTime, compact = false, priority = false }: VideoPlayerProps) {
  const { t, locale } = useTranslation();
  const tr = t as (key: string, params?: Record<string, string | number>) => string;
  const title = loc(tutorial.title, locale);
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("poster");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [captionLang, setCaptionLang] = useState<TutorialLocale>(asTutorialLocale(locale));
  const [speedIndex, setSpeedIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const start = (at?: number) => {
    if (!tutorial.hasVideo) return;
    if (typeof at === "number") pendingSeek.current = at;
    setPhase("video");
    const video = videoRef.current;
    if (video) {
      if (pendingSeek.current !== null) {
        video.currentTime = pendingSeek.current;
        pendingSeek.current = null;
      }
      void video.play().catch(() => {});
    }
  };

  useImperativeHandle(ref, () => ({ seek: (seconds: number) => start(seconds) }));

  // A videó elem a „video” fázisban jelenik meg: első megjelenéskor indítjuk (a felhasználó kattintása után).
  useEffect(() => {
    if (phase !== "video") return;
    const video = videoRef.current;
    if (!video) return;
    if (pendingSeek.current !== null) {
      video.currentTime = pendingSeek.current;
      pendingSeek.current = null;
    }
    void video.play().catch(() => {});
  }, [phase]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const report = (seconds: number) => {
    setTime(seconds);
    onTime?.(seconds, true);
  };

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };

  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (videoRef.current) videoRef.current.playbackRate = SPEEDS[next];
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void frameRef.current?.requestFullscreen?.().catch(() => {});
  };

  const retry = () => {
    setPhase("video");
    videoRef.current?.load();
    void videoRef.current?.play().catch(() => {});
  };

  const stepIndex = activeStepIndex(tutorial, time);
  const caption = stepIndex >= 0 ? loc(tutorial.steps[stepIndex].text, captionLang) : "";
  const langName = (l: TutorialLocale) => tr(`tutorials.language.${l}`);
  const captionLabel = tr("tutorials.captionLanguages", { languages: langName(asTutorialLocale(locale)) });
  const btn = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-ghost focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-accent";

  return (
    <div
      ref={frameRef}
      className={`relative aspect-video w-full overflow-hidden bg-canvas ${fullscreen ? "" : compact ? "rounded-trevu-lg" : "rounded-trevu-2xl"} border border-line`}
      data-testid="tutorial-player"
      data-phase={phase}
    >
      {phase !== "video" && (
        <>
          <Image src={posterUrl(tutorial.slug)} alt="" fill sizes="(min-width: 1024px) 820px, 100vw" className="object-cover" priority={priority} />
        </>
      )}

      {phase === "poster" && tutorial.hasVideo && (
        <>
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-glass px-2 py-1 text-xs font-semibold text-ink">
              <Icon name="timer" size={14} aria-hidden />
              {formatTime(tutorial.duration)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-glass px-2 py-1 text-xs font-semibold text-ink">
              <Icon name="captions" size={14} aria-hidden />
              {captionLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => start()}
            aria-label={tr("tutorials.player.play", { title })}
            className={`absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-on shadow-trevu-xl hover:bg-accent-hover focus-visible:outline-solid focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent ${compact ? "h-16 w-16" : "h-[72px] w-[72px]"}`}
            data-testid="tutorial-play"
          >
            <Icon name="play" size={compact ? 26 : 30} aria-hidden className="translate-x-0.5" />
          </button>
        </>
      )}

      {phase === "poster" && !tutorial.hasVideo && (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4" role="status" data-testid="tutorial-video-soon">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-glass text-ink">
            <Icon name="circle-play" size={20} aria-hidden />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-ink">{tr("tutorials.player.soonTitle")}</span>
            <span className="text-xs text-ink-secondary">{tr("tutorials.player.soonBody")}</span>
          </span>
        </div>
      )}

      {phase === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/80 p-6 text-center" role="alert" data-testid="tutorial-video-error">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-ghost text-ink-secondary">
            <Icon name="video-off" size={26} aria-hidden />
          </span>
          <p className="text-base font-semibold text-ink">{tr("tutorials.player.errorTitle")}</p>
          <p className="text-sm text-ink-secondary">{tr("tutorials.player.errorBody")}</p>
          <button type="button" onClick={retry} className="inline-flex h-11 items-center gap-2 rounded-trevu border border-line-strong px-4 text-sm font-semibold text-ink hover:bg-ghost">
            <Icon name="rotate-ccw" size={16} aria-hidden />
            {tr("tutorials.player.retry")}
          </button>
        </div>
      )}

      {phase !== "poster" && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full bg-canvas object-contain ${phase === "error" ? "invisible" : ""}`}
          src={videoUrl(tutorial.slug)}
          poster={posterUrl(tutorial.slug)}
          preload="metadata"
          playsInline
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => report(e.currentTarget.currentTime)}
          onSeeked={(e) => report(e.currentTarget.currentTime)}
          onError={() => setPhase("error")}
          onLoadedMetadata={(e) => {
            // A VTT-sávokat rejtve tartjuk: a feliratot mi rajzoljuk (egységes doboz, nyelvváltás).
            const tracks = e.currentTarget.textTracks;
            for (let i = 0; i < tracks.length; i++) tracks[i].mode = "hidden";
          }}
          aria-label={title}
        >
          {CAPTION_LOCALES.map((l) => (
            <track key={l} kind="captions" srcLang={l} label={langName(l)} src={captionsUrl(tutorial.slug, l)} default={l === captionLang} />
          ))}
        </video>
      )}

      {phase === "video" && (
        <>
          {captionsOn && caption && (
            <div className={`pointer-events-none absolute inset-x-0 flex justify-center px-4 ${compact ? "bottom-16" : "bottom-20"}`} aria-hidden>
              <span data-surface="night" className={`max-w-[90%] rounded-trevu bg-canvas/85 px-3 py-1.5 text-center font-semibold text-ink ${compact ? "text-sm" : "text-base md:text-lg"}`} data-testid="tutorial-caption">
                {caption}
              </span>
            </div>
          )}
          <div data-surface="night" className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-canvas/90 px-2 pb-1.5 pt-2">
            <button type="button" onClick={toggle} className={btn} aria-label={playing ? tr("tutorials.player.pause") : tr("tutorials.player.resume")}>
              <Icon name={playing ? "pause" : "play"} size={20} aria-hidden />
            </button>
            <span className="shrink-0 px-1 text-xs font-semibold tabular-nums text-ink">
              {formatTime(time)} / {formatTime(tutorial.duration)}
            </span>
            <input
              type="range"
              min={0}
              max={tutorial.duration}
              step={0.5}
              value={Math.min(time, tutorial.duration)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = v;
                report(v);
              }}
              aria-label={tr("tutorials.player.progress")}
              aria-valuetext={formatTime(time)}
              className="mx-1 h-11 min-w-0 flex-1 cursor-pointer accent-(--color-primary)"
            />
            <button
              type="button"
              onClick={() => setCaptionsOn((v) => !v)}
              className={btn}
              aria-pressed={captionsOn}
              aria-label={captionsOn ? tr("tutorials.player.captionsOn") : tr("tutorials.player.captionsOff")}
            >
              <Icon name={captionsOn ? "captions" : "captions-off"} size={20} aria-hidden />
            </button>
            {!compact && (
              <button
                type="button"
                onClick={() => setCaptionLang((l) => (l === "hu" ? "en" : "hu"))}
                className="inline-flex h-11 shrink-0 items-center rounded-full px-2 text-xs font-bold text-ink hover:bg-ghost"
                aria-label={tr("tutorials.player.captionLanguage", { language: langName(captionLang) })}
              >
                {captionLang.toUpperCase()}
              </button>
            )}
            <button
              type="button"
              onClick={cycleSpeed}
              className="inline-flex h-11 shrink-0 items-center rounded-full px-2 text-xs font-bold text-ink hover:bg-ghost"
              aria-label={tr("tutorials.player.speed", { speed: `${SPEEDS[speedIndex]}×` })}
            >
              {SPEEDS[speedIndex]}×
            </button>
            <button type="button" onClick={toggleFullscreen} className={btn} aria-label={fullscreen ? tr("tutorials.player.exitFullscreen") : tr("tutorials.player.fullscreen")}>
              <Icon name={fullscreen ? "minimize" : "maximize"} size={18} aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
