"use client";

import type { WizardFormData } from "../../types";
import type { CategoryDisplay } from "@/lib/categories";
import { DIFFICULTY_LEVELS } from "@/lib/categories";

interface Step4Props {
  formData: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  categoryDisplay?: CategoryDisplay;
}

export function Step4Publish({ formData, onChange, categoryDisplay }: Step4Props) {
  const diffLabel = DIFFICULTY_LEVELS.find(
    (l) => l.value === formData.difficulty
  );

  return (
    <div className="space-y-8">
      {/* ── Summary Card ── */}
      <div>
        <h2 className="text-2xl font-bold text-navy-900 mb-2">
          Áttekintés & Publikálás
        </h2>
        <p className="text-navy-500">
          Ellenőrizd az adatokat és állítsd be a láthatóságot
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
              {formData.title || "Névtelen túra"}
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
            <span className="text-navy-400 block text-xs">Kategória</span>
            <span className="font-medium text-navy-800">
              {categoryDisplay?.nameHu || formData.category_name}
            </span>
          </div>
          <div className="bg-white rounded-xl p-3">
            <span className="text-navy-400 block text-xs">Dátum</span>
            <span className="font-medium text-navy-800">
              {formData.start_date
                ? `${formData.start_date} → ${formData.end_date}`
                : "Nincs megadva"}
            </span>
          </div>
          <div className="bg-white rounded-xl p-3">
            <span className="text-navy-400 block text-xs">Helyszín</span>
            <span className="font-medium text-navy-800">
              {[formData.location_city, formData.location_region, formData.location_country]
                .filter(Boolean)
                .join(", ") || "Nincs megadva"}
            </span>
          </div>
          <div className="bg-white rounded-xl p-3">
            <span className="text-navy-400 block text-xs">Nehézség</span>
            <span
              className="font-medium"
              style={{ color: diffLabel?.color }}
            >
              {diffLabel?.label} ({formData.difficulty}/5)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded-xl p-3">
            <span className="text-navy-400 block text-xs">Résztvevők</span>
            <span className="font-medium text-navy-800">
              {formData.min_participants}–{formData.max_participants} fő
            </span>
          </div>
          <div className="bg-white rounded-xl p-3">
            <span className="text-navy-400 block text-xs">Kategória részletek</span>
            <span className="font-medium text-navy-800">
              {Object.keys(formData.category_details).length} mező kitöltve
            </span>
          </div>
        </div>
      </div>

      {/* ── Visibility ── */}
      <div>
        <label className="block text-sm font-semibold text-navy-700 mb-3">
          Láthatóság
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              value: "public" as const,
              label: "Nyilvános",
              desc: "Mindenki számára látható",
              icon: "🌍",
            },
            {
              value: "followers_only" as const,
              label: "Követők",
              desc: "Csak követőid látják",
              icon: "👥",
            },
            {
              value: "private" as const,
              label: "Privát",
              desc: "Csak meghívottak",
              icon: "🔒",
            },
          ].map((opt) => (
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
                {opt.label}
              </span>
              <span className="block text-xs text-navy-400 mt-0.5">
                {opt.desc}
              </span>
            </button>
          ))}
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
              Jóváhagyás szükséges
            </span>
            <span className="block text-xs text-navy-400">
              Jelentkezőket manuálisan fogadod el
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onChange({ is_cost_sharing: !formData.is_cost_sharing })
            }
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
              Költségmegosztás
            </span>
            <span className="block text-xs text-navy-400">
              Közös költségek nyilvántartása
            </span>
          </div>
        </div>
      </div>

      {/* ── Registration Deadline ── */}
      <div className="max-w-xs">
        <label className="block text-sm font-medium text-navy-700 mb-1.5">
          Jelentkezési határidő (opcionális)
        </label>
        <input
          type="datetime-local"
          value={formData.registration_deadline}
          onChange={(e) => onChange({ registration_deadline: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
        />
      </div>
    </div>
  );
}
