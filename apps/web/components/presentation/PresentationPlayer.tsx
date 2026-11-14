"use client";

/**
 * M211b — Promó bemutató lejátszó (nyilvános, /presentation).
 * Design: design/D09_Search_Discover.pen „M211b — Bemutató lejátszó” 1440 / MOBIL 390.
 * Animált diák (belépő mozgás lépcsőzve, képek becsúsznak, lassú zoom a borítón),
 * automatikus léptetés (7 mp) szünet gombbal, ←/→/szóköz/Home/End/Esc, húzás mobilon,
 * a dia száma az URL-ben (#3). Mozgáscsökkentésnél nincs animáció és nincs automatikus léptetés.
 */

import { BrandWordmark } from "@/components/brand/BrandMark";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SLIDES, SLIDE_SECONDS, type Card, type L, type Lang, type Slide } from "@/lib/presentation/content";
import s from "./presentation.module.css";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function indexFromHash(): number {
  if (typeof window === "undefined") return 0;
  const n = Number.parseInt(window.location.hash.replace("#", ""), 10);
  return Number.isFinite(n) && n >= 1 && n <= SLIDES.length ? n - 1 : 0;
}

export function PresentationPlayer() {
  const { t, locale } = useTranslation();
  const lang: Lang = locale === "en" ? "en" : "hu";
  const tx = (v: L) => v[lang];

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const touchX = useRef<number | null>(null);
  const last = SLIDES.length - 1;

  // Kezdő dia az URL-ből; mozgáscsökkentésnél nincs automatikus léptetés.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = indexFromHash();
    queueMicrotask(() => {
      setIndex(start);
      if (reduce) setPlaying(false);
    });
  }, []);

  const go = useCallback(
    (next: number) => {
      const i = Math.max(0, Math.min(last, next));
      setIndex(i);
      window.history.replaceState(null, "", `#${i + 1}`);
    },
    [last],
  );

  // Automatikus léptetés; az utolsó dián megáll.
  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      queueMicrotask(() => setPlaying(false));
      return;
    }
    const id = window.setTimeout(() => go(index + 1), SLIDE_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [playing, index, last, go]);

  // Rejtett lapon szünet.
  useEffect(() => {
    const onVis = () => document.hidden && setPlaying(false);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); setPlaying(false); go(index + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); setPlaying(false); go(index - 1); }
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === "Home") { e.preventDefault(); go(0); }
      else if (e.key === "End") { e.preventDefault(); go(last); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, last, go]);

  const slide = SLIDES[index];

  return (
    <div
      data-surface="night"
      className={`flex h-dvh flex-col bg-canvas text-ink ${playing ? "" : s.paused}`}
      data-testid="presentation"
      data-index={index}
    >
      {/* Felső sáv */}
      <header className="flex h-14 shrink-0 items-center justify-between px-4 md:h-16 md:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-accent md:text-base">
          <BrandWordmark height={16} /> <span className="font-semibold text-ink-muted">· {t("presentation.label")}</span>
        </Link>
        <div className="flex items-center gap-3 md:gap-4">
          <span className="text-sm tabular-nums text-ink-muted" data-testid="presentation-counter" aria-live="polite">
            {t("presentation.counter", { n: index + 1, total: SLIDES.length })}
          </span>
          <Link
            href="/"
            aria-label={t("presentation.close")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ghost text-ink hover:bg-surface focus-visible:shadow-(--focus-ring) focus-visible:outline-hidden"
          >
            <Icon name="x" size={20} aria-hidden />
          </Link>
        </div>
      </header>

      {/* Haladás — diánként egy szegmens */}
      <div className="flex gap-1 px-4 md:px-8" aria-hidden>
        {SLIDES.map((sl, i) => (
          <button
            key={sl.id}
            type="button"
            tabIndex={-1}
            onClick={() => { setPlaying(false); go(i); }}
            className="group relative h-3 flex-1 py-1"
          >
            <span className="block h-[3px] w-full overflow-hidden rounded-full bg-line">
              {i < index && <span className="block h-full w-full bg-accent" />}
              {i === index && (
                <span
                  key={`${index}-${playing}`}
                  className={`block h-full w-full bg-accent ${playing ? s.progressFill : ""}`}
                  style={playing ? { animationDuration: `${SLIDE_SECONDS}s` } : undefined}
                />
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Dia */}
      <main
        className="relative min-h-0 flex-1 overflow-hidden"
        onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start == null || end == null || Math.abs(end - start) < 50) return;
          setPlaying(false);
          go(index + (end < start ? 1 : -1));
        }}
      >
        <SlideView key={slide.id} slide={slide} tx={tx} t={t} />
      </main>

      {/* Vezérlők — hüvelykujj-zóna */}
      <nav className="flex h-20 shrink-0 items-center justify-center gap-4" aria-label={t("presentation.controls")}>
        <button
          type="button"
          onClick={() => { setPlaying(false); go(index - 1); }}
          disabled={index === 0}
          aria-label={t("presentation.prev")}
          data-testid="presentation-prev"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ghost text-ink hover:bg-surface disabled:opacity-40 focus-visible:shadow-(--focus-ring) focus-visible:outline-hidden"
        >
          <Icon name="chevron-left" size={22} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => (index >= last && !playing ? (go(0), setPlaying(true)) : setPlaying((p) => !p))}
          aria-label={playing ? t("presentation.pause") : t("presentation.play")}
          aria-pressed={playing}
          data-testid="presentation-toggle"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-on hover:bg-accent-hover focus-visible:shadow-(--focus-ring) focus-visible:outline-hidden"
        >
          <Icon name={playing ? "pause" : "play"} size={22} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => { setPlaying(false); go(index + 1); }}
          disabled={index === last}
          aria-label={t("presentation.next")}
          data-testid="presentation-next"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ghost text-ink hover:bg-surface disabled:opacity-40 focus-visible:shadow-(--focus-ring) focus-visible:outline-hidden"
        >
          <Icon name="chevron-right" size={22} aria-hidden />
        </button>
        <span className="hidden text-xs text-ink-muted lg:inline">{t("presentation.hint")}</span>
      </nav>
    </div>
  );
}

type TFn = ReturnType<typeof useTranslation>["t"];

function Eyebrow({ children, d = 0 }: { children: ReactNode; d?: number }) {
  return (
    <p className={`${s.rise} text-xs font-bold uppercase tracking-[0.2em] text-accent md:text-sm`} style={delay(d)}>
      {children}
    </p>
  );
}

function SlideView({ slide, tx, t }: { slide: Slide; tx: (v: L) => string; t: TFn }) {
  const surface = slide.tone === "dark" ? "night" : "day";

  if (slide.kind === "cover" || slide.kind === "closing") {
    const closing = slide.kind === "closing";
    return (
      <section data-surface="night" className={`${s.stage} absolute inset-0 overflow-hidden bg-canvas`} data-testid={`slide-${slide.id}`}>
        <div className={`${s.kenburns} absolute inset-0`}>
          <Image src={slide.image} alt="" fill priority sizes="100vw" className="object-cover opacity-50" />
        </div>
        <div className="absolute inset-0 [background:linear-gradient(90deg,var(--color-bg)_0%,color-mix(in_srgb,var(--color-bg)_85%,transparent)_50%,color-mix(in_srgb,var(--color-bg)_25%,transparent)_100%)]" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end gap-5 px-6 pb-12 md:justify-center md:gap-7 md:px-16 md:pb-0">
          <Eyebrow>{tx(slide.eyebrow)}</Eyebrow>
          <h1 className={`${s.rise} max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight md:text-7xl`} style={delay(120)}>
            {tx(slide.title)}
          </h1>
          <p className={`${s.rise} max-w-2xl text-lg text-ink-secondary md:text-2xl`} style={delay(260)}>
            {tx(slide.lead)}
          </p>
          {closing ? (
            <div className={`${s.rise} flex flex-wrap gap-3`} style={delay(420)}>
              <Link
                href="/register"
                className={`${s.glow} inline-flex h-12 items-center gap-2 rounded-trevu bg-accent px-6 text-base font-bold text-accent-on hover:bg-accent-hover md:h-14 md:text-lg`}
                data-testid="presentation-register"
              >
                {t("presentation.register")}
                <Icon name="arrow-right" size={20} aria-hidden />
              </Link>
              <Link href="/" className="inline-flex h-12 items-center rounded-trevu bg-ghost px-6 text-base font-semibold text-ink hover:bg-surface md:h-14 md:text-lg">
                {t("presentation.discover")}
              </Link>
            </div>
          ) : (
            <p className={`${s.rise} text-base text-ink-muted md:text-lg`} style={delay(420)}>www.ttvk.hu</p>
          )}
        </div>
      </section>
    );
  }

  if (slide.kind === "cards") {
    const cols = slide.columns === 5 ? "md:grid-cols-5" : slide.columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
    return (
      <section data-surface={surface} className={`${s.stage} absolute inset-0 overflow-y-auto bg-canvas text-ink`} data-testid={`slide-${slide.id}`}>
        <div className="mx-auto flex min-h-full max-w-7xl flex-col justify-center gap-6 px-5 py-8 md:gap-10 md:px-16">
          <div className="flex flex-col gap-3">
            <Eyebrow>{tx(slide.eyebrow)}</Eyebrow>
            <h2 className={`${s.rise} max-w-5xl text-3xl font-extrabold leading-tight md:text-5xl`} style={delay(100)}>
              {tx(slide.title)}
            </h2>
          </div>
          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-5 ${cols}`}>
            {slide.cards.map((c, i) => (
              <CardView key={i} card={c} tx={tx} d={220 + i * 90} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (slide.kind === "phones") {
    return (
      <section data-surface={surface} className={`${s.stage} absolute inset-0 overflow-y-auto bg-canvas text-ink`} data-testid={`slide-${slide.id}`}>
        <div className="mx-auto grid min-h-full max-w-7xl items-center gap-8 px-5 py-8 md:grid-cols-[5fr_7fr] md:gap-14 md:px-16">
          <TextBlock slide={slide} tx={tx} />
          <div className="flex items-center justify-center gap-3 md:gap-8">
            {slide.phones.map((p, i) => (
              <div key={p.src} className="contents">
                {slide.caption && i === 1 && (
                  <p className={`${s.pop} max-w-[180px] rounded-2xl border border-line bg-surface px-4 py-3 text-center text-sm font-bold text-ink md:text-lg`} style={delay(520)}>
                    <Icon name="wifi-off" size={28} aria-hidden className="mx-auto mb-2 block text-accent" />
                    {tx(slide.caption)}
                  </p>
                )}
                <div className={`${s.phone} w-[30%] max-w-[230px]`} style={delay(300 + i * 160)}>
                  <div className={s.drift} style={{ animationDelay: `${i * 0.8}s` }}>
                    <Image src={p.src} alt={tx(p.alt)} width={600} height={1298} sizes="(min-width: 768px) 230px, 30vw" className="h-auto w-full rounded-[22px] border border-line shadow-2xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (slide.kind !== "split") return null;

  return (
    <section data-surface={surface} className={`${s.stage} absolute inset-0 overflow-y-auto bg-canvas text-ink`} data-testid={`slide-${slide.id}`}>
      <div className="mx-auto grid min-h-full max-w-7xl items-center gap-6 px-5 py-8 md:grid-cols-[5fr_7fr] md:gap-14 md:px-16">
        <TextBlock slide={slide} tx={tx} />
        <div className="relative">
          <div className={`${s.shot} overflow-hidden rounded-2xl border border-line shadow-2xl`}>
            <Image src={slide.image} alt={tx(slide.title)} width={1600} height={1000} sizes="(min-width: 768px) 60vw, 100vw" className="h-auto w-full" />
          </div>
          {slide.phone && (
            <div className={`${s.phone} absolute -bottom-6 right-2 hidden w-[24%] md:block`}>
              <Image src={slide.phone} alt="" width={600} height={1298} sizes="15vw" className="h-auto w-full rounded-[18px] border border-line shadow-2xl" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TextBlock({ slide, tx }: { slide: Extract<Slide, { kind: "split" | "phones" }>; tx: (v: L) => string }) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {slide.badge && (
        <p className={`${s.pop} self-start rounded-full bg-(--color-primary-subtle) px-4 py-1.5 text-sm font-bold text-accent md:text-base`} style={delay(0)}>
          {tx(slide.badge)}
        </p>
      )}
      {!slide.badge && <Eyebrow d={60}>{tx(slide.eyebrow)}</Eyebrow>}
      <h2 className={`${s.rise} text-3xl font-extrabold leading-tight md:text-5xl`} style={delay(140)}>
        {tx(slide.title)}
      </h2>
      <p className={`${s.rise} text-base leading-relaxed text-ink-body md:text-xl`} style={delay(240)}>
        {tx(slide.lead)}
      </p>
      <ul className="flex flex-col gap-2.5">
        {slide.bullets.map((b, i) => (
          <li key={i} className={`${s.rise} flex items-start gap-3 text-base text-ink-body md:text-lg`} style={delay(360 + i * 110)}>
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--color-primary-subtle) text-accent">
              <Icon name="check" size={14} aria-hidden />
            </span>
            {tx(b)}
          </li>
        ))}
      </ul>
      {slide.kind === "split" && slide.roles && (
        <div className={`${s.rise} rounded-2xl border border-line bg-surface p-4 md:p-5`} style={delay(360 + slide.bullets.length * 110)} data-testid="presentation-roles">
          <p className="mb-2 text-sm font-bold text-accent md:text-base">{tx({ hu: "Szerepek túratípusonként", en: "Roles by trip type" })}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm md:text-base">
            {slide.roles.map((r, i) => (
              <div key={i} className="contents">
                <dt className="font-bold text-ink">{tx(r.type)}</dt>
                <dd className="text-ink-body">{tx(r.roles)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function CardView({ card, tx, d }: { card: Card; tx: (v: L) => string; d: number }) {
  return (
    <div className={`${s.pop} flex gap-4 rounded-2xl border border-line bg-surface ${card.img && !card.n ? "p-3 md:p-4" : "p-5 md:p-7"} ${card.icon || (card.img && !card.n) ? "flex-row items-center" : "flex-col"}`} style={delay(d)}>
      {card.img && (
        <Image src={card.img} alt="" width={1600} height={1000} sizes="(min-width: 768px) 240px, 40vw" className={`h-auto shrink-0 rounded-xl border border-line ${card.n ? "w-full" : "w-[40%] max-w-[176px]"}`} />
      )}
      {card.n && <p className="text-4xl font-extrabold text-accent md:text-5xl">{card.n}</p>}
      {card.icon && (
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-(--color-primary-subtle) text-accent">
          <Icon name={card.icon} size={26} aria-hidden />
        </span>
      )}
      <div className="flex flex-col gap-2">
        <h3 className={`font-bold ${card.img && !card.n ? "text-base md:text-xl" : "text-lg md:text-2xl"}`}>{tx(card.title)}</h3>
        <p className={`text-sm leading-relaxed text-ink-body ${card.img && !card.n ? "md:text-base" : "md:text-lg"}`}>{tx(card.text)}</p>
      </div>
    </div>
  );
}
