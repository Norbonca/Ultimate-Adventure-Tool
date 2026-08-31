"use client";

/**
 * Wizard Step 2 — Basic Information — design/D02_Trip_Management.pen#sGfJS
 */

import type { WizardFormData, SubDisciplineRow } from "../../types";
import { DIFFICULTY_LEVELS } from "@/lib/categories";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Input } from "@/components/ui";

interface Step2Props {
  formData: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  countries: { code: string; name_hu: string; name_en: string; flag_emoji: string }[];
  subDisciplines: SubDisciplineRow[];
  onSubDisciplineChange: (subId: string) => void;
}

const SELECT_CLASSES =
  "w-full min-h-[48px] px-4 py-3 rounded-trevu border-[1.5px] border-navy-300 text-[15px] text-navy-900 bg-white focus:ring-[3px] focus:ring-trevu-600/10 focus:border-trevu-600 outline-none transition-all duration-200";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy-900 mb-2">{t('trips.wizard.step2Title')}</h2>
        <p className="text-navy-500">{t('trips.wizard.step2Description')}</p>
      </div>

      {/* Sub-discipline selector (if available) */}
      {subDisciplines.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sub-discipline" className="text-sm font-semibold text-navy-900">
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
        <label htmlFor="trip-description" className="text-sm font-semibold text-navy-900">
          {t('trips.fields.detailedDescription')} <RequiredMark />
        </label>
        <textarea
          id="trip-description"
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t('trips.wizard.descPlaceholder')}
          rows={5}
          className="w-full px-4 py-3 rounded-trevu border-[1.5px] border-navy-300 text-[15px] text-navy-900 placeholder:text-navy-500 focus:ring-[3px] focus:ring-trevu-600/10 focus:border-trevu-600 outline-none transition-all duration-200 resize-none"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
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
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trip-country" className="text-sm font-semibold text-navy-900">
            {t('trips.fields.country')}
          </label>
          <select
            id="trip-country"
            value={formData.location_country}
            onChange={(e) => onChange({ location_country: e.target.value })}
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
          placeholder={t('trips.wizard.regionPlaceholder')}
        />
        <Input
          id="trip-city"
          label={t('trips.fields.city')}
          type="text"
          value={formData.location_city}
          onChange={(e) => onChange({ location_city: e.target.value })}
          placeholder={t('trips.wizard.cityPlaceholder')}
        />
      </div>

      {/* Participants & Difficulty */}
      <div className="grid grid-cols-3 gap-4">
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
          <label className="block text-sm font-semibold text-navy-900 mb-1.5">
            {t('trips.fields.difficulty')}
          </label>
          <div className="flex gap-1">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => onChange({ difficulty: level.value })}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  formData.difficulty === level.value
                    ? "text-white shadow-md"
                    : "bg-navy-50 text-navy-400 hover:bg-navy-100"
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
          <p className="text-xs text-navy-500 mt-1 text-center">
            {locale === 'en'
              ? DIFFICULTY_LEVELS.find((l) => l.value === formData.difficulty)?.labelEn
              : DIFFICULTY_LEVELS.find((l) => l.value === formData.difficulty)?.label}
          </p>
        </div>
      </div>
    </div>
  );
}
