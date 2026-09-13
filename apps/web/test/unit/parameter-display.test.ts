import { describe, expect, it } from "vitest";
import { formatParameterValue, type ParameterDisplayOption } from "@/lib/i18n/localized";

const options: ParameterDisplayOption[] = [
  { value: "sea", label: "Sea / Ocean", label_localized: { hu: "Tenger / Óceán" } },
  { value: "easy", label: "Calm water", label_localized: { hu: "Nyugodt víz", en: "Calm water" } },
  { value: "catamaran_small", label: "Catamaran >45 feet", label_localized: { hu: "Katamarán >45 láb" } },
  { value: "normal", label: "Normal (20–25)", label_localized: { hu: "Normál (20–25)" } },
];

describe("trip parameter display", () => {
  it("uses Hungarian reference labels for the reported values", () => {
    expect(formatParameterValue("sea", "select", null, options, "hu")).toBe("Tenger / Óceán");
    expect(formatParameterValue("catamaran_small", "select", null, options, "hu")).toBe("Katamarán >45 láb");
    expect(formatParameterValue("easy", "select", null, options, "hu")).toBe("Nyugodt víz");
  });
  it("uses English labels with the base label as translation fallback", () => {
    expect(formatParameterValue("sea", "select", null, options, "en")).toBe("Sea / Ocean");
    expect(formatParameterValue("easy", "select", null, options, "en")).toBe("Calm water");
  });
  it("displays the configured temperature range with its unit", () => {
    expect(formatParameterValue("normal", "select", "°C", options, "hu")).toBe("Normál (20–25) °C");
  });
  it("resolves every selected option in stored order", () => {
    expect(formatParameterValue(["easy", "sea"], "multiselect", null, options, "hu"))
      .toBe("Nyugodt víz, Tenger / Óceán");
  });
  it("retains legacy values whose reference option no longer exists", () => {
    expect(formatParameterValue("retired", "select", null, options, "hu")).toBe("retired");
  });
  it("formats numeric measurements and leaves free text unchanged", () => {
    expect(formatParameterValue(40.5, "number", "nm", options, "hu")).toBe("40,5 nm");
    expect(formatParameterValue(40.5, "number", "nm", options, "en")).toBe("40.5 nm");
    expect(formatParameterValue("sea", "text", null, options, "hu")).toBe("sea");
  });
  it("falls back from a blank translation to the configured base label", () => {
    expect(formatParameterValue("1", "select", null, [{ value: "1", label: "Level one", label_localized: { hu: " " } }], "hu"))
      .toBe("Level one");
  });
});
