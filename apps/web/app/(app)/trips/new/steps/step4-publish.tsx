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
import { TimezoneSelect } from "@/components/trip-forms/TimezoneSelect";
import { formatLocalDate } from "@/lib/timezone";

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
        <h2 className="mb-2 font-display text-4xl font-extrabold leading-none text-ink">
          {t("trips.wizard.step4Title")}
        </h2>
        <p className="text-ink-muted">
          {t("trips.wizard.step4Subtitle")}
        </p>
      </div>

      <div className="space-y-4 border border-line bg-canvas p-6">
        <div className="flex items-start gap-4">
          {categoryDisplay && (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center text-2xl"
              style={{ backgroundColor: `${categoryDisplay.colorHex}15` }}
            >
              <Icon name={categoryDisplay.icon} size={24} className="text-ink" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="truncate font-display text-2xl font-extrabold text-ink">
              {formData.title || t("trips.wizard.untitledTrip")}
            </h3>
            {formData.short_description && (
              <p className="mt-0.5 text-sm text-ink-muted">
                {formData.short_description}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="border border-line bg-surface p-3">
            <span className="block text-xs text-ink-muted">{t("trips.wizard.category")}</span>
            <span className="font-medium text-ink">
              {categoryDisplay
                ? locale === "en" ? categoryDisplay.nameEn : categoryDisplay.nameHu
                : formData.category_name}
            </span>
          </div>
          <div className="border border-line bg-surface p-3">
            <span className="block text-xs text-ink-muted">{t("trips.wizard.date")}</span>
            <span className="font-medium text-ink">
              {formData.start_date
                ? `${formData.start_date} - ${formData.end_date}`
                : t("trips.wizard.notSet")}
            </span>
          </div>
          <div className="border border-line bg-surface p-3">
            <span className="block text-xs text-ink-muted">{t("trips.wizard.location")}</span>
            <span className="font-medium text-ink">
              {[formData.location_city, formData.location_region, formData.location_country]
                .filter(Boolean)
                .join(", ") || t("trips.wizard.notSet")}
            </span>
          </div>
          <div className="border border-line bg-surface p-3">
            <span className="block text-xs text-ink-muted">{t("trips.wizard.difficulty")}</span>
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
        <label className="mb-3 block text-sm font-semibold text-ink">
          {t("trips.wizard.coverImage")} <span className="text-coral">*</span>
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
        <label className="mb-1 block text-sm font-semibold text-ink">
          {t("imagePicker.card.title")}
        </label>
        <p className="mb-3 text-xs text-ink-muted">
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
        <label className="mb-3 block text-sm font-semibold text-ink">
          {t("trips.wizard.visibility")}
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([
            { value: "public" as const, icon: "globe", labelKey: "trips.wizard.visPublic", descKey: "trips.wizard.visPublicDesc" },
            { value: "followers_only" as const, icon: "users", labelKey: "trips.wizard.visFollowers", descKey: "trips.wizard.visFollowersDesc" },
            { value: "private" as const, icon: "lock", labelKey: "trips.wizard.visPrivate", descKey: "trips.wizard.visPrivateDesc" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ visibility: opt.value })}
              className={`border-2 p-4 text-left transition-colors ${
                formData.visibility === opt.value
                  ? "border-accent bg-[var(--color-primary-subtle)]"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <Icon name={opt.icon} size={20} className="text-ink-muted" />
              <span className="mt-2 block text-sm font-semibold text-ink">
                {t(opt.labelKey as TranslationKey)}
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                {t(opt.descKey as TranslationKey)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Crew Positions ── */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-ink">
          {t("trips.wizard.crewPositions")}
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.crew_positions.map((pos) => (
            <span
              key={pos}
              className="inline-flex items-center gap-1.5 border border-accent bg-[var(--color-primary-subtle)] px-3 py-1.5 text-sm font-medium text-ink"
            >
              {pos}
              <button
                onClick={() =>
                  onChange({
                    crew_positions: formData.crew_positions.filter((p) => p !== pos),
                  })
                }
                className="ml-0.5 text-xs text-accent hover:text-accent-hover"
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
              className="w-48 border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
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
              className="whitespace-nowrap text-sm font-bold text-accent hover:underline"
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
          <label htmlFor="trip-currency" className="text-sm font-semibold text-ink">
            {t("trips.wizard.currency")}
          </label>
          <select
            id="trip-currency"
            value={formData.price_currency}
            onChange={(e) => onChange({ price_currency: e.target.value })}
            className="min-h-[48px] w-full border border-line-strong bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-accent"
          >
            <option value="EUR">EUR (€)</option>
            <option value="HUF">HUF (Ft)</option>
            <option value="CZK">CZK (Kč)</option>
            <option value="RON">RON (lei)</option>
          </select>
        </div>
      </div>

      {/* ── Registration Deadline ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="trip-registration-deadline"
          label={t("trips.wizard.registrationDeadline")}
          type="date"
          value={formData.registration_deadline}
          onChange={(e) => onChange({ registration_deadline: e.target.value })}
        />
        <TimezoneSelect
          id="trip-timezone"
          value={formData.timezone}
          onChange={(timezone) => onChange({ timezone })}
        />
      </div>
      {formData.registration_deadline && (
        <p className="-mt-2 text-sm text-ink-muted">
          {t("trips.wizard.registrationDeadlineHint", {
            date: formatLocalDate(formData.registration_deadline, locale === "en" ? "en-US" : "hu-HU"),
            timezone: formData.timezone || "UTC",
          })}
        </p>
      )}

      {/* ── Show on Landing Page ── */}
      <Toggle
        checked={formData.show_on_landing}
        onChange={(checked) => onChange({ show_on_landing: checked })}
        label={t("trips.wizard.showOnLanding")}
        description={t("trips.wizard.showOnLandingDesc")}
        trailing
        className="justify-between border-t border-line py-4"
      />
    </div>
  );
}
