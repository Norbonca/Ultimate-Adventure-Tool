"use client";

import type { CategoryRow } from "../../types";
import { CATEGORY_DISPLAY } from "@/lib/categories";

interface Step1Props {
  categories: CategoryRow[];
  selectedCategoryId: string;
  onSelect: (categoryId: string, categoryName: string) => void;
  isLoading: boolean;
}

export function Step1Category({
  categories,
  selectedCategoryId,
  onSelect,
  isLoading,
}: Step1Props) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-900 mb-2">
        Milyen kalandot tervezel?
      </h2>
      <p className="text-navy-500 mb-8">
        Válaszd ki a túra kategóriáját — ez határozza meg a részletes beállításokat
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const display = CATEGORY_DISPLAY[cat.name];
          const isSelected = selectedCategoryId === cat.id;
          const localName =
            (cat.name_localized as Record<string, string>)?.hu || cat.name;

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
              {/* Category color accent */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 text-3xl"
                style={{
                  backgroundColor: `${cat.color_hex}15`,
                }}
              >
                {display?.emoji || "🏔️"}
              </div>

              <span className="text-sm font-semibold text-navy-900">
                {localName}
              </span>

              {cat.description && (
                <span className="text-xs text-navy-400 mt-1 text-center line-clamp-2">
                  {(cat.description as string).slice(0, 50)}
                </span>
              )}

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-trevu-600 text-white flex items-center justify-center">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
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
          Alkategóriák betöltése...
        </div>
      )}
    </div>
  );
}
