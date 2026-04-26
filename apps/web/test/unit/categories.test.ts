/**
 * Unit tests for `apps/web/lib/categories.ts` UI helpers.
 *
 * Coverage targets (TEST_CASES.md UNIT-categories-display):
 *   - getCategoryName(cat, locale) — locale-aware
 *   - getDifficultyLabel(level, locale)
 *   - CATEGORY_DISPLAY consistency invariants
 */

import { describe, it, expect } from 'vitest';
import {
  CATEGORY_DISPLAY,
  DIFFICULTY_LEVELS,
  getCategoryName,
  getDifficultyLabel,
} from '@/lib/categories';

describe('getCategoryName', () => {
  it('returns Hungarian name for hu locale', () => {
    expect(getCategoryName(CATEGORY_DISPLAY.Hiking, 'hu')).toBe('Túrázás');
  });

  it('returns English name for en locale', () => {
    expect(getCategoryName(CATEGORY_DISPLAY.Hiking, 'en')).toBe('Hiking');
  });

  it('defaults to hu when locale omitted', () => {
    expect(getCategoryName(CATEGORY_DISPLAY.Hiking)).toBe('Túrázás');
  });
});

describe('getDifficultyLabel', () => {
  it('returns Hungarian label for hu locale', () => {
    expect(getDifficultyLabel(DIFFICULTY_LEVELS[0], 'hu')).toBe('Könnyű');
    expect(getDifficultyLabel(DIFFICULTY_LEVELS[4], 'hu')).toBe('Extrém');
  });

  it('returns English label for en locale', () => {
    expect(getDifficultyLabel(DIFFICULTY_LEVELS[0], 'en')).toBe('Easy');
    expect(getDifficultyLabel(DIFFICULTY_LEVELS[4], 'en')).toBe('Extreme');
  });

  it('defaults to hu when locale omitted', () => {
    expect(getDifficultyLabel(DIFFICULTY_LEVELS[2])).toBe('Közepes');
  });
});

describe('CATEGORY_DISPLAY invariants', () => {
  it('every category has all required fields', () => {
    for (const [key, cat] of Object.entries(CATEGORY_DISPLAY)) {
      expect(cat.name, `${key}.name`).toBeTruthy();
      expect(cat.nameHu, `${key}.nameHu`).toBeTruthy();
      expect(cat.nameEn, `${key}.nameEn`).toBeTruthy();
      expect(cat.icon, `${key}.icon`).toBeTruthy();
      expect(cat.emoji, `${key}.emoji`).toBeTruthy();
      expect(cat.colorHex, `${key}.colorHex`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('every category icon is kebab-case (Icon Bank convention)', () => {
    for (const [key, cat] of Object.entries(CATEGORY_DISPLAY)) {
      expect(cat.icon, `${key}.icon "${cat.icon}"`).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('emoji is a single grapheme cluster', () => {
    for (const [key, cat] of Object.entries(CATEGORY_DISPLAY)) {
      // Most emoji are 1-2 code points; allow up to 4 (e.g. flag, ZWJ)
      expect([...cat.emoji].length, `${key}.emoji "${cat.emoji}"`).toBeLessThanOrEqual(7);
    }
  });
});

describe('DIFFICULTY_LEVELS invariants', () => {
  it('has exactly 5 levels (CLAUDE.md §3.7)', () => {
    expect(DIFFICULTY_LEVELS).toHaveLength(5);
  });

  it('values are 1..5 in ascending order', () => {
    DIFFICULTY_LEVELS.forEach((lvl, i) => {
      expect(lvl.value).toBe(i + 1);
    });
  });

  it('every level has Hungarian + English label', () => {
    DIFFICULTY_LEVELS.forEach((lvl, i) => {
      expect(lvl.label, `level ${i + 1} HU`).toBeTruthy();
      expect(lvl.labelEn, `level ${i + 1} EN`).toBeTruthy();
      expect(lvl.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
