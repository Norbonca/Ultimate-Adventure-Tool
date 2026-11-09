"use client";

/**
 * ShareButton — a túra „Megosztás” gombja (FR-M02-010).
 *
 * Terv: design/D02_Trip_Management.pen#yWKG1 (Component/ShareButton/Night), #ScGu5 (1440), #TWPUa (390).
 * Érintőképernyőn, ha a böngésző ismeri a natív megosztást, közvetlenül azt nyitja; egyébként (és ha a natív
 * megosztás hibával tér vissza) a ShareSheet panelt.
 * `variant="night"`: üveg kapszula a Night hero felső sávjában (a Vissza gomb párja);
 * `variant="block"`: teljes szélességű gomb a Kezelés oldal oldalsávjában.
 */

import { useCallback, useState, useSyncExternalStore } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";
import { ShareSheet } from "@/components/share/ShareSheet";
import { tripShareUrl } from "@/lib/share/trip-share";

const noopSubscribe = () => () => {};
const hasNativeShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

export interface ShareButtonProps {
  slug: string;
  title: string;
  metaLine?: string;
  imageUrl?: string | null;
  isPublic?: boolean;
  variant?: "night" | "block";
  /** A gomb felirata; alapértelmezés: „Megosztás”. */
  label?: string;
}

const STYLE = {
  night:
    "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-glass px-3.5 text-sm font-medium text-ink backdrop-blur-sm hover:text-accent focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)",
  block:
    "flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-canvas focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)",
} as const;

export function ShareButton({ slug, title, metaLine, imageUrl, isPublic = true, variant = "night", label }: ShareButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const canNativeShare = useSyncExternalStore(noopSubscribe, hasNativeShare, () => false);
  const close = useCallback(() => setOpen(false), []);

  const nativeShare = async (): Promise<"done" | "failed"> => {
    try {
      await navigator.share({ title, text: t("trips.share.message", { title }), url: tripShareUrl(window.location.origin, slug, "native") });
      return "done";
    } catch (error) {
      // A felhasználó bezárta a rendszerlapot — nem hiba.
      return error instanceof DOMException && error.name === "AbortError" ? "done" : "failed";
    }
  };

  const onClick = async () => {
    const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    if (canNativeShare && coarse && (await nativeShare()) === "done") return;
    setOpen(true);
  };

  return (
    <>
      <button type="button" onClick={onClick} className={STYLE[variant]} aria-haspopup="dialog" data-testid="share-button">
        <Icon name="share-2" size={variant === "night" ? 16 : 15} />
        {label ?? t("trips.share.button")}
      </button>
      <ShareSheet
        open={open}
        onClose={close}
        slug={slug}
        title={title}
        metaLine={metaLine}
        imageUrl={imageUrl}
        isPublic={isPublic}
        canNativeShare={canNativeShare}
        onNativeShare={async () => {
          if ((await nativeShare()) === "done") setOpen(false);
        }}
      />
    </>
  );
}
