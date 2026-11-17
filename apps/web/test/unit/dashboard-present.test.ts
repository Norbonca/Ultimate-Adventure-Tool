import { describe, it, expect } from "vitest";
import { hatarido, savSzamlalo, todoCim, todoRangsor } from "@/lib/dashboard/present";
import type { Todo } from "@/app/(app)/dashboard/queries";

/** Egyszerű fordító: a kulcsot adja vissza, a behelyettesítésekkel — így a logika látszik, nem a szöveg. */
const t = ((kulcs: string, params?: Record<string, string | number>) =>
  params ? `${kulcs}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(",")})` : kulcs) as never;

const todo = (p: Partial<Todo>): Todo => ({
  id: "x", kind: "organizerTask", icon: "square", href: "/", trip: "Túra",
  params: {}, days: null, action: "open", soft: false, ...p,
});

describe("dashboard — határidő", () => {
  it("a lejárt határidő sürgős, és napban mondja meg, mennyire", () => {
    expect(hatarido(t, { days: -3 })).toEqual({ szoveg: "dashboard.dueOverdue(days=3)", surgos: true });
  });

  it("egy nap késésnek saját, egyes számú kulcsa van", () => {
    expect(hatarido(t, { days: -1 })).toEqual({ szoveg: "dashboard.dueOverdueOne", surgos: true });
  });

  it("a mai és a holnapi határidő sürgős", () => {
    expect(hatarido(t, { days: 0 }).surgos).toBe(true);
    expect(hatarido(t, { days: 1 }).surgos).toBe(true);
  });

  it("két napon túl már nem sürgős, de szöveget akkor is kap", () => {
    const h = hatarido(t, { days: 12 });
    expect(h.surgos).toBe(false);
    expect(h.szoveg).toBe("dashboard.dueDays(days=12)");
  });

  it("határidő nélkül nem sürgős, és nem marad üres a sor vége", () => {
    expect(hatarido(t, { days: null })).toEqual({ szoveg: "dashboard.dueNone", surgos: false });
  });
});

describe("dashboard — teendő címe", () => {
  it("egy jelentkezésnél egyes számú kulcs", () => {
    expect(todoCim(t, todo({ kind: "pendingApplications", params: { count: 1 }, days: 0 })))
      .toBe("dashboard.todoPendingApplicationsOne");
  });

  it("többnél a számot behelyettesíti", () => {
    expect(todoCim(t, todo({ kind: "pendingApplications", params: { count: 3 }, days: 0 })))
      .toBe("dashboard.todoPendingApplications(count=3)");
  });

  it("a ma lejáró jelentkezési határidő saját szöveget kap", () => {
    expect(todoCim(t, todo({ kind: "deadlineSoon", params: { days: 0 }, days: 0 })))
      .toBe("dashboard.todoDeadlineToday");
  });

  it("a ma induló túra saját szöveget kap", () => {
    expect(todoCim(t, todo({ kind: "tripSoon", params: { days: 0 }, days: 0 })))
      .toBe("dashboard.todoTripToday");
  });
});

describe("dashboard — sáv számlálója", () => {
  it("csak szorító teendő", () => {
    expect(savSzamlalo(t, [{ soft: false }, { soft: false }])).toBe("dashboard.laneCount(count=2)");
  });

  it("szorító és ráérős együtt", () => {
    expect(savSzamlalo(t, [{ soft: false }, { soft: true }])).toBe("dashboard.laneCountWithSoft(count=1,soft=1)");
  });

  it("csak ráérős", () => {
    expect(savSzamlalo(t, [{ soft: true }])).toBe("dashboard.laneCountSoftOnly(soft=1)");
  });
});

describe("dashboard — rangsor", () => {
  it("a lejárt elöl, a ráérős a végén, a határidő nélküli a szorítók után", () => {
    const sorok = [
      { days: null, soft: false },
      { days: 5, soft: false },
      { days: -2, soft: false },
      { days: 1, soft: true },
    ];
    expect([...sorok].sort(todoRangsor)).toEqual([
      { days: -2, soft: false },
      { days: 5, soft: false },
      { days: null, soft: false },
      { days: 1, soft: true },
    ]);
  });
});
