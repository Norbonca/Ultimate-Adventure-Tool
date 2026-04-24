"use client";

import type { WizardFormData, SubDisciplineRow } from "@/app/(app)/trips/types";
import { DIFFICULTY_LEVELS } from "@/lib/categories";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface BasicInfoSectionProps {
  data: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  countries: { code: string; name_hu: string; name_en: string; flag_emoji: string }[];
  subDisciplines?: SubDisciplineRow[];
  onSubDisciplineChange?: (subId: string) => void;
}

export function BasicInfoSection({
  data,
  onChange,
  countries,
  subDisciplines = [],
  onSubDisciplineChange,
}: BasicInfoSectionProps) {
  const { t, locale } = useTranslation();

  const todayIso = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Sub-discipline selector (if available) */}
      {subDisciplines.length > 0 && onSubDisciplineChange && (
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.fields.subcategory")}
          </label>
          <select
            value={data.sub_discipline_id}
            onChange={(e) => onSubDisciplineChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 bg-white focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          >
            <option value="">{t("trips.wizard.selectSubcategory")}</option>
            {subDisciplines.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {locale === "en"
                  ? (sub.name_localized as Record<string, string>)?.en || sub.name
                  : (sub.name_localized as Record<string, string>)?.hu || sub.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1.5">
          {t("trips.fields.title")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={t("trips.wizard.titlePlaceholder")}
          maxLength={200}
          className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
        />
        <p className="text-xs text-navy-400 mt-1">
          {t("trips.wizard.charCount").replace("{count}", String(data.title.length))}
        </p>
      </div>

      {/* Short description */}
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1.5">
          {t("trips.fields.shortDescription")}
        </label>
        <input
          type="text"
          value={data.short_description}
          onChange={(e) => onChange({ short_description: e.target.value })}
          placeholder={t("trips.wizard.shortDescPlaceholder")}
          maxLength={280}
          className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1.5">
          {t("trips.fields.detailedDescription")} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t("trips.wizard.descPlaceholder")}
          rows={5}
          className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors resize-none"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.fields.startDate")} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={data.start_date}
            onChange={(e) => onChange({ start_date: e.target.value })}
            min={todayIso}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.fields.endDate")} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={data.end_date}
            onChange={(e) => onChange({ end_date: e.target.value })}
            min={data.start_date || todayIso}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.fields.country")}
          </label>
          <select
            value={data.location_country}
            onChange={(e) => onChange({ location_country: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 bg-white focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag_emoji} {locale === "en" ? c.name_en : c.name_hu}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.wizard.regionLabel")}
          </label>
          <input
            type="text"
            value={data.location_region}
            onChange={(e) => onChange({ location_region: e.target.value })}
            placeholder={t("trips.wizard.regionPlaceholder")}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.fields.city")}
          </label>
          <input
            type="text"
            value={data.location_city}
            onChange={(e) => onChange({ location_city: e.target.value })}
            placeholder={t("trips.wizard.cityPlaceholder")}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Participants & Difficulty */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.fields.maxParticipants")}
          </label>
          <input
            type="number"
            value={data.max_participants}
            onChange={(e) => onChange({ max_participants: parseInt(e.target.value) || 2 })}
            min={2}
            max={200}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.fields.minParticipants")}
          </label>
          <input
            type="number"
            value={data.min_participants}
            onChange={(e) => onChange({ min_participants: parseInt(e.target.value) || 1 })}
            min={1}
            max={data.max_participants}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.fields.difficulty")}
          </label>
          <div className="flex gap-1">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => onChange({ difficulty: level.value })}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  data.difficulty === level.value
                    ? "text-white shadow-md"
                    : "bg-navy-50 text-navy-400 hover:bg-navy-100"
                }`}
                style={
                  data.difficulty === level.value ? { backgroundColor: level.color } : undefined
                }
                title={locale === "en" ? level.labelEn : level.label}
              >
                {level.value}
              </button>
            ))}
          </div>
          <p className="text-xs text-navy-500 mt-1 text-center">
            {locale === "en"
              ? DIFFICULTY_LEVELS.find((l) => l.value === data.difficulty)?.labelEn
              : DIFFICULTY_LEVELS.find((l) => l.value === data.difficulty)?.label}
          </p>
        </div>
      </div>
    </div>
  );
}
