// M151 Rendszerállapot — böngészős bejárás (helyi Supabase, admin demófiók).
// Futtatás: BASE=http://localhost:3009 OUT=<mappa> node scripts/qa-m151-system-status.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3009";
const OUT = process.env.OUT ?? "/tmp/qa-m151";
const EMAIL = process.env.EMAIL ?? "admin@demo.trevu.local";
const PASSWORD = process.env.PASSWORD ?? "Demo-Trevu-2026!";
fs.mkdirSync(OUT, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass++;
  else fail++;
  console.log(cond ? "  ✔" : "  ✖", msg);
};

const browser = await chromium.launch();

async function login(page) {
  await page.goto(`${BASE}/admin/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => u.pathname === "/admin", { timeout: 30000 });
}

for (const [label, viewport] of [["1440", { width: 1440, height: 900 }], ["390", { width: 390, height: 844 }]]) {
  console.log(`\n[${label}]`);
  const ctx = await browser.newContext({ viewport, locale: "hu-HU" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await login(page);

  // Áttekintő: az állapotsáv betölt és összesít
  const strip = page.locator('section[aria-label="Rendszerállapot"]');
  ok(await strip.isVisible(), "az /admin-on látszik az állapotsáv");
  await page.waitForFunction(() => {
    const s = document.querySelector('section[aria-label="Rendszerállapot"] [role="status"]');
    return s && !s.textContent.includes("folyamatban");
  }, null, { timeout: 30000 });
  const stripTitle = (await strip.locator('[role="status"]').first().textContent())?.trim();
  ok(/Minden rendben|figyelmeztetés|Hiba/.test(stripTitle ?? ""), `a sáv összesít: „${stripTitle}”`);
  if (label === "1440") ok((await strip.locator("li").count()) === 8, "8 szolgáltatás-pötty");
  await page.screenshot({ path: `${OUT}/admin-${label}.png`, fullPage: false });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= viewport.width, `nincs vízszintes görgetés (${sw}px)`);

  // Részletek → /admin/system
  await strip.getByRole("link").filter({ visible: true }).first().click();
  await page.waitForURL((u) => u.pathname === "/admin/system");
  ok(true, "a sávról a /admin/system-re visz");
  await page.waitForFunction(() => document.querySelectorAll("main li .font-mono").length >= 8, null, { timeout: 30000 });
  const rows = await page.locator("main section[aria-labelledby] > ul > li").count();
  ok(rows === 10, `10 ellenőrzés sora (${rows})`);
  const chips = await page.locator("main section[aria-labelledby] > ul > li").allTextContents();
  ok(chips.every((t) => /Rendben|Figyelmeztetés|Hiba/.test(t)), "minden sor kapott állapotot");
  const cronJobs = await page.locator("main section[aria-labelledby] ul ul li").count();
  ok(cronJobs >= 1, `cron-feladatok listája (${cronJobs})`);
  const migText = await page.locator("main section[aria-labelledby] > ul > li").nth(4).textContent();
  console.log("    migrációk:", migText?.replace(/\s+/g, " ").trim());

  // Kézi ellenőrzés
  const btn = page.getByRole("button", { name: /Ellenőrzés most|Ellenőrzés…/ });
  await btn.click();
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Ellenőrzés most") && !b.disabled), null, { timeout: 30000 });
  ok(true, "az „Ellenőrzés most” lefut és visszaáll");
  const sw2 = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw2 <= viewport.width, `a /admin/system-en sincs vízszintes görgetés (${sw2}px)`);
  await page.screenshot({ path: `${OUT}/system-${label}.png`, fullPage: true });

  if (label === "390") {
    await page.getByRole("button", { name: "Menü megnyitása" }).click();
    ok(await page.locator("#admin-sidebar").isVisible(), "mobilon a menü fiókként nyílik");
    await page.screenshot({ path: `${OUT}/menu-390.png` });
    await page.getByRole("button", { name: "Menü bezárása" }).click();
    ok(!(await page.locator("#admin-sidebar").isVisible()), "a menü bezárható");
  }

  // Automatikus frissítés: 30 mp múlva új lekérés
  if (label === "1440") {
    const before = Date.now();
    const req = await page.waitForRequest((r) => r.url().includes("/api/v1/admin/system-status") && !r.url().includes("force"), { timeout: 40000 });
    ok(Boolean(req) && Date.now() - before < 40000, "magától újra lekér (≈30 mp)");
  }

  ok(errors.length === 0, `0 konzolhiba${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
}

// Felhasználói dashboard: a régi sáv eltűnt (kijelentkezve /dashboard → login; a szöveg a forrásban sincs)
const anon = await browser.newPage();
const res = await anon.request.get(`${BASE}/api/v1/admin/system-status`);
ok(res.status() === 401, "az API belépés nélkül 401");
await browser.close();
console.log(`\nEredmény: ${pass} ✔ / ${fail} ✖`);
process.exit(fail ? 1 : 0);
