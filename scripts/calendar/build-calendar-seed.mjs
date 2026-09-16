#!/usr/bin/env node
// M23 Calendar — seed-generátor a 043-as migrációhoz (korábban 037).
//
// Futtatás a monorepo gyökeréből (Node ≥ 22.18, típuskivonással):
//   node scripts/calendar/build-calendar-seed.mjs          # a migráció GENERATED SEED blokkjának frissítése
//   node scripts/calendar/build-calendar-seed.mjs --check  # csak ellenőrzés, fájlírás nélkül
//
// Bemenet: scripts/calendar/data/nager-2026-2028 (Nager.Date, MIT), a HU hivatalos adatai (lent),
// hu-names.mjs. Kimenet: supabase/migrations/043_m23_calendar.sql seed-blokkja.
// Ellenőrzés: a HU szabályos ünnepei egyeznek a Nager.Date HU-adatával; minden levezetett szabály
// mindhárom évre visszaadja a forrás dátumát.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveRule, ruleOccurrence } from "../../apps/web/lib/calendar/rules.ts";
import { HU_HOLIDAY_NAMES } from "./hu-names.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA_DIR = join(ROOT, "scripts/calendar/data/nager-2026-2028");
const MIGRATION = join(ROOT, "supabase/migrations/043_m23_calendar.sql");
const YEARS = [2026, 2027, 2028];
const CHECK_ONLY = process.argv.includes("--check");
const START = "-- >>> GENERATED SEED — scripts/calendar/build-calendar-seed.mjs; kézzel ne szerkeszd >>>";
const END = "-- <<< GENERATED SEED <<<";

const NAGER_SOURCE = "Nager.Date (MIT licenc), date.nager.at — letöltve 2026-09-15; a szabályt a Trevu seed-generátora vezette le és 2026–2028-ra ellenőrizte";
const NAGER_NOTE = "Nager.Date (MIT) pillanatkép, 2026-09-15; admin-ellenőrzésre vár";
const MT_SOURCE = "A munka törvénykönyvéről szóló 2012. évi I. törvény 102. § (1)";
const MT_URL = "https://njt.hu/jogszabaly/2012-1-00-00";
const NGM_2026 = "10/2025. (IV. 30.) NGM rendelet a 2026. évi munkaszüneti napok körüli munkarendről";
const SCHOOL_SOURCE = "A tanév rendjéről szóló miniszteri rendeletek: 27/2025. (VII. 24.) BM rendelet (2025/2026), 1/2026. (VII. 31.) OGYM rendelet (2026/2027)";
const VERIFY_NOTE = "ellenőrizve 2026-09-15: rendelet + két független másodlagos forrás";

// Ismert, elavult tétel a forrásban: Ferenc pápa 2025-ben elhunyt, az évforduló már nem munkaszüneti nap.
const EXCLUDED = new Set(["VA|Anniversary of the election of Pope Francis"]);

// Az országok elsődleges nyelve (a label_localized natív kulcsa); en/hu esetén nincs külön kulcs.
const NATIVE_LANG = {
  AD: "ca", AL: "sq", AT: "de", BA: "bs", BE: "nl", BG: "bg", BY: "be", CH: "de", CY: "el", CZ: "cs",
  DE: "de", DK: "da", EE: "et", ES: "es", FI: "fi", FR: "fr", GB: "en", GR: "el", HR: "hr", IE: "en",
  IS: "is", IT: "it", LI: "de", LT: "lt", LU: "fr", LV: "lv", MC: "fr", MD: "ro", ME: "sr", MK: "mk",
  MT: "mt", NL: "nl", NO: "no", PL: "pl", PT: "pt", RO: "ro", RS: "sr", RU: "ru", SE: "sv", SI: "sl",
  SK: "sk", SM: "it", UA: "uk", VA: "it",
};

const TYPES = [
  ["national_holiday", "Nemzeti ünnep", "National holiday", true, 10],
  ["public_holiday", "Munkaszüneti nap", "Public holiday", true, 20],
  ["bridge_day", "Áthelyezett pihenőnap", "Bridge day", true, 30],
  ["swapped_workday", "Áthelyezett munkanap", "Swapped working day", false, 40],
  ["holiday_season", "Ünnepi időszak", "Holiday season", false, 50],
  ["school_holiday", "Tanítási szünet", "School holiday", false, 60],
  ["season", "Évszak", "Season", false, 70],
  ["custom", "Egyedi időszak", "Custom period", false, 80],
];

const TAGS = [
  ["long_weekend", "Hosszú hétvége", "Long weekend", 10],
  ["family_friendly", "Családbarát", "Family-friendly", 20],
  ["peak_season", "Főszezon", "Peak season", 30],
  ["ski_season", "Síszezon", "Ski season", 40],
];

const q = (value) => (value === null || value === undefined ? "NULL" : `'${String(value).replace(/'/g, "''")}'`);
const j = (value) => `${q(JSON.stringify(value))}::jsonb`;
const slug = (text) =>
  text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/** @type {Array<{country: string|null, key: string, hu: string, en: string, extra?: object, type: string, hemisphere?: string, ruleKind: string, params: object, dayOff: boolean, source: string, url?: string, tags?: string[]}>} */
const periods = [];
/** @type {Array<{country: string|null, key: string, year: number, earliest: string, latest: string, status: string, note: string}>} */
const occurrences = [];

function addPeriod(period) {
  if (periods.some((p) => p.country === period.country && p.key === period.key)) {
    throw new Error(`Duplikált kulcs: ${period.country}/${period.key}`);
  }
  periods.push(period);
}

// ─── Évszakok (BR-M23-005, F-01) ────────────────────────────────────────────
const SEASONS = [
  ["spring", "Tavasz", "Spring"], ["summer", "Nyár", "Summer"], ["autumn", "Ősz", "Autumn"], ["winter", "Tél", "Winter"],
];
const SEASON_RANGES = {
  north: { spring: [3, 1, 5, 31], summer: [6, 1, 8, 31], autumn: [9, 1, 11, 30], winter: [12, 1, 2, 29] },
  south: { spring: [9, 1, 11, 30], summer: [12, 1, 2, 29], autumn: [3, 1, 5, 31], winter: [6, 1, 8, 31] },
};
for (const hemisphere of ["north", "south"]) {
  for (const [code, hu, en] of SEASONS) {
    const [month, day, end_month, end_day] = SEASON_RANGES[hemisphere][code];
    addPeriod({
      country: null, key: `season_${hemisphere}_${code}`,
      hu: `${hu} (${hemisphere === "north" ? "északi" : "déli"} félteke)`,
      en: `${en} (${hemisphere === "north" ? "Northern" : "Southern"} Hemisphere)`,
      type: "season", hemisphere, ruleKind: "fixed_annual", params: { month, day, end_month, end_day },
      dayOff: false, source: "Meteorológiai évszakok (M23 BR-M23-005)",
    });
  }
}

// ─── Magyarország — hivatalos jogforrás ─────────────────────────────────────
const HU_FIXED = [
  ["hu_new_year", "Újév", "New Year's Day", "public_holiday", "fixed_annual", { month: 1, day: 1 }],
  ["hu_national_day_1848", "Nemzeti ünnep (1848. március 15.)", "National Day (1848 Revolution)", "national_holiday", "fixed_annual", { month: 3, day: 15 }],
  ["hu_good_friday", "Nagypéntek", "Good Friday", "public_holiday", "easter_offset", { offset: -2 }],
  ["hu_easter_monday", "Húsvéthétfő", "Easter Monday", "public_holiday", "easter_offset", { offset: 1 }],
  ["hu_labour_day", "A munka ünnepe", "Labour Day", "public_holiday", "fixed_annual", { month: 5, day: 1 }],
  ["hu_whit_monday", "Pünkösdhétfő", "Whit Monday", "public_holiday", "easter_offset", { offset: 50 }],
  ["hu_state_foundation_day", "Az államalapítás ünnepe", "State Foundation Day", "national_holiday", "fixed_annual", { month: 8, day: 20 }],
  ["hu_national_day_1956", "Nemzeti ünnep (1956. október 23.)", "National Day (1956 Revolution)", "national_holiday", "fixed_annual", { month: 10, day: 23 }],
  ["hu_all_saints_day", "Mindenszentek", "All Saints' Day", "public_holiday", "fixed_annual", { month: 11, day: 1 }],
  ["hu_christmas_day", "Karácsony", "Christmas Day", "public_holiday", "fixed_annual", { month: 12, day: 25 }],
  ["hu_christmas_second_day", "Karácsony másnapja", "Second Day of Christmas", "public_holiday", "fixed_annual", { month: 12, day: 26 }],
];
for (const [key, hu, en, type, ruleKind, params] of HU_FIXED) {
  addPeriod({ country: "HU", key, hu, en, type, ruleKind, params, dayOff: true, source: MT_SOURCE, url: MT_URL });
}

const HU_SWAPS_2026 = [
  ["bridge_day", "2026-01-02", "Áthelyezett pihenőnap (2026. január 2.)", "Bridge day (2 January 2026)", "a 2026. január 10-i munkanap helyett"],
  ["swapped_workday", "2026-01-10", "Áthelyezett munkanap (2026. január 10., szombat)", "Swapped working day (Saturday, 10 January 2026)", "a január 2-i pihenőnap ledolgozása"],
  ["bridge_day", "2026-08-21", "Áthelyezett pihenőnap (2026. augusztus 21.)", "Bridge day (21 August 2026)", "a 2026. augusztus 8-i munkanap helyett"],
  ["swapped_workday", "2026-08-08", "Áthelyezett munkanap (2026. augusztus 8., szombat)", "Swapped working day (Saturday, 8 August 2026)", "az augusztus 21-i pihenőnap ledolgozása"],
  ["bridge_day", "2026-12-24", "Áthelyezett pihenőnap (2026. december 24.)", "Bridge day (24 December 2026)", "a 2026. december 12-i munkanap helyett"],
  ["swapped_workday", "2026-12-12", "Áthelyezett munkanap (2026. december 12., szombat)", "Swapped working day (Saturday, 12 December 2026)", "a december 24-i pihenőnap ledolgozása"],
];
for (const [type, date, hu, en, note] of HU_SWAPS_2026) {
  const key = `hu_${type}_${date.replace(/-/g, "_")}`;
  addPeriod({ country: "HU", key, hu, en, type, ruleKind: "explicit", params: { one_off: true }, dayOff: type === "bridge_day", source: NGM_2026 });
  occurrences.push({ country: "HU", key, year: 2026, earliest: date, latest: date, status: "verified", note: `${NGM_2026}; ${note}; ${VERIFY_NOTE}` });
}

const HU_SCHOOL = [
  ["hu_school_autumn_break", "Őszi szünet", "Autumn school holiday", [
    [2025, "2025-10-23", "2025-11-02", "2025/2026. tanév: utolsó tanítási nap okt. 22., első nov. 3."],
    [2026, "2026-10-23", "2026-11-01", "2026/2027. tanév: utolsó tanítási nap okt. 22., első nov. 2."],
  ]],
  ["hu_school_winter_break", "Téli szünet", "Winter school holiday", [
    [2025, "2025-12-20", "2026-01-04", "2025/2026. tanév: utolsó tanítási nap dec. 19., első jan. 5."],
    [2026, "2026-12-19", "2027-01-03", "2026/2027. tanév: utolsó tanítási nap dec. 18., első jan. 4."],
  ]],
  ["hu_school_spring_break", "Tavaszi szünet", "Spring school holiday", [
    [2026, "2026-04-02", "2026-04-12", "2025/2026. tanév: utolsó tanítási nap ápr. 1., első ápr. 13."],
    [2027, "2027-03-25", "2027-04-04", "2026/2027. tanév: utolsó tanítási nap márc. 24., első ápr. 5."],
  ]],
  ["hu_school_summer_break", "Nyári szünet", "Summer school holiday", [
    [2026, "2026-06-20", "2026-08-31", "2025/2026. tanév utolsó tanítási napja jún. 19."],
    [2027, "2027-06-19", "2027-08-31", "2026/2027. tanév utolsó tanítási napja jún. 18."],
  ]],
];
for (const [key, hu, en, rows] of HU_SCHOOL) {
  addPeriod({ country: "HU", key, hu, en, type: "school_holiday", ruleKind: "explicit", params: {}, dayOff: false, source: SCHOOL_SOURCE, tags: ["family_friendly"] });
  for (const [year, earliest, latest, note] of rows) {
    occurrences.push({ country: "HU", key, year, earliest, latest, status: "verified", note: `${note}; ${VERIFY_NOTE}` });
  }
}

// ─── Európa — Nager.Date pillanatkép ────────────────────────────────────────
const files = readdirSync(DATA_DIR).filter((f) => /^[A-Z]{2}_\d{4}\.json$/.test(f));
const byCountry = new Map();
for (const file of files) {
  const [country, year] = [file.slice(0, 2), Number(file.slice(3, 7))];
  const rows = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
  if (!byCountry.has(country)) byCountry.set(country, []);
  for (const row of rows) {
    if (row.global && row.types.includes("Public")) byCountry.get(country).push({ ...row, year });
  }
}

// HU keresztellenőrzés: a Mt. 102. § (1) szerinti napok = Nager HU, a két vasárnapi ünnep nélkül.
{
  const ours = HU_FIXED.flatMap(([, , , , ruleKind, params]) => YEARS.map((y) => ruleOccurrence({ kind: ruleKind, params }, y).earliest)).sort();
  const nager = byCountry.get("HU").filter((r) => !["Easter Sunday", "Pentecost"].includes(r.name)).map((r) => r.date).sort();
  if (JSON.stringify(ours) !== JSON.stringify(nager)) {
    throw new Error(`HU keresztellenőrzés sikertelen:\n saját: ${ours.join(",")}\n Nager: ${nager.join(",")}`);
  }
}

const stats = { countries: 0, rule: 0, explicit: 0, excluded: 0 };
for (const [country, rows] of [...byCountry.entries()].sort()) {
  if (country === "HU") continue;
  stats.countries += 1;
  // Csoportosítás név szerint; ha egy évben ugyanaz a név többször szerepel, sorszám szerint.
  const groups = new Map();
  const seen = new Map();
  for (const row of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
    if (EXCLUDED.has(`${country}|${row.name}`)) { stats.excluded += 1; continue; }
    const countKey = `${row.name}|${row.year}`;
    const index = seen.get(countKey) ?? 0;
    seen.set(countKey, index + 1);
    const groupKey = `${row.name}|${index}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { name: row.name, localName: row.localName, index, dates: {} });
    groups.get(groupKey).dates[row.year] = row.date;
  }
  const usedKeys = new Set();
  for (const group of [...groups.values()].sort((a, b) => Object.values(a.dates)[0].localeCompare(Object.values(b.dates)[0]))) {
    const hu = HU_HOLIDAY_NAMES[group.name];
    if (!hu) throw new Error(`Hiányzó magyar név: "${group.name}" (${country}) — bővítsd a hu-names.mjs-t`);
    let key = `${country.toLowerCase()}_${slug(group.name)}`.slice(0, 72);
    for (let n = 2; usedKeys.has(key); n += 1) key = `${key.replace(/_\d+$/, "")}_${n}`;
    usedKeys.add(key);
    const extra = {};
    const lang = NATIVE_LANG[country];
    if (lang && lang !== "en" && lang !== "hu" && group.localName && group.localName !== group.name) extra[lang] = group.localName;
    const fullYears = YEARS.every((y) => group.dates[y]);
    const rule = fullYears ? deriveRule(group.dates) : null;
    if (rule) {
      stats.rule += 1;
      addPeriod({ country, key, hu, en: group.name, extra, type: "public_holiday", ruleKind: rule.kind, params: rule.params, dayOff: true, source: NAGER_SOURCE, url: "https://date.nager.at" });
    } else {
      stats.explicit += 1;
      addPeriod({ country, key, hu, en: group.name, extra, type: "public_holiday", ruleKind: "explicit", params: {}, dayOff: true, source: NAGER_SOURCE, url: "https://date.nager.at" });
      for (const [year, date] of Object.entries(group.dates)) {
        occurrences.push({ country, key, year: Number(year), earliest: date, latest: date, status: "entered", note: NAGER_NOTE });
      }
    }
  }
}

// ─── SQL ────────────────────────────────────────────────────────────────────
const out = [];
out.push("-- 7.1 Időszaktípusok (FR-M23-001)");
out.push("INSERT INTO public.ref_calendar_period_types (key, label_localized, can_be_day_off, sort_order) VALUES");
out.push(TYPES.map(([key, hu, en, dayOff, sort]) => `  (${q(key)}, ${j({ hu, en })}, ${dayOff}, ${sort})`).join(",\n"));
out.push("ON CONFLICT (key) DO NOTHING;\n");
out.push("-- 7.2 Címkék — kezdőkészlet (FR-M23-002 3., NyK-03)");
out.push("INSERT INTO public.ref_calendar_tags (key, label_localized, sort_order) VALUES");
out.push(TAGS.map(([key, hu, en, sort]) => `  (${q(key)}, ${j({ hu, en })}, ${sort})`).join(",\n"));
out.push("ON CONFLICT (key) DO NOTHING;\n");
out.push(`-- 7.3 Időszak-definíciók (${periods.length} db): évszakok, HU (hivatalos forrás), ${stats.countries} európai ország (Nager.Date)`);
out.push("INSERT INTO public.ref_calendar_periods (key, label_localized, period_type, country_code, hemisphere, rule_kind, rule_params, is_day_off, source_text, source_url) VALUES");
out.push(periods.map((p) => `  (${q(p.key)}, ${j({ hu: p.hu, en: p.en, ...(p.extra ?? {}) })}, ${q(p.type)}, ${q(p.country)}, ${q(p.hemisphere)}, ${q(p.ruleKind)}, ${j(p.params)}, ${p.dayOff}, ${q(p.source)}, ${q(p.url)})`).join(",\n"));
out.push("ON CONFLICT ON CONSTRAINT uq_ref_calendar_periods_scope_key DO NOTHING;\n");
out.push("-- 7.4 Címkék a definíciókon");
out.push("INSERT INTO public.ref_calendar_period_tags (period_id, tag_id)");
out.push("SELECT p.id, t.id FROM (VALUES");
out.push(periods.flatMap((p) => (p.tags ?? []).map((tag) => `  (${q(p.country)}, ${q(p.key)}, ${q(tag)})`)).join(",\n"));
out.push(") AS v(country_code, period_key, tag_key)");
out.push("JOIN public.ref_calendar_periods p ON p.country_code IS NOT DISTINCT FROM v.country_code AND p.subdivision_code IS NULL AND p.key = v.period_key");
out.push("JOIN public.ref_calendar_tags t ON t.key = v.tag_key");
out.push("ON CONFLICT DO NOTHING;\n");
out.push(`-- 7.5 Évenkénti (explicit) előfordulások (${occurrences.length} db): HU verified, Nager.Date entered`);
out.push("INSERT INTO public.ref_calendar_occurrences (period_id, year, earliest, latest, status, verified_at, source_note)");
out.push("SELECT p.id, v.year, v.earliest::date, v.latest::date, v.status, CASE WHEN v.status = 'verified' THEN now() END, v.note FROM (VALUES");
out.push(occurrences.map((o) => `  (${q(o.country)}, ${q(o.key)}, ${o.year}, ${q(o.earliest)}, ${q(o.latest)}, ${q(o.status)}, ${q(o.note)})`).join(",\n"));
out.push(") AS v(country_code, period_key, year, earliest, latest, status, note)");
out.push("JOIN public.ref_calendar_periods p ON p.country_code IS NOT DISTINCT FROM v.country_code AND p.subdivision_code IS NULL AND p.key = v.period_key");
out.push("ON CONFLICT (period_id, year) DO NOTHING;\n");
out.push("-- 7.6 Szabályalapú előfordulások: folyó év + 2 (FR-M23-004 1.)");
out.push("SELECT public.calendar_generate_occurrences(2026, 2028);");
const block = out.join("\n");

console.log(`Definíciók: ${periods.length} (európai országok: ${stats.countries}, szabály: ${stats.rule}, évenkénti: ${stats.explicit}, kizárt: ${stats.excluded})`);
console.log(`Explicit előfordulások: ${occurrences.length}`);

if (CHECK_ONLY) process.exit(0);
const sql = readFileSync(MIGRATION, "utf8");
const start = sql.indexOf(START);
const end = sql.indexOf(END);
if (start < 0 || end < start) throw new Error("A migrációban nem található a GENERATED SEED blokk");
writeFileSync(MIGRATION, `${sql.slice(0, start + START.length)}\n${block}\n${sql.slice(end)}`);
console.log(`Frissítve: ${MIGRATION}`);
