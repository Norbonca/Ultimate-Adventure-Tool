"use client";

import type { WizardFormData, SubDisciplineRow } from "../../types";
import { DIFFICULTY_LEVELS } from "@/lib/categories";

interface Step2Props {
  formData: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  countries: { code: string; name_hu: string; name_en: string; flag_emoji: string }[];
  subDisciplines: SubDisciplineRow[];
  onSubDisciplineChange: (subId: string) => void;
}

export function Step2Basics({
  formData,
  onChange,
  countries,
  subDisciplines,
  onSubDisciplineChange,
}: Step2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy-900 mb-2">Alapadatok</h2>
        <p className="text-navy-500">A túra legfontosabb információi</p>
      </div>

      {/* Sub-discipline selector (if available) */}
      {subDisciplines.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            Alkategória
          </label>
          <select
            value={formData.sub_discipline_id}
            onChange={(e) => onSubDisciplineChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 bg-white focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          >
            <option value="">— Válassz alkategóriát —</option>
            {subDisciplines.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {(sub.name_localized as Record<string, string>)?.hu || sub.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1.5">
          Túra neve <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="pl. Tátra csúcstúra, Adriai vitorlázás..."
          maxLength={200}
          className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
        />
        <p className="text-xs text-navy-400 mt-1">
          {formData.title.length}/200 karakter
        </p>
      </div>

      {/* Short description */}
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1.5">
          Rövid leírás
        </label>
        <input
          type="text"
          value={formData.short_description}
          onChange={(e) => onChange({ short_description: e.target.value })}
          placeholder="Egy mondat a túráról (kártyákon jelenik meg)"
          maxLength={280}
          className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1.5">
          Részletes leírás <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Írd le a túra programját, mit várhatnak a résztvevők, milyen élmény lesz..."
          rows={5}
          className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors resize-none"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            Kezdés dátuma <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => onChange({ start_date: e.target.value })}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            Befejezés dátuma <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.end_date}
            onChange={(e) => onChange({ end_date: e.target.value })}
            min={formData.start_date || new Date().toISOString().split("T")[0]}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            Ország
          </label>
          <select
            value={formData.location_country}
            onChange={(e) => onChange({ location_country: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 bg-white focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag_emoji} {c.name_hu}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            Régió / Megye
          </label>
          <input
            type="text"
            value={formData.location_region}
            onChange={(e) => onChange({ location_region: e.target.value })}
            placeholder="pl. Magas-Tátra"
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            Város
          </label>
          <input
            type="text"
            value={formData.location_city}
            onChange={(e) => onChange({ location_city: e.target.value })}
            placeholder="pl. Poprad"
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Participants & Difficulty */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            Max résztvevők
          </label>
          <input
            type="number"
            value={formData.max_participants}
            onChange={(e) =>
              onChange({ max_participants: parseInt(e.target.value) || 2 })
            }
            min={2}
            max={200}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            Min résztvevők
          </label>
          <input
            type="number"
            value={formData.min_participants}
            onChange={(e) =>
              onChange({ min_participants: parseInt(e.target.value) || 1 })
            }
            min={1}
            max={formData.max_participants}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            Nehézségi szint
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
                title={level.labelEn}
              >
                {level.value}
              </button>
            ))}
          </div>
          <p className="text-xs text-navy-500 mt-1 text-center">
            {DIFFICULTY_LEVELS.find((l) => l.value === formData.difficulty)?.label}
          </p>
        </div>
      </div>
    </div>
  );
}
