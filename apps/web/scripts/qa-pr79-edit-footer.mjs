// PR #79 — szerkesztő alsó sáv: 390-en nincs kilógás, a gombok ≥ 44 px, 1440-en a Mégse látszik.
// Futtatás: BASE=http://localhost:3011 SLUG=<piszkozat> OUT=<mappa> node scripts/qa-pr79-edit-footer.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3011";
const SLUG = process.env.SLUG;
const OUT = process.env.OUT ?? ".";
const STATE = process.env.STATE ?? "draft";
const EMAIL = process.env.EMAIL ?? "dora@demo.trevu.local";
const PASSWORD = process.env.PASSWORD ?? "Demo-Trevu-2026!";
mkdirSync(OUT, { recursive: true });

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✔" : "✖"} ${msg}`); if (!ok) fail++; };

const browser = await chromium.launch();
for (const [w, h, locale] of [[390, 844, "hu"], [390, 844, "en"], [1440, 900, "hu"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addCookies([{ name: "trevu-locale", value: locale, url: BASE }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" && !/_vercel\/|status of 404/.test(m.text() + (m.location()?.url ?? ""))) errors.push(m.text()); });
  page.on("response", (r) => { if (r.status() >= 400) console.log("  HTTP", r.status(), r.url()); });
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/e-?mail/i).first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  await page.goto(`${BASE}/trips/${SLUG}/edit`);
  await page.waitForLoadState("networkidle");
  const footer = page.locator("div.fixed.bottom-0").last();
  const info = await footer.evaluate((el) => {
    const vis = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && r.width > 0; };
    return {
      scrollWidth: document.documentElement.scrollWidth,
      items: [...el.querySelectorAll("a,button")].filter(vis).map((e) => {
        const r = e.getBoundingClientRect();
        return { text: e.innerText.trim(), aria: e.getAttribute("aria-label"), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height) };
      }),
    };
  });
  const tag = `${w} ${locale} ${STATE}`;
  console.log(tag, JSON.stringify(info));
  check(info.scrollWidth <= w, `${tag}: scrollWidth ${info.scrollWidth} ≤ ${w}`);
  check(info.items.every((i) => i.left >= 0 && i.right <= w), `${tag}: minden gomb a látótérben`);
  const expected = STATE === "draft" ? (w < 640 ? 2 : 3) : (w < 640 ? 1 : 2);
  check(info.items.length === expected, `${tag}: ${info.items.length} látható gomb (várt ${expected})`);
  if (w < 640) check(info.items.every((i) => i.h >= 44), `${tag}: gombmagasság ≥ 44 px (${info.items.map((i) => i.h).join(", ")})`);
  check(errors.length === 0, `${tag}: 0 konzolhiba${errors.length ? " — " + errors[0] : ""}`);
  await page.screenshot({ path: `${OUT}/edit-${STATE}-${w}-${locale}.png` });
  await footer.screenshot({ path: `${OUT}/edit-${STATE}-${w}-${locale}-footer.png` });
  await ctx.close();
}
await browser.close();
console.log(fail ? `HIBA: ${fail}` : "MINDEN ZÖLD");
process.exit(fail ? 1 : 0);
