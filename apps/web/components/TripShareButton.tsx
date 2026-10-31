"use client";

import { useId, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";

export function TripShareButton({ slug, title }: { slug: string; title: string }) {
  const { t } = useTranslation();
  const inputId = useId();
  const [result, setResult] = useState<"idle" | "copied" | "manual">("idle");
  const [url, setUrl] = useState("");
  const copy = async () => {
    const link = new URL(`/trips/${encodeURIComponent(slug)}`, window.location.origin).href;
    setUrl(link);
    try {
      await navigator.clipboard.writeText(link);
      setResult("copied");
    } catch {
      setResult("manual");
    }
  };
  return (
    <div className="space-y-2">
      <button type="button" onClick={copy}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-ink-secondary bg-surface border border-border rounded-xl hover:bg-surface-alt transition-colors">
        <Icon name="share-2" size={15} /> {t("trips.manage.shareLink")}
      </button>
      {result !== "idle" && <p role="status" className="text-xs text-ink-secondary">
        {t(result === "copied" ? "trips.manage.linkCopied" : "trips.manage.copyLinkManually")}
      </p>}
      {result === "manual" && <div>
        <label htmlFor={inputId} className="sr-only">{t("trips.manage.tripLink")}: {title}</label>
        <input id={inputId} readOnly value={url} onFocus={(event) => event.currentTarget.select()}
          className="w-full min-w-0 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-ink" />
      </div>}
    </div>
  );
}
