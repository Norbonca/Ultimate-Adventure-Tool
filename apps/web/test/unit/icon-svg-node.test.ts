import { describe, expect, it } from "vitest";
import { iconSvgNode } from "@/lib/icons";
import { CATEGORY_DISPLAY } from "@/lib/categories";

// A megosztókép (app/og/trips/[slug]) az ikonok nyers geometriáját rajzolja; az álnév-modulok
// (pl. a lucide 1.x `waves`) nem adnak geometriát — ezért minden használt kulcsra ellenőrizzük.
describe("iconSvgNode", () => {
  it.each(["calendar", "map-pin", "hourglass"])("returns geometry for the OG meta icon %s", (name) => {
    expect(iconSvgNode(name)?.length).toBeGreaterThan(0);
  });

  it.each(Object.entries(CATEGORY_DISPLAY).map(([k, v]) => [k, v.icon]))("returns geometry for the %s category icon (%s)", (_cat, icon) => {
    const node = iconSvgNode(icon);
    expect(node?.length).toBeGreaterThan(0);
    for (const [tag, attrs] of node!) {
      expect(typeof tag).toBe("string");
      expect(typeof attrs).toBe("object");
    }
  });

  it("returns null for keys outside the list", () => {
    expect(iconSvgNode("not-an-icon")).toBeNull();
  });
});
