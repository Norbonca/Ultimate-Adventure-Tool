import { describe, it, expect } from "vitest";
import { containsContact, firstIssue, ideaInputSchema } from "@/lib/ideas/schemas";

const base = {
  title: "Vitorlázás a Balti-tengeren augusztusban",
  category_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  destinations: [{ name: "Balti-tenger", country_codes: ["EE"] }],
  window_start_month: 7,
  window_end_month: 8,
};

describe("M22 containsContact (BR-M22-011 — Norbert: A, tiltás)", () => {
  it("e-mail, telefon és webcím tiltott", () => {
    expect(containsContact("írj: valaki@example.com")).toBe(true);
    expect(containsContact("hívj: +36 30 123 4567")).toBe(true);
    expect(containsContact("tel 06301234567")).toBe(true);
    expect(containsContact("nézd meg: www.pelda.hu")).toBe(true);
    expect(containsContact("https://pelda.hu/ajanlat")).toBe(true);
    expect(containsContact("tovabbi info pelda.com/x")).toBe(true);
  });
  it("sima szöveg, dátum és ártartomány átmegy", () => {
    expect(containsContact("Két hét augusztusban, 1 200–1 500 EUR fejenként.")).toBe(false);
    expect(containsContact("Indulás 2027. 08. 10., Tallinnból.")).toBe(false);
    expect(containsContact("2027. 08. 10. – 2027. 08. 20. között, 12 fő")).toBe(false);
    expect(containsContact(null)).toBe(false);
  });
});

describe("M22 ideaInputSchema", () => {
  it("minimális érvényes bemenet, alapértékekkel", () => {
    const r = ideaInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.intent).toBe("seeking_organizer");
      expect(r.data.visibility).toBe("public");
      expect(r.data.created_via).toBe("form");
    }
  });
  it("hibakulcsok: cím, kontakt, időtartam, csoport, költség", () => {
    const short = ideaInputSchema.safeParse({ ...base, title: "Rövid" });
    expect(short.success).toBe(false);
    if (!short.success) expect(firstIssue(short.error).key).toBe("titleLength");

    const contact = ideaInputSchema.safeParse({ ...base, description: "írj: x@y.hu" });
    expect(contact.success).toBe(false);
    if (!contact.success) expect(firstIssue(contact.error).key).toBe("contactNotAllowed");

    const dur = ideaInputSchema.safeParse({ ...base, duration_min_days: 10, duration_max_days: 5 });
    expect(dur.success).toBe(false);
    if (!dur.success) expect(firstIssue(dur.error).key).toBe("durationRange");

    const grp = ideaInputSchema.safeParse({ ...base, group_size_min: 20, group_size_max: 10 });
    expect(grp.success).toBe(false);
    if (!grp.success) expect(firstIssue(grp.error).key).toBe("groupSizeRange");

    const bud = ideaInputSchema.safeParse({ ...base, budget_amount: 500 });
    expect(bud.success).toBe(false);
    if (!bud.success) expect(firstIssue(bud.error).key).toBe("budgetInvalid");
  });
  it("célállomás: ország vagy kontinens kötelező, legfeljebb 5", () => {
    expect(ideaInputSchema.safeParse({ ...base, destinations: [{ name: "Valahol", country_codes: [] }] }).success).toBe(false);
    expect(ideaInputSchema.safeParse({ ...base, destinations: [{ name: "Alpok", continent: "Europe", country_codes: [] }] }).success).toBe(true);
    const six = Array.from({ length: 6 }, (_, i) => ({ name: `Hely ${i}`, country_codes: ["AT"] }));
    expect(ideaInputSchema.safeParse({ ...base, destinations: six }).success).toBe(false);
  });
});
