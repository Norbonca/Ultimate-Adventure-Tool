"use client";

/**
 * Wizard Step 2 — Basic Information — design/D02_Trip_Management.pen#sGfJS
 */

import { useEffect, useState } from "react";
import type { WizardFormData, SubDisciplineRow } from "../../types";
import { DIFFICULTY_LEVELS } from "@/lib/categories";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Input } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { previewGeocode } from "../../actions";

interface Step2Props {
  formData: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  countries: { code: string; name_hu: string; name_en: string; flag_emoji: string }[];
  subDisciplines: SubDisciplineRow[];
  onSubDisciplineChange: (subId: string) => void;
}

const SELECT_CLASSES =
  "min-h-[48px] w-full border border-line-strong bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-accent";

function RequiredMark() {
  return <span className="text-coral">*</span>;
}

export function Step2Basics({
  formData,
  onChange,
  countries,
  subDisciplines,
  onSubDisciplineChange,
}: Step2Props) {
  const { t, locale } = useTranslation();

  // Geocoding preview: shows the organizer where the trip will land on the
  // globe. The authoritative geocoding happens server-side on save; this is the
  // same lookup, so they are not surprised afterwards.
  //
  // Nominatim's usage policy forbids autocomplete-style querying, so the
  // lookup runs for a *committed* location only — when the country changes or
  // the region/city field loses focus — never while the organizer is typing.
  // Results are keyed by location and the displayed state is derived during
  // render, so a stale answer can never overwrite a newer one.
  type GeocodePreview = { lat: number; lng: number; displayName: string } | null;
  const [resolved, setResolved] = useState<Record<string, GeocodePreview>>({});

  const country = formData.location_country;
  const region = formData.location_region || "";
  const city = formData.location_city || "";
  const locationKey = `${country}|${region}|${city}`;

  const [committed, setCommitted] = useState({ country, region, city });
  const committedKey = `${committed.country}|${committed.region}|${committed.city}`;
  const commitLocation = (next: Partial<typeof committed> = {}) =>
    setCommitted({ country, region, city, ...next });

  useEffect(() => {
    if (!committed.country || committedKey in resolved) return;
    let cancelled = false;
    (async () => {
      let result: GeocodePreview = null;
      try {
        result = await previewGeocode({
          country: committed.country,
          region: committed.region || null,
          city: committed.city || null,
        });
      } catch {
        result = null;
      }
      if (!cancelled) setResolved((previous) => ({ ...previous, [committedKey]: result }));
    })();
    return () => {
      cancelled = true;
    };
    // `resolved` is read only to skip repeat lookups; it must not re-trigger one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedKey]);

  const geocode:
    | { state: "idle" }
    | { state: "pending" }
    | { state: "loading" }
    | { state: "found"; lat: number; lng: number; displayName: string }
    | { state: "missing" } = !country
    ? { state: "idle" }
    : locationKey !== committedKey
      ? { state: "pending" }
      : !(locationKey in resolved)
        ? { state: "loading" }
        : resolved[locationKey]
          ? { state: "found", ...(resolved[locationKey] as NonNullable<GeocodePreview>) }
          : { state: "missing" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-display text-4xl font-extrabold leading-none text-ink">{t('trips.wizard.step2Title')}</h2>
        <p className="text-ink-muted">{t('trips.wizard.step2Description')}</p>
      </div>

      {/* Sub-discipline selector (if available) */}
      {subDisciplines.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sub-discipline" className="text-sm font-semibold text-ink">
            {t('trips.fields.subcategory')}
          </label>
          <select
            id="sub-discipline"
            value={formData.sub_discipline_id}
            onChange={(e) => onSubDisciplineChange(e.target.value)}
            className={SELECT_CLASSES}
          >
            <option value="">{t('trips.wizard.selectSubcategory')}</option>
            {subDisciplines.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {locale === 'en'
                  ? (sub.name_localized as Record<string, string>)?.en || sub.name
                  : (sub.name_localized as Record<string, string>)?.hu || sub.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <Input
        id="trip-title"
        label={<>{t('trips.fields.title')} <RequiredMark /></>}
        type="text"
        value={formData.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder={t('trips.wizard.titlePlaceholder')}
        maxLength={200}
        hint={t('trips.wizard.charCount').replace('{count}', String(formData.title.length))}
      />

      {/* Short description */}
      <Input
        id="trip-short-description"
        label={t('trips.fields.shortDescription')}
        type="text"
        value={formData.short_description}
        onChange={(e) => onChange({ short_description: e.target.value })}
        placeholder={t('trips.wizard.shortDescPlaceholder')}
        maxLength={280}
      />

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="trip-description" className="text-sm font-semibold text-ink">
          {t('trips.fields.detailedDescription')} <RequiredMark />
        </label>
        <textarea
          id="trip-description"
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t('trips.wizard.descPlaceholder')}
          rows={5}
          className="w-full resize-none border border-line-strong bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="trip-start-date"
          label={<>{t('trips.fields.startDate')} <RequiredMark /></>}
          type="date"
          value={formData.start_date}
          onChange={(e) => onChange({ start_date: e.target.value })}
          min={new Date().toISOString().split("T")[0]}
        />
        <Input
          id="trip-end-date"
          label={<>{t('trips.fields.endDate')} <RequiredMark /></>}
          type="date"
          value={formData.end_date}
          onChange={(e) => onChange({ end_date: e.target.value })}
          min={formData.start_date || new Date().toISOString().split("T")[0]}
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trip-country" className="text-sm font-semibold text-ink">
            {t('trips.fields.country')}
          </label>
          <select
            id="trip-country"
            value={formData.location_country}
            onChange={(e) => {
              onChange({ location_country: e.target.value });
              commitLocation({ country: e.target.value });
            }}
            className={SELECT_CLASSES}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag_emoji} {locale === 'en' ? c.name_en : c.name_hu}
              </option>
            ))}
          </select>
        </div>
        <Input
          id="trip-region"
          label={t('trips.wizard.regionLabel')}
          type="text"
          value={formData.location_region}
          onChange={(e) => onChange({ location_region: e.target.value })}
          onBlur={() => commitLocation()}
          placeholder={t('trips.wizard.regionPlaceholder')}
        />
        <Input
          id="trip-city"
          label={t('trips.fields.city')}
          type="text"
          value={formData.location_city}
          onChange={(e) => onChange({ location_city: e.target.value })}
          onBlur={() => commitLocation()}
          placeholder={t('trips.wizard.cityPlaceholder')}
        />
      </div>

      {/* Where this trip will appear on the globe */}
      <div
        className="flex items-start gap-2 border-l-4 border-accent bg-[var(--color-primary-subtle)] p-4 text-sm text-ink-muted"
        data-testid="geocode-status"
        aria-live="polite"
      >
        <Icon name="globe" size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
        {geocode.state === "loading" && <span>{t('trips.wizard.geocodeLoading')}</span>}
        {geocode.state === "pending" && <span>{t('trips.wizard.geocodePending')}</span>}
        {geocode.state === "found" && (
          <span>
            {t('trips.wizard.geocodeFound')
              .replace('{place}', geocode.displayName)
              .replace('{lat}', geocode.lat.toFixed(4))
              .replace('{lng}', geocode.lng.toFixed(4))}
          </span>
        )}
        {geocode.state === "missing" && <span>{t('trips.wizard.geocodeMissing')}</span>}
        {geocode.state === "idle" && <span>{t('trips.wizard.geocodeIdle')}</span>}
      </div>

      {/* Participants & Difficulty */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Input
          id="trip-max-participants"
          label={t('trips.fields.maxParticipants')}
          type="number"
          value={formData.max_participants}
          onChange={(e) =>
            onChange({ max_participants: parseInt(e.target.value) || 2 })
          }
          min={2}
          max={200}
        />
        <Input
          id="trip-min-participants"
          label={t('trips.fields.minParticipants')}
          type="number"
          value={formData.min_participants}
          onChange={(e) =>
            onChange({ min_participants: parseInt(e.target.value) || 1 })
          }
          min={1}
          max={formData.max_participants}
        />
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">
            {t('trips.fields.difficulty')}
          </label>
          <div className="flex gap-1">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => onChange({ difficulty: level.value })}
                className={`flex-1 border py-2.5 text-xs font-bold transition-colors ${
                  formData.difficulty === level.value
                    ? "border-transparent text-surface"
                    : "border-line bg-canvas text-ink-muted hover:border-line-strong"
                }`}
                style={
                  formData.difficulty === level.value
                    ? { backgroundColor: level.color }
                    : undefined
                }
                title={locale === 'en' ? level.labelEn : level.label}
              >
                {level.value}
              </button>
            ))}
          </div>
          <p className="mt-1 text-center text-xs text-ink-muted">
            {locale === 'en'
              ? DIFFICULTY_LEVELS.find((l) => l.value === formData.difficulty)?.labelEn
              : DIFFICULTY_LEVELS.find((l) => l.value === formData.difficulty)?.label}
          </p>
        </div>
      </div>
    </div>
  );
}
