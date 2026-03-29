import { describe, it, expect, beforeEach } from "vitest";
import { t, setLocale, getLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@uat/i18n";

describe("i18n system", () => {
  beforeEach(() => {
    setLocale("hu");
  });

  describe("locale management", () => {
    it("default locale is Hungarian", () => {
      expect(DEFAULT_LOCALE).toBe("hu");
    });

    it("supports hu and en locales", () => {
      expect(SUPPORTED_LOCALES).toEqual(["hu", "en"]);
    });

    it("can switch locale", () => {
      setLocale("en");
      expect(getLocale()).toBe("en");
      setLocale("hu");
      expect(getLocale()).toBe("hu");
    });

    it("ignores invalid locale", () => {
      setLocale("xx" as "hu");
      expect(getLocale()).toBe("hu");
    });
  });

  describe("translation lookup", () => {
    it("translates common keys in Hungarian", () => {
      setLocale("hu");
      expect(t("common.save")).toBe("Mentés");
      expect(t("common.cancel")).toBe("Mégse");
      expect(t("common.loading")).toBe("Betöltés...");
    });

    it("translates common keys in English", () => {
      setLocale("en");
      expect(t("common.save")).toBe("Save");
      expect(t("common.cancel")).toBe("Cancel");
      expect(t("common.loading")).toBe("Loading...");
    });

    it("returns key for missing translations", () => {
      const result = t("nonexistent.key" as Parameters<typeof t>[0]);
      expect(result).toBe("nonexistent.key");
    });

    it("handles nested keys", () => {
      setLocale("hu");
      const result = t("common.appName");
      expect(result).toBe("Trevu");
    });
  });

  describe("interpolation", () => {
    it("replaces {count} placeholder", () => {
      setLocale("hu");
      // Test with a known interpolation key
      const result = t("profile.overview.memberSince", { date: "2026" });
      expect(result).toContain("2026");
    });
  });

  describe("key sync between languages", () => {
    it("both languages have the same app name", () => {
      setLocale("hu");
      const huName = t("common.appName");
      setLocale("en");
      const enName = t("common.appName");
      expect(huName).toBe(enName);
    });
  });
});
