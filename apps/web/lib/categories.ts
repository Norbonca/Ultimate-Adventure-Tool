// ============================================
// Category Constants — Wizard UI Helper
// ============================================
// Maps Supabase categories.name to UI display data.
// Icons use lucide-react icon names.

import type { Locale } from '@uat/i18n';

export interface CategoryDisplay {
  name: string;
  nameHu: string;
  nameEn: string;
  descriptionHu?: string;  // localized description for HU
  icon: string;       // lucide-react icon name
  emoji: string;      // fallback emoji
  colorHex: string;
  colorBg: string;    // light bg for cards
  colorText: string;  // dark text for badges
}

/**
 * Static category display map — keyed by categories.name (English system name).
 * Used for wizard Step 1 grid, badges, cards.
 * The actual data (sub_disciplines, parameters) comes from Supabase.
 */
export const CATEGORY_DISPLAY: Record<string, CategoryDisplay> = {
  Hiking: {
    name: "Hiking",
    nameHu: "Túrázás",
    nameEn: "Hiking",
    descriptionHu: "Túrák és ösvények a természetben",
    icon: "footprints",
    emoji: "🥾",
    colorHex: "#22C55E",
    colorBg: "bg-green-50",
    colorText: "text-green-700",
  },
  Mountaineering: {
    name: "Mountaineering",
    nameHu: "Hegymászás",
    nameEn: "Mountaineering",
    descriptionHu: "Hegymászás és alpinista kalandok",
    icon: "mountain",
    emoji: "🧗",
    colorHex: "#F97316",
    colorBg: "bg-orange-50",
    colorText: "text-orange-700",
  },
  Mountain: {
    name: "Mountain",
    nameHu: "Hegymászás",
    nameEn: "Mountain",
    descriptionHu: "Hegymászás és alpinista kalandok",
    icon: "mountain",
    emoji: "🧗",
    colorHex: "#F97316",
    colorBg: "bg-orange-50",
    colorText: "text-orange-700",
  },
  "Water Sports": {
    name: "Water Sports",
    nameHu: "Vízi sportok",
    nameEn: "Water Sports",
    descriptionHu: "Vitorlázás, kajak, szörfözés és más",
    icon: "waves",
    emoji: "⛵",
    colorHex: "#3B82F6",
    colorBg: "bg-blue-50",
    colorText: "text-blue-700",
  },
  Motorsport: {
    name: "Motorsport",
    nameHu: "Motorsport",
    nameEn: "Motorsport",
    descriptionHu: "Motorozás, enduro és terep off-road",
    icon: "gauge",
    emoji: "🏍️",
    colorHex: "#B91C1C",
    colorBg: "bg-red-50",
    colorText: "text-red-700",
  },
  Cycling: {
    name: "Cycling",
    nameHu: "Kerékpározás",
    nameEn: "Cycling",
    descriptionHu: "Országúti, hegyi és gravel kerékpározás",
    icon: "bike",
    emoji: "🚴",
    colorHex: "#EAB308",
    colorBg: "bg-yellow-50",
    colorText: "text-yellow-700",
  },
  Running: {
    name: "Running",
    nameHu: "Futás",
    nameEn: "Running",
    descriptionHu: "Terepfutás, ultra és közúti versenyek",
    icon: "person-standing",
    emoji: "🏃",
    colorHex: "#EF4444",
    colorBg: "bg-red-50",
    colorText: "text-red-600",
  },
  "Winter Sports": {
    name: "Winter Sports",
    nameHu: "Téli sportok",
    nameEn: "Winter Sports",
    descriptionHu: "Sítúra, backcountry és hótalpas túrák",
    icon: "snowflake",
    emoji: "⛷️",
    colorHex: "#6366F1",
    colorBg: "bg-indigo-50",
    colorText: "text-indigo-700",
  },
  Expedition: {
    name: "Expedition",
    nameHu: "Expedíció",
    nameEn: "Expedition",
    descriptionHu: "Többnapos vadon és extrém kalandok",
    icon: "compass",
    emoji: "🎒",
    colorHex: "#8B5CF6",
    colorBg: "bg-violet-50",
    colorText: "text-violet-700",
  },
};

/**
 * Get the localized name for a category.
 */
export function getCategoryName(cat: CategoryDisplay, locale: Locale = 'hu'): string {
  return locale === 'en' ? cat.nameEn : cat.nameHu;
}

/** Difficulty level labels */
export const DIFFICULTY_LEVELS = [
  { value: 1, label: "Könnyű", labelEn: "Easy", color: "#64748B" },
  { value: 2, label: "Mérsékelt", labelEn: "Moderate", color: "#D97706" },
  { value: 3, label: "Közepes", labelEn: "Intermediate", color: "#3B82F6" },
  { value: 4, label: "Nehéz", labelEn: "Hard", color: "#8B5CF6" },
  { value: 5, label: "Extrém", labelEn: "Extreme", color: "#0F172A" },
];

/**
 * Get the localized label for a difficulty level.
 */
export function getDifficultyLabel(level: typeof DIFFICULTY_LEVELS[number], locale: Locale = 'hu'): string {
  return locale === 'en' ? level.labelEn : level.label;
}
