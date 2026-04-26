#!/usr/bin/env node
// scripts/refactor-hex-to-tailwind.mjs
//
// One-shot bulk-refactor for PLAN-005 hardcoded hex colors.
//
// Maps known Trevu palette + Tailwind-default hex values to Tailwind utility
// classes inside JSX className strings. Touches only known-mapping values;
// unknown hexes are left alone (they may be category/illustration specific).
//
// Patterns rewritten (in apps/web *.tsx, *.jsx, *.ts, *.css excluding tokens):
//   bg-[#0F172A]      -> bg-slate-900
//   text-[#0F172A]    -> text-slate-900
//   border-[#0F172A]  -> border-slate-900
//   ring-[#0F172A]    -> ring-slate-900
//   fill-[#0F172A]    -> fill-slate-900
//   stroke-[#0F172A]  -> stroke-slate-900
//
// Whitelisted files (NOT touched):
//   - apps/web/styles/globals.css      (token authority)
//   - apps/web/tailwind.config.*       (token authority)
//
// Usage:
//   node scripts/refactor-hex-to-tailwind.mjs            (apply)
//   node scripts/refactor-hex-to-tailwind.mjs --dry-run  (preview)

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const APP = join(ROOT, 'Ultimate-Adventure-Tool', 'apps', 'web');

const DRY = process.argv.includes('--dry-run');

// Hex → Tailwind class suffix. Case-insensitive match.
const HEX_TO_TW = {
  // Trevu / slate neutrals
  '#0F172A': 'slate-900',
  '#1E293B': 'slate-800',
  '#475569': 'slate-600',
  '#64748B': 'slate-500',
  '#94A3B8': 'slate-400',
  '#CBD5E1': 'slate-300',
  '#E2E8F0': 'slate-200',
  '#F1F5F9': 'slate-100',
  '#F8FAFC': 'slate-50',
  // Trevu Teal
  '#0F766E': 'teal-700',
  '#0D9488': 'teal-600',
  '#14B8A6': 'teal-500',
  // Brand "near-teal" green (some old places)
  '#10B981': 'emerald-500',
  '#6EE7B7': 'emerald-300',
  '#16A34A': 'green-600',
  // Status accents
  '#DC2626': 'red-600',
  '#FEF2F2': 'red-50',
  '#F97066': 'red-400',
  '#D97706': 'amber-600',
  '#FBBF24': 'amber-400',
  '#FEF3C7': 'amber-100',
  '#3B82F6': 'blue-500',
  '#DBEAFE': 'blue-100',
  '#8B5CF6': 'violet-500',
  '#EDE9FE': 'violet-100',
  // Pure
  '#FFFFFF': 'white',
  '#000000': 'black',
};

// Build regex once: matches `<prefix>-[#hexvalue]`
const PREFIX = '(bg|text|border|ring|fill|stroke|from|to|via|placeholder|caret|outline|divide|accent|decoration)';
const HEX_RE = new RegExp(`\\b${PREFIX}-\\[(#[0-9a-fA-F]{3,6})\\]`, 'g');

const SKIP_DIRS = new Set(['node_modules', '.next', '.turbo', 'dist', 'build', '.vercel', 'coverage']);
const SKIP_FILE_NAMES = new Set([
  'globals.css', 'tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs',
]);
const SCAN = /\.(tsx?|jsx?|css|scss)$/;

async function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (SCAN.test(e.name) && !SKIP_FILE_NAMES.has(e.name)) yield p;
  }
}

let totalFiles = 0, touchedFiles = 0, totalReplacements = 0;
const unmappedHexes = new Map();   // hex -> count
const replacementsByHex = new Map();

for await (const file of walk(APP)) {
  totalFiles++;
  let text = await readFile(file, 'utf8');
  let local = 0;
  const updated = text.replace(HEX_RE, (m, prefix, hex) => {
    const upper = hex.toUpperCase();
    const tw = HEX_TO_TW[upper];
    if (!tw) {
      unmappedHexes.set(upper, (unmappedHexes.get(upper) || 0) + 1);
      return m;
    }
    local++;
    replacementsByHex.set(upper, (replacementsByHex.get(upper) || 0) + 1);
    return `${prefix}-${tw}`;
  });
  if (updated !== text) {
    touchedFiles++;
    totalReplacements += local;
    if (!DRY) await writeFile(file, updated);
    console.log(`  ${DRY ? '[dry]' : '✏️ '}  ${relative(ROOT, file)}  (${local} replacement)`);
  }
}

console.log('\n=================================');
console.log(`  Scanned files:   ${totalFiles}`);
console.log(`  Touched files:   ${touchedFiles}`);
console.log(`  Replacements:    ${totalReplacements}`);
console.log('=================================\n');

if (replacementsByHex.size) {
  console.log('  Mapped hex → Tailwind:');
  for (const [hex, n] of [...replacementsByHex.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${hex.padEnd(10)}  →  ${HEX_TO_TW[hex].padEnd(15)}  (${n}x)`);
  }
}
if (unmappedHexes.size) {
  console.log('\n  Unmapped hex values (left alone — manual review if needed):');
  for (const [hex, n] of [...unmappedHexes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`    ${hex}  (${n}x)`);
  }
  if (unmappedHexes.size > 20) console.log(`    … +${unmappedHexes.size - 20} további`);
}

if (DRY) console.log('\n🔍 DRY RUN — semmi nem íródott felül.');
console.log('');
