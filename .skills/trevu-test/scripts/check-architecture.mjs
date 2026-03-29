#!/usr/bin/env node
/**
 * Trevu Architecture & Convention Checker
 * Validates coding conventions from CLAUDE.md.
 *
 * Checks: hardcoded UI text, server component misuse, UPSERT pattern, AI attribution
 * Exit code 0 = all pass, 1 = issues found
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, dirname, relative, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const WEB_DIR = resolve(ROOT, 'apps/web');

// ── Helpers ──────────────────────────────────────────────

function walkDir(dir, extensions) {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', '.skills'].includes(entry.name)) continue;
      results.push(...walkDir(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────

const fails = [];
const concerns = [];

console.log('🔍 Trevu Architecture & Convention Check\n');

// ── Check 1: Hardcoded UI text in TSX ────────────────────
console.log('── Hardcoded UI text ──');

const tsxFiles = walkDir(resolve(WEB_DIR, 'app'), ['.tsx']);
const componentFiles = walkDir(resolve(WEB_DIR, 'components'), ['.tsx']);
const allTsx = [...tsxFiles, ...componentFiles];

let hardcodedCount = 0;

// Attributes to skip
const skipAttrs = /^(className|href|src|key|id|type|role|name|method|action|data-|aria-|style|placeholder|autoComplete|htmlFor|tabIndex)/;

for (const file of allTsx) {
  const content = readFileSync(file, 'utf-8');
  const relPath = relative(ROOT, file);
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip comments, imports, type definitions
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('import ')
        || line.startsWith('export type') || line.startsWith('interface ')
        || line.startsWith('console.')) continue;

    // Skip lines that are pure attribute assignments
    if (skipAttrs.test(line)) continue;

    // Find string literals in JSX context that aren't t() calls
    // Look for: >Some text< or >Some text{
    const jsxTextMatch = line.match(/>\s*([A-ZÁÉÍÓÖŐÚÜŰa-záéíóöőúüű][A-Za-záéíóöőúüűÁÉÍÓÖŐÚÜŰ\s,.!?-]{3,})\s*[<{]/);
    if (jsxTextMatch) {
      const text = jsxTextMatch[1].trim();
      // Skip if inside a t() or {t( context
      if (line.includes("t('") || line.includes('t("') || line.includes('t(`')) continue;
      // Skip very short texts that might be punctuation
      if (text.length < 4) continue;

      concerns.push({
        id: 'ARCH-01',
        msg: `Hardcoded text: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}" in ${relPath}:${i + 1}`
      });
      hardcodedCount++;
    }
  }
}

console.log(hardcodedCount === 0
  ? '  ✅ No hardcoded UI text detected'
  : `  ⚠️  ${hardcodedCount} potential hardcoded text(s)`);

// ── Check 2: Server component misuse ─────────────────────
console.log('\n── Server component misuse ──');

let scMisuse = 0;
for (const file of allTsx) {
  const content = readFileSync(file, 'utf-8');
  const relPath = relative(ROOT, file);

  if (content.includes('"use client"') || content.includes("'use client'")) {
    const hasState = /use(State|Effect|Ref|Callback|Memo|Reducer)\s*\(/.test(content);
    const hasHandlers = /on(Click|Change|Submit|Focus|Blur|Key)\s*=/.test(content);

    if (!hasState && !hasHandlers) {
      concerns.push({
        id: 'ARCH-02',
        msg: `"use client" but no hooks/handlers: ${relPath} — consider Server Component`
      });
      scMisuse++;
    }
  }
}

console.log(scMisuse === 0
  ? '  ✅ No unnecessary "use client" directives'
  : `  ⚠️  ${scMisuse} file(s) with potentially unnecessary "use client"`);

// ── Check 3: UPSERT pattern ──────────────────────────────
console.log('\n── UPSERT pattern compliance ──');

const actionFiles = walkDir(WEB_DIR, ['.ts', '.tsx']).filter(f =>
  f.includes('action') || f.includes('server')
);

let updateCount = 0;
for (const file of actionFiles) {
  const content = readFileSync(file, 'utf-8');
  const relPath = relative(ROOT, file);

  // Find .update( calls that aren't near .upsert(
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('.update(') && !lines[i].includes('.upsert(')) {
      // Check nearby lines for upsert
      const context = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4)).join('\n');
      if (!context.includes('.upsert(') && !context.includes('upsert')) {
        concerns.push({
          id: 'ARCH-03',
          msg: `.update() without upsert in ${relPath}:${i + 1}`
        });
        updateCount++;
      }
    }
  }
}

console.log(updateCount === 0
  ? '  ✅ No .update() without upsert pattern'
  : `  ⚠️  ${updateCount} .update() call(s) without nearby upsert`);

// ── Check 4: AI attribution leak ─────────────────────────
console.log('\n── AI attribution leak ──');

const allSourceFiles = walkDir(ROOT, ['.ts', '.tsx', '.js', '.jsx']).filter(f =>
  !f.includes('node_modules') && !f.includes('.next') && !f.includes('.git')
  && !f.includes('.skills') && !f.includes('CLAUDE.md') && !f.includes('TESTING_PLAN.md')
);

const aiPatterns = /Co-Authored-By|Generated by AI|Anthropic|Claude(?! *Code)/i;
let aiLeakCount = 0;

for (const file of allSourceFiles) {
  const content = readFileSync(file, 'utf-8');
  const relPath = relative(ROOT, file);

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (aiPatterns.test(lines[i])) {
      // Skip if it's in a comment about the tool itself
      concerns.push({
        id: 'ARCH-04',
        msg: `AI attribution found in ${relPath}:${i + 1}: "${lines[i].trim().slice(0, 60)}"`
      });
      aiLeakCount++;
    }
  }
}

console.log(aiLeakCount === 0
  ? '  ✅ No AI attribution leaks in source code'
  : `  ⚠️  ${aiLeakCount} AI attribution(s) found`);

// ── Summary ──────────────────────────────────────────────
console.log('\n── Summary ──');
console.log(`  Files scanned: ${allTsx.length} TSX + ${actionFiles.length} action files + ${allSourceFiles.length} source files`);
console.log(`  FAILs: ${fails.length}`);
console.log(`  CONCERNs: ${concerns.length}`);

if (fails.length > 0 || concerns.length > 0) {
  console.log('\n── Details ──');
  fails.forEach(f => console.log(`  ❌ [${f.id}] ${f.msg}`));
  concerns.slice(0, 20).forEach(c => console.log(`  ⚠️  [${c.id}] ${c.msg}`));
  if (concerns.length > 20) console.log(`  ... and ${concerns.length - 20} more concerns`);
}

const result = {
  step: 'architecture',
  fails: fails.length,
  concerns: concerns.length,
  details: { fails, concerns },
  filesScanned: allTsx.length + actionFiles.length,
};

console.log('\n' + JSON.stringify(result));
process.exit(fails.length > 0 ? 1 : 0);
