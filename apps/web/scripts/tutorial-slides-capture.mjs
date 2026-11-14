// M211 — Útmutató-diák: lépésenként egy képernyőkép a helyi demókörnyezetből, a magyarázott elem
// jelzőnarancs (B „Terep”, #F15B2A) kerettel, szén fátyollal kiemelve, lekerekítés nélkül.
// Kimenet: public/tutorials/slides/<slug>/<lépés>.jpg (1440×810).
// Használat: BASE=http://localhost:3011 [LOCALE=en] node scripts/tutorial-slides-capture.mjs [slug-szűrő]
// Angolul (LOCALE=en) a kimenet a …/slides-en mappába megy.
// A lépéstábla és a segédfüggvények: tutorial-capture-lib.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { BASE, LOCALE, VIEW, TUTORIALS, settle, into, highlight, rogzitFelvetel } from "./tutorial-capture-lib.mjs";

const FILTER = process.argv[2] ? new RegExp(process.argv[2]) : null;
const OUT = LOCALE === "hu" ? "public/tutorials/slides" : "public/tutorials/slides-" + LOCALE;
const browser = await chromium.launch();
const ctxs = {};
async function ctxFor(who) {
  if (ctxs[who ?? "-"]) return ctxs[who ?? "-"];
  const ctx = await browser.newContext({ ...VIEW, locale: LOCALE === "en" ? "en-GB" : "hu-HU", timezoneId: "Europe/Budapest" });
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

const log = [];
for (const [slug, who, steps] of TUTORIALS) {
  if (FILTER && !FILTER.test(slug)) continue;
  mkdirSync(`${OUT}/${slug}`, { recursive: true });
  for (const [i, [url, prep, targets, stepWho]] of steps.entries()) {
    const ctx = await ctxFor(stepWho ?? who);
    const p = await ctx.newPage();
    try {
      await p.goto(BASE + url, { waitUntil: "networkidle", timeout: 120000 });
      await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await settle(p, 1200);
      if (prep) await prep(p);
      const locs = targets.map((f) => f(p));
      const first = locs[0];
      const inDialog = await first.evaluate((e) => !!e.closest('[role="dialog"], [data-testid="expense-sheet"]')).catch(() => false);
      if (!inDialog) await into(p, first).catch(() => {});
      else await first.scrollIntoViewIfNeeded().catch(() => {});
      await p.waitForTimeout(400);
      const ok = await highlight(p, locs);
      await p.screenshot({ path: `${OUT}/${slug}/${i + 1}.jpg`, type: "jpeg", quality: 82 });
      log.push(`${ok ? "OK  " : "NOHL"} ${slug}/${i + 1}`);
    } catch (e) {
      await p.screenshot({ path: `${OUT}/${slug}/${i + 1}.jpg`, type: "jpeg", quality: 82 }).catch(() => {});
      log.push(`HIBA ${slug}/${i + 1}: ${e.message.split("\n")[0].slice(0, 120)}`);
    }
    await p.close();
  }
}
await browser.close();
console.log(log.join("\n"));

// Csak a hibátlan útmutatók felvételét rögzítjük.
const hibas = new Set(log.filter((l) => !l.startsWith("OK")).map((l) => l.split(/\s+/)[1].split("/")[0]));
const sikeres = [...new Set(log.map((l) => l.split(/\s+/)[1].split("/")[0]))].filter((s) => !hibas.has(s));
const r = rogzitFelvetel(sikeres);
if (r) console.log(`\nManifest: ${r.n} útmutató felvétele ${LOCALE} nyelven a(z) ${r.head} commitra állítva.`);

