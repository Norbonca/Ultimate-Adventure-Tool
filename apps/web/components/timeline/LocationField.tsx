"use client";

/**
 * LocationField — M121 L3 helyszín mező a Menetrendhez (mérföldkő és feladat).
 * Terv: D02 `NO5UX` (kiválasztott hely), `CDW0l` (üres / találatok / nincs találat / feladat kinyitva), 390: `zNUB9`.
 * A keresés csak gombra vagy Enterre indul (Nominatim-szabályzat, M121 spec §4.4), a túra országára szűkítve.
 * Találat nélkül is menthető a név — ekkor nincs koordináta és térképlink.
 */

import { useId, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";
import type { PlaceCandidate } from "@/lib/geocoding";
import { searchTimelinePlaces } from "@/app/(app)/trips/timeline-location-actions";
import { mapsDirectionsUrl } from "@/lib/timeline/format";

export interface LocationDraft {
  name: string;
  notes: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  /** Új keresési találat (mentéskor ez kerül a locations sorba); meglévő helynél null. */
  place: PlaceCandidate | null;
}

type SearchState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "results"; results: PlaceCandidate[] }
  | { kind: "none" }
  | { kind: "unavailable" }
  | { kind: "too_short" };

export const TIMELINE_INPUT =
  "h-11 w-full rounded-[10px] border border-line bg-[var(--color-input-bg)] px-3 text-base text-ink placeholder:text-ink-muted outline-none focus:border-accent focus:shadow-[var(--focus-ring)] disabled:opacity-50";

export function LocationField({
  tripId,
  value,
  onChange,
  readOnly = false,
  showNotes = true,
  label,
}: {
  tripId: string;
  value: LocationDraft | null;
  onChange: (next: LocationDraft | null) => void;
  readOnly?: boolean;
  showNotes?: boolean;
  label: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "idle" });

  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 3) {
      setSearch({ kind: "too_short" });
      return;
    }
    setSearch({ kind: "busy" });
    const res = await searchTimelinePlaces(tripId, q).catch(() => ({ results: [] as PlaceCandidate[], error: "unavailable" as const }));
    if (res.error === "too_short") setSearch({ kind: "too_short" });
    else if (res.error) setSearch({ kind: "unavailable" });
    else setSearch(res.results.length ? { kind: "results", results: res.results } : { kind: "none" });
  };

  const choose = (draft: LocationDraft) => {
    onChange(draft);
    setEditing(false);
    setSearch({ kind: "idle" });
  };

  const keepName = () => {
    const name = query.trim();
    if (!name) return;
    choose({ name, notes: value?.notes ?? "", address: null, lat: null, lng: null, place: null });
  };

  const mapUrl = value ? mapsDirectionsUrl(value.lat, value.lng) : null;

  if (readOnly) {
    if (!value) return null;
    return (
      <div className="space-y-1">
        <p className="text-[13px] font-semibold text-ink-secondary">{label}</p>
        <div className="flex gap-2.5 text-ink">
          <Icon name="map-pin" size={18} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="font-semibold">{value.name}</p>
            {value.address && <p className="text-[13px] text-ink-muted">{value.address}</p>}
            {value.notes && <p className="text-[13px] text-ink-secondary">{value.notes}</p>}
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
                <Icon name="external-link" size={14} /> {t("timeline.locationOpenMap")}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const linkBtn =
    "inline-flex min-h-11 sm:min-h-0 items-center justify-center gap-1.5 rounded-[10px] border border-line sm:border-0 text-[13px] font-medium";

  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-q`} className="block text-[13px] font-semibold text-ink-secondary">
        {label}
      </label>

      {value && !editing ? (
        <div className="space-y-2.5 rounded-[10px] border border-line bg-ghost p-3.5">
          <div className="flex gap-2.5">
            <Icon name="map-pin" size={18} className="mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="break-words font-semibold text-ink">{value.name}</p>
              <p className="break-words text-[13px] text-ink-muted">
                {[value.address, value.lat != null ? t("timeline.locationHasCoords") : t("timeline.locationNoCoords")]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-4 sm:pl-7">
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={`${linkBtn} text-accent hover:underline`}>
                <Icon name="external-link" size={14} /> {t("timeline.locationOpenMap")}
              </a>
            )}
            <button
              type="button"
              id={`${id}-q`}
              onClick={() => {
                setQuery(value.name);
                setEditing(true);
              }}
              className={`${linkBtn} text-ink-secondary hover:text-ink`}
            >
              <Icon name="search" size={14} /> {t("timeline.locationChange")}
            </button>
            <button type="button" onClick={() => onChange(null)} className={`${linkBtn} text-[var(--color-danger)] hover:underline`}>
              <Icon name="trash-2" size={14} /> {t("timeline.locationRemove")}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                id={`${id}-q`}
                type="text"
                value={query}
                maxLength={200}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder={t("timeline.locationSearchPlaceholder")}
                className={`${TIMELINE_INPUT} pl-9`}
              />
            </div>
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={search.kind === "busy"}
              className="h-11 shrink-0 rounded-[10px] border border-line-strong px-3.5 text-sm font-medium text-ink hover:bg-ghost disabled:opacity-60"
            >
              {search.kind === "busy" ? t("timeline.locationSearching") : t("timeline.locationSearch")}
            </button>
          </div>

          <div aria-live="polite" className="space-y-2">
            {search.kind === "idle" && <p className="text-[13px] text-ink-muted">{t("timeline.locationHelp")}</p>}
            {search.kind === "too_short" && <p className="text-[13px] text-ink-muted">{t("timeline.locationTooShort")}</p>}
            {(search.kind === "none" || search.kind === "unavailable") && (
              <p className="flex gap-2 rounded-[10px] border border-line bg-ghost p-3 text-[13px] text-ink-secondary">
                <Icon name="info" size={16} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
                {search.kind === "none" ? t("timeline.locationNoResults") : t("timeline.locationUnavailable")}
              </p>
            )}
            {search.kind === "results" && (
              <ul aria-label={t("timeline.locationResults")} className="overflow-hidden rounded-[10px] border border-line">
                {search.results.map((r) => (
                  <li key={r.placeId} className="border-t border-line first:border-t-0">
                    <button
                      type="button"
                      onClick={() => choose({ name: r.name, notes: value?.notes ?? "", address: r.address, lat: r.lat, lng: r.lng, place: r })}
                      className="flex min-h-11 w-full items-start gap-2.5 p-3 text-left outline-none hover:bg-[var(--color-primary-subtle)] focus-visible:bg-[var(--color-primary-subtle)]"
                    >
                      <Icon name="map-pin" size={16} className="mt-0.5 shrink-0 text-ink-muted" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{r.name}</span>
                        {r.address && <span className="block break-words text-xs text-ink-muted">{r.address}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query.trim().length > 0 && (search.kind === "results" || search.kind === "none" || search.kind === "unavailable") && (
              <button type="button" onClick={keepName} className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-accent hover:underline sm:min-h-0">
                <Icon name="check" size={14} /> {t("timeline.locationKeepName").replace("{name}", query.trim())}
              </button>
            )}
            {search.kind === "results" && <p className="text-xs text-ink-muted">{t("timeline.locationAttribution")}</p>}
            {editing && value && (
              <button type="button" onClick={() => setEditing(false)} className="min-h-11 text-[13px] text-ink-secondary hover:text-ink sm:min-h-0">
                {t("common.cancel")}
              </button>
            )}
          </div>
        </div>
      )}

      {showNotes && value && (
        <div className="relative">
          <Icon name="message-square" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={value.notes}
            maxLength={500}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
            aria-label={t("timeline.locationNotes")}
            placeholder={t("timeline.locationNotesPlaceholder")}
            className={`${TIMELINE_INPUT} pl-9`}
          />
        </div>
      )}
    </div>
  );
}

/** Mentendő-e a hely: más név/jegyzet, új találat, vagy törlés. */
export function locationChanged(before: LocationDraft | null, after: LocationDraft | null): boolean {
  if (!before && !after) return false;
  if (!before || !after) return true;
  return before.name !== after.name || before.notes !== after.notes || after.place !== null;
}
