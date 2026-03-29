#!/usr/bin/env node
/**
 * Trevu Category Consistency Checker
 * Cross-references category definitions across 4 sources.
 *
 * Checks: CFG-03, CFG-04, CFG-05 from TESTING_PLAN.md
 * Exit code 0 = all pass, 1 = issues found
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

// ── Source paths ─────────────────────────────────────────

const SOURCES = {
  validators: resolve(ROOT, 'packages/validators/src/index.ts'),
  config: resolve(ROOT, 'packages/config/src/categories.ts'),
  i18nHu: resolve(ROOT, 'packages/i18n/src/hu.ts'),
  i18nEn: resolve(ROOT, 'packages/i18n/src/en.ts'),
  uiLib: resolve(ROOT, 'apps/web/lib/categories.ts'),
};

// ── Extractors ───────────────────────────────────────────

function extractValidatorCategories(content) {
  const match = content.match(/category:\s*z\.enum\(\[([^\]]+)\]\)/);
  if (!match) return [];
  return match[1].match(/["'](\w+)["']/g)?.map(s => s.replace(/["']/g, '')) || [];
}

function extractConfigCategories(content) {
  const keys = [];
  const matches = content.matchAll(/^\s+(\w+):\s*\{/gm);
  for (const m of matches) {
    // Only top-level keys inside ADVENTURE_CATEGORIES
    if (m[1] !== 'ADVENTURE_CATEGORIES') {
      keys.push(m[1]);
    }
  }
  return keys;
}

function extractI18nCategories(content) {
  const keys = [];
  // Find the categories section and extract its keys
  let inCategories = false;
  let braceDepth = 0;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.match(/^categories\s*:\s*\{/)) {
      inCategories = true;
      braceDepth = 1;
      continue;
    }

    if (inCategories) {
      if (trimmed.includes('{')) braceDepth++;
      if (trimmed.includes('}')) braceDepth--;
      if (braceDepth <= 0) break;

      const keyMatch = trimmed.match(/^(\w+)\s*:/);
      if (keyMatch) keys.push(keyMatch[1]);
    }
  }
  return keys;
}

function extractUiLibCategories(content) {
  const keys = [];
  let inDisplay = false;
  let braceDepth = 0;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Match the CATEGORY_DISPLAY declaration line (includes opening {)
    if (trimmed.includes('CATEGORY_DISPLAY') && trimmed.includes('{')) {
      inDisplay = true;
      braceDepth = 1; // The { on this line opens the top-level object
      continue;
    }

    if (inDisplay) {
      // Check for key BEFORE counting braces on this line
      // At depth 1 we're at the top level of CATEGORY_DISPLAY
      const keyMatch = trimmed.match(/^["']?([\w\s]+?)["']?\s*:\s*\{/);
      if (keyMatch && braceDepth === 1) {
        keys.push(keyMatch[1].trim());
      }

      // Count braces
      for (const ch of trimmed) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }

      // When we close the CATEGORY_DISPLAY object itself
      if (braceDepth <= 0) break;
    }
  }
  return keys;
}

// ── Main ─────────────────────────────────────────────────

const fails = [];
const concerns = [];

console.log('🔍 Trevu Category Consistency Check\n');

// Load all sources
const sourceData = {};
for (const [name, path] of Object.entries(SOURCES)) {
  if (!existsSync(path)) {
    console.log(`  ⚠️  Source not found: ${name} (${path})`);
    concerns.push({ id: 'CFG-03', msg: `Source file missing: ${name}` });
    continue;
  }
  sourceData[name] = readFileSync(path, 'utf-8');
}

// Extract categories from each source
const categories = {};

if (sourceData.validators) {
  categories.validators = extractValidatorCategories(sourceData.validators);
  console.log(`── Validators: ${categories.validators.length} categories ──`);
  console.log(`  ${categories.validators.join(', ')}`);
}

if (sourceData.config) {
  categories.config = extractConfigCategories(sourceData.config);
  console.log(`\n── Config (ADVENTURE_CATEGORIES): ${categories.config.length} categories ──`);
  console.log(`  ${categories.config.join(', ')}`);
}

if (sourceData.i18nHu) {
  categories.i18nHu = extractI18nCategories(sourceData.i18nHu);
  console.log(`\n── i18n HU categories: ${categories.i18nHu.length} categories ──`);
  console.log(`  ${categories.i18nHu.join(', ')}`);
}

if (sourceData.i18nEn) {
  categories.i18nEn = extractI18nCategories(sourceData.i18nEn);
  console.log(`\n── i18n EN categories: ${categories.i18nEn.length} categories ──`);
  console.log(`  ${categories.i18nEn.join(', ')}`);
}

if (sourceData.uiLib) {
  categories.uiLib = extractUiLibCategories(sourceData.uiLib);
  console.log(`\n── UI lib (CATEGORY_DISPLAY): ${categories.uiLib.length} categories ──`);
  console.log(`  ${categories.uiLib.join(', ')}`);
}

// ── Cross-reference checks ───────────────────────────────

console.log('\n── CFG-03: Validator ↔ Config consistency ──');
if (categories.validators && categories.config) {
  const valSet = new Set(categories.validators);
  const cfgSet = new Set(categories.config);

  const missingInConfig = categories.validators.filter(c => !cfgSet.has(c));
  const missingInValidator = categories.config.filter(c => !valSet.has(c));

  if (missingInConfig.length > 0) {
    console.log(`  ❌ Missing in config: ${missingInConfig.join(', ')}`);
    missingInConfig.forEach(c => fails.push({ id: 'CFG-03', msg: `Category "${c}" in validators but missing in config` }));
  }
  if (missingInValidator.length > 0) {
    console.log(`  ❌ Missing in validators: ${missingInValidator.join(', ')}`);
    missingInValidator.forEach(c => fails.push({ id: 'CFG-03', msg: `Category "${c}" in config but missing in validators` }));
  }
  if (missingInConfig.length === 0 && missingInValidator.length === 0) {
    console.log('  ✅ Validators and config match');
  }
}

// Known naming convention map: validator key → i18n key
// The validator uses short keys, i18n may use longer/camelCase variants
const CATEGORY_NAME_MAP = {
  mountain: 'mountaineering',
  water: 'waterSports',
  winter: 'winterSports',
};

function fuzzyMatch(validatorCat, i18nSet) {
  if (i18nSet.has(validatorCat)) return true;
  if (CATEGORY_NAME_MAP[validatorCat] && i18nSet.has(CATEGORY_NAME_MAP[validatorCat])) return true;
  // Also try lowercase prefix match
  for (const k of i18nSet) {
    if (k.toLowerCase().startsWith(validatorCat.toLowerCase())) return true;
  }
  return false;
}

console.log('\n── CFG-04: i18n category coverage ──');
if (categories.validators && categories.i18nHu) {
  const i18nSet = new Set(categories.i18nHu);
  const exactMissing = categories.validators.filter(c => !i18nSet.has(c));
  const realMissing = exactMissing.filter(c => !fuzzyMatch(c, i18nSet));
  const nameMismatch = exactMissing.filter(c => fuzzyMatch(c, i18nSet));

  if (nameMismatch.length > 0) {
    console.log(`  ⚠️  Name convention mismatch in i18n HU: ${nameMismatch.map(c => `${c}→${CATEGORY_NAME_MAP[c] || '?'}`).join(', ')}`);
    nameMismatch.forEach(c => concerns.push({ id: 'CFG-04', msg: `Category name mismatch: validator "${c}" ↔ i18n "${CATEGORY_NAME_MAP[c] || '?'}" in hu.ts` }));
  }
  if (realMissing.length > 0) {
    console.log(`  ❌ Missing in i18n HU: ${realMissing.join(', ')}`);
    realMissing.forEach(c => fails.push({ id: 'CFG-04', msg: `Category "${c}" completely missing in i18n hu.ts` }));
  }
  if (realMissing.length === 0 && nameMismatch.length === 0) {
    console.log('  ✅ All validator categories have i18n HU entries');
  }
}

if (categories.validators && categories.i18nEn) {
  const i18nSet = new Set(categories.i18nEn);
  const exactMissing = categories.validators.filter(c => !i18nSet.has(c));
  const realMissing = exactMissing.filter(c => !fuzzyMatch(c, i18nSet));
  const nameMismatch = exactMissing.filter(c => fuzzyMatch(c, i18nSet));

  if (nameMismatch.length > 0) {
    console.log(`  ⚠️  Name convention mismatch in i18n EN: ${nameMismatch.map(c => `${c}→${CATEGORY_NAME_MAP[c] || '?'}`).join(', ')}`);
    nameMismatch.forEach(c => concerns.push({ id: 'CFG-04', msg: `Category name mismatch: validator "${c}" ↔ i18n "${CATEGORY_NAME_MAP[c] || '?'}" in en.ts` }));
  }
  if (realMissing.length > 0) {
    console.log(`  ❌ Missing in i18n EN: ${realMissing.join(', ')}`);
    realMissing.forEach(c => fails.push({ id: 'CFG-04', msg: `Category "${c}" completely missing in i18n en.ts` }));
  }
  if (realMissing.length === 0 && nameMismatch.length === 0) {
    console.log('  ✅ All validator categories have i18n EN entries');
  }
}

// UI lib name → validator name mapping (UI lib uses display names)
const UI_TO_VALIDATOR = {
  'hiking': 'hiking',
  'mountaineering': 'mountain',
  'water sports': 'water',
  'motorsport': 'motorsport',
  'cycling': 'cycling',
  'running': 'running',
  'winter sports': 'winter',
  'expedition': 'expedition',
};

console.log('\n── CFG-05: UI lib category coverage ──');
if (categories.validators && categories.uiLib) {
  const uiMapped = new Set(categories.uiLib.map(c => UI_TO_VALIDATOR[c.toLowerCase()] || c.toLowerCase()));
  const valSet = new Set(categories.validators);

  const missingInUi = categories.validators.filter(c => !uiMapped.has(c));
  const extraInUi = categories.uiLib.filter(c => {
    const mapped = UI_TO_VALIDATOR[c.toLowerCase()] || c.toLowerCase();
    return !valSet.has(mapped);
  });

  if (missingInUi.length > 0) {
    console.log(`  ❌ Missing in UI lib: ${missingInUi.join(', ')}`);
    missingInUi.forEach(c => fails.push({ id: 'CFG-05', msg: `Category "${c}" has no UI lib entry` }));
  }
  if (extraInUi.length > 0) {
    console.log(`  ⚠️  Extra in UI lib: ${extraInUi.join(', ')}`);
    extraInUi.forEach(c => concerns.push({ id: 'CFG-05', msg: `UI lib has extra category "${c}" not in validators` }));
  }
  if (missingInUi.length === 0 && extraInUi.length === 0) {
    console.log('  ✅ All validator categories have UI lib entries');
  }
}

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
  step: 'categories',
  fails: fails.length,
  concerns: concerns.length,
  details: { fails, concerns },
  sources: Object.fromEntries(
    Object.entries(categories).map(([k, v]) => [k, v.length])
  ),
};

console.log('\n' + JSON.stringify(result));
process.exit(fails.length > 0 ? 1 : 0);
