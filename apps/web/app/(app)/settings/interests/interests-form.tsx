"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CATEGORY_DISPLAY, getCategoryName } from "@/lib/categories";
import { saveUserInterests, saveUserSkills } from "../actions";

type LocalizedName = Record<string, string> | null;

interface Category {
  id: string;
  name: string;
  name_localized: LocalizedName;
  icon_name: string | null;
  color_hex: string | null;
  display_order: number | null;
}

interface SubDiscipline {
  id: string;
  category_id: string;
  name: string;
  name_localized: LocalizedName;
  description: string | null;
  display_order: number | null;
}

interface UserSkill {
  id: string;
  category_id: string;
  skill_level: string;
  years_experience: number | null;
}

function getLocalized(obj: LocalizedName, locale: string, fallback: string): string {
  if (!obj) return fallback;
  return obj[locale] ?? obj["en"] ?? fallback;
}

const SKILL_LEVELS = [
  { key: "none", color: "#DC2626", bg: "#FEF2F2" },
  { key: "beginner", color: "#64748B", bg: "#F1F5F9" },
  { key: "intermediate", color: "#D97706", bg: "#FEF3C7" },
  { key: "advanced", color: "#3B82F6", bg: "#DBEAFE" },
  { key: "expert", color: "#8B5CF6", bg: "#EDE9FE" },
] as const;

interface Props {
  categories: Category[];
  subDisciplines: SubDiscipline[];
  initialInterests: string[];
  initialSkills: UserSkill[];
}

export function InterestsForm({ categories, subDisciplines, initialInterests, initialSkills }: Props) {
  const { t, locale } = useTranslation();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(initialInterests)
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(initialInterests)
  );
  const [skills, setSkills] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of initialSkills) {
      map[s.category_id] = s.skill_level;
    }
    return map;
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
        setExpandedCategories((exp) => new Set(exp).add(catId));
      }
      return next;
    });
    setSaved(false);
  };

  const toggleExpand = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const setSkillLevel = (subDisciplineId: string, level: string) => {
    setSkills((prev) => ({ ...prev, [subDisciplineId]: level }));
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const interestsResult = await saveUserInterests(Array.from(selectedCategories));
      if (interestsResult.error) return;

      // Save skills for sub-disciplines that have a level set
      const skillEntries = Object.entries(skills)
        .filter(([, level]) => level && level !== "none")
        .map(([category_id, skill_level]) => ({ category_id, skill_level }));
      if (skillEntries.length > 0) {
        const skillsResult = await saveUserSkills(skillEntries);
        if (skillsResult.error) return;
      }

      setSaved(true);
    });
  };

  const subsByCategory = subDisciplines.reduce<Record<string, SubDiscipline[]>>((acc, sd) => {
    if (!acc[sd.category_id]) acc[sd.category_id] = [];
    acc[sd.category_id].push(sd);
    return acc;
  }, {});

  const selectedCount = selectedCategories.size;
  const totalSubs = Array.from(selectedCategories).reduce(
    (sum, catId) => sum + (subsByCategory[catId]?.length ?? 0),
    0
  );

  return (
    <div className="rounded-2xl border border-navy-200 bg-white p-8">
      <h1 className="text-[22px] font-bold text-navy-900 mb-2">
        {t('settings.interests.title')}
      </h1>
      <p className="text-sm text-navy-500 leading-relaxed mb-2">
        {t('settings.interests.description')}
      </p>
      <div className="flex items-center gap-2 text-xs text-trevu-600 font-medium mb-8">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        {t('settings.interests.refNote')}
      </div>

      {/* Category list */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const display = CATEGORY_DISPLAY[cat.name];
          const isSelected = selectedCategories.has(cat.id);
          const isExpanded = expandedCategories.has(cat.id);
          const subs = subsByCategory[cat.id] ?? [];
          const catName = display ? getCategoryName(display, locale) : getLocalized(cat.name_localized, locale, cat.name);
          const emoji = display?.emoji ?? "🏔️";
          const colorHex = display?.colorHex ?? cat.color_hex ?? "#0D9488";

          return (
            <div
              key={cat.id}
              className="rounded-xl border-2 transition-colors overflow-hidden"
              style={{
                borderColor: isSelected ? colorHex : "#E2E8F0",
                backgroundColor: isSelected ? undefined : "#FFFFFF",
              }}
            >
              {/* Category header */}
              <button
                onClick={() => isSelected ? toggleExpand(cat.id) : toggleCategory(cat.id)}
                className="flex items-center gap-3 w-full px-5 py-4 text-left transition-colors"
                style={{ backgroundColor: isSelected ? `${colorHex}10` : undefined }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                  style={{ backgroundColor: colorHex }}
                >
                  {emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-navy-900">{catName}</div>
                  <div className="text-xs text-navy-500">
                    {subs.length} {t('settings.interests.subDisciplines')}
                    {isSelected && ` · ${t('settings.interests.selected')}`}
                  </div>
                </div>
                {isSelected && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCategory(cat.id); }}
                    className="text-xs font-medium text-navy-400 hover:text-red-500 px-2 py-1"
                  >
                    {t('common.remove')}
                  </button>
                )}
                <svg
                  className={`h-5 w-5 text-navy-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Sub-disciplines with skill levels (expanded) */}
              {isSelected && isExpanded && subs.length > 0 && (
                <div className="border-t px-5 pb-4 pt-3 space-y-3" style={{ borderColor: `${colorHex}30` }}>
                  {subs.map((sd) => {
                    const sdName = getLocalized(sd.name_localized, locale, sd.name);
                    const currentLevel = skills[sd.id];
                    const currentLevelDef = SKILL_LEVELS.find((l) => l.key === currentLevel);
                    return (
                      <div
                        key={sd.id}
                        className="rounded-lg px-4 py-3 border"
                        style={{
                          backgroundColor: `${colorHex}08`,
                          borderColor: `${colorHex}30`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-navy-800">{sdName}</span>
                          {currentLevelDef && (
                            <span
                              className="rounded px-2 py-0.5 text-[11px] font-semibold"
                              style={{ backgroundColor: currentLevelDef.bg, color: currentLevelDef.color }}
                            >
                              {t(`profile.skillLevels.${currentLevel}` as Parameters<typeof t>[0])}
                            </span>
                          )}
                        </div>
                        {sd.description && (
                          <p className="text-xs text-navy-400 mb-2">{sd.description}</p>
                        )}
                        {/* Skill level bar */}
                        <div className="flex gap-1.5">
                          {SKILL_LEVELS.map((level) => {
                            const isActive = currentLevel === level.key;
                            return (
                              <button
                                key={level.key}
                                onClick={() => setSkillLevel(sd.id, level.key)}
                                className="flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors"
                                style={{
                                  backgroundColor: isActive ? level.color : level.bg,
                                  color: isActive ? "#FFFFFF" : level.color,
                                }}
                              >
                                {t(`profile.skillLevels.${level.key}` as Parameters<typeof t>[0])}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary + actions */}
      <div className="mt-8 pt-6 border-t border-navy-200">
        <p className="text-sm text-navy-500 mb-6">
          {selectedCount} {t('settings.interests.categoriesActive')} · {totalSubs} {t('settings.interests.subDisciplinesAvailable')}
        </p>
        <div className="flex gap-3">
          <a
            href="/profile"
            className="rounded-xl border border-navy-200 bg-white px-7 py-3 text-sm font-semibold text-navy-700 hover:bg-navy-50 transition-colors"
          >
            {t('common.cancel')}
          </a>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl bg-trevu-600 px-7 py-3 text-sm font-semibold text-white hover:bg-trevu-700 transition-colors disabled:opacity-50"
          >
            {isPending ? t('common.loading') : saved ? t('common.saved') : t('common.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
