// Vizuális A/B összevetés két futó példány között (pl. main ↔ ág), 1440 és 390 px-en.
// A témaréteg szeleteinek kapuja: tokenre állítás után a kép nem változhat.
// Futtatás (apps/web-ből):
//   A=http://localhost:3111 B=http://localhost:3112 OUT=<mappa> node scripts/qa-visual-ab.mjs
// Kimenet: <OUT>/<szerep>_<útvonal>-<szélesség>-{a,b,diff}.png + report.json; kilépési kód 1, ha bármelyik eltérés > MAX_PCT.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const A = process.env.A ?? "http://localhost:3111";
const B = process.env.B ?? "http://localhost:3112";
const OUT = process.env.OUT ?? "./qa-visual-ab";
const MAX_PCT = Number(process.env.MAX_PCT ?? "0.2");
const PASSWORD = process.env.PASSWORD ?? "Demo-Trevu-2026!";
const TRIP = process.env.TRIP ?? "split-vitorlas-tura";
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
mkdirSync(OUT, { recursive: true });

const ROLES = {
  anon: { email: null, routes: ["/?view=list", "/get-started", "/pricing", "/login", "/register", "/forgot-password", `/trips/${TRIP}`, "/presentation"] },
  dora: {
    email: "dora@demo.trevu.local",
    routes: ["/?view=list", "/trips", `/trips/${TRIP}`, `/trips/${TRIP}/manage`, `/trips/${TRIP}/edit`, `/trips/${TRIP}/expenses`, "/trips/new", "/profile", "/settings/skills", "/settings/interests", "/dashboard", "/community", "/ideas", "/tutorials"],
  },
  admin: { email: "admin@demo.trevu.local", routes: ["/admin", "/admin/calendar", "/admin/users", "/admin/trips"] },
};
const WIDTHS = [[1440, 900], [390, 844]];
const FREEZE = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}video,canvas,nextjs-portal{visibility:hidden!important}`;

async function login(page, base, email) {
  await page.goto(`${base}/login`);
  await page.locator('input[type="email"], #email').first().fill(email);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
}

async function shot(page, url) {
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.addStyleTag({ content: FREEZE });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return { status: res?.status() ?? 0, finalPath: new URL(page.url()).pathname, png: await page.screenshot({ fullPage: true }) };
}

const browser = await chromium.launch();
const differ = await (await browser.newContext()).newPage();
async function diff(a, b) {
  return differ.evaluate(async ([ua, ub]) => {
    const load = (u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; });
    const [ia, ib] = await Promise.all([load(ua), load(ub)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const data = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext("2d"); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = data(ia), db = data(ib);
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
    const out = x.createImageData(w, h); let n = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
      if (d > 8) { n++; out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 80; out.data[i + 3] = 255; }
      else { const g = (da[i] + da[i + 1] + da[i + 2]) / 3; out.data[i] = out.data[i + 1] = out.data[i + 2] = 200 + g / 5; out.data[i + 3] = 255; }
    }
    x.putImageData(out, 0, 0);
    return { pixels: n, total: w * h, sizeA: [ia.width, ia.height], sizeB: [ib.width, ib.height], png: c.toDataURL("image/png").split(",")[1] };
  }, [`data:image/png;base64,${a.toString("base64")}`, `data:image/png;base64,${b.toString("base64")}`]);
}

const report = [];
for (const [role, { email, routes }] of Object.entries(ROLES)) {
  for (const [w, h] of WIDTHS) {
    const ctx = {};
    for (const [key, base] of [["a", A], ["b", B]]) {
      const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", locale: "hu-HU", timezoneId: "Europe/Budapest" });
      await c.addCookies([{ name: "trevu-locale", value: "hu", url: base }]);
      const p = await c.newPage();
      if (email) await login(p, base, email);
      ctx[key] = { c, p, base };
    }
    for (const route of routes) {
      const name = `${role}_${route.replace(/^\//, "").replace(/[/?=&]+/g, "_") || "home"}-${w}`;
      if (ONLY && !ONLY.test(name)) continue;
      try {
        const a = await shot(ctx.a.p, ctx.a.base + route);
        const b = await shot(ctx.b.p, ctx.b.base + route);
        const d = await diff(a.png, b.png);
        const pct = (d.pixels / d.total) * 100;
        writeFileSync(join(OUT, `${name}-a.png`), a.png);
        writeFileSync(join(OUT, `${name}-b.png`), b.png);
        writeFileSync(join(OUT, `${name}-diff.png`), Buffer.from(d.png, "base64"));
        const row = { name, route, width: w, statusA: a.status, statusB: b.status, pathA: a.finalPath, pathB: b.finalPath, sizeA: d.sizeA, sizeB: d.sizeB, diffPixels: d.pixels, diffPct: Number(pct.toFixed(4)) };
        report.push(row);
        console.log(`${pct <= MAX_PCT ? "✔" : "✖"} ${name}  ${row.diffPct} %  (${d.pixels} px)  ${a.status}/${b.status} ${a.finalPath}`);
      } catch (e) {
        report.push({ name, route, width: w, error: String(e).slice(0, 300) });
        console.log(`✖ ${name}  HIBA: ${String(e).slice(0, 200)}`);
      }
    }
    await ctx.a.c.close(); await ctx.b.c.close();
  }
}
await browser.close();
writeFileSync(join(OUT, "report.json"), JSON.stringify({ a: A, b: B, maxPct: MAX_PCT, at: new Date().toISOString(), rows: report }, null, 2));
const bad = report.filter((r) => r.error || r.diffPct > MAX_PCT);
console.log(`\n${report.length} összevetés, ${bad.length} a küszöb (${MAX_PCT} %) fölött vagy hibás.`);
process.exit(bad.length ? 1 : 0);
