"use client";

/**
 * M211 — „Hogyan működik?” a funkcióban: link vagy súgó-ikon + súgóablak, oldalelhagyás nélkül.
 * Design: D21 `qCg43` HelpLink, `ggGyk` HelpIconButton, `mblRQ` súgóablak (asztal),
 * `Y9gr7` alsó lap (mobil), `e9ero8` választó (több útmutató egy részhez).
 *
 * Szabályok (spec K-2…K-5): a link csak akkor jelenik meg, ha van útmutató a horgonyhoz;
 * nincs automatikus lejátszás; a fókusz az ablakban marad, Esc / X / háttér zár, és a fókusz
 * visszakerül a linkre; a teljes útmutató új lapon nyílik. Csak bejelentkezve jelenik meg.
 */

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { asTutorialLocale, formatTime, loc, posterUrl, tutorialHref, tutorialsForAnchor, type Tutorial } from "@/lib/tutorials";
import { TutorialViewer } from "./TutorialViewer";
import { useIsLoggedIn } from "@/lib/auth/useIsLoggedIn";

interface TutorialHelpProps {
  /** Funkció-horgony, pl. `expenses`, `trip.applications` (lib/tutorials/content.ts). */
  anchor: string;
  className?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, video[controls], [tabindex]:not([tabindex="-1"])';

export function TutorialHelp({ anchor, className = "" }: TutorialHelpProps) {
  const { t, locale } = useTranslation();
  const tutorials = tutorialsForAnchor(anchor);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Az útmutatók csak belépett felhasználónak szólnak (Norbert 2026-11-02): kijelentkezve nincs súgó.
  const loggedIn = useIsLoggedIn();

  if (!loggedIn || tutorials.length === 0) return null;
  const single = tutorials.length === 1 ? tutorials[0] : null;
  const label = single ? t("tutorials.helpFor", { title: loc(single.title, locale) }) : t("tutorials.helpIcon");

  return (
    <>
      {/* Egyetlen megjelenés mindenhol (D21 `qCg43` HelpLink, 2026-11-02): kompakt „Hogyan működik?”
          a cím mellett; a látható pirula 36 px, az érintési felület 44 px. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        className={`relative inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-ghost px-3 text-sm font-semibold text-ink transition-colors after:absolute after:-inset-1 after:content-[''] hover:border-accent hover:text-accent focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-accent ${className}`}
        data-testid={`help-${anchor}`}
      >
        <Icon name="circle-play" size={16} aria-hidden className="text-accent" />
        {t("tutorials.help")}
      </button>
      {open && (
        <HelpDialog
          tutorials={tutorials}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

function HelpDialog({ tutorials, onClose }: { tutorials: Tutorial[]; onClose: () => void }) {
  const { t, locale } = useTranslation();
  const tr = t as (key: string, params?: Record<string, string | number>) => string;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Tutorial | null>(tutorials.length === 1 ? tutorials[0] : null);
  const chooser = tutorials.length > 1;

  // Fókusz be, Esc zár, Tab körbe a panelen belül, a háttér nem görget.
  useEffect(() => {
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.fullscreenElement) return; // a teljes képernyőt a böngésző zárja előbb
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Nézetváltáskor (választó ↔ útmutató) a fókusz a panel elejére kerül.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [selected]);

  const topic = selected ? loc(selected.topic, locale) : loc(tutorials[0].topic, locale);
  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label={t("tutorials.close")}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ghost text-ink hover:bg-ghost-strong focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-accent"
      data-testid="help-close"
      data-autofocus
    >
      <Icon name="x" size={20} aria-hidden />
    </button>
  );

  return createPortal(
    <div
      data-surface="night"
      className="fixed inset-0 z-60 flex items-end justify-center bg-scrim sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-t-trevu-3xl border border-line-strong bg-surface text-ink shadow-trevu-xl sm:rounded-trevu-3xl ${selected ? "sm:max-w-[864px]" : "sm:max-w-[640px]"}`}
        data-testid="help-dialog"
      >
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-(--color-border-strong)" />
        </div>

        {selected ? (
          <>
            <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-3 sm:px-6 sm:pt-6">
              <div className="flex min-w-0 flex-col gap-1">
                {chooser && (
                  <button type="button" onClick={() => setSelected(null)} className="mb-1 inline-flex items-center gap-1 self-start text-sm font-semibold text-accent hover:underline">
                    <Icon name="chevron-left" size={16} aria-hidden />
                    {t("tutorials.backToList")}
                  </button>
                )}
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent">{t("tutorials.helpEyebrow", { topic })}</p>
                <h2 id={titleId} className="text-[19px] font-bold leading-tight text-ink sm:text-[22px]">
                  {loc(selected.title, locale)}
                </h2>
                <p className="text-xs font-medium text-ink-muted sm:text-[13px]">
                  {selected.hasVideo
                    ? `${formatTime(selected.duration)} · ${t("tutorials.captionLanguages", { languages: tr(`tutorials.language.${asTutorialLocale(locale)}`) })}`
                    : `${t("tutorials.slidesLabel")} · ${t("tutorials.stepsCount", { count: selected.steps.length })}`}
                </p>
              </div>
              {closeButton}
            </div>
            <div className="px-4 pb-4 sm:px-6">
              <TutorialViewer tutorial={selected} variant="dialog" />
            </div>
            <div className="sticky bottom-0 mt-auto flex flex-col-reverse gap-2 border-t border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
              <a
                href={tutorialHref(selected.slug)}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                data-testid="help-open-full"
              >
                {t("tutorials.openFull")}
                <Icon name="external-link" size={15} aria-hidden />
                <span className="sr-only">{t("tutorials.newTab")}</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 items-center justify-center rounded-trevu bg-accent px-5 text-[15px] font-semibold text-accent-on hover:bg-accent-hover"
                data-testid="help-got-it"
              >
                {t("tutorials.gotIt")}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4 px-4 pb-5 pt-3 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent">{t("tutorials.helpEyebrow", { topic })}</p>
                <h2 id={titleId} className="text-[22px] font-bold leading-tight text-ink">
                  {t("tutorials.chooserTitle")}
                </h2>
                <p className="text-[13px] font-medium text-ink-muted">{t("tutorials.chooserSub", { count: tutorials.length })}</p>
              </div>
              {closeButton}
            </div>
            <ul className="flex flex-col gap-3" data-testid="help-chooser">
              {tutorials.map((tut) => (
                <li key={tut.slug}>
                  <button
                    type="button"
                    onClick={() => setSelected(tut)}
                    className="flex w-full items-center gap-4 rounded-trevu-xl border border-line p-3 text-left hover:bg-ghost focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span className="relative flex h-[68px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-trevu sm:h-[90px] sm:w-[160px]">
                      <Image src={posterUrl(tut.slug)} alt="" fill sizes="160px" className="object-cover" />
                      <span aria-hidden className="absolute inset-0 bg-scrim" />
                      <span aria-hidden className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-on">
                        <Icon name="play" size={14} />
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-base font-semibold text-ink">{loc(tut.title, locale)}</span>
                      <span className="line-clamp-2 text-sm text-ink-secondary">{loc(tut.summary, locale)}</span>
                      <span className="text-xs font-semibold text-ink-muted">
                        {tut.hasVideo ? `${formatTime(tut.duration)} · ${t("tutorials.withCaptions")}` : `${t("tutorials.slidesLabel")} · ${t("tutorials.stepsCount", { count: tut.steps.length })}`}
                      </span>
                    </span>
                    <Icon name="chevron-right" size={20} aria-hidden className="shrink-0 text-ink-muted" />
                  </button>
                </li>
              ))}
            </ul>
            <a href="/tutorials" target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-accent hover:underline">
              {t("tutorials.openAll")}
              <Icon name="external-link" size={15} aria-hidden />
              <span className="sr-only">{t("tutorials.newTab")}</span>
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
