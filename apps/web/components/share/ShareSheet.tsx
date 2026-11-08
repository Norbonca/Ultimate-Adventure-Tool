"use client";

/**
 * ShareSheet — a túra megosztási panelje (FR-M02-010).
 *
 * Terv: design/D02_Trip_Management.pen#bXK2G (Component/ShareSheet), #izSsy (1440, párbeszédablak),
 * #UZkVp (390, alsó lap), #UOa7M (állapotok: Link másolva · Másolás nem sikerült).
 * Asztalon középre igazított párbeszédablak, mobilon alsó lap. Esc, a háttér és a bezárás gomb zárja;
 * nyitáskor a fókusz a panelbe kerül, a Tab a panelen belül marad, záráskor visszakerül a hívó gombra.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";
import { CoverImage } from "@/components/ui/CoverImage";
import { BrandIcon, type BrandIconName } from "@/lib/brand-icons";
import { SHARE_PLATFORMS, platformShareHref, tripCanonicalUrl, tripShareUrl, type SharePlatform } from "@/lib/share/trip-share";

const BRAND: Record<Exclude<SharePlatform, "email">, BrandIconName> = {
  facebook: "brand.facebook",
  whatsapp: "brand.whatsapp",
  x: "brand.x",
  telegram: "brand.telegram",
};

export interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  title: string;
  /** Előnézet második sora, pl. „2027. jún. 5–12. · Split, Horvátország”. */
  metaLine?: string;
  imageUrl?: string | null;
  isPublic: boolean;
  /** Látszik-e a „Továbbiak” (a böngésző ismeri a natív megosztást). */
  canNativeShare: boolean;
  onNativeShare: () => void;
}

type CopyState = "idle" | "copied" | "failed";

const TARGET =
  "flex w-24 shrink-0 flex-col items-center gap-2 rounded-trevu py-1 text-center text-xs md:w-[76px] font-medium text-ink-body hover:text-ink focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]";
const CIRCLE = "flex h-[52px] w-[52px] items-center justify-center rounded-full border border-line bg-ghost text-ink";

export function ShareSheet({ open, onClose, slug, title, metaLine, imageUrl, isPublic, canNativeShare, onNativeShare }: ShareSheetProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const inputId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copy, setCopy] = useState<CopyState>("idle");

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (copy !== "copied") return;
    const id = window.setTimeout(() => setCopy("idle"), 2500);
    return () => window.clearTimeout(id);
  }, [copy]);

  if (!open) return null;

  const origin = window.location.origin;
  const canonical = tripCanonicalUrl(origin, slug);
  const message = t("trips.share.message", { title });
  const subject = t("trips.share.emailSubject", { title });

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(tripShareUrl(origin, slug, "copy"));
      setCopy("copied");
    } catch {
      setCopy("failed");
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  // Tab a panelen belül marad
  const trapTab = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input"));
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

  return (
    <div
      data-surface="night"
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim md:items-center md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        data-testid="share-sheet"
        className="flex max-h-[92dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-[20px] border-t border-line bg-surface px-4 pb-7 pt-2.5 text-ink shadow-trevu-xl focus:outline-none md:max-w-[480px] md:gap-5 md:rounded-trevu-2xl md:border md:p-6"
      >
        <div className="flex justify-center md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-line-strong" />
        </div>
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-bold text-ink">
            {t("trips.share.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("trips.share.close")}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-trevu text-ink-secondary hover:bg-ghost focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Linkelőnézet — ahogy a közösségi felületen megjelenik */}
        <div className="flex items-center overflow-hidden rounded-trevu border border-line bg-canvas">
          {imageUrl ? (
            <div className="relative h-20 w-[152px] shrink-0">
              <CoverImage src={imageUrl} sizes="152px" />
            </div>
          ) : (
            <div aria-hidden className="h-20 w-[152px] shrink-0 [background:radial-gradient(80%_100%_at_0%_0%,rgba(45,212,191,.18),transparent_70%)]" />
          )}
          <div className="min-w-0 flex-1 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{new URL(origin).host}</p>
            <p className="line-clamp-2 text-sm font-semibold text-ink">{title}</p>
            {metaLine && <p className="truncate text-xs text-ink-secondary">{metaLine}</p>}
          </div>
        </div>

        {/* Platformok */}
        {/* Mobilon 3 oszlopos rács, a 6. csempe a linkmásolás (terv: #UZkVp); asztalon egy sor (#bXK2G) */}
        <div className="grid grid-cols-3 justify-items-center gap-y-3 md:flex md:justify-between">
          {SHARE_PLATFORMS.map((p, i) => {
            const label = t(`trips.share.platform.${p}` as Parameters<typeof t>[0]);
            const href = platformShareHref(p, tripShareUrl(origin, slug, p), message, subject);
            return (
              <a
                key={p}
                href={href}
                {...(p === "email" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                aria-label={t("trips.share.openIn", { platform: label })}
                data-share-target={p}
                data-autofocus={i === 0 ? "" : undefined}
                className={TARGET}
              >
                <span className={CIRCLE}>
                  {p === "email" ? <Icon name="mail" size={22} /> : <BrandIcon name={BRAND[p]} size={22} />}
                </span>
                <span aria-hidden>{label}</span>
              </a>
            );
          })}
          <button type="button" onClick={doCopy} className={`${TARGET} md:hidden`} data-share-target="copy-tile">
            <span className={CIRCLE}>
              <Icon name={copy === "copied" ? "check" : "copy"} size={22} />
            </span>
            {copy === "copied" ? t("trips.share.copied") : t("trips.share.copy")}
          </button>
          {canNativeShare && (
            <button type="button" onClick={onNativeShare} className={TARGET} data-share-target="native">
              <span className={CIRCLE}>
                <Icon name="more-horizontal" size={22} />
              </span>
              {t("trips.share.more")}
            </button>
          )}
        </div>

        {/* Link mezője + másolás */}
        <div className={`items-center gap-2 ${copy === "failed" ? "flex" : "hidden md:flex"}`}>
          <label htmlFor={inputId} className="sr-only">
            {t("trips.share.linkLabel")}
          </label>
          <input
            id={inputId}
            ref={inputRef}
            readOnly
            value={canonical}
            onFocus={(event) => event.currentTarget.select()}
            className={`h-12 min-w-0 flex-1 rounded-trevu border bg-[var(--color-input-bg)] px-3.5 text-sm text-ink-body focus:outline-none focus-visible:shadow-[var(--focus-ring)] ${copy === "failed" ? "border-2 border-accent" : "border-line"}`}
          />
          <button
            type="button"
            onClick={doCopy}
            data-testid="share-copy"
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-trevu bg-accent px-4 text-sm font-semibold text-accent-on hover:bg-accent-hover focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Icon name={copy === "copied" ? "check" : "copy"} size={18} />
            {copy === "copied" ? t("trips.share.copied") : t("trips.share.copy")}
          </button>
        </div>

        <p
          role="status"
          className={`text-xs ${copy === "copied" ? "text-[var(--color-success)]" : copy === "failed" ? "text-[var(--color-warning)]" : "text-ink-muted"}`}
        >
          {copy === "copied"
            ? t("trips.share.copiedStatus")
            : copy === "failed"
              ? t("trips.share.copyFailed")
              : isPublic
                ? t("trips.share.hint")
                : t("trips.share.notPublicHint")}
        </p>
      </div>
    </div>
  );
}
