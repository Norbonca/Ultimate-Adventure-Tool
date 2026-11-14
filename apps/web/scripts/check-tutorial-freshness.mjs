// M211 — Útmutató-frissesség: mely útmutatók képanyaga avult el a felvétel óta?
//
// A szabály a `tutorial-freshness.json`-ban van:
//   kozos.utvonalak     — az egész felületet érintő forrás (téma, márka, fejléc, lábléc, közös UI).
//                         Ha ezek bármelyike változott, MINDEN útmutató elavul.
//   utmutatok.<slug>    — az adott útmutató képernyőit adó forrásmappák, és a felvétel commitja
//                         nyelvenként (`felveve.hu`, `felveve.en`) — ezt a felvevő szkriptek írják.
//   puha.utvonalak      — nem tesz elavulttá, csak átnézendőként jelzi (nyelvi fájlok).
//
// Használat:
//   node apps/web/scripts/check-tutorial-freshness.mjs            # teljes kapu: mi avult el valaha
//   node apps/web/scripts/check-tutorial-freshness.mjs --figyelmeztet   # mindig 0, csak jelent
//   node apps/web/scripts/check-tutorial-freshness.mjs --nyelv hu
//   node apps/web/scripts/check-tutorial-freshness.mjs --diff <alap-sha>
//        EZT futtatja a CI a PR-eken: csak azt nézi, hogy EBBEN a változásban van-e olyan fájl,
//        amitől útmutató avul el — és ha igen, frissült-e vele a képanyag (public/tutorials/**)
//        vagy a manifest. Így a régi adósság nem blokkol, az új viszont a saját PR-jében derül ki.
//
// Exit: 0 ok, 1 elavult útmutató, 2 hiányzó vagy hibás manifest.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(SCRIPTS, "..", "..", "..");
const MANIFEST = join(SCRIPTS, "tutorial-freshness.json");
const FIGYELMEZTET = process.argv.includes("--figyelmeztet");
const nyelvArg = process.argv[process.argv.indexOf("--nyelv") + 1];
const NYELVEK = process.argv.includes("--nyelv") ? [nyelvArg] : ["hu", "en"];

if (!existsSync(MANIFEST)) {
  console.log(`\n📸 Útmutató-frissesség — nincs manifest: ${MANIFEST}\n`);
  process.exit(2);
}
const m = JSON.parse(readFileSync(MANIFEST, "utf8"));
if (!m.utmutatok || !m.kozos) {
  console.log("\n📸 Útmutató-frissesség — a manifestből hiányzik a `kozos` vagy az `utmutatok` szakasz.\n");
  process.exit(2);
}

const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
const letezik = (sha) => {
  try { git("cat-file", "-e", `${sha}^{commit}`); return true; } catch { return false; }
};
/** A megadott útvonalakat érintő commitok a `sinceSha` óta (tárgysorral). */
const commitokOta = (sinceSha, utvonalak) => {
  if (!utvonalak.length) return [];
  const out = git("log", "--format=%h %s", `${sinceSha}..HEAD`, "--", ...utvonalak);
  return out ? out.split("\n") : [];
};


// ── --diff mód: csak az aktuális változás hatása ──────────────────────────────
const diffIdx = process.argv.indexOf("--diff");
if (diffIdx > -1) {
  const alap = process.argv[diffIdx + 1];
  if (!alap || !letezik(alap)) {
    console.log(`\n📸 Útmutató-frissesség — a --diff alapja nem érvényes commit: ${alap ?? "(nincs megadva)"}\n`);
    process.exit(2);
  }
  const valtozott = git("diff", "--name-only", `${alap}...HEAD`).split("\n").filter(Boolean);
  const erint = (f, utvonalak) => utvonalak.some((u) => (u.endsWith("/") ? f.startsWith(u) : f === u));
  const kozos = valtozott.filter((f) => erint(f, m.kozos.utvonalak ?? []));
  const sajat = {};
  for (const [slug, be] of Object.entries(m.utmutatok)) {
    const h = valtozott.filter((f) => erint(f, be.utvonalak ?? []));
    if (h.length) sajat[slug] = h;
  }
  const kepFrissult = valtozott.some((f) => f.startsWith("apps/web/public/tutorials/") || f.endsWith("scripts/tutorial-freshness.json"));
  const puhaDiff = valtozott.filter((f) => erint(f, m.puha?.utvonalak ?? []));

  console.log(`\n📸 Útmutató-frissesség — ez a változás (${alap}...HEAD, ${valtozott.length} fájl)\n`);
  if (puhaDiff.length) console.log(`🟡 Nyelvi fájl változott (${puhaDiff.length}) — nézd át, látszik-e a képeken.\n`);
  if (!kozos.length && !Object.keys(sajat).length) {
    console.log("✅ Egyetlen útmutató képanyagát sem érinti.\n");
    process.exit(0);
  }
  if (kozos.length) {
    console.log(`🔴 Közös felület változott — MINDEN útmutató képanyaga elavul:`);
    kozos.slice(0, 10).forEach((f) => console.log(`  ${f}`));
    if (kozos.length > 10) console.log(`  … és még ${kozos.length - 10} fájl`);
    console.log("");
  }
  if (Object.keys(sajat).length) {
    console.log(`🔴 Érintett útmutatók (${Object.keys(sajat).length}):`);
    for (const [slug, fajlok] of Object.entries(sajat)) console.log(`  ${slug} ← ${fajlok.slice(0, 3).join(", ")}${fajlok.length > 3 ? ` (+${fajlok.length - 3})` : ""}`);
    console.log("");
  }
  if (kepFrissult) {
    console.log("✅ A képanyag vagy a manifest is változott ebben a PR-ben — rendben.\n");
    process.exit(0);
  }
  console.log("👉 Vedd fel újra az érintett útmutatókat (3.12), vagy ha a változás a képeken tényleg nem látszik,");
  console.log("   írd meg a PR leírásában, miért nem — a kapu a képanyag vagy a manifest érintésére enged tovább.\n");
  process.exit(FIGYELMEZTET ? 0 : 1);
}

const elavult = [];
const nincsFelveve = [];
const friss = [];

for (const [slug, be] of Object.entries(m.utmutatok)) {
  const utvonalak = [...(m.kozos.utvonalak ?? []), ...(be.utvonalak ?? [])];
  for (const nyelv of NYELVEK) {
    const sha = be.felveve?.[nyelv] ?? null;
    if (!sha) { nincsFelveve.push(`${slug} · ${nyelv}`); continue; }
    if (!letezik(sha)) { elavult.push({ slug, nyelv, okok: [`a felvétel commitja (${sha}) nincs meg a history-ban`] }); continue; }
    const okok = commitokOta(sha, utvonalak);
    if (okok.length) elavult.push({ slug, nyelv, okok });
    else friss.push(`${slug} · ${nyelv}`);
  }
}

// Puha jelzés: a nyelvi fájlok változása a képeken is látszik, de nem kapu.
const legregebbi = Object.values(m.utmutatok)
  .flatMap((be) => NYELVEK.map((n) => be.felveve?.[n]).filter(Boolean))
  .filter(letezik)
  .sort((a, b) => Number(git("rev-list", "--count", `${a}..HEAD`)) - Number(git("rev-list", "--count", `${b}..HEAD`)))
  .pop();
const puha = legregebbi && m.puha?.utvonalak?.length ? commitokOta(legregebbi, m.puha.utvonalak) : [];

console.log(`\n📸 Útmutató-frissesség — ${friss.length} friss, ${elavult.length} elavult, ${nincsFelveve.length} felvétel nélkül\n`);

if (nincsFelveve.length) {
  console.log(`⚪ ${nincsFelveve.length} tétel még nincs felvéve (a manifestben nincs commit):`);
  nincsFelveve.forEach((x) => console.log(`  ${x}`));
  console.log("");
}
if (elavult.length) {
  console.log(`🔴 ${elavult.length} útmutató képanyaga elavult:`);
  for (const e of elavult) {
    console.log(`  ${e.slug} · ${e.nyelv}`);
    e.okok.slice(0, 4).forEach((o) => console.log(`      ${o}`));
    if (e.okok.length > 4) console.log(`      … és még ${e.okok.length - 4} commit`);
  }
  console.log("");
}
if (puha.length) {
  console.log(`🟡 A nyelvi fájlok ${puha.length} commitban változtak a legrégebbi felvétel óta — nézd át, látszik-e a képeken:`);
  puha.slice(0, 5).forEach((o) => console.log(`      ${o}`));
  if (puha.length > 5) console.log(`      … és még ${puha.length - 5} commit`);
  console.log("");
}

if (!elavult.length && !nincsFelveve.length) {
  console.log("✅ Minden útmutató képanyaga friss.\n");
  process.exit(0);
}
console.log("👉 Újrafelvétel (helyi dev szerver + demóadat, LOCAL_DEV_GUIDE.md):");
console.log("   BASE=http://localhost:3011 [LOCALE=en] node apps/web/scripts/tutorial-slides-capture.mjs [slug]");
console.log("   BASE=http://localhost:3011 [LOCALE=en] node apps/web/scripts/tutorial-posters-capture.mjs [slug]");
console.log("   A felvevő a manifest `felveve` mezőjét magától frissíti; a commitba a képek és a manifest is menjen.\n");
process.exit(FIGYELMEZTET ? 0 : 1);
