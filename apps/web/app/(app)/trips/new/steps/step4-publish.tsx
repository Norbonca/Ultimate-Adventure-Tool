"use client";

import { useState } from "react";
import type { WizardFormData } from "../../types";
import type { CategoryDisplay } from "@/lib/categories";
import { DIFFICULTY_LEVELS } from "@/lib/categories";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { TranslationKey } from "@uat/i18n";
import { ImagePicker } from "@/components/ImagePicker";

interface Step4Props {
  formData: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  categoryDisplay?: CategoryDisplay;
}

export function Step4Publish({ formData, onChange, categoryDisplay }: Step4Props) {
  const { t, locale } = useTranslation();
  const [newPosition, setNewPosition] = useState("");

  const diffLabel = DIFFICULTY_LEVELS.find(
    (l) => l.value === formData.difficulty
  );
  const diffLabelText = diffLabel
    ? locale === "en" ? diffLabel.labelEn : diffLabel.label
    : "";

  return (
    <div className="space-y-8">
      {/* ── Summary Card ── */}
      <div>
        <h2 className="text-2xl font-bold text-navy-900 mb-2">
          {t("trips.wizard.step4Title")}
        </h2>
        <p className="text-navy-500">
          {t("trips.wizard.step4Subtitle")}
        </p>
      </div>

      <div className="bg-navy-50 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-4">
          {categoryDisplay && (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ backgroundColor: `${categoryDisplay.colorHex}15` }}
            >
              {categoryDisplay.emoji}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-navy-900 truncate">
              {formData.title || t("trips.wizard.untitledTrip")}
            </h3>
            {formData.short_description && (
              <p className="text-sm text-navy-500 mt-0.5">
                {formData.short_description}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-white rounded-xl p-3">
            <span className="text-navy-400 block text-xs">{t("trips.wizard.category")}</span>
            <span className="font-medium text-navy-800">
              {categoryDisplay
                ? locale === "en" ? categoryDisplay.nameEn : categoryDisplay.nameHu
                : formData.category_name}
            </span>
          </div>
          <div className="bg-white rounded-xl p-3">
            <span className="text-navy-400 block text-xs">{t("trips.wizard.date")}</span>
            <span className="font-medium text-navy-800">
              {formData.start_date
                ? `${formData.start_date} → ${formData.end_date}`
                : t("trips.wizard.notSet")}
            </span>
          </div>
          <div className="bg-white rounded-xl p-3">
            <span className="text-navy-400 block text-xs">{t("trips.wizard.location")}</span>
            <span className="font-medium text-navy-800">
              {[formData.location_city, formData.location_region, formData.location_country]
                .filter(Boolean)
                .join(", ") || t("trips.wizard.notSet")}
            </span>
          </div>
          <div className="bg-white rounded-xl p-3">
            <span className="text-navy-400 block text-xs">{t("trips.wizard.difficulty")}</span>
            <span
              className="font-medium"
              style={{ color: diffLabel?.color }}
            >
              {diffLabelText} ({formData.difficulty}/5)
            </span>
          </div>
        </div>
      </div>

      {/* ── Cover Image ── */}
      <div>
        <label className="block text-sm font-semibold text-navy-700 mb-3">
          {t("trips.wizard.coverImage")}
        </label>
        <ImagePicker
          type="cover"
          categoryId={formData.category_id}
          currentImageUrl={formData.cover_image_url || undefined}
          currentSource={formData.cover_image_source}
          onSelect={(url, source) =>
            onChange({ cover_image_url: url, cover_image_source: source })
          }
          onClear={() =>
            onChange({ cover_image_url: "", cover_image_source: "system" })
          }
        />
      </div>

      {/* ── Card Image (Discover kártyákhoz) ── */}
      <div>
        <label className="block text-sm font-semibold text-navy-700 mb-1">
          {t("imagePicker.card.title")}
        </label>
        <p className="text-xs text-navy-400 mb-3">
          {t("imagePicker.card.subtitle")}
        </p>
        <ImagePicker
          type="card"
          categoryId={formData.category_id}
          currentImageUrl={formData.card_image_url || undefined}
          currentSource={formData.card_image_source}
          onSelect={(url, source) =>
            onChange({ card_image_url: url, card_image_source: source })
          }
          onClear={() =>
            onChange({ card_image_url: "", card_image_source: "system" })
          }
        />
      </div>

      {/* ── Visibility ── */}
      <div>
        <label className="block text-sm font-semibold text-navy-700 mb-3">
          {t("trips.wizard.visibility")}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: "public" as const, icon: "🌍", labelKey: "trips.wizard.visPublic", descKey: "trips.wizard.visPublicDesc" },
            { value: "followers_only" as const, icon: "👥", labelKey: "trips.wizard.visFollowers", descKey: "trips.wizard.visFollowersDesc" },
            { value: "private" as const, icon: "🔒", labelKey: "trips.wizard.visPrivate", descKey: "trips.wizard.visPrivateDesc" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ visibility: opt.value })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                formData.visibility === opt.value
                  ? "border-trevu-500 bg-trevu-50"
                  : "border-navy-200 hover:border-navy-300"
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className="block text-sm font-semibold text-navy-800 mt-2">
                {t(opt.labelKey as TranslationKey)}
              </span>
              <span className="block text-xs text-navy-400 mt-0.5">
                {t(opt.descKey as TranslationKey)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Crew Positions ── */}
      <div>
        <label className="block text-sm font-semibold text-navy-700 mb-3">
          {t("trips.wizard.crewPositions")}
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.crew_positions.map((pos) => (
            <span
              key={pos}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-trevu-50 text-trevu-700 rounded-lg text-sm font-medium border border-trevu-200"
            >
              {pos}
              <button
                onClick={() =>
                  onChange({
                    crew_positions: formData.crew_positions.filter((p) => p !== pos),
                  })
                }
                className="text-trevu-400 hover:text-trevu-600 text-xs ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newPosition.trim()) {
                  e.preventDefault();
                  if (!formData.crew_positions.includes(newPosition.trim())) {
                    onChange({
                      crew_positions: [...formData.crew_positions, newPosition.trim()],
                    });
                  }
                  setNewPosition("");
                }
              }}
              placeholder={t("trips.wizard.crewPositionPlaceholder")}
              className="px-3 py-1.5 rounded-lg border border-navy-200 text-sm text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none w-48"
            />
            <button
              onClick={() => {
                if (newPosition.trim() && !formData.crew_positions.includes(newPosition.trim())) {
                  onChange({
                    crew_positions: [...formData.crew_positions, newPosition.trim()],
                  });
                  setNewPosition("");
                }
              }}
              className="text-sm font-medium text-trevu-600 hover:text-trevu-700 whitespace-nowrap"
            >
              {t("trips.wizard.addPosition")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Settings ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ require_approval: !formData.require_approval })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              formData.require_approval ? "bg-trevu-600" : "bg-navy-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                formData.require_approval ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <div>
            <span className="text-sm font-medium text-navy-700">
              {t("trips.wizard.requireApproval")}
            </span>
            <span className="block text-xs text-navy-400">
              {t("trips.wizard.requireApprovalDesc")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ is_cost_sharing: !formData.is_cost_sharing })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              formData.is_cost_sharing ? "bg-trevu-600" : "bg-navy-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                formData.is_cost_sharing ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <div>
            <span className="text-sm font-medium text-navy-700">
              {t("trips.wizard.costSharing")}
            </span>
            <span className="block text-xs text-navy-400">
              {t("trips.wizard.costSharingDesc")}
            </span>
          </div>
        </div>
      </div>

      {/* ── Pricing ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.wizard.pricePerPerson")}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.price_amount ?? ""}
            onChange={(e) => onChange({ price_amount: e.target.value ? Number(e.target.value) : null })}
            placeholder="0.00"
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.wizard.currency")}
          </label>
          <select
            value={formData.price_currency}
            onChange={(e) => onChange({ price_currency: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors bg-white"
          >
            <option value="EUR">EUR (€)</option>
            <option value="HUF">HUF (Ft)</option>
            <option value="CZK">CZK (Kč)</option>
            <option value="RON">RON (lei)</option>
          </select>
        </div>
      </div>

      {/* ── Registration Deadline ── */}
      <div className="max-w-xs">
        <label className="block text-sm font-medium text-navy-700 mb-1.5">
          {t("trips.wizard.registrationDeadline")}
        </label>
        <input
          type="datetime-local"
          value={formData.registration_deadline}
          onChange={(e) => onChange({ registration_deadline: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
        />
      </div>

      {/* ── Show on Landing Page ── */}
      <div className="flex items-center justify-between py-4 border-t border-navy-100">
        <div>
          <span className="text-sm font-medium text-navy-700">
            {t("trips.wizard.showOnLanding")}
          </span>
          <span className="block text-xs text-navy-400">
            {t("trips.wizard.showOnLandingDesc")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onChange({ show_on_landing: !formData.show_on_landing })}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            formData.show_on_landing ? "bg-trevu-600" : "bg-navy-200"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              formData.show_on_landing ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
