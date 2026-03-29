"use client";

import type { CategoryRow, WizardFormData } from "../../types";
import { CATEGORY_DISPLAY } from "@/lib/categories";
import { useTranslation } from "@/lib/i18n/useTranslation";

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
      <h2 className="text-2xl font-bold text-navy-900 mb-2">
        {t("trips.wizard.categoryPrompt")}
      </h2>
      <p className="text-navy-500 mb-8">
        {t("trips.wizard.categoryDescription")}
      </p>

      {/* Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const display = CATEGORY_DISPLAY[cat.name];
          const isSelected = selectedCategoryId === cat.id;
          const localName =
            (cat.name_localized as Record<string, string>)?.[locale] || cat.name;

          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id, cat.name)}
              disabled={isLoading}
              className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 ${
                isSelected
                  ? "border-trevu-500 bg-trevu-50 shadow-lg shadow-trevu-600/10"
                  : "border-navy-200 bg-white hover:border-navy-300 hover:shadow-md"
              }`}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 text-3xl"
                style={{ backgroundColor: `${cat.color_hex}15` }}
              >
                {display?.emoji || "🏔️"}
              </div>
              <span className="text-sm font-semibold text-navy-900">
                {localName}
              </span>
              {(display?.descriptionHu || cat.description) && (
                <span className="text-xs text-navy-400 mt-1 text-center line-clamp-2">
                  {locale === "hu"
                    ? (display?.descriptionHu || (cat.description as string))
                    : (cat.description as string)
                  }
                </span>
              )}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-trevu-600 text-white flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="mt-6 text-center text-sm text-navy-400 animate-pulse">
          {t("trips.wizard.loadingSubcategories")}
        </div>
      )}

      {/* Trip Type Selector */}
      <div className="mt-10">
        <h3 className="text-lg font-bold text-navy-900 text-center mb-4">
          {t("trips.wizard.whoIsThisFor")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Private Trip */}
          <button
            onClick={() => onTripTypeChange("private")}
            className={`text-left p-5 rounded-xl border-2 transition-all ${
              tripType === "private"
                ? "border-trevu-500 bg-trevu-50/50"
                : "border-navy-200 bg-white hover:border-navy-300"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">🔒</span>
              <h4 className="font-semibold text-navy-900">
                {t("trips.wizard.tripTypePrivate")}
              </h4>
            </div>
            <p className="text-xs text-navy-500 leading-relaxed">
              {t("trips.wizard.tripTypePrivateDesc")}
            </p>
          </button>

          {/* Public Event */}
          <button
            onClick={() => onTripTypeChange("public")}
            className={`text-left p-5 rounded-xl border-2 transition-all ${
              tripType === "public"
                ? "border-trevu-500 bg-trevu-50/50"
                : "border-navy-200 bg-white hover:border-navy-300"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">🌍</span>
              <h4 className="font-semibold text-navy-900">
                {t("trips.wizard.tripTypePublic")}
              </h4>
            </div>
            <p className="text-xs text-navy-500 leading-relaxed">
              {t("trips.wizard.tripTypePublicDesc")}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
