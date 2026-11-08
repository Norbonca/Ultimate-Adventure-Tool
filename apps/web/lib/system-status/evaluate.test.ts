import { describe, expect, it } from "vitest";
import {
  evaluateCron,
  evaluateDatabase,
  evaluateExternal,
  evaluateFx,
  evaluateHttpCritical,
  evaluateMigrations,
  parseExpectedMigrations,
  summarize,
} from "./evaluate";
import { shouldReuse } from "./service";
import { affectedNames, stripItemState } from "@/components/admin/system-status/format";
import type { CheckResult } from "./types";

const check = (over: Partial<CheckResult>): CheckResult => ({
  key: "database",
  group: "platform",
  state: "ok",
  critical: true,
  value: null,
  ...over,
});

describe("M151 evaluateDatabase", () => {
  it("rendben 800 ms-ig, fölötte figyelmeztet, hibánál hiba", () => {
    expect(evaluateDatabase(84.4, false)).toEqual({ state: "ok", value: { key: "latency", params: { ms: 84 } } });
    expect(evaluateDatabase(801, false).state).toBe("warn");
    expect(evaluateDatabase(null, true).state).toBe("down");
  });
});

describe("M151 evaluateMigrations", () => {
  it("minden fájl lefutott → rendben, utolsó verzióval", () => {
    expect(evaluateMigrations(["001", "002"], ["002", "001"])).toEqual({
      state: "ok",
      value: { key: "migrationsAll", params: { applied: 2, total: 2, last: "002" } },
    });
  });
  it("hiányzó fájl → figyelmeztetés a számokkal (kisebb szám is, --include-all)", () => {
    const r = evaluateMigrations(["059", "070", "080"], ["070"]);
    expect(r.state).toBe("warn");
    expect(r.value).toEqual({ key: "migrationsMissing", params: { count: 2, list: "059, 080" } });
  });
  it("az élesben több fut, mint a kódban (új migráció a deploy előtt) → rendben", () => {
    expect(evaluateMigrations(["001"], ["001", "002"]).state).toBe("ok");
  });
  it("nincs elvárt lista → nem hiba; sikertelen lekérdezés → hiba", () => {
    expect(evaluateMigrations([], ["001"]).value.key).toBe("migrationsUnknownExpected");
    expect(evaluateMigrations(["001"], null).state).toBe("down");
  });
});

describe("M151 evaluateCron", () => {
  const job = (name: string, status: string | null, active = true) => ({ name, schedule: "* * * * *", active, status, startTime: null });
  it("sikertelen utolsó futás → figyelmeztetés névvel; a kikapcsolt feladat nem számít", () => {
    const r = evaluateCron([job("a", "succeeded"), job("fx-sync-daily", "failed"), job("old", "failed", false)]);
    expect(r).toEqual({ state: "warn", value: { key: "cronFailed", params: { failed: 1, total: 2, names: "fx-sync-daily" } } });
  });
  it("minden sikeres → rendben; lekérdezési hiba → hiba", () => {
    expect(evaluateCron([job("a", "succeeded"), job("b", null)]).value).toEqual({ key: "cronOk", params: { ok: 1, total: 2 } });
    expect(evaluateCron(null).state).toBe("down");
  });
});

describe("M151 evaluateFx", () => {
  const now = new Date("2026-11-08T17:00:00Z");
  it("péntek délutáni szinkron vasárnap még rendben (≤ 4 nap)", () => {
    expect(evaluateFx([{ status: "ok", startedAt: "2026-11-06T16:17:00Z" }], now).state).toBe("ok");
  });
  it("4 napnál régebbi sikeres → figyelmeztetés", () => {
    expect(evaluateFx([{ status: "ok", startedAt: "2026-11-03T16:17:00Z" }], now).state).toBe("warn");
  });
  it("az utolsó befejezett futás hibás → figyelmeztetés; a futó sort átugorja", () => {
    const r = evaluateFx(
      [
        { status: "running", startedAt: "2026-11-08T16:59:00Z" },
        { status: "error", startedAt: "2026-11-07T16:17:00Z" },
        { status: "ok", startedAt: "2026-11-06T16:17:00Z" },
      ],
      now,
    );
    expect(r.value.key).toBe("fxLastFailed");
  });
  it("partial sikeresnek számít; még nem futott → figyelmeztetés", () => {
    expect(evaluateFx([{ status: "partial", startedAt: "2026-11-08T10:00:00Z" }], now).state).toBe("ok");
    expect(evaluateFx([], now).value.key).toBe("fxNever");
  });
});

describe("M151 külső és kritikus HTTP", () => {
  it("külső kiesés csak figyelmeztetés", () => {
    expect(evaluateExternal(null, null).state).toBe("warn");
    expect(evaluateExternal(503, 120).state).toBe("warn");
    expect(evaluateExternal(200, 75.6).value).toEqual({ key: "latency", params: { ms: 76 } });
  });
  it("az Auth kiesése hiba", () => {
    expect(evaluateHttpCritical(500, 40).state).toBe("down");
    expect(evaluateHttpCritical(null, null).state).toBe("down");
    expect(evaluateHttpCritical(200, 61).state).toBe("ok");
  });
});

describe("M151 summarize", () => {
  it("kritikus hiba → hiba; nem kritikus hiba → csak figyelmeztetés", () => {
    expect(summarize([check({ state: "down" }), check({ key: "fx", critical: false })]).state).toBe("down");
    const s = summarize([check({}), check({ key: "cron", critical: false, state: "down" }), check({ key: "extEox", critical: false, state: "warn" })]);
    expect(s).toEqual({ state: "warn", ok: 1, warn: 1, down: 1, total: 3, affected: ["cron", "extEox"] });
  });
  it("minden rendben", () => {
    expect(summarize([check({}), check({ key: "auth" })])).toMatchObject({ state: "ok", ok: 2, affected: [] });
  });
});

describe("M151 segédek", () => {
  it("a buildkor rögzített lista beolvasása", () => {
    expect(parseExpectedMigrations("001, 002,,080")).toEqual(["001", "002", "080"]);
    expect(parseExpectedMigrations(undefined)).toEqual([]);
  });
  it("gyorsítótár: 15 mp-ig újrahasznosít, kézi ellenőrzésnél csak 5 mp-ig", () => {
    expect(shouldReuse(null, 1000, false)).toBe(false);
    expect(shouldReuse(0, 14_000, false)).toBe(true);
    expect(shouldReuse(0, 16_000, false)).toBe(false);
    expect(shouldReuse(0, 4_000, true)).toBe(true);
    expect(shouldReuse(0, 6_000, true)).toBe(false);
  });
  it("az állapotsáv „Külső” pöttye a legrosszabb külső állapot; az érintettek egyszer szerepelnek", () => {
    const checks = [check({ key: "extFrankfurter", state: "ok" }), check({ key: "extEox", state: "warn" })];
    expect(stripItemState("external", checks)).toBe("warn");
    const t = (k: string) => k.split(".").pop() as string;
    expect(affectedNames(["extEox", "extNominatim", "migrations"], t as never)).toBe("external, migrations");
  });
});
