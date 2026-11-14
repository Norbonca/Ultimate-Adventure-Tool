// M211 — Útmutató-plakátok: útmutatónként egy tiszta nyitókép a helyi demókörnyezetből,
// kiemelőkeret nélkül, az oldal tetejéről. Kimenet: public/tutorials/posters/<slug>.jpg
// (1440×900-as felvétel 1600×1000-re nagyítva — ez a kártyák és a súgóválasztó bélyegképe).
// Használat: BASE=http://localhost:3011 [LOCALE=en] node scripts/tutorial-posters-capture.mjs [slug-szűrő]
// Angolul (LOCALE=en) a kimenet a …/posters-en mappába megy.
//
// A forrás a közös tutorial-capture-lib.mjs TUTORIALS táblája: útmutatónként az UTOLSÓ lépés
// útvonala — ez az útmutató tárgya (a 22-ből 18-nál egyetlen útvonal van, a négy többlépcsősnél
// a kiegyenlítés, a varázsló, az új ötlet és a készségek lapja). Előkészítés nincs: a plakáton
// nem nyílik párbeszédablak, és nincs kiemelőkeret.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { BASE, LOCALE, TUTORIALS, settle, rogzitFelvetel } from "./tutorial-capture-lib.mjs";

const FILTER = process.argv[2] ? new RegExp(process.argv[2]) : null;
const OUT = LOCALE === "hu" ? "public/tutorials/posters" : "public/tutorials/posters-" + LOCALE;
const SHOT = { width: 1440, height: 900 };
const SCALE = 1600 / SHOT.width; // 1600×1000

const browser = await chromium.launch();
const ctxs = {};
async function ctxFor(who) {
  if (ctxs[who ?? "-"]) return ctxs[who ?? "-"];
  const ctx = await browser.newContext({
    viewport: SHOT,
    deviceScaleFactor: SCALE,
    locale: LOCALE === "en" ? "en-GB" : "hu-HU",
    timezoneId: "Europe/Budapest",
  });
  await ctx.addCookies([{ name: "trevu-locale", value: LOCALE, url: BASE }]);
  if (who) {
    const p = await ctx.newPage();
    await p.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 });
    await p.locator("#email").fill(`${who}@demo.trevu.local`);
    await p.locator("#password").fill("Demo-Trevu-2026!");
    await p.locator('button[type="submit"]').click();
    await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
    await p.close();
  }
  return (ctxs[who ?? "-"] = ctx);
}

mkdirSync(OUT, { recursive: true });
const log = [];
for (const [slug, who, steps] of TUTORIALS) {
  if (FILTER && !FILTER.test(slug)) continue;
  const [url, prep, , stepWho] = steps[steps.length - 1];
  const ctx = await ctxFor(stepWho ?? who);
  const p = await ctx.newPage();
  try {
    await p.goto(BASE + url, { waitUntil: "networkidle", timeout: 120000 });
    await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await settle(p, 1500);
    // Az előkészítés nyitja a tárgyhoz tartozó fület vagy lapot — enélkül a hét szerkesztő-útmutató
    // plakátja ugyanaz az Alapadatok lap lenne. Ha nincs előkészítés, az oldal tetejét mutatjuk.
    if (prep) await prep(p);
    else await p.evaluate(() => window.scrollTo(0, 0));
    // A plakáton ne a lábléc vigye el a képet: ha nincs nyitott párbeszédablak, a görgetést
    // visszahúzzuk a lábléc tetejéig.
    await p.evaluate(() => {
      if (document.querySelector('[role="dialog"], [data-testid="expense-sheet"]')) return;
      const f = document.querySelector("footer");
      if (!f) return;
      const max = f.getBoundingClientRect().top + window.scrollY - window.innerHeight;
      if (window.scrollY > max) window.scrollTo(0, Math.max(0, max));
    });
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/${slug}.jpg`, type: "jpeg", quality: 84 });
    log.push(`OK   ${slug}`);
  } catch (e) {
    await p.screenshot({ path: `${OUT}/${slug}.jpg`, type: "jpeg", quality: 84 }).catch(() => {});
    log.push(`HIBA ${slug}: ${e.message.split("\n")[0].slice(0, 120)}`);
  }
  await p.close();
}
await browser.close();
console.log(log.join("\n"));

// Csak a hibátlan útmutatók felvételét rögzítjük.
const hibas = new Set(log.filter((l) => !l.startsWith("OK")).map((l) => l.split(/\s+/)[1].split("/")[0]));
const sikeres = [...new Set(log.map((l) => l.split(/\s+/)[1].split("/")[0]))].filter((s) => !hibas.has(s));
const r = rogzitFelvetel(sikeres);
if (r) console.log(`\nManifest: ${r.n} útmutató felvétele ${LOCALE} nyelven a(z) ${r.head} commitra állítva.`);
