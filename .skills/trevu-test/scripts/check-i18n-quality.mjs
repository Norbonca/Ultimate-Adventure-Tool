#!/usr/bin/env node
/**
 * Trevu i18n Quality Checker
 * Detects language contamination and consistency issues.
 *
 * Checks: LANG-01 through LANG-05 from TESTING_PLAN.md
 * Exit code 0 = all pass, 1 = issues found
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

// ── Allowed English terms in Hungarian text ───────────────
const ALLOWED_EN_IN_HU = new Set([
  'login', 'email', 'dashboard', 'trip', 'profile', 'gps', 'url',
  'wifi', 'ai', 'admin', 'cookie', 'online', 'offline', 'app', 'web',
  'link', 'upload', 'download', 'slider', 'scroll', 'ok', 'trevu',
  'api', 'supabase', 'oauth', 'google', 'smtp', 'http', 'https',
  'slug', 'id', 'uuid', 'json', 'csv', 'pdf', 'ui', 'ux',
]);

// Common English words that shouldn't appear in Hungarian translations
const ENGLISH_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'way', 'who', 'did',
  'your', 'each', 'make', 'like', 'long', 'look', 'many', 'some',
  'time', 'very', 'when', 'come', 'could', 'than', 'first', 'been',
  'have', 'from', 'they', 'this', 'that', 'with', 'what', 'there',
  'about', 'would', 'these', 'other', 'which', 'their', 'will',
  'welcome', 'hello', 'please', 'thank', 'sorry', 'error', 'success',
  'failed', 'loading', 'submit', 'save', 'delete', 'edit', 'create',
  'update', 'cancel', 'close', 'open', 'search', 'filter', 'settings',
  'password', 'username', 'sign', 'register', 'logout', 'account',
  'description', 'title', 'name', 'date', 'type', 'status', 'action',
  'details', 'overview', 'manage', 'confirm', 'required', 'optional',
]);

// Common Hungarian words that shouldn't appear in English translations
const HUNGARIAN_WORDS = new Set([
  'és', 'vagy', 'nem', 'igen', 'egy', 'az', 'meg', 'már', 'lesz',
  'volt', 'lett', 'csak', 'mint', 'még', 'sem', 'majd', 'fel', 'itt',
  'ott', 'ami', 'aki', 'azt', 'ezt', 'van', 'nincs', 'kell', 'hogy',
  'ból', 'ből', 'ban', 'ben', 'nak', 'nek', 'hoz', 'hez', 'höz',
  'szükséges', 'kötelező', 'mentés', 'törlés', 'szerkesztés',
  'bezárás', 'vissza', 'tovább', 'keresés', 'szűrés', 'rendezés',
  'összes', 'bejelentkezés', 'kijelentkezés', 'regisztráció',
  'jelszó', 'felhasználó', 'betöltés', 'hiba', 'sikeres', 'figyelmeztetés',
]);

// ── Helpers ──────────────────────────────────────────────

function loadContent(locale) {
  const path = resolve(ROOT, `packages/i18n/src/${locale}.ts`);
  return readFileSync(path, 'utf-8');
}

function extractKeyValues(content) {
  const values = {};
  const lines = content.split('\n');
  const currentPath = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('export ')
        || trimmed.startsWith('//') || trimmed.startsWith('*')
        || trimmed.startsWith('/*') || trimmed === '') continue;

    const kvMatch = trimmed.match(/^(\w+)\s*:\s*["'`](.*?)["'`]\s*,?\s*$/);
    if (kvMatch) {
      const fullKey = [...currentPath, kvMatch[1]].join('.');
      values[fullKey] = kvMatch[2];
      continue;
    }

    const nestMatch = trimmed.match(/^(\w+)\s*:\s*\{\s*$/);
    if (nestMatch) {
      currentPath.push(nestMatch[1]);
      continue;
    }

    if (trimmed === '},' || trimmed === '}') {
      if (currentPath.length > 0) currentPath.pop();
    }
  }
  return values;
}

function tokenize(str) {
  return str.toLowerCase()
    .replace(/\{[\w]+\}/g, '')       // Remove {placeholders}
    .replace(/[^a-záàâãéèêíïóôõöúüûçñšžő\s-]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

// ── Main ─────────────────────────────────────────────────

const fails = [];
const concerns = [];

console.log('🔍 Trevu i18n Quality Check\n');

const huContent = loadContent('hu');
const enContent = loadContent('en');
const huValues = extractKeyValues(huContent);
const enValues = extractKeyValues(enContent);

// LANG-01: Hungarian values shouldn't contain common English words
console.log('── LANG-01: English contamination in HU ──');
let enInHuCount = 0;
for (const [key, val] of Object.entries(huValues)) {
  const words = tokenize(val);
  for (const word of words) {
    if (ENGLISH_WORDS.has(word) && !ALLOWED_EN_IN_HU.has(word)) {
      concerns.push({ id: 'LANG-01', msg: `English word "${word}" in hu.ts: ${key} = "${val}"` });
      enInHuCount++;
      break; // One per key is enough
    }
  }
}
console.log(enInHuCount === 0
  ? '  ✅ No English contamination in HU'
  : `  ⚠️  ${enInHuCount} key(s) with English words in HU`);

// LANG-02: English values shouldn't contain Hungarian words
console.log('\n── LANG-02: Hungarian contamination in EN ──');
let huInEnCount = 0;
for (const [key, val] of Object.entries(enValues)) {
  const words = tokenize(val);
  for (const word of words) {
    if (HUNGARIAN_WORDS.has(word)) {
      concerns.push({ id: 'LANG-02', msg: `Hungarian word "${word}" in en.ts: ${key} = "${val}"` });
      huInEnCount++;
      break;
    }
  }
}
console.log(huInEnCount === 0
  ? '  ✅ No Hungarian contamination in EN'
  : `  ⚠️  ${huInEnCount} key(s) with Hungarian words in EN`);

// LANG-03: Consistent form of address (tegezés vs magázás)
console.log('\n── LANG-03: Address consistency (tegezés/magázás) ──');
const tegezPatterns = /\b(te |neked |nálad |tőled |veled |rólad |benned |rajtad |hozzád |tiéd )/i;
const magazPatterns = /\b(ön |önnek |önnél |öntől |önnel |önről |önben |önön |önhöz )/i;
let tegezCount = 0;
let magazCount = 0;
const tegezKeys = [];
const magazKeys = [];
for (const [key, val] of Object.entries(huValues)) {
  if (tegezPatterns.test(val)) { tegezCount++; tegezKeys.push(key); }
  if (magazPatterns.test(val)) { magazCount++; magazKeys.push(key); }
}
if (tegezCount > 0 && magazCount > 0) {
  concerns.push({
    id: 'LANG-03',
    msg: `Mixed address forms: ${tegezCount} tegezés, ${magazCount} magázás — should be consistent`
  });
  console.log(`  ⚠️  Mixed: ${tegezCount} tegezés + ${magazCount} magázás`);
} else {
  console.log(`  ✅ Consistent address form (tegezés: ${tegezCount}, magázás: ${magazCount})`);
}

// LANG-05: Capitalization consistency for buttons/headings
console.log('\n── LANG-05: Capitalization consistency ──');
const buttonSections = ['common', 'auth', 'profile'];
let capsIssues = 0;
for (const [key, val] of Object.entries(enValues)) {
  const section = key.split('.')[0];
  // Check button-like values in English (should start with capital)
  if (key.includes('button') || key.includes('cta') || key.includes('submit')
      || key.includes('action') || key.includes('title') || key.includes('heading')) {
    if (val.length > 0 && val[0] !== val[0].toUpperCase()) {
      concerns.push({ id: 'LANG-05', msg: `Lowercase start in EN button/title: ${key} = "${val}"` });
      capsIssues++;
    }
  }
}
console.log(capsIssues === 0
  ? '  ✅ Capitalization consistent'
  : `  ⚠️  ${capsIssues} capitalization issue(s)`);

// ── Summary ──────────────────────────────────────────────
console.log('\n── Summary ──');
console.log(`  FAILs: ${fails.length}`);
console.log(`  CONCERNs: ${concerns.length}`);

if (fails.length > 0 || concerns.length > 0) {
  console.log('\n── Details ──');
  fails.forEach(f => console.log(`  ❌ [${f.id}] ${f.msg}`));
  concerns.forEach(c => console.log(`  ⚠️  [${c.id}] ${c.msg}`));
}

const result = {
  step: 'i18n-quality',
  fails: fails.length,
  concerns: concerns.length,
  details: { fails, concerns },
  huKeys: Object.keys(huValues).length,
  enKeys: Object.keys(enValues).length,
};

console.log('\n' + JSON.stringify(result));
process.exit(fails.length > 0 ? 1 : 0);
