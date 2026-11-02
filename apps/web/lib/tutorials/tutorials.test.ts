// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  activeStepIndex,
  buildVtt,
  filterTutorials,
  formatTime,
  getTutorial,
  listTutorials,
  relatedTutorials,
  tutorialsForAnchor,
} from "./index";

const PUBLIC = join(__dirname, "../../public");

describe("M211 tutorial content", () => {
  const all = listTutorials();

  it("has unique slugs in URL-safe form", () => {
    const slugs = all.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("has every text in Hungarian and English", () => {
    for (const t of all) {
      for (const field of [t.title, t.summary, t.topic, ...(t.tip ? [t.tip] : []), ...t.steps.map((s) => s.text)]) {
        expect(field.hu.trim(), t.slug).not.toBe("");
        expect(field.en.trim(), t.slug).not.toBe("");
      }
      expect(t.body.hu.length, t.slug).toBe(t.body.en.length);
    }
  });

  it("keeps steps ordered, inside the video and 20–60 s long (ND-08)", () => {
    for (const t of all) {
      expect(t.duration, t.slug).toBeGreaterThanOrEqual(20);
      expect(t.duration, t.slug).toBeLessThanOrEqual(60);
      t.steps.forEach((s, i) => {
        expect(s.at, t.slug).toBeLessThan(t.duration);
        if (i > 0) expect(s.at, t.slug).toBeGreaterThan(t.steps[i - 1].at);
      });
    }
  });

  it("links only to existing tutorials and ships a poster for each", () => {
    for (const t of all) {
      expect(relatedTutorials(t).length, t.slug).toBe(t.related.length);
      expect(t.related, t.slug).not.toContain(t.slug);
      expect(existsSync(join(PUBLIC, "tutorials/posters", `${t.slug}.jpg`)), `${t.slug} poster`).toBe(true);
      if (t.hasVideo) expect(existsSync(join(PUBLIC, "tutorials/videos", `${t.slug}.mp4`)), `${t.slug} video`).toBe(true);
      if (t.hasSlides)
        t.steps.forEach((_, i) => expect(existsSync(join(PUBLIC, "tutorials/slides", t.slug, `${i + 1}.jpg`)), `${t.slug} slide ${i + 1}`).toBe(true));
    }
  });

  it("has exactly one featured tutorial", () => {
    expect(all.filter((t) => t.featured)).toHaveLength(1);
  });
});

describe("M211 tutorial helpers", () => {
  it("resolves anchors and hides the link when there is none", () => {
    expect(tutorialsForAnchor("expenses").map((t) => t.slug)).toEqual(["kozos-koltseg"]);
    expect(tutorialsForAnchor("does.not.exist")).toEqual([]);
  });

  it("filters by role and by accent-insensitive words", () => {
    expect(filterTutorials({ role: "traveler" }, "hu").every((t) => t.role === "traveler")).toBe(true);
    expect(filterTutorials({ q: "koltseg" }, "hu").map((t) => t.slug)).toContain("kozos-koltseg");
    expect(filterTutorials({ q: "expense" }, "en").map((t) => t.slug)).toContain("kozos-koltseg");
    expect(filterTutorials({ q: "zzzz" }, "hu")).toEqual([]);
  });

  it("formats times and finds the active step", () => {
    expect(formatTime(45)).toBe("0:45");
    expect(formatTime(75.9)).toBe("1:15");
    const t = getTutorial("kozos-koltseg")!;
    expect(activeStepIndex(t, 0)).toBe(-1);
    expect(activeStepIndex(t, 12)).toBe(1);
    expect(activeStepIndex(t, 44)).toBe(4);
  });

  it("builds WebVTT cues from the steps", () => {
    const vtt = buildVtt(getTutorial("kozos-koltseg")!, "hu");
    expect(vtt.startsWith("WEBVTT\n\n1\n00:00:04.000 --> 00:00:12.000\nNyisd meg")).toBe(true);
    expect(vtt).toContain("00:00:40.000 --> 00:00:45.000");
    expect(buildVtt(getTutorial("kozos-koltseg")!, "en")).toContain("Tap “Add expense”");
  });
});
