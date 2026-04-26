"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CATEGORY_DISPLAY, getCategoryName } from "@/lib/categories";
import { saveUserSkills } from "../actions";
import Link from "next/link";

type LocalizedName = Record<string, string> | null;

function getLocalized(obj: LocalizedName, locale: string, fallback: string): string {
  if (!obj) return fallback;
  return obj[locale] ?? obj["en"] ?? fallback;
}

interface Category {
  id: string;
  name: string;
  name_localized: LocalizedName;
  color_hex: string | null;
  display_order: number | null;
}

interface SubDiscipline {
  id: string;
  category_id: string;
  name: string;
  name_localized: LocalizedName;
  description: string | null;
}

interface UserSkill {
  id: string;
  category_id: string;
  skill_level: string;
  years_experience: number | null;
}

const SKILL_LEVELS = [
  { key: "beginner", color: "#64748B", bg: "#F1F5F9" },
  { key: "intermediate", color: "#D97706", bg: "#FEF3C7" },
  { key: "advanced", color: "#3B82F6", bg: "#DBEAFE" },
  { key: "expert", color: "#8B5CF6", bg: "#EDE9FE" },
] as const;

interface Props {
  categories: Category[];
  subDisciplines: SubDiscipline[];
  userInterests: string[];
  initialSkills: UserSkill[];
}

export function SkillsForm({ categories, subDisciplines, userInterests, initialSkills }: Props) {
  const { t, locale } = useTranslation();
  const [skills, setSkills] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of initialSkills) {
      map[s.category_id] = s.skill_level;
    }
    return map;
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(userInterests.slice(0, 2))
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Only show categories the user has selected as interests
  const activeCategories = categories.filter((c) => userInterests.includes(c.id));
  const subsByCategory = subDisciplines.reduce<Record<string, SubDiscipline[]>>((acc, sd) => {
    if (!acc[sd.category_id]) acc[sd.category_id] = [];
    acc[sd.category_id].push(sd);
    return acc;
  }, {});

  const toggleExpand = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const setSkillLevel = (categoryId: string, level: string) => {
    setSkills((prev) => ({ ...prev, [categoryId]: level }));
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const skillEntries = Object.entries(skills).map(([category_id, skill_level]) => ({
        category_id,
        skill_level,
      }));
      const result = await saveUserSkills(skillEntries);
      if (!result.error) setSaved(true);
    });
  };

  const ratedCount = Object.keys(skills).length;

  if (activeCategories.length === 0) {
    return (
      <div className="rounded-2xl border border-navy-200 bg-white p-8 text-center">
        <h1 className="text-[22px] font-bold text-navy-900 mb-4">
          {t('settings.skills.title')}
        </h1>
        <p className="text-sm text-navy-500 mb-6">
          {t('settings.interests.description')}
        </p>
        <Link
          href="/settings/interests"
          className="inline-flex rounded-xl bg-trevu-600 px-6 py-3 text-sm font-semibold text-white hover:bg-trevu-700 transition-colors"
        >
          {t('settings.nav.adventureInterests')} →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-navy-200 bg-white p-8">
      <h1 className="text-[22px] font-bold text-navy-900 mb-2">
        {t('settings.skills.title')}
      </h1>
      <p className="text-sm text-navy-500 leading-relaxed mb-6">
        {t('settings.skills.description')}
      </p>

      {/* Level legend */}
      <div className="flex gap-3 rounded-xl bg-slate-50 p-4 mb-8">
        {SKILL_LEVELS.map((level) => (
          <div key={level.key} className="flex-1 text-center">
            <span
              className="inline-block rounded-md px-3 py-1 text-xs font-semibold mb-1"
              style={{ backgroundColor: level.bg, color: level.color }}
            >
              {t(`settings.skills.${level.key}` as Parameters<typeof t>[0])}
            </span>
            <p className="text-[11px] text-navy-400 leading-tight">
              {t(`settings.skills.${level.key}Desc` as Parameters<typeof t>[0])}
            </p>
          </div>
        ))}
      </div>

      {/* Category list */}
      <div className="space-y-4">
        {activeCategories.map((cat) => {
          const display = CATEGORY_DISPLAY[cat.name];
          const isExpanded = expandedCategories.has(cat.id);
          const subs = subsByCategory[cat.id] ?? [];
          const catName = display ? getCategoryName(display, locale) : getLocalized(cat.name_localized, locale, cat.name);
          const emoji = display?.emoji ?? "🏔️";
          const colorHex = display?.colorHex ?? cat.color_hex ?? "#0D9488";
          const currentLevel = skills[cat.id];
          const currentLevelDef = SKILL_LEVELS.find((l) => l.key === currentLevel);

          return (
            <div
              key={cat.id}
              className="rounded-xl border-2 overflow-hidden"
              style={{ borderColor: colorHex }}
            >
              {/* Category header */}
              <button
                onClick={() => toggleExpand(cat.id)}
                aria-expanded={isExpanded}
                aria-label={catName}
                className="flex items-center gap-3 w-full px-5 py-4 text-left"
                style={{ backgroundColor: `${colorHex}10` }}
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
                    {currentLevel && (
                      <span
                        className="ml-2 inline-block rounded px-2 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: currentLevelDef?.bg, color: currentLevelDef?.color }}
                      >
                        {t(`settings.skills.${currentLevel}` as Parameters<typeof t>[0])}
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  className={`h-5 w-5 text-navy-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Expanded: skill level selector */}
              {isExpanded && (
                <div className="border-t px-5 pb-5 pt-4 space-y-4" style={{ borderColor: `${colorHex}30` }}>
                  {/* Overall category level */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-navy-800">
                        {t('settings.skills.title')}
                      </span>
                      {currentLevelDef && (
                        <span
                          className="rounded-md px-3 py-1 text-xs font-semibold"
                          style={{ backgroundColor: currentLevelDef.bg, color: currentLevelDef.color }}
                        >
                          {t(`settings.skills.${currentLevel}` as Parameters<typeof t>[0])}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {SKILL_LEVELS.map((level) => {
                        const isActive = currentLevel === level.key;
                        return (
                          <button
                            key={level.key}
                            onClick={() => setSkillLevel(cat.id, level.key)}
                            className="flex-1 rounded-lg py-2 text-xs font-semibold transition-colors"
                            style={{
                              backgroundColor: isActive ? level.color : level.bg,
                              color: isActive ? "#FFFFFF" : level.color,
                            }}
                          >
                            {t(`settings.skills.${level.key}` as Parameters<typeof t>[0])}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-disciplines list (info only, skill is per-category) */}
                  {subs.length > 0 && (
                    <div className="pt-2 border-t" style={{ borderColor: `${colorHex}20` }}>
                      <p className="text-xs text-navy-400 mb-2">
                        {t('settings.interests.subDisciplines')}:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {subs.map((sd) => {
                          const sdName = getLocalized(sd.name_localized, locale, sd.name);
                          return (
                            <span
                              key={sd.id}
                              className="rounded-full px-3 py-1 text-xs font-medium"
                              style={{ backgroundColor: `${colorHex}12`, color: colorHex }}
                            >
                              {sdName}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Future enhancement note */}
      <div className="mt-6 flex gap-3 rounded-xl border border-trevu-200 bg-trevu-50 p-4">
        <span className="text-base">✨</span>
        <div>
          <p className="text-[13px] font-semibold text-trevu-700">
            {t('settings.skills.futureTitle')}
          </p>
          <p className="text-xs text-navy-500 leading-relaxed mt-1">
            {t('settings.skills.futureDesc')}
          </p>
        </div>
      </div>

      {/* Summary + actions */}
      <div className="mt-8 pt-6 border-t border-navy-200">
        <p className="text-sm text-navy-500 mb-6">
          {ratedCount} {t('settings.skills.rated')}
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
