// QA-bejárás: M021 Menetrend v2 (húzás, időpont, helyszín) — helyi dev szerveren, demófiókkal.
// Futtatás: BASE=http://localhost:3008 OUT=<mappa> node scripts/qa-m021-timeline.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3008";
const OUT = process.env.OUT ?? "/tmp/qa-m021";
const SLUG = process.env.SLUG ?? "split-vitorlas-tura";
const EMAIL = process.env.EMAIL ?? "dora@demo.trevu.local";
const PASSWORD = process.env.PASSWORD ?? "Demo-Trevu-2026!";
fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log("[qa]", ...a);
const cols = (page) => page.locator("section[aria-label]").filter({ has: page.locator('button[aria-label^="Mérföldkő hozzáadása"], button:has-text("Mérföldkő hozzáadása")') });
const browser = await chromium.launch();
const errors = [];

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/e-?mail/i).first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

async function openTimeline(page) {
  await page.goto(`${BASE}/trips/${SLUG}/edit`);
  await page.getByRole("button", { name: /^Menetrend$/ }).first().click().catch(async () => {
    await page.getByText("Menetrend", { exact: true }).first().click();
  });
  await page.getByRole("heading", { name: "Menetrend" }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
}

// ── 1440 ────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "hu-HU" });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await login(page);
  await openTimeline(page);
  await page.screenshot({ path: `${OUT}/01-board-1440.png`, fullPage: true });

  const handles = page.getByRole("button", { name: /^Áthelyezés: / });
  log("fogantyúk:", await handles.count());

  // Billentyűzetes áthelyezés: az első oszlop első kártyája egyet lejjebb
  let ci = 0;
  const nCols = await cols(page).count();
  for (; ci < nCols; ci++) if ((await cols(page).nth(ci).getByRole("button", { name: /^Áthelyezés: / }).count()) >= 3) break;
  log("oszlop a teszthez:", ci, "/", nCols);
  const cards = cols(page).nth(ci).getByRole("button", { name: /^Áthelyezés: / });
  const firstCardHandle = cards.nth(1); // 0 = fázisfej
  const firstName = (await firstCardHandle.getAttribute("aria-label")).replace("Áthelyezés: ", "");
  await firstCardHandle.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(200);
  await page.keyboard.press("Space");
  await page.getByRole("status").filter({ hasText: "Sorrend mentve" }).waitFor({ timeout: 10000 });
  log("billentyűzetes áthelyezés OK:", firstName);
  await page.screenshot({ path: `${OUT}/02-board-after-keyboard-move.png` });

  // Egérrel áthúzás a következő fázisba
  const src = cols(page).nth(ci).getByRole("button", { name: /^Áthelyezés: / }).nth(1);
  const dst = cols(page).nth(ci + 1);
  const sb = await src.boundingBox();
  const db = await dst.boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.mouse.down();
  await page.mouse.move(sb.x + 20, sb.y + 10, { steps: 5 });
  await page.mouse.move(db.x + db.width / 2, db.y + 80, { steps: 15 });
  await page.screenshot({ path: `${OUT}/03-dragging.png` });
  await page.mouse.up();
  await page.getByRole("status").filter({ hasText: "Sorrend mentve" }).waitFor({ timeout: 10000 });
  log("egeres áthúzás fázisok között OK");

  // Mérföldkő megnyitása, időpont + helyszín
  const card = cols(page).nth(ci + 1).locator("button:not([aria-label])").first();
  const cardName = (await card.innerText()).split("\n")[0];
  log("megnyitandó kártya:", cardName);
  await page.waitForTimeout(800);
  await card.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/03b-after-card-click.png` });
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.locator('input[type="date"]').first().fill("2026-12-10");
  await dialog.locator('input[type="time"]').first().fill("08:00");
  await dialog.getByPlaceholder(/Hely neve vagy címe/).fill("MOL Budaörsi út Budapest");
  await dialog.getByRole("button", { name: "Keresés", exact: true }).click();
  await dialog.locator('ul[aria-label="Találatok"], [role="alert"], p:has-text("Nincs találat"), p:has-text("nem érhető el")').first().waitFor({ timeout: 20000 });
  await page.screenshot({ path: `${OUT}/04-modal-search.png` });
  const results = dialog.locator('ul[aria-label="Találatok"] button');
  const n = await results.count();
  log("találatok:", n);
  if (n > 0) await results.first().click();
  else await dialog.getByRole("button", { name: /mentése koordináta nélkül/ }).click();
  await dialog.getByLabel("Megjegyzés a helyhez").fill("A kút parkolójában, az autómosó mellett");
  await page.screenshot({ path: `${OUT}/05-modal-filled.png` });
  await dialog.getByRole("button", { name: "Mentés", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Mérföldkő mentve" }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/06-board-with-time-place.png`, fullPage: true });
  const cardText = await cols(page).nth(ci + 1).innerText();
  log("kártya tartalmaz 08:00:", cardText.includes("08:00"), "| név:", cardName);

  // Újratöltés után is megvan?
  await openTimeline(page);
  const after = await cols(page).nth(ci + 1).innerText();
  log("újratöltés után 08:00:", after.includes("08:00"));

  // Feladat: időpont + hely + sorrend gombbal
  await cols(page).nth(ci + 1).locator("button:not([aria-label])").first().click();
  await dialog.waitFor();
  const taskInput = dialog.getByLabel("Feladat neve");
  for (const name of ["Autók beosztása", "Tankolás, gyülekező"]) {
    await taskInput.fill(name);
    await taskInput.press("Enter");
    await dialog.getByRole("button", { name: `Részletek: ${name}` }).waitFor();
  }
  await dialog.getByRole("button", { name: "Részletek: Tankolás, gyülekező" }).click();
  const taskDates = dialog.locator('li input[type="date"]');
  await taskDates.first().fill("2026-12-10");
  await dialog.locator('li input[type="time"]').first().fill("07:45");
  await dialog.locator("li").getByPlaceholder(/Hely neve vagy címe/).fill("BAH csomópont, benzinkút");
  await dialog.locator("li").getByRole("button", { name: "Keresés", exact: true }).click();
  await dialog.locator("li").getByRole("button", { name: /mentése koordináta nélkül/ }).waitFor({ timeout: 20000 });
  await dialog.locator("li").getByRole("button", { name: /mentése koordináta nélkül/ }).click();
  await dialog.getByRole("button", { name: "Feladat mentése" }).click();
  await dialog.getByText("dec. 10. · 07:45 · BAH csomópont, benzinkút").waitFor({ timeout: 10000 });
  await dialog.getByRole("button", { name: "Tankolás, gyülekező feljebb" }).click();
  await page.waitForTimeout(800);
  const taskOrder = await dialog.locator("li").allInnerTexts();
  log("feladatsorrend:", taskOrder.map((x) => x.split("\n")[0]).join(" | "));
  await page.screenshot({ path: `${OUT}/07-modal-tasks.png` });
  await page.keyboard.press("Escape");
  await ctx.close();
}

// ── 390 ─────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "hu-HU", hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await login(page);
  await openTimeline(page);
  await page.screenshot({ path: `${OUT}/08-board-390.png` });
  await cols(page).nth(1).locator("button:not([aria-label])").first().click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/09-sheet-390.png` });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  log("390 scrollWidth:", sw);
  await ctx.close();
}

await browser.close();
log("konzol/oldalhibák:", errors.length, errors.slice(0, 5));
