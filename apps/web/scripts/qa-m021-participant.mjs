// QA: M021 résztvevői menetrend (US-TL-007) — belépő a túraoldalról, Feladataim, csak olvasható Menetrend.
// Futtatás: BASE=http://localhost:3008 OUT=<mappa> node scripts/qa-m021-participant.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3008";
const OUT = process.env.OUT ?? "/tmp/qa-m021";
const SLUG = process.env.SLUG ?? "split-vitorlas-tura";
const EMAIL = process.env.EMAIL ?? "lili@demo.trevu.local";
const PASSWORD = process.env.PASSWORD ?? "Demo-Trevu-2026!";
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log("[qa-p]", ...a);
const errors = [];
const browser = await chromium.launch();

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

for (const [w, h, tag] of [[1440, 1000, "1440"], [390, 844, "390"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "hu-HU", ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await login(page);
  await page.goto(`${BASE}/trips/${SLUG}`);
  const entry = page.getByTestId("trip-participant-link");
  await entry.first().waitFor({ timeout: 20000 });
  await entry.first().click();
  await page.waitForURL(/\/participant$/, { timeout: 20000 });
  await page.getByRole("heading", { name: "Feladataim" }).waitFor();
  await page.screenshot({ path: `${OUT}/p-${tag}-01.png`, fullPage: true });
  const tasksBox = page.locator("section[aria-labelledby='pt-tasks']");
  const count = await tasksBox.locator("li").count();
  const overdue = await tasksBox.getByText("Lejárt határidő").count();
  const next = await page.getByText("Következő", { exact: true }).count();
  const maps = await page.getByRole("link", { name: /Megnyitás térképen/ }).count();
  const headings = await page.getByRole("heading", { level: 2 }).allInnerTexts();
  log(tag, "saját feladatok:", count, "| lejárt jelölés:", overdue, "| Következő:", next, "| térképlink:", maps, "| címek:", headings.join(" / "));
  if (tag === "1440") {
    const first = tasksBox.getByRole("button", { name: "Tankolás, gyülekező" });
    const before = await first.getAttribute("aria-pressed");
    await first.click();
    await page.waitForTimeout(1200);
    const after = await first.getAttribute("aria-pressed");
    await page.reload();
    await page.getByRole("heading", { name: "Feladataim" }).waitFor();
    const persisted = await page.locator("section[aria-labelledby='pt-tasks']").getByRole("button", { name: "Tankolás, gyülekező" }).getAttribute("aria-pressed");
    log("pipálás:", before, "→", after, "| újratöltés után:", persisted);
    // vissza az eredeti állapotra
    if (persisted !== before) {
      await page.locator("section[aria-labelledby='pt-tasks']").getByRole("button", { name: "Tankolás, gyülekező" }).click();
      await page.waitForTimeout(1200);
    }
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    log("1440 scrollWidth:", sw);
  } else {
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    log("390 scrollWidth:", sw);
  }
  await ctx.close();
}

// angol felület
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addCookies([{ name: "trevu-locale", value: "en", url: BASE }]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await login(page);
  await page.goto(`${BASE}/trips/${SLUG}/participant`);
  await page.getByRole("heading", { name: "My Tasks" }).waitFor({ timeout: 20000 });
  const txt = await page.locator("main").innerText();
  const hu = ["Feladataim", "Menetrend", "Következő", "Megnyitás térképen", "Napi program", "kész"].filter((w) => txt.includes(w));
  log("EN: magyar maradvány:", hu);
  await page.screenshot({ path: `${OUT}/p-en.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
log("hibák:", errors.length, errors.slice(0, 5));
