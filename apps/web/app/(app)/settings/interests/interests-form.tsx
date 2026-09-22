"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CATEGORY_DISPLAY, getCategoryName } from "@/lib/categories";
import { saveUserInterests, saveUserSkills } from "../actions";
import { Icon } from "@/components/Icon";

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
  { key: "none", color: "var(--color-danger)", bg: "var(--color-danger-subtle)" },
  { key: "beginner", color: "var(--color-text-muted)", bg: "var(--color-border)" },
  { key: "intermediate", color: "var(--color-warning)", bg: "var(--color-warning-subtle)" },
  { key: "advanced", color: "var(--color-info)", bg: "var(--color-info-subtle)" },
  { key: "expert", color: "var(--color-primary)", bg: "var(--color-primary-subtle)" },
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
    <div className="border border-line bg-surface p-6 sm:p-8">
      <h1 className="mb-2 font-display text-4xl font-extrabold leading-none text-ink">
        {t('settings.interests.title')}
      </h1>
      <p className="mb-2 text-sm leading-relaxed text-ink-muted">
        {t('settings.interests.description')}
      </p>
      <div className="mb-8 flex items-center gap-2 text-xs font-medium text-accent">
        <Icon name="info" size={16} />
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
          const iconName = display?.icon ?? cat.icon_name ?? "compass";
          const colorHex = display?.colorHex ?? cat.color_hex ?? "var(--color-primary)";

          return (
            <div
              key={cat.id}
              className="overflow-hidden border-2 transition-colors"
              style={{
                borderColor: isSelected ? colorHex : "var(--color-border)",
                backgroundColor: "var(--color-surface)",
              }}
            >
              {/* Category header */}
              <button
                onClick={() => isSelected ? toggleExpand(cat.id) : toggleCategory(cat.id)}
                aria-expanded={isSelected ? isExpanded : undefined}
                aria-label={catName}
                className="flex items-center gap-3 w-full px-5 py-4 text-left transition-colors"
                style={{ backgroundColor: isSelected ? `${colorHex}10` : undefined }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center text-xl"
                  style={{ backgroundColor: colorHex }}
                >
                  <Icon name={iconName} size={20} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-ink">{catName}</div>
                  <div className="text-xs text-ink-muted">
                    {subs.length} {t('settings.interests.subDisciplines')}
                    {isSelected && ` · ${t('settings.interests.selected')}`}
                  </div>
                </div>
                {isSelected && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); toggleCategory(cat.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleCategory(cat.id); } }}
                    className="cursor-pointer px-2 py-1 text-xs font-medium text-ink-muted hover:text-[var(--color-danger)]"
                  >
                    {t('common.remove')}
                  </div>
                )}
                <Icon name="chevron-down" size={20} className={`text-ink-muted transition-transform ${isExpanded ? "rotate-180" : ""}`} />
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
                        className="border px-4 py-3"
                        style={{
                          backgroundColor: `${colorHex}08`,
                          borderColor: `${colorHex}30`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-ink">{sdName}</span>
                          {currentLevelDef && (
                            <span
                              className="px-2 py-0.5 text-[11px] font-semibold"
                              style={{ backgroundColor: currentLevelDef.bg, color: currentLevelDef.color }}
                            >
                              {t(`profile.skillLevels.${currentLevel}` as Parameters<typeof t>[0])}
                            </span>
                          )}
                        </div>
                        {sd.description && locale === 'en' && (
                          <p className="mb-2 text-xs text-ink-muted">{sd.description}</p>
                        )}
                        {/* Skill level bar */}
                        <div className="flex gap-1.5">
                          {SKILL_LEVELS.map((level) => {
                            const isActive = currentLevel === level.key;
                            return (
                              <button
                                key={level.key}
                                onClick={() => setSkillLevel(sd.id, level.key)}
                                className="flex-1 py-1.5 text-[11px] font-semibold transition-colors"
                                style={{
                                  backgroundColor: isActive ? level.color : level.bg,
                                  color: isActive ? "var(--color-surface)" : level.color,
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
      <div className="mt-8 border-t border-line pt-6">
        <p className="mb-6 text-sm text-ink-muted">
          {selectedCount} {t('settings.interests.categoriesActive')} · {totalSubs} {t('settings.interests.subDisciplinesAvailable')}
        </p>
        <div className="flex gap-3">
          <a
            href="/profile"
            className="inline-flex min-h-12 items-center justify-center border border-line-strong bg-surface px-7 py-3 text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {t('common.cancel')}
          </a>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="min-h-12 bg-accent px-7 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {isPending ? t('common.loading') : saved ? t('common.saved') : t('common.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
