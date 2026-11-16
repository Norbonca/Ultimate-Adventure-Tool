// M211b — A bemutató (/presentation) képernyőképei a helyi demókörnyezetből, az aktuális arculattal.
// Kimenet: public/presentation/<név>.jpg — asztali 1600×1000 (1440×900 nézet), mobil 600×1298 (390×844 nézet).
// Használat: BASE=http://localhost:3013 node scripts/presentation-capture.mjs [szűrő]
// Előzmény: a prez-demo munkafa prez-capture.mjs szkriptje (2026-11); a képnevek a lib/presentation/content.ts-é.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3011";
const FILTER = process.argv[2] ? new RegExp(process.argv[2]) : null;
const OUT = "public/presentation";
const TMP = "/tmp/presentation-capture";
mkdirSync(TMP, { recursive: true });

const BASE_TRIP = "split-vitorlas-tura", EXP_TRIP = "split-vitorlas-tura-1-ca6750", SEPT = "split-vitorlas-tura-1-f38016";
const D = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const M = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const settle = async (p, ms = 1200) => { await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(ms); };
const clickText = (t) => async (p) => { await p.getByText(t, { exact: false }).first().click(); await settle(p); };
const scrollTo = (sel, offset = 90) => async (p) => {
  const el = typeof sel === "string" ? p.locator(sel).first() : sel(p);
  await el.waitFor({ timeout: 20000 });
  await el.evaluate((e, o) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - o), offset);
  await settle(p, 600);
};
const openApply = async (p) => {
  await p.locator("#trip-apply").getByRole("button", { name: /jelentkezem/i }).first().click();
  await p.getByTestId("apply-series-options").waitFor();
  await p.getByTestId("apply-series-options").evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 160));
  await settle(p, 600);
};
const addDate = async (p) => { await p.getByTestId("series-add-date").click(); const d = p.getByRole("dialog"); await d.waitFor(); await d.locator("#series-start").fill("2027-10-31"); await settle(p, 800); };
const expSheet = async (p) => {
  const add = p.getByTestId("expense-add").filter({ visible: true }).first();
  await add.scrollIntoViewIfNeeded().catch(() => {}); await add.click({ force: true });
  const s = p.getByTestId("expense-sheet"); await s.waitFor();
  await s.locator("#exp-title").fill("Tankolás és pályamatrica"); await s.locator("#exp-amount").fill("24500");
  await s.locator("#exp-currency").selectOption("HUF"); await s.getByTestId("fx-band").waitFor(); await settle(p, 1200);
};
const tiles = async (p) => { await p.getByTestId("view-toggle-grid").filter({ visible: true }).first().click(); await settle(p, 1200); await scrollTo('[data-testid="discover-count"]', 200)(p); };
const globe = async (p) => { await p.getByTestId("view-toggle-globe").filter({ visible: true }).first().click(); await p.waitForTimeout(9000); };
const wizard = async (p) => { await clickText("Kezdés nulláról")(p); await p.getByRole("button", { name: /Tovább/ }).first().click(); await settle(p, 1500); };
const team = async (p) => { await p.getByRole("button", { name: "Csapat", exact: true }).first().click(); await settle(p, 1200); };

// [kimeneti név, felhasználó, útvonal, nézet, előkészítés]
const SHOTS = [
  ["01-felfedezes", null, "/", D],
  ["04-varazslo", "dora", "/trips/new", D, wizard],
  ["05b-uj-idopont", "dora", `/trips/${BASE_TRIP}`, D, addDate],
  ["06-jelentkezok", "dora", `/trips/${BASE_TRIP}/edit`, D, async (p) => { await team(p); await scrollTo('[data-testid="application-card"]', 200)(p); }],
  ["07-idovonal", "dora", `/trips/${BASE_TRIP}/manage`, D],
  ["08a-koltsegek", "dora", `/trips/${EXP_TRIP}/expenses`, D],
  ["08c-koltseg-mobil", "dora", `/trips/${EXP_TRIP}/expenses`, M, expSheet],
  ["09b-naptar-figyelmeztetes", "dora", "/trips/nepal-annapurna-base-camp-trek", D, scrollTo('[data-testid="trip-calendar-section"]', 110)],
  ["10a-otletborze", "dora", "/ideas", D],
  ["10b-otlet-mobil", "lili", "/ideas/vitorlassal-a-balti-tengeren-demo", M],
  ["11-felfedezes-csempek", null, "/", D, tiles],
  ["12-3d-terkep", null, "/", D, globe],
  ["13b-jelentkezes", "bence", `/trips/${SEPT}`, D, openApply],
  ["14-keszsegek", "dora", "/settings/skills", D],
  ["15a-mobil-turaoldal", null, `/trips/${BASE_TRIP}`, M],
  ["15b-mobil-allapot", "bence", `/trips/${BASE_TRIP}`, M, scrollTo("#trip-apply", 120)],
  ["15c-mobil-koltsegek", "lili", `/trips/${EXP_TRIP}/expenses`, M],
  ["21-szervezocsapat", "dora", `/trips/${BASE_TRIP}/edit`, D, team],
];

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const sessions = {};
async function ctxFor(who, opt) {
  const key = `${who}|${opt.viewport.width}`;
  if (sessions[key]) return sessions[key];
  const ctx = await browser.newContext({ ...opt, locale: "hu-HU", timezoneId: "Europe/Budapest" });
  await ctx.addCookies([{ name: "trevu-locale", value: "hu", url: BASE }]);
  if (who) {
    const p = await ctx.newPage();
    await p.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 });
    await p.locator("#email").fill(`${who}@demo.trevu.local`);
    await p.locator("#password").fill("Demo-Trevu-2026!");
    await p.locator('button[type="submit"]').click();
    await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
    await p.close();
  }
  return (sessions[key] = ctx);
}

const results = [];
for (const [name, who, url, opt, prep] of SHOTS) {
  if (FILTER && !FILTER.test(name)) continue;
  const ctx = await ctxFor(who, opt);
  const p = await ctx.newPage();
  const png = `${TMP}/${name}.png`;
  try {
    await p.goto(BASE + url, { waitUntil: "networkidle", timeout: 120000 });
    await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await settle(p, 1500);
    if (prep) await prep(p);
    await p.screenshot({ path: png });
    // Méretre szabás és JPEG — macOS-en sips, máshol ImageMagick.
    const width = opt === M ? 600 : 1600;
    try {
      execFileSync("sips", ["--resampleWidth", String(width), "-s", "format", "jpeg", "-s", "formatOptions", "82", png, "--out", `${OUT}/${name}.jpg`], { stdio: "ignore" });
    } catch {
      execFileSync("convert", [png, "-resize", `${width}x`, "-quality", "82", `${OUT}/${name}.jpg`]);
    }
    results.push(`OK   ${name}`);
  } catch (e) {
    await p.screenshot({ path: `${TMP}/HIBA-${name}.png` }).catch(() => {});
    results.push(`HIBA ${name}: ${e.message.split("\n")[0].slice(0, 140)}`);
  }
  await p.close();
}
await browser.close();
rmSync(TMP, { recursive: true, force: true });
console.log(results.join("\n"));
