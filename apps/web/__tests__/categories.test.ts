import { describe, it, expect } from "vitest";
import { CATEGORY_DISPLAY } from "../lib/categories";

describe("Category Display Constants", () => {
  const categoryNames = [
    "Hiking",
    "Mountaineering",
    "Water Sports",
    "Motorsport",
    "Cycling",
    "Running",
    "Winter Sports",
  ];

  it("has all 7 adventure categories", () => {
    expect(Object.keys(CATEGORY_DISPLAY).length).toBeGreaterThanOrEqual(7);
  });

  it.each(categoryNames)("category '%s' exists", (name) => {
    expect(CATEGORY_DISPLAY[name]).toBeDefined();
  });

  it("each category has required display fields", () => {
    for (const [key, cat] of Object.entries(CATEGORY_DISPLAY)) {
      expect(cat.nameHu, `${key} missing nameHu`).toBeTruthy();
      expect(cat.nameEn, `${key} missing nameEn`).toBeTruthy();
      expect(cat.emoji, `${key} missing emoji`).toBeTruthy();
      expect(cat.colorHex, `${key} missing colorHex`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(cat.icon, `${key} missing icon`).toBeTruthy();
    }
  });

  it("each category has valid CSS color classes", () => {
    for (const [key, cat] of Object.entries(CATEGORY_DISPLAY)) {
      expect(cat.colorBg, `${key} colorBg`).toMatch(/^bg-/);
      expect(cat.colorText, `${key} colorText`).toMatch(/^text-/);
    }
  });
});
