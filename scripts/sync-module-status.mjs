#!/usr/bin/env node
// scripts/sync-module-status.mjs
//
// One-shot fix for DOC-005 module status divergence.
//
// Reads PROJEKTMENEDZSMENT.md (single source of truth for module status),
// extracts the canonical status emoji per module (M01..M20), and:
//
//   1. Adds (or replaces) a status line in each modules/NN_X/README.md,
//      right after the H1 heading.
//   2. Inserts a complete status table into CLAUDE.md sec 2 (Modulok),
//      replacing the freeform paragraph mention with a canonical table.
//
// Idempotent — running again is safe; existing status lines get updated.
//
// Usage:
//   node scripts/sync-module-status.mjs            (apply)
//   node scripts/sync-module-status.mjs --dry-run  (preview)

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const DRY = process.argv.includes('--dry-run');

const PM = join(ROOT, 'PROJEKTMENEDZSMENT.md');
const CLAUDE = join(ROOT, 'CLAUDE.md');
const MODULES_DIR = join(ROOT, 'modules');

const STATUS_LABEL = {
  '✅': 'kész',
  '⏳': 'folyamatban',
  '📐': 'specifikáció kész',
  '🔵': 'backlog',
  '⛔': 'blokkolva',
};

// 1) Extract canonical status from PM
const pmText = await readFile(PM, 'utf8');
const pmStatus = {};
const moduleNames = {};

// Pass A: H4 with canonical emoji on the same line
const pmHeaderRe = /^####\s+(M\d{2,3})\s*[-–—]\s*([^\n#]+?)\s+([✅⏳📐🔵⛔])/gm;
let m;
while ((m = pmHeaderRe.exec(pmText)) !== null) {
  pmStatus[m[1]] = { name: m[2].trim(), emoji: m[3] };
  moduleNames[m[1]] = m[2].trim();
}

// Pass B: H4 without canonical emoji (e.g. "M20 - Travel Planner ⭐ ÚJ")
// Capture name only, status will come from Pass C/D.
const pmNameOnlyRe = /^####\s+(M\d{2,3})\s*[-–—]\s*([^\n#]+?)\s*$/gm;
while ((m = pmNameOnlyRe.exec(pmText)) !== null) {
  if (!moduleNames[m[1]]) moduleNames[m[1]] = m[2].replace(/[⭐✨🆕🔥]\s*ÚJ?/gi, '').trim();
}

// Pass C: free-form "✅ M20 ..." or "⏳ M20 ..." mentions in PM
const pmFreeRe = /([✅⏳📐🔵⛔])\s+(M\d{2,3})\b/g;
while ((m = pmFreeRe.exec(pmText)) !== null) {
  if (!pmStatus[m[2]]) pmStatus[m[2]] = { name: moduleNames[m[2]] || m[2], emoji: m[1] };
}

// Pass D: almodul "**Almodul: M021 Trip Timeline** — 📐"
const subRe = /\*\*Almodul:\s+(M\d{2,3})\s+([^*]+?)\*\*[^\n📐⏳✅🔵]*([📐⏳✅🔵])/g;
while ((m = subRe.exec(pmText)) !== null) {
  pmStatus[m[1]] = { name: m[2].trim(), emoji: m[3] };
  moduleNames[m[1]] = m[2].trim();
}

// Pass E: fill in any module name we know but lack status — assume backlog
for (const id of Object.keys(moduleNames)) {
  if (!pmStatus[id]) {
    pmStatus[id] = { name: moduleNames[id], emoji: '🔵' };
  }
}

const moduleIds = Object.keys(pmStatus).filter((k) => /^M\d{2}$/.test(k)).sort();
console.log(`\n📋 PM-ből kiolvasott modul státuszok: ${moduleIds.length}`);
moduleIds.forEach((id) => {
  const s = pmStatus[id];
  console.log(`   ${id} ${s.emoji} ${s.name}`);
});

// 2) Update each module's README header
const dirs = await readdir(MODULES_DIR, { withFileTypes: true });
let touched = 0;
for (const d of dirs) {
  if (!d.isDirectory()) continue;
  const m2 = d.name.match(/^(\d{2})_/);
  if (!m2) continue;
  const id = 'M' + m2[1];
  const status = pmStatus[id];
  if (!status) continue;
  const readme = join(MODULES_DIR, d.name, 'README.md');
  if (!existsSync(readme)) continue;
  let text = await readFile(readme, 'utf8');
  const statusLine = `> **Státusz:** ${status.emoji} ${STATUS_LABEL[status.emoji]} _(forrás: PROJEKTMENEDZSMENT.md)_`;
  // Find H1 line, then either replace existing > **Státusz:** line or insert one
  const h1Re = /^#\s+[^\n]+$/m;
  const h1Match = text.match(h1Re);
  if (!h1Match) {
    console.warn(`   ⚠️  ${d.name}/README.md — nincs H1, kihagyva`);
    continue;
  }
  const existingStatusRe = /^>\s*\*\*Státusz:\*\*[^\n]*$/m;
  if (existingStatusRe.test(text)) {
    const updated = text.replace(existingStatusRe, statusLine);
    if (updated !== text) {
      if (!DRY) await writeFile(readme, updated);
      console.log(`   ✏️   ${d.name}/README.md — státusz frissítve → ${status.emoji}`);
      touched++;
    }
  } else {
    // insert after H1 line
    const h1End = h1Match.index + h1Match[0].length;
    const updated = text.slice(0, h1End) + '\n\n' + statusLine + '\n' + text.slice(h1End);
    if (!DRY) await writeFile(readme, updated);
    console.log(`   ➕  ${d.name}/README.md — státusz beszúrva → ${status.emoji}`);
    touched++;
  }
}

// 3) Update CLAUDE.md §2 with a complete table
let claudeText = await readFile(CLAUDE, 'utf8');
const tableLines = [
  '',
  '#### Modul státusz (forrás: `PROJEKTMENEDZSMENT.md`)',
  '',
  '| ID | Modul | Státusz |',
  '|----|-------|---------|',
  ...moduleIds.map((id) => `| ${id} | ${pmStatus[id].name} | ${pmStatus[id].emoji} ${STATUS_LABEL[pmStatus[id].emoji]} |`),
  '',
];
const tableBlock = tableLines.join('\n');

// Replace existing block (between marker comments) or insert before "### Jelenlegi állapot"
const blockRe = /<!-- module-status-table:start -->[\s\S]*?<!-- module-status-table:end -->/;
const wrapped = `<!-- module-status-table:start -->\n${tableBlock}\n<!-- module-status-table:end -->`;
if (blockRe.test(claudeText)) {
  claudeText = claudeText.replace(blockRe, wrapped);
} else {
  claudeText = claudeText.replace(/(### Jelenlegi állapot)/, `${wrapped}\n\n$1`);
}
if (!DRY) await writeFile(CLAUDE, claudeText);
console.log(`\n   ✏️   CLAUDE.md §2 frissítve (modul státusz táblázat)`);

console.log(`\n${DRY ? '🔍 DRY RUN — semmit nem írtam.' : `✅ ${touched + 1} fájl frissítve.`}\n`);
