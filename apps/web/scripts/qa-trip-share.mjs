// FR-M02-010 — Túramegosztás böngészős bejárása (helyi dev szerver + helyi Supabase demóadat).
// Használat: BASE=http://localhost:3100 OUT=<mappa> node scripts/qa-trip-share.mjs
// A nem nyilvános esethez a szkript egy demótúrát ideiglenesen privátra állít (helyi DB), majd visszaállítja.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.env.OUT ?? "../../.qa-trip-share";
const PUBLIC_TRIP = "velebit-ultra-trail-100k";
const ORG_TRIP = "split-vitorlas-tura"; // szervező: dora@demo.trevu.local
const PRIVATE_TRIP = "split-vitorlas-tura-1-ca6750";
const PASSWORD = "Demo-Trevu-2026!";
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok, extra });
  console.log(`${ok ? "✔" : "✖"} ${name}${extra ? ` — ${extra}` : ""}`);
};
const sql = (q) => execFileSync("docker", ["exec", "supabase_db_trevu-local", "psql", "-U", "postgres", "-At", "-c", q]).toString().trim();

const browser = await chromium.launch();
const errors = [];
async function page({ width, locale = "hu", touch = false } = { width: 1440 }) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 600 ? 844 : 900 },
    deviceScaleFactor: 1,
    hasTouch: touch,
    isMobile: touch,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await ctx.addCookies([{ name: "trevu-locale", value: locale, url: BASE }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/Download the React DevTools|favicon|_vercel|sentry|Failed to load resource/i.test(m.text())) errors.push(`${p.url()} :: ${m.text().slice(0, 200)}`);
  });
  p.on("pageerror", (e) => errors.push(`${p.url()} :: pageerror ${e.message.slice(0, 200)}`));
  return p;
}
const imgLoaded = (p) =>
  p.waitForFunction(() => [...document.querySelectorAll('[data-testid="share-sheet"] img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 }).then(() => true, () => false);
const meta = (p, sel) => p.locator(sel).first().getAttribute("content").catch(() => null);

// ── 1. Metaadat a nyilvános túraoldalon ─────────────────────────────
{
  const p = await page({ width: 1440 });
  await p.goto(`${BASE}/trips/${PUBLIC_TRIP}`, { waitUntil: "networkidle", timeout: 180000 });
  const og = {
    title: await meta(p, 'meta[property="og:title"]'),
    description: await meta(p, 'meta[property="og:description"]'),
    url: await meta(p, 'meta[property="og:url"]'),
    type: await meta(p, 'meta[property="og:type"]'),
    image: await meta(p, 'meta[property="og:image"]'),
    w: await meta(p, 'meta[property="og:image:width"]'),
    h: await meta(p, 'meta[property="og:image:height"]'),
    alt: await meta(p, 'meta[property="og:image:alt"]'),
    card: await meta(p, 'meta[name="twitter:card"]'),
    tImage: await meta(p, 'meta[name="twitter:image"]'),
    robots: await meta(p, 'meta[name="robots"]'),
  };
  const canonical = await p.locator('link[rel="canonical"]').getAttribute("href");
  check("og:title a túra címe", /Velebit/.test(og.title ?? ""), og.title ?? "");
  check("og:description ≤ 200 karakter, címke nélkül", !!og.description && og.description.length <= 200 && !/[<*#]/.test(og.description), `${og.description?.length}`);
  check("og:url és canonical paraméter nélküli", (og.url ?? "").endsWith(`/trips/${PUBLIC_TRIP}`) && (canonical ?? "").endsWith(`/trips/${PUBLIC_TRIP}`));
  check("og:type = article", og.type === "article");
  check("og:image = /og/trips/<slug>?v=…", new RegExp(`/og/trips/${PUBLIC_TRIP}\\?v=\\d+$`).test(og.image ?? ""), og.image ?? "");
  check("og:image 1200×630 + alt", og.w === "1200" && og.h === "630" && /Velebit/.test(og.alt ?? ""));
  check("twitter:card = summary_large_image + twitter:image", og.card === "summary_large_image" && og.tImage === og.image);
  check("nincs noindex", !og.robots || !/noindex/.test(og.robots));
  // a metadataBase helyben NEXT_PUBLIC_APP_URL — a képet a vizsgált szerverről kérjük
  const ogPath = new URL(og.image); 
  const img = await p.request.get(BASE + ogPath.pathname + ogPath.search);
  check("a megosztókép 200, image/png", img.status() === 200 && (img.headers()["content-type"] ?? "").startsWith("image/png"));
  check("a megosztókép gyorsítótár-fejléce", /s-maxage=86400/.test(img.headers()["cache-control"] ?? ""), img.headers()["cache-control"]);

  // ── 2. Asztali panel ─────────────────────────────────────────────
  const btn = p.getByTestId("share-button");
  const box = await btn.boundingBox();
  check("Megosztás gomb a hero jobb felső sávjában", !!box && box.x > 1000 && box.y < 200 && box.height >= 44, JSON.stringify(box));
  await p.screenshot({ path: `${OUT}/detail-1440.png` });
  await btn.click();
  const dlg = p.getByRole("dialog", { name: "Túra megosztása" });
  check("a panel megnyílik", await dlg.isVisible());
  for (const pf of ["facebook", "whatsapp", "x", "telegram", "email"]) {
    const href = await p.locator(`[data-share-target="${pf}"]`).getAttribute("href");
    check(`${pf}: utm_source=${pf}`, decodeURIComponent(href ?? "").includes(`utm_source=${pf}`), (href ?? "").slice(0, 60));
  }
  check("előnézeti kép betöltődött", await imgLoaded(p));
  check("asztalon nincs linkmásoló csempe", !(await p.locator('[data-share-target="copy-tile"]').isVisible()));
  await p.screenshot({ path: `${OUT}/sheet-1440.png` });
  await p.getByRole("button", { name: "Link másolása" }).click();
  await p.getByRole("button", { name: "Másolva" }).waitFor({ timeout: 5000 });
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  check("link másolva UTM-mel", clip.includes(`/trips/${PUBLIC_TRIP}?utm_source=copy`), clip);
  await p.screenshot({ path: `${OUT}/sheet-copied-1440.png` });
  await p.keyboard.press("Escape");
  check("Esc bezárja, a fókusz a gombon", !(await dlg.isVisible()) && (await p.evaluate(() => document.activeElement?.getAttribute("data-testid"))) === "share-button");
  await p.context().close();
}

// ── 3. Mobil 390: alsó lap (natív megosztás nélkül) és natív megosztás ─
{
  const p = await page({ width: 390 });
  await p.goto(`${BASE}/trips/${PUBLIC_TRIP}`, { waitUntil: "networkidle", timeout: 180000 });
  const box = await p.getByTestId("share-button").boundingBox();
  check("390: a gomb látszik, 44 px", !!box && box.height >= 44 && box.x + box.width <= 390, JSON.stringify(box));
  await p.screenshot({ path: `${OUT}/detail-390.png` });
  await p.getByTestId("share-button").click();
  const sheet = await p.getByTestId("share-sheet").boundingBox();
  check("390: alsó lap a képernyő alján", !!sheet && Math.round(sheet.y + sheet.height) >= 840, JSON.stringify(sheet));
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("390: nincs vízszintes túlfolyás", !overflow);
  check("390: linkmásoló csempe a rácsban, linkmező rejtve", (await p.locator('[data-share-target="copy-tile"]').isVisible()) && !(await p.getByRole("textbox").isVisible()));
  await imgLoaded(p);
  await p.screenshot({ path: `${OUT}/sheet-390.png` });
  await p.context().close();

  const m = await page({ width: 390, touch: true });
  await m.addInitScript(() => {
    window.__shared = null;
    navigator.share = (data) => {
      window.__shared = data;
      return Promise.resolve();
    };
  });
  await m.goto(`${BASE}/trips/${PUBLIC_TRIP}`, { waitUntil: "networkidle", timeout: 180000 });
  await m.getByTestId("share-button").tap();
  await m.waitForTimeout(300);
  const shared = await m.evaluate(() => window.__shared);
  check("érintőképernyő: natív megosztás utm_source=native", !!shared && String(shared.url).includes("utm_source=native"), JSON.stringify(shared));
  check("érintőképernyő: nem nyílik panel", (await m.getByTestId("share-sheet").count()) === 0);
  await m.context().close();
}

// ── 4. Angol nyelv ──────────────────────────────────────────────────
{
  const p = await page({ width: 1440, locale: "en" });
  await p.goto(`${BASE}/trips/${PUBLIC_TRIP}`, { waitUntil: "networkidle", timeout: 180000 });
  check("EN: „Share” gomb", (await p.getByTestId("share-button").innerText()).trim() === "Share");
  await p.getByTestId("share-button").click();
  check("EN: „Share this trip” panel", await p.getByRole("dialog", { name: "Share this trip" }).isVisible());
  await p.context().close();
}

// ── 5. Nem nyilvános túra ───────────────────────────────────────────
const prevVis = sql(`select visibility from trips where slug='${PRIVATE_TRIP}'`);
const prevOrg = sql(`select visibility from trips where slug='${ORG_TRIP}'`);
try {
  sql(`update trips set visibility='private' where slug='${PRIVATE_TRIP}'`);
  const r = await fetch(`${BASE}/og/trips/${PRIVATE_TRIP}`);
  const generic = await fetch(`${BASE}/opengraph-image`);
  const [a, b] = [Buffer.from(await r.arrayBuffer()), Buffer.from(await generic.arrayBuffer())];
  check("privát túra: a megosztókép az általános Trevu-kép", r.status === 200 && a.equals(b), `${a.length} vs ${b.length}`);
  const html = await (await fetch(`${BASE}/trips/${PRIVATE_TRIP}`)).text();
  check("privát túra kívülállónak: nincs Megosztás gomb", !html.includes('data-testid="share-button"'));

  // Szervező a Kezelés oldalon: a panel jelzi, hogy nem nyilvános
  sql(`update trips set visibility='private' where slug='${ORG_TRIP}'`);
  const p = await page({ width: 1440 });
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 180000 });
  await p.locator("#email").fill("dora@demo.trevu.local");
  await p.locator("#password").fill(PASSWORD);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), p.locator('button[type="submit"]').first().click()]);
  await p.goto(`${BASE}/trips/${ORG_TRIP}/manage`, { waitUntil: "networkidle", timeout: 180000 });
  await p.getByRole("button", { name: "Link megosztása" }).click();
  check("Kezelés oldal: ugyanaz a panel nyílik", await p.getByRole("dialog", { name: "Túra megosztása" }).isVisible());
  check("Kezelés oldal, privát túra: figyelmeztetés", (await p.getByRole("dialog").getByRole("status").innerText()).includes("még nem nyilvános"));
  await p.screenshot({ path: `${OUT}/manage-private-1440.png` });
  await p.goto(`${BASE}/trips/${ORG_TRIP}`, { waitUntil: "networkidle", timeout: 180000 });
  check("szervező, privát túra oldalán nincs Megosztás gomb", (await p.getByTestId("share-button").count()) === 0);
  check("privát túra: noindex", /noindex/.test((await meta(p, 'meta[name="robots"]')) ?? ""));
  await p.context().close();
} finally {
  sql(`update trips set visibility='${prevVis}' where slug='${PRIVATE_TRIP}'`);
  sql(`update trips set visibility='${prevOrg}' where slug='${ORG_TRIP}'`);
}

check("0 konzolhiba", errors.length === 0, errors.slice(0, 5).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} ✔`);
process.exit(failed ? 1 : 0);
