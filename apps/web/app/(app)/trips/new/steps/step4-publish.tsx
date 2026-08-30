"use client";

/**
 * Wizard Step 4 — Settings and Publish — design/D02_Trip_Management.pen#Gvgnj
 */

import { useState } from "react";
import type { WizardFormData } from "../../types";
import type { CategoryDisplay } from "@/lib/categories";
import { DIFFICULTY_LEVELS } from "@/lib/categories";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { TranslationKey } from "@uat/i18n";
import { ImagePicker } from "@/components/ImagePicker";
import { Icon } from "@/components/Icon";
import { Input, Toggle } from "@/components/ui";

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
              <Icon name={categoryDisplay.icon} size={24} className="text-navy-700" />
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
            { value: "public" as const, icon: "globe", labelKey: "trips.wizard.visPublic", descKey: "trips.wizard.visPublicDesc" },
            { value: "followers_only" as const, icon: "users", labelKey: "trips.wizard.visFollowers", descKey: "trips.wizard.visFollowersDesc" },
            { value: "private" as const, icon: "lock", labelKey: "trips.wizard.visPrivate", descKey: "trips.wizard.visPrivateDesc" },
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
              <Icon name={opt.icon} size={20} className="text-navy-600" />
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
                aria-label={t("common.cancel")}
              >
                <Icon name="x" size={12} />
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
        <Toggle
          checked={formData.require_approval}
          onChange={(checked) => onChange({ require_approval: checked })}
          label={t("trips.wizard.requireApproval")}
          description={t("trips.wizard.requireApprovalDesc")}
        />
        <Toggle
          checked={formData.is_cost_sharing}
          onChange={(checked) => onChange({ is_cost_sharing: checked })}
          label={t("trips.wizard.costSharing")}
          description={t("trips.wizard.costSharingDesc")}
        />
      </div>

      {/* ── Pricing ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input
          id="trip-price"
          label={t("trips.wizard.pricePerPerson")}
          type="number"
          min="0"
          step="0.01"
          value={formData.price_amount ?? ""}
          onChange={(e) => onChange({ price_amount: e.target.value ? Number(e.target.value) : null })}
          placeholder="0.00"
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trip-currency" className="text-sm font-semibold text-navy-900">
            {t("trips.wizard.currency")}
          </label>
          <select
            id="trip-currency"
            value={formData.price_currency}
            onChange={(e) => onChange({ price_currency: e.target.value })}
            className="w-full min-h-[48px] px-4 py-3 rounded-trevu border-[1.5px] border-navy-300 text-[15px] text-navy-900 bg-white focus:ring-[3px] focus:ring-trevu-600/10 focus:border-trevu-600 outline-none transition-all duration-200"
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
        <Input
          id="trip-registration-deadline"
          label={t("trips.wizard.registrationDeadline")}
          type="datetime-local"
          value={formData.registration_deadline}
          onChange={(e) => onChange({ registration_deadline: e.target.value })}
        />
      </div>

      {/* ── Show on Landing Page ── */}
      <Toggle
        checked={formData.show_on_landing}
        onChange={(checked) => onChange({ show_on_landing: checked })}
        label={t("trips.wizard.showOnLanding")}
        description={t("trips.wizard.showOnLandingDesc")}
        trailing
        className="justify-between py-4 border-t border-navy-100"
      />
    </div>
  );
}
