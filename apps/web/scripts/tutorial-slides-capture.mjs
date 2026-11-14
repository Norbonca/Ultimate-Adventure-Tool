// M211 — Útmutató-diák: lépésenként egy képernyőkép a helyi demókörnyezetből, a magyarázott elem
// jelzőnarancs (B „Terep”, #F15B2A) kerettel, szén fátyollal kiemelve, lekerekítés nélkül.
// Kimenet: public/tutorials/slides/<slug>/<lépés>.jpg (1440×810).
// Használat: BASE=http://localhost:3011 node scripts/tutorial-slides-capture.mjs [slug-szűrő]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3011";
const FILTER = process.argv[2] ? new RegExp(process.argv[2]) : null;
const OUT = "public/tutorials/slides";
const BASE_TRIP = "split-vitorlas-tura", EXP_TRIP = "split-vitorlas-tura-1-ca6750", SEPT = "split-vitorlas-tura-1-f38016";
const VIEW = { viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 };

const settle = async (p, ms = 1000) => { await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(ms); };
const tid = (id) => (p) => p.getByTestId(id).filter({ visible: true }).first();
const txt = (re) => (p) => p.getByText(re).filter({ visible: true }).first();
const role = (r, name) => (p) => p.getByRole(r, { name }).filter({ visible: true }).first();
const css = (s) => (p) => p.locator(s).filter({ visible: true }).first();

async function into(p, loc, offset = 200) {
  await loc.waitFor({ timeout: 20000 });
  await loc.evaluate((e, o) => {
    const scroller = e.closest('[role="dialog"], [data-testid="expense-sheet"]') ?? null;
    if (scroller && scroller.scrollHeight > scroller.clientHeight) e.scrollIntoView({ block: "center" });
    else window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - o);
  }, offset);
  await p.waitForTimeout(500);
}

async function highlight(p, locs) {
  await p.evaluate(() => document.querySelectorAll(".m211-hl").forEach((n) => n.remove()));
  const boxes = [];
  for (const l of locs) {
    const b = await l.boundingBox().catch(() => null);
    if (b) boxes.push(b);
  }
  if (!boxes.length) return false;
  const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.width)), bt = Math.max(...boxes.map((b) => b.y + b.height));
  await p.evaluate(({ x, y, w, h }) => {
    const d = document.createElement("div");
    d.className = "m211-hl";
    Object.assign(d.style, {
      position: "fixed", left: `${x - 8}px`, top: `${y - 8}px`, width: `${w + 16}px`, height: `${h + 16}px`,
      border: "3px solid #F15B2A", borderRadius: "0px", boxShadow: "0 0 0 9999px rgba(34,37,32,0.35)",
      zIndex: "2147483647", pointerEvents: "none",
    });
    document.body.appendChild(d);
  }, { x, y, w: r - x, h: bt - y });
  return true;
}

// Közös előkészítések
const openExpenseSheet = async (p) => {
  const add = tid("expense-add")(p); await add.scrollIntoViewIfNeeded().catch(() => {}); await add.click({ force: true });
  await tid("expense-sheet")(p).waitFor(); await settle(p, 600);
};
const fillExpense = async (p) => {
  await openExpenseSheet(p);
  const s = tid("expense-sheet")(p);
  await s.locator("#exp-title").fill("Közös vacsora, Hvar"); await s.locator("#exp-amount").fill("340");
  await settle(p, 600);
};
const team = async (p) => { await p.getByRole("button", { name: "Csapat", exact: true }).first().click(); await settle(p, 1200); };
const openApply = async (p) => { await p.locator("#trip-apply").getByRole("button", { name: /jelentkezem/i }).first().click(); await tid("apply-series-options")(p).waitFor(); await settle(p, 600); };
const fromScratch = async (p) => { await txt(/Kezdés nulláról/)(p).click(); await settle(p, 800); };
const wizardStep1 = async (p) => { await fromScratch(p); await role("button", /Tovább/)(p).click(); await settle(p, 1200); };
const wizardStep2 = async (p) => { await wizardStep1(p); await p.getByText("Túrázás", { exact: true }).first().click(); await settle(p, 600); await role("button", /Tovább/)(p).click(); await settle(p, 1500); };
const globeOpen = async (p) => { await tid("view-toggle-globe")(p).click(); await p.waitForTimeout(9000); };
const globeCard = async (p) => { await globeOpen(p); await txt(/Teide/)(p).click({ force: true }); await p.waitForTimeout(2500); };
const openMilestone = async (p) => { await txt(/Publikálás és promóció/)(p).click(); await settle(p, 1000); };

const editTab = (name) => async (p) => { await p.getByRole("button", { name, exact: true }).first().click(); await settle(p, 1200); };
const settingsDanger = async (p) => { await editTab("Beállítások")(p); await into(p, css("#trip-danger-title")(p), 260); };
const demandTab = async (p) => { await txt(/Mire várnak/)(p).click(); await settle(p, 1500); };
const openJoin = async (p) => { await role("button", /Csatlakozom/)(p).click(); await settle(p, 1000); };
// [slug, felhasználó, [[útvonal, előkészítés|null, kiemelés(ek)], …]] — a lépések sorrendje = content.ts lépései
const TUTORIALS = [
  ["kozos-koltseg", "dora", [
    [`/trips/${EXP_TRIP}/expenses`, null, [css('nav a[aria-current="page"]')]],
    [`/trips/${EXP_TRIP}/expenses`, null, [tid("expense-add")]],
    [`/trips/${EXP_TRIP}/expenses`, fillExpense, [css("#exp-title"), css("#exp-amount"), css("#exp-currency")]],
    [`/trips/${EXP_TRIP}/expenses`, fillExpense, [txt(/egyenlően|résztvevő|Megosztás|Elosztás/i)]],
    [`/trips/${EXP_TRIP}/expenses`, fillExpense, [tid("expense-save")]],
  ]],
  ["kiegyenlites", "dora", [
    [`/trips/${EXP_TRIP}/expenses`, null, [css('nav a[href$="/expenses/settle"]')]],
    [`/trips/${EXP_TRIP}/expenses/settle`, null, [tid("settle-row")]],
    [`/trips/${EXP_TRIP}/expenses/settle`, null, [tid("settle-mark-paid")], "nora"],
    [`/trips/${EXP_TRIP}/expenses/settle`, null, [tid("settle-confirm")]],
    [`/trips/${EXP_TRIP}/expenses/settle`, null, [tid("settle-dispute")]],
  ]],
  ["uj-idopont", "dora", [
    [`/trips/${BASE_TRIP}`, null, [tid("trip-series-dates")]],
    [`/trips/${BASE_TRIP}`, null, [tid("series-add-date")]],
    [`/trips/${BASE_TRIP}`, async (p) => { await tid("series-add-date")(p).click(); await css('[role="dialog"]')(p).waitFor(); await settle(p, 600); }, [css("#series-start"), css("#series-end"), css("#series-capacity"), css("#series-price")]],
    [`/trips/${BASE_TRIP}`, async (p) => { await tid("series-add-date")(p).click(); await css('[role="dialog"]')(p).waitFor(); await settle(p, 600); }, [tid("series-copy-box")]],
    [`/trips/${BASE_TRIP}`, async (p) => { await tid("series-add-date")(p).click(); await css('[role="dialog"]')(p).waitFor(); await settle(p, 600); }, [tid("series-create-draft")]],
  ]],
  ["jelentkezok-elbiralasa", "dora", [
    [`/trips/${BASE_TRIP}/edit`, team, [tid("application-card")]],
    [`/trips/${BASE_TRIP}/edit`, team, [txt(/Jelentkezés: /)]],
    [`/trips/${BASE_TRIP}/edit`, team, [role("button", /^Elfogad/)]],
    [`/trips/${BASE_TRIP}/edit`, team, [role("button", /Várólistára/)]],
    [`/trips/${BASE_TRIP}/edit`, team, [role("button", /^Elutasít/)]],
  ]],
  ["menetrend-teendok", "dora", [
    [`/trips/${BASE_TRIP}/manage`, null, [role("heading", /^Menetrend$/)]],
    [`/trips/${BASE_TRIP}/manage`, null, [role("button", /Fázis hozzáadása/)]],
    [`/trips/${BASE_TRIP}/manage`, null, [role("button", /Mérföldkő hozzáadása/)]],
    [`/trips/${BASE_TRIP}/manage`, openMilestone, [txt(/Feladatok \(/)]],
    [`/trips/${BASE_TRIP}/manage`, null, [css('[aria-roledescription="sortable"], [aria-label*="Áthelyez"]')]],
  ]],
  ["elso-tura-meghirdetese", "dora", [
    ["/trips", null, [css('a[href="/trips/new"]')]],
    ["/trips/new", null, [txt(/Kezdés nulláról/)]],
    ["/trips/new", wizardStep1, [txt(/Milyen kalandot tervezel/)]],
    ["/trips/new", wizardStep2, [css("form input, main input")]],
    ["/trips/new", wizardStep2, [css("main textarea")]],
    ["/trips/new", wizardStep2, [txt(/^Közzététel$/)]],
  ]],
  ["kereses-es-szures", null, [
    ["/", null, [tid("discover-search-query")]],
    ["/", null, [tid("discover-filters-open")]],
    ["/", null, [css('[aria-label="Nézet kiválasztása"]')]],
    ["/", async (p) => { await into(p, tid("discover-trip-grid")(p), 140); }, [css('[data-testid="discover-trip-grid"] a')]],
  ]],
  ["3d-terkep", null, [
    ["/", null, [tid("view-toggle-globe")]],
    ["/", async (p) => { await tid("view-toggle-globe")(p).click(); await p.waitForTimeout(9000); }, [css("canvas")]],
    ["/", globeOpen, [txt(/Teide/)]],
    ["/", globeCard, [txt(/Részletek|Megnézem|Túra megnyitása/)]],
  ]],
  ["jelentkezes-idopontra", "bence", [
    [`/trips/${SEPT}`, async (p) => { await into(p, css("#trip-apply")(p), 160); }, [role("button", /jelentkezem/i)]],
    [`/trips/${SEPT}`, openApply, [tid("apply-series-options")]],
    [`/trips/${SEPT}`, openApply, [css('[role="dialog"] textarea, #trip-apply textarea')]],
    [`/trips/${SEPT}`, openApply, [tid("apply-submit")]],
  ]],
  ["otlet-kituzese", "dora", [
    ["/ideas", null, [css('a[href="/ideas"], [data-testid="ideas-hero"]')]],
    ["/ideas", null, [tid("ideas-new")]],
    ["/ideas/new", null, [css("#idea-title"), css("#idea-category")]],
    ["/ideas/new", async (p) => { await into(p, tid("idea-submit")(p), 300); }, [tid("idea-submit")]],
  ]],
  ["szerepek-es-stabhelyek", "dora", [
    [`/trips/${BASE_TRIP}/edit`, null, [role("button", /^Csapat$/)]],
    [`/trips/${BASE_TRIP}/edit`, editTab("Csapat"), [txt(/Pozíció hozzáadása/)]],
    [`/trips/${BASE_TRIP}/edit`, editTab("Csapat"), [txt(/SZERVEZŐI HELYEK/)]],
    [`/trips/${BASE_TRIP}/edit`, editTab("Csapat"), [tid("member-row")]],
  ]],
  ["check-in", "dora", [
    [`/trips/${BASE_TRIP}/edit`, null, [role("button", /^Csapat$/)]],
    [`/trips/${BASE_TRIP}/edit`, editTab("Csapat"), [tid("member-row")]],
    [`/trips/${BASE_TRIP}/edit`, editTab("Csapat"), [role("button", /^Check-in$/)]],
  ]],
  ["boritokep", "dora", [
    [`/trips/${BASE_TRIP}/edit`, null, [role("button", /^Képek$/)]],
    [`/trips/${BASE_TRIP}/edit`, editTab("Képek"), [txt(/Borítókép/)]],
    [`/trips/${BASE_TRIP}/edit`, editTab("Képek"), [txt(/Kártyakép|kártya/i)]],
    [`/trips/${BASE_TRIP}/edit`, editTab("Képek"), [role("button", /Mentés|Változtatások mentése/)]],
  ]],
  ["tura-beallitasok", "dora", [
    [`/trips/${BASE_TRIP}/edit`, null, [role("button", /^Beállítások$/)]],
    [`/trips/${BASE_TRIP}/edit`, editTab("Beállítások"), [txt(/Láthatóság/), txt(/Jelentkezés jóváhagyást igényel/)]],
    [`/trips/${BASE_TRIP}/edit`, editTab("Beállítások"), [txt(/CSAPAT FELÉPÍTÉS/), txt(/Vendégek \(jelentkezhetnek\)/)]],
    [`/trips/${BASE_TRIP}/edit`, editTab("Beállítások"), [txt(/Ár \/ fő|Ár\/fő|ÁRAZÁS|Árazás/)]],
  ]],
  ["koltseg-beallitasok", "dora", [
    [`/trips/${EXP_TRIP}/edit`, editTab("Beállítások"), [tid("trip-fx-settings")]],
    [`/trips/${EXP_TRIP}/edit`, async (p) => { await editTab("Beállítások")(p); await into(p, tid("trip-fx-settings")(p), 140); }, [css('[data-testid="trip-fx-settings"] select')]],
    [`/trips/${EXP_TRIP}/edit`, async (p) => { await editTab("Beállítások")(p); await into(p, tid("trip-fx-settings")(p), 140); }, [txt(/A résztvevők is rögzíthetnek költséget/)]],
  ]],
  ["tura-lemondasa", "dora", [
    [`/trips/${BASE_TRIP}/edit`, settingsDanger, [css("#trip-danger-title")]],
    [`/trips/${BASE_TRIP}/edit`, settingsDanger, [role("button", /Túra törlése/)]],
    [`/trips/${BASE_TRIP}/edit`, settingsDanger, [css('section[aria-labelledby="trip-danger-title"] > div:last-child')]],
  ]],
  ["mire-varnak", "dora", [
    ["/trips", null, [css("h1")]],
    ["/trips", null, [txt(/Mire várnak/)]],
    ["/trips", demandTab, [txt(/csatlakozó|fő/)]],
    ["/trips", demandTab, [txt(/Megszervezem/)]],
  ]],
  ["keszsegek-es-erdeklodes", "dora", [
    ["/settings/interests", null, [css("h1")]],
    ["/settings/interests", null, [txt(/^Túrázás$/)]],
    ["/settings/skills", null, [css("h1")]],
  ]],
  ["jelentkezes-allapota", "bence", [
    [`/trips/${BASE_TRIP}`, null, [css("h1")]],
    [`/trips/${BASE_TRIP}`, async (p) => { await into(p, css("#trip-apply")(p), 120); }, [txt(/Függőben/)]],
    [`/trips/${BASE_TRIP}`, async (p) => { await into(p, css("#trip-apply")(p), 120); }, [txt(/megjegyzés/i)]],
  ]],
  ["resztvevoi-menetrend", "lili", [
    [`/trips/${BASE_TRIP}/participant`, null, [css("h1")]],
    [`/trips/${BASE_TRIP}/participant`, null, [txt(/Feladataim/)]],
    [`/trips/${BASE_TRIP}/participant`, async (p) => { await into(p, txt(/^Menetrend$/)(p), 120); }, [txt(/^Menetrend$/)]],
  ]],
  ["naptar-es-idozona", "dora", [
    ["/trips/nepal-annapurna-base-camp-trek", null, [txt(/szünet|hosszú hétvége|munkaszüneti/i)]],
    ["/trips/nepal-annapurna-base-camp-trek", null, [tid("trip-calendar-section")]],
    ["/trips/nepal-annapurna-base-camp-trek", null, [css('[data-testid="trip-calendar-section"] ul, [data-testid="trip-calendar-section"] [role="list"]')]],
  ]],
  ["otlet-csatlakozas", "mate", [
    ["/ideas/vitorlassal-a-balti-tengeren-demo", null, [css("h1")]],
    ["/ideas/vitorlassal-a-balti-tengeren-demo", null, [role("button", /Csatlakoz/)]],
    ["/ideas/vitorlassal-a-balti-tengeren-demo", openJoin, [css('[role="dialog"]')]],
  ]],
];

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
