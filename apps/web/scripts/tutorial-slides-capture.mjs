// M211 — Útmutató-diák: lépésenként egy képernyőkép a helyi demókörnyezetből, a magyarázott elem
// jelzőnarancs (B „Terep”, #F15B2A) kerettel, szén fátyollal kiemelve, lekerekítés nélkül.
// Kimenet: public/tutorials/slides/<slug>/<lépés>.jpg (1440×810).
// Használat: BASE=http://localhost:3011 node scripts/tutorial-slides-capture.mjs [slug-szűrő]
// A lépéstábla és a segédfüggvények: tutorial-capture-lib.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { BASE, VIEW, TUTORIALS, settle, into, highlight } from "./tutorial-capture-lib.mjs";

const FILTER = process.argv[2] ? new RegExp(process.argv[2]) : null;
const OUT = "public/tutorials/slides";
const browser = await chromium.launch();
const ctxs = {};
async function ctxFor(who) {
  if (ctxs[who ?? "-"]) return ctxs[who ?? "-"];
  const ctx = await browser.newContext({ ...VIEW, locale: "hu-HU", timezoneId: "Europe/Budapest" });
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

