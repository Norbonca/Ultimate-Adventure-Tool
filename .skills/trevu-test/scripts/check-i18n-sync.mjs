#!/usr/bin/env node
/**
 * Trevu i18n Sync Checker
 * Compares hu.ts and en.ts translation files for structural consistency.
 *
 * Checks: SYNC-01 through SYNC-05 from TESTING_PLAN.md
 * Exit code 0 = all pass, 1 = issues found
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

// ── Helpers ──────────────────────────────────────────────

function loadTranslations(locale) {
  const path = resolve(ROOT, `packages/i18n/src/${locale}.ts`);
  const content = readFileSync(path, 'utf-8');

  // Extract the default export object by evaluating a simplified version
  // We parse the TS file as a structured key extractor instead of executing it
  return { path, content };
}

function extractKeys(content, prefix = '') {
  const keys = [];
  const values = {};
  // Match key: "value" and key: { (nested)
  const lines = content.split('\n');
  const stack = [];
  let currentPath = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip imports, exports, type annotations, comments
    if (trimmed.startsWith('import ') || trimmed.startsWith('export ')
        || trimmed.startsWith('//') || trimmed.startsWith('*')
        || trimmed.startsWith('/*') || trimmed === '') continue;

    // Match: key: "value" or key: 'value'
    const kvMatch = trimmed.match(/^(\w+)\s*:\s*["'`](.*)["'`]\s*,?\s*$/);
    if (kvMatch) {
      const fullKey = [...currentPath, kvMatch[1]].join('.');
      keys.push(fullKey);
      values[fullKey] = kvMatch[2];
      continue;
    }

    // Match: key: { (start of nested object)
    const nestMatch = trimmed.match(/^(\w+)\s*:\s*\{\s*$/);
    if (nestMatch) {
      currentPath.push(nestMatch[1]);
      continue;
    }

    // Match: closing brace
    if (trimmed === '},' || trimmed === '}') {
      if (currentPath.length > 0) {
        currentPath.pop();
      }
    }
  }

  return { keys, values };
}

function findPlaceholders(str) {
  const matches = str.match(/\{(\w+)\}/g) || [];
  return matches.sort();
}

// ── Main ─────────────────────────────────────────────────

const fails = [];
const concerns = [];

console.log('🔍 Trevu i18n Sync Check\n');

const hu = loadTranslations('hu');
const en = loadTranslations('en');

const huData = extractKeys(hu.content);
const enData = extractKeys(en.content);

const huKeySet = new Set(huData.keys);
const enKeySet = new Set(enData.keys);

// SYNC-01 & SYNC-02: Key structure match
console.log('── SYNC-01/02: Key structure ──');
const missingInEn = huData.keys.filter(k => !enKeySet.has(k));
const missingInHu = enData.keys.filter(k => !huKeySet.has(k));

if (missingInEn.length > 0) {
  console.log(`  ❌ ${missingInEn.length} key(s) missing in en.ts:`);
  missingInEn.forEach(k => {
    console.log(`     - ${k}`);
    fails.push({ id: 'SYNC-01', msg: `Missing in en.ts: ${k}` });
  });
} else {
  console.log('  ✅ All HU keys exist in EN');
}

if (missingInHu.length > 0) {
  console.log(`  ❌ ${missingInHu.length} key(s) missing in hu.ts:`);
  missingInHu.forEach(k => {
    console.log(`     - ${k}`);
    fails.push({ id: 'SYNC-01', msg: `Missing in hu.ts: ${k}` });
  });
} else {
  console.log('  ✅ All EN keys exist in HU');
}

// SYNC-03: No empty strings
console.log('\n── SYNC-03: Empty strings ──');
let emptyCount = 0;
for (const [key, val] of Object.entries(huData.values)) {
  if (val.trim() === '') {
    concerns.push({ id: 'SYNC-03', msg: `Empty value in hu.ts: ${key}` });
    emptyCount++;
  }
}
for (const [key, val] of Object.entries(enData.values)) {
  if (val.trim() === '') {
    concerns.push({ id: 'SYNC-03', msg: `Empty value in en.ts: ${key}` });
    emptyCount++;
  }
}
console.log(emptyCount === 0
  ? '  ✅ No empty strings'
  : `  ⚠️  ${emptyCount} empty string(s) found`);

// SYNC-04: Placeholder consistency
console.log('\n── SYNC-04: Placeholder consistency ──');
let placeholderMismatch = 0;
const commonKeys = huData.keys.filter(k => enKeySet.has(k));
for (const key of commonKeys) {
  const huPh = findPlaceholders(huData.values[key] || '');
  const enPh = findPlaceholders(enData.values[key] || '');
  if (JSON.stringify(huPh) !== JSON.stringify(enPh)) {
    fails.push({ id: 'SYNC-04', msg: `Placeholder mismatch: ${key} — HU: ${huPh.join(',')} EN: ${enPh.join(',')}` });
    placeholderMismatch++;
  }
}
console.log(placeholderMismatch === 0
  ? '  ✅ All placeholders match'
  : `  ❌ ${placeholderMismatch} placeholder mismatch(es)`);

// SYNC-05: TODO/placeholder values
console.log('\n── SYNC-05: TODO/placeholder values ──');
const todoPattern = /\b(TODO|FIXME|XXX|PLACEHOLDER|LOREM)\b/i;
let todoCount = 0;
for (const [key, val] of Object.entries({ ...huData.values, ...enData.values })) {
  if (todoPattern.test(val)) {
    concerns.push({ id: 'SYNC-05', msg: `Placeholder value: ${key} = "${val}"` });
    todoCount++;
  }
}
console.log(todoCount === 0
  ? '  ✅ No TODO/placeholder values'
  : `  ⚠️  ${todoCount} TODO/placeholder(s) found`);

// ── Summary ──────────────────────────────────────────────
console.log('\n── Summary ──');
console.log(`  Keys: HU=${huData.keys.length}, EN=${enData.keys.length}`);
console.log(`  FAILs: ${fails.length}`);
console.log(`  CONCERNs: ${concerns.length}`);

if (fails.length > 0 || concerns.length > 0) {
  console.log('\n── Details ──');
  fails.forEach(f => console.log(`  ❌ [${f.id}] ${f.msg}`));
  concerns.forEach(c => console.log(`  ⚠️  [${c.id}] ${c.msg}`));
}

// Output JSON for programmatic use
const result = {
  step: 'i18n-sync',
  fails: fails.length,
  concerns: concerns.length,
  details: { fails, concerns },
  huKeys: huData.keys.length,
  enKeys: enData.keys.length,
};

console.log('\n' + JSON.stringify(result));
process.exit(fails.length > 0 ? 1 : 0);
