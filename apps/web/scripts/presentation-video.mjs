// M211b — A bemutató videója és borítóképe a /presentation lejátszóból, az aktuális arculattal.
// Kimenet: public/videos/bemutato.mp4 (LOCALE=en: bemutato-en.mp4; 1280×720, H.264, hang nélkül)
// és public/videos/bemutato-poster.jpg (nyelvfüggetlen, a magyar futás írja).
// Nyitókép a nagy márkafejjel és a szójellel, utána a diák a vezérlők, a fejléc és a haladásjelző nélkül.
// A borító felirat nélküli: a nyitódia háttérképe a márkafejjel (képre nem kerül beégetett szöveg vagy név).
// Használat: BASE=http://localhost:3000 [LOCALE=hu] node scripts/presentation-video.mjs   (kell: ffmpeg)
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";

// A márkafej vektora a components/brand/paths.ts-ből (névváltásnál onnan frissül).
const PATHS = readFileSync(new URL("../components/brand/paths.ts", import.meta.url), "utf8");
const headBlock = PATHS.slice(PATHS.indexOf("export const HEAD"));
const HEAD = { viewBox: headBlock.match(/viewBox: "([^"]+)"/)[1], d: headBlock.match(/d: "([^"]+)"/)[1] };
const wordBlock = PATHS.slice(PATHS.indexOf("export const WORDMARK"));
const WORDMARK = { viewBox: wordBlock.match(/viewBox: "([^"]+)"/)[1], d: wordBlock.match(/d: "([^"]+)"/)[1] };
const INTRO_SECONDS = 3.5; // nyitókép: nagy fej-ikon és szójel (Norbert, 2026-11-15) — URL nélkül, mert a domain változik

const BASE = process.env.BASE ?? "http://localhost:3000";
const LOCALE = process.env.LOCALE === "en" ? "en" : "hu";
const SLIDES = Number(process.env.SLIDES ?? 20);
const SLIDE_SECONDS = 7;
const TMP = "/tmp/presentation-video";
const OUT = "public/videos";
const VIDEO_NAME = LOCALE === "en" ? "bemutato-en.mp4" : "bemutato.mp4";
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const HIDE_CHROME = `
  [data-testid="presentation"] > header,
  [data-testid="presentation"] > div:first-of-type,
  [data-testid="presentation"] > nav,
  nextjs-portal { display: none !important; }
`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

// 1) Bemelegítés: a fejlesztői szerver lefordítja az oldalt, a képek gyorsítótárba kerülnek.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addCookies([{ name: "trevu-locale", value: LOCALE, url: BASE }]);
  const p = await ctx.newPage();
  for (let n = 1; n <= SLIDES; n++) {
    await p.goto(`${BASE}/presentation#${n}`, { waitUntil: "networkidle", timeout: 120000 });
    await p.reload({ waitUntil: "networkidle" });
  }
  await ctx.close();
}

// 2) Felvétel
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: TMP, size: { width: 1280, height: 720 } },
  reducedMotion: "no-preference",
});
await ctx.addCookies([{ name: "trevu-locale", value: LOCALE, url: BASE }]);
const p = await ctx.newPage();
await p.addInitScript((css) => {
  document.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  });
}, HIDE_CHROME);
const t0 = Date.now();
await p.goto(`${BASE}/presentation`, { waitUntil: "networkidle", timeout: 120000 });
const lead = (Date.now() - t0) / 1000; // a betöltés ideje — ezt vágjuk le az elejéről
await p.waitForTimeout(SLIDES * SLIDE_SECONDS * 1000 + 1500);
await ctx.close();

// 3) Nyitókép: a márkafej és a szójel a sötét felületen (a színek a téma tokenjeiből)
{
  const c = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const q = await c.newPage();
  await q.goto(`${BASE}/presentation#1`, { waitUntil: "networkidle" });
  await q.evaluate(({ head, word }) => {
    const box = document.createElement("div");
    box.setAttribute("data-surface", "night");
    box.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;background:var(--color-bg)";
    box.innerHTML =
      `<svg viewBox="${head.viewBox}" height="300" aria-hidden="true" style="color:var(--color-primary)"><path fill="currentColor" fill-rule="evenodd" d="${head.d}"/></svg>` +
      `<svg viewBox="${word.viewBox}" height="120" aria-hidden="true" style="color:var(--color-text)"><path fill="currentColor" fill-rule="evenodd" d="${word.d}"/></svg>`;
    document.body.appendChild(box);
  }, { head: HEAD, word: WORDMARK });
  await q.waitForTimeout(500);
  await q.screenshot({ path: `${TMP}/intro.png` });
  await c.close();
}

// 4) Kódolás: nyitókép (beúszás) + a diák felvétele áttűnéssel → MP4 (H.264, faststart)
const webm = readdirSync(TMP).find((f) => f.endsWith(".webm"));
const body = SLIDES * SLIDE_SECONDS + 1;
execFileSync("ffmpeg", [
  "-y", "-v", "error",
  "-loop", "1", "-t", String(INTRO_SECONDS), "-framerate", "25", "-i", `${TMP}/intro.png`,
  "-ss", String(Math.max(0, lead + 0.3)), "-t", String(body), "-i", `${TMP}/${webm}`,
  "-filter_complex",
  `[0:v]format=yuv420p,fade=t=in:st=0:d=0.6,setsar=1[i];[1:v]fps=25,format=yuv420p,setsar=1[b];[i][b]xfade=transition=fade:duration=0.6:offset=${INTRO_SECONDS - 0.6}[v]`,
  "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
  `${OUT}/${VIDEO_NAME}`,
]);

// 5) Borító: a nyitódia háttere szöveg nélkül, a márkafejjel (csak a magyar futásnál)
if (LOCALE === "hu") {
  const c = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await c.addCookies([{ name: "trevu-locale", value: LOCALE, url: BASE }]);
  const q = await c.newPage();
  await q.goto(`${BASE}/presentation#1`, { waitUntil: "networkidle" });
  await q.reload({ waitUntil: "networkidle" });
  await q.addStyleTag({ content: HIDE_CHROME });
  await q.waitForTimeout(1500);
  await q.evaluate((head) => {
    const slide = document.querySelector('[data-testid="slide-cover"]');
    if (!slide) return;
    // A szöveg eltűnik; a háttérkép és a fátyol marad, középre a márkafej kerül (név nélkül).
    slide.querySelectorAll("h1, h2, p, a").forEach((el) => { el.style.visibility = "hidden"; });
    const box = document.createElement("div");
    box.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--color-primary)";
    box.innerHTML = `<svg viewBox="${head.viewBox}" height="260" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${head.d}"/></svg>`;
    slide.appendChild(box);
  }, HEAD);
  await q.screenshot({ path: `${TMP}/poster.png` });
  await c.close();
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", `${TMP}/poster.png`, "-q:v", "4", `${OUT}/bemutato-poster.jpg`]);
}

await browser.close();
console.log(`kész: ${OUT}/${VIDEO_NAME}${LOCALE === "hu" ? `, ${OUT}/bemutato-poster.jpg` : ""} (levágott betöltés: ${lead.toFixed(1)} s)`);
