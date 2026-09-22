"use client";

import type { CategoryRow, WizardFormData } from "../../types";
import { CATEGORY_DISPLAY } from "@/lib/categories";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";

interface Step1Props {
  categories: CategoryRow[];
  selectedCategoryId: string;
  tripType: WizardFormData["trip_type"];
  onSelect: (categoryId: string, categoryName: string) => void;
  onTripTypeChange: (type: WizardFormData["trip_type"]) => void;
  isLoading: boolean;
}

export function Step1Category({
  categories,
  selectedCategoryId,
  tripType,
  onSelect,
  onTripTypeChange,
  isLoading,
}: Step1Props) {
  const { t, locale } = useTranslation();

  return (
    <div>
      <h2 className="mb-2 font-display text-4xl font-extrabold leading-none text-ink">
        {t("trips.wizard.categoryPrompt")}
      </h2>
      <p className="mb-8 text-ink-muted">
        {t("trips.wizard.categoryDescription")}
      </p>

      {/* Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const display = CATEGORY_DISPLAY[cat.name];
          const isSelected = selectedCategoryId === cat.id;
          const localName =
            (cat.name_localized as Record<string, string>)?.[locale] || cat.name;
          const categoryColor = cat.color_hex || "var(--color-primary)";

          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id, cat.name)}
              disabled={isLoading}
              className={`relative flex flex-col items-center justify-center border-2 p-5 transition-colors disabled:opacity-70 ${
                isSelected
                  ? "border-accent bg-[var(--color-primary-subtle)]"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <div
                className="mb-3 flex h-14 w-14 items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${categoryColor} 12%, transparent)`, color: categoryColor }}
              >
                <Icon name={display?.icon || cat.icon_name || "compass"} size={28} strokeWidth={1.5} />
              </div>
              <span className="text-sm font-semibold text-ink">
                {localName}
              </span>
              {(display?.descriptionHu || cat.description) && (
                <span className="mt-1 line-clamp-2 text-center text-xs text-ink-muted">
                  {locale === "hu"
                    ? (display?.descriptionHu || (cat.description as string))
                    : (cat.description as string)
                  }
                </span>
              )}
              {isSelected && (
                <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center bg-accent text-accent-on">
                  <Icon name="check" size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="mt-6 animate-pulse text-center text-sm text-ink-muted">
          {t("trips.wizard.loadingSubcategories")}
        </div>
      )}

      {/* Trip Type Selector */}
      <div className="mt-10">
        <h3 className="mb-4 text-center font-display text-2xl font-extrabold text-ink">
          {t("trips.wizard.whoIsThisFor")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Private Trip */}
          <button
            onClick={() => onTripTypeChange("private")}
            className={`border-2 p-5 text-left transition-colors ${
              tripType === "private"
                ? "border-accent bg-[var(--color-primary-subtle)]"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon name="lock" size={18} className="text-ink-muted" />
              <h4 className="font-semibold text-ink">
                {t("trips.wizard.tripTypePrivate")}
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-ink-muted">
              {t("trips.wizard.tripTypePrivateDesc")}
            </p>
          </button>

          {/* Public Event */}
          <button
            onClick={() => onTripTypeChange("public")}
            className={`border-2 p-5 text-left transition-colors ${
              tripType === "public"
                ? "border-accent bg-[var(--color-primary-subtle)]"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon name="globe" size={18} className="text-ink-muted" />
              <h4 className="font-semibold text-ink">
                {t("trips.wizard.tripTypePublic")}
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-ink-muted">
              {t("trips.wizard.tripTypePublicDesc")}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
