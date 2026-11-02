// M211b — promó bemutató böngészős bejárása (helyi dev szerver + helyi Supabase demóadat).
// Használat: BASE=http://localhost:3011 OUT=<mappa> node scripts/qa-m211b-presentation.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3011";
const OUT = process.env.OUT ?? "/tmp/qa-m211b";
const PASSWORD = "Demo-Trevu-2026!";
mkdirSync(OUT, { recursive: true });

const results = [];
const errors = [];
const check = (name, ok, info = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "✔" : "✖"} ${name}${ok || !info ? "" : ` — ${info}`}`);
};

const browser = await chromium.launch();
async function page(width, locale = "hu", reducedMotion = "no-preference") {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, deviceScaleFactor: 1, reducedMotion });
  await ctx.addCookies([{ name: "trevu-locale", value: locale, url: BASE }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/Download the React DevTools|favicon|_vercel|sentry/i.test(m.text())) errors.push(`${p.url()} :: ${m.text().slice(0, 200)}`);
  });
  p.on("pageerror", (e) => errors.push(`${p.url()} :: pageerror ${e.message.slice(0, 200)}`));
  return p;
}
const noHScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const idx = async (p) => Number(await p.getByTestId("presentation").getAttribute("data-index"));

// 1) Lejátszó 1440 / 390, hu
for (const w of [1440, 390]) {
  const p = await page(w);
  await p.goto(BASE + "/presentation", { waitUntil: "networkidle", timeout: 120000 });
  check(`/presentation ${w}: kijelentkezve elérhető, 1. dia`, (await idx(p)) === 0 && (await p.getByTestId("slide-cover").count()) === 1);
  check(`/presentation ${w}: számláló 1 / 19`, (await p.getByTestId("presentation-counter").textContent())?.trim() === "1 / 19");
  check(`/presentation ${w}: borítócím a jóváhagyott szöveg`, (await p.locator("h1").first().textContent())?.trim() === "A kalandtúrád szervezése egy helyen");
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `${OUT}/p-${w}-01.png` });
  const shots = w === 1440 ? [2, 3, 4, 8, 15, 16, 18, 19] : [2, 4, 8, 15, 19];
  await p.getByTestId("presentation-toggle").click(); // szünet
  for (const n of shots) {
    await p.goto(BASE + `/presentation#${n}`, { waitUntil: "networkidle" });
    await p.reload({ waitUntil: "networkidle" });
    await p.waitForTimeout(1600);
    check(`/presentation ${w}: #${n} → ${n}. dia`, (await idx(p)) === n - 1);
    check(`/presentation ${w} #${n}: nincs vízszintes görgetés`, await noHScroll(p));
    await p.screenshot({ path: `${OUT}/p-${w}-${String(n).padStart(2, "0")}.png` });
  }
  await p.close();
}

// 2) Vezérlés: gombok, billentyűk, automatikus léptetés, URL
{
  const p = await page(1440);
  await p.goto(BASE + "/presentation", { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForTimeout(7600);
  check("automatikus léptetés: 7 mp után a 2. dia", (await idx(p)) === 1);
  await p.getByTestId("presentation-toggle").click();
  check("szünet: aria-pressed=false", (await p.getByTestId("presentation-toggle").getAttribute("aria-pressed")) === "false");
  await p.waitForTimeout(7600);
  check("szünetben nem lép tovább", (await idx(p)) === 1);
  await p.getByTestId("presentation-next").click();
  check("Következő → 3. dia, URL #3", (await idx(p)) === 2 && p.url().endsWith("#3"));
  await p.keyboard.press("ArrowLeft");
  check("← billentyű → 2. dia", (await idx(p)) === 1);
  await p.keyboard.press("End");
  check("End → utolsó dia, regisztráció gomb", (await idx(p)) === 18 && (await p.getByTestId("presentation-register").isVisible()));
  check("utolsó dián a Következő tiltott", await p.getByTestId("presentation-next").isDisabled());
  await p.keyboard.press("Home");
  check("Home → 1. dia, az Előző tiltott", (await idx(p)) === 0 && (await p.getByTestId("presentation-prev").isDisabled()));
  await p.close();
}

// 3) Angol és mozgáscsökkentés
{
  const p = await page(1440, "en", "reduce");
  await p.goto(BASE + "/presentation", { waitUntil: "networkidle", timeout: 120000 });
  check("EN: borítócím angolul", (await p.locator("h1").first().textContent())?.trim() === "Organize your adventure trip in one place");
  await p.waitForTimeout(7600);
  check("mozgáscsökkentés: nincs automatikus léptetés", (await idx(p)) === 0);
  await p.close();
}

// 4) Promó blokk: kijelentkezve a nyitóoldalon és a Kezdésen, belépve a nyitóoldalon nincs
for (const w of [1440, 390]) {
  const p = await page(w);
  await p.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120000 });
  const promo = p.getByTestId("presentation-promo");
  await promo.waitFor({ timeout: 15000 }).catch(() => {});
  check(`nyitóoldal ${w} kijelentkezve: promó blokk`, (await promo.count()) === 1);
  await p.waitForTimeout(2500);
  const vstate = await p.getByTestId("presentation-promo-video").evaluate((v) => ({ paused: v.paused, muted: v.muted, t: v.currentTime, loop: v.loop }));
  check(`nyitóoldal ${w}: a bemutatóvideó magától, némán, ismétlődve fut`, !vstate.paused && vstate.muted && vstate.loop && vstate.t > 0.5, JSON.stringify(vstate));
  check(`nyitóoldal ${w}: nincs vízszintes görgetés`, await noHScroll(p));
  await promo.scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await promo.screenshot({ path: `${OUT}/promo-home-${w}.png` });
  await p.goto(BASE + "/get-started", { waitUntil: "networkidle", timeout: 120000 });
  check(`Kezdés ${w}: promó blokk`, (await p.getByTestId("presentation-promo").count()) === 1);
  await p.getByTestId("presentation-promo").scrollIntoViewIfNeeded();
  await p.getByTestId("presentation-promo").screenshot({ path: `${OUT}/promo-getstarted-${w}.png` });
  if (w === 1440) {
    await p.getByTestId("presentation-promo").locator("a").first().click();
    await p.waitForURL((u) => u.pathname === "/presentation", { timeout: 30000 });
    check("promó → /presentation", new URL(p.url()).pathname === "/presentation");
  }
  await p.close();
}
{
  const p = await page(1440);
  await p.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 });
  await p.locator("#email").fill("dora@demo.trevu.local");
  await p.locator("#password").fill(PASSWORD);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), p.locator('button[type="submit"]').first().click()]);
  await p.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForTimeout(1500);
  check("nyitóoldal belépve: nincs promó blokk", (await p.getByTestId("presentation-promo").count()) === 0);
  await p.close();
}

await browser.close();
check("konzolhiba nincs", errors.length === 0, errors.slice(0, 5).join(" | "));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} rendben`);
process.exit(failed.length ? 1 : 0);
