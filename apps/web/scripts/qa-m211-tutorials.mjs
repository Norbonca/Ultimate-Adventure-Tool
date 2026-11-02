// M211 — Útmutatók böngészős bejárása (helyi dev szerver + helyi Supabase demóadat).
// Használat: BASE=http://localhost:3011 node scripts/qa-m211-tutorials.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3011";
const OUT = process.env.OUT ?? "../../.qa-m211-2026-11-02";
const PASSWORD = "Demo-Trevu-2026!";
const BASE_TRIP = "split-vitorlas-tura";
const EXP_TRIP = "split-vitorlas-tura-1-ca6750";
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok, extra });
  console.log(`${ok ? "✔" : "✖"} ${name}${extra ? ` — ${extra}` : ""}`);
};

const browser = await chromium.launch();
const errors = [];

async function page(width, locale = "hu") {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, deviceScaleFactor: 1 });
  await ctx.addCookies([{ name: "trevu-locale", value: locale, url: BASE }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/Download the React DevTools|favicon|_vercel|sentry/i.test(m.text())) errors.push(`${p.url()} :: ${m.text().slice(0, 200)}`);
  });
  p.on("pageerror", (e) => errors.push(`${p.url()} :: pageerror ${e.message.slice(0, 200)}`));
  return p;
}

async function login(p, who) {
  await p.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 });
  await p.locator("#email").fill(`${who}@demo.trevu.local`);
  await p.locator("#password").fill(PASSWORD);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), p.locator('button[type="submit"]').first().click()]);
}

const noHScroll = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

// 1) Lista 1440 / 390
for (const w of [1440, 390]) {
  const p = await page(w);
  await p.goto(BASE + "/tutorials", { waitUntil: "networkidle", timeout: 120000 });
  check(`/tutorials ${w}: kiemelt + két csoport`, (await p.getByTestId("tutorials-featured").count()) === 1 && (await p.getByTestId("tutorials-group-organizer").count()) === 1 && (await p.getByTestId("tutorials-group-traveler").count()) === 1);
  check(`/tutorials ${w}: nincs vízszintes görgetés`, await noHScroll(p));
  await p.screenshot({ path: `${OUT}/s1-lista-${w}.png`, fullPage: true });
  await p.close();
}

// 2) Szűrők és üres állapot
{
  const p = await page(1440);
  await p.goto(BASE + "/tutorials?role=traveler", { waitUntil: "networkidle" });
  check("szerepszűrő: csak túrázóknak", (await p.getByTestId("tutorials-group-organizer").count()) === 0 && (await p.getByTestId("tutorials-featured").count()) === 0);
  await p.goto(BASE + "/tutorials?q=koltseg", { waitUntil: "networkidle" });
  check("keresés ékezet nélkül: „koltseg” → Közös költség", (await p.getByTestId("tutorial-card-kozos-koltseg").count()) === 1);
  await p.goto(BASE + "/tutorials?q=zzzz", { waitUntil: "networkidle" });
  check("üres keresés: üres állapot", (await p.getByTestId("tutorials-empty").count()) === 1);
  await p.screenshot({ path: `${OUT}/s1-ures-1440.png` });
  await p.close();
}

// 3) Adatlap 1440 / 390 + EN
for (const [w, locale] of [[1440, "hu"], [390, "hu"], [1440, "en"]]) {
  const p = await page(w, locale);
  await p.goto(BASE + "/tutorials/kozos-koltseg", { waitUntil: "networkidle", timeout: 120000 });
  const h1 = (await p.locator("h1").first().textContent())?.trim();
  check(`adatlap ${w} ${locale}: cím`, h1 === (locale === "en" ? "Recording a shared cost" : "Közös költség rögzítése"), h1);
  check(`adatlap ${w} ${locale}: 5 lépés, leírás, felirat szövege`, (await p.locator('[data-testid^="tutorial-step-"]').count()) === 5 && (await p.locator("#leiras").count()) === 1 && (await p.getByTestId("tutorial-transcript").count()) === 1);
  check(`adatlap ${w} ${locale}: nincs vízszintes görgetés`, await noHScroll(p));
  await p.getByTestId("tutorial-transcript").locator("summary").click();
  await p.screenshot({ path: `${OUT}/s2-adatlap-${w}-${locale}.png`, fullPage: true });
  await p.close();
}

// 4) Felirat (WebVTT)
{
  const p = await page(1440);
  const r = await p.request.get(BASE + "/api/v1/tutorials/kozos-koltseg/captions/hu");
  const body = await r.text();
  check("WebVTT hu: 200 + text/vtt", r.status() === 200 && /text\/vtt/.test(r.headers()["content-type"] ?? "") && body.startsWith("WEBVTT"));
  const r404 = await p.request.get(BASE + "/api/v1/tutorials/nincs-ilyen/captions/hu");
  check("WebVTT ismeretlen útmutató: 404", r404.status() === 404);
  await p.close();
}

// 5) Súgóablak a funkcióban — Költségek (szervező), asztal és mobil
for (const w of [1440, 390]) {
  const p = await page(w);
  await login(p, "dora");
  await p.goto(BASE + `/trips/${EXP_TRIP}/expenses`, { waitUntil: "networkidle", timeout: 120000 });
  const trigger = p.getByTestId("help-expenses");
  check(`Költségek ${w}: „Hogyan működik?” látszik`, await trigger.isVisible());
  await p.screenshot({ path: `${OUT}/s3a-link-${w}.png` });
  await trigger.click();
  const dialog = p.getByTestId("help-dialog");
  await dialog.waitFor();
  check(`súgóablak ${w}: megnyílt, a cím a funkcióé`, (await dialog.locator("h2").first().textContent())?.includes("Közös költség") ?? false);
  check(`súgóablak ${w}: fókusz az ablakban`, await p.evaluate(() => !!document.activeElement?.closest('[data-testid="help-dialog"]')));
  for (let i = 0; i < 14; i++) await p.keyboard.press("Tab");
  check(`súgóablak ${w}: Tab nem hagyja el az ablakot`, await p.evaluate(() => !!document.activeElement?.closest('[data-testid="help-dialog"]')));
  check(`súgóablak ${w}: teljes útmutató új lapon`, (await p.getByTestId("help-open-full").getAttribute("target")) === "_blank");
  check(`súgóablak ${w}: az URL nem változott`, new URL(p.url()).pathname === `/trips/${EXP_TRIP}/expenses`);
  await p.screenshot({ path: `${OUT}/s3-sugo-${w}.png` });
  await p.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  check(`súgóablak ${w}: Esc zár, a fókusz visszakerül a linkre`, await p.evaluate(() => document.activeElement?.getAttribute("data-testid") === "help-expenses"));
  await trigger.click();
  await p.getByTestId("help-got-it").click();
  check(`súgóablak ${w}: „Rendben, kipróbálom” zár`, (await p.getByTestId("help-dialog").count()) === 0);
  await p.close();
}

// 6) Többi belépési pont
{
  const p = await page(1440);
  await login(p, "dora");
  const spots = [
    ["/trips/new", "help-trips.new"],
    [`/trips/${BASE_TRIP}`, "help-series.addDate"],
    [`/trips/${BASE_TRIP}/expenses/settle`.replace(BASE_TRIP, EXP_TRIP), "help-expenses.settle"],
    ["/ideas", "help-ideas"],
    ["/", "help-discover"],
  ];
  for (const [url, id] of spots) {
    await p.goto(BASE + url, { waitUntil: "networkidle", timeout: 120000 });
    check(`belépési pont ${url}: ${id}`, (await p.getByTestId(id).count()) >= 1);
  }
  await p.goto(BASE + `/trips/${BASE_TRIP}/manage`, { waitUntil: "networkidle", timeout: 120000 });
  check("Menetrend: help-trip.timeline", (await p.getByTestId("help-trip.timeline").count()) >= 1);
  // T▾ menü
  await p.goto(BASE + "/tutorials", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /menü|menu/i }).first().click();
  check("T▾ menü: Útmutatók pont", (await p.locator('a[href="/tutorials"]').count()) >= 1);
  await p.close();
}

await browser.close();
check("konzolhiba nincs", errors.length === 0, errors.slice(0, 5).join(" | "));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} rendben`);
process.exit(failed.length ? 1 : 0);
