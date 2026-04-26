#!/usr/bin/env node
/**
 * scripts/log-from-output.mjs
 *
 * Runs each Trevu QA skill, captures its stdout, parses findings into category
 * buckets, and creates/updates `<PREFIX>-NNN` entries in the corresponding
 * `*_LOG.md`. One log entry per *category* of finding (not per occurrence) —
 * the entry body lists up to 30 examples and the total count.
 *
 * Subsequent runs update the existing entry's `**Napló:**` section with a new
 * dated count line, so trends over time become visible.
 *
 * Usage:
 *   node scripts/log-from-output.mjs                # run all skills, write logs
 *   node scripts/log-from-output.mjs --dry-run      # preview only, no writes
 *   node scripts/log-from-output.mjs --skip flow,usability
 *   node scripts/log-from-output.mjs --only doc-consistency
 *
 * Run from monorepo root or anywhere — script resolves project root from
 * its own location.
 */

import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const arg = (n) => {
  const i = args.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  if (i < 0) return null;
  if (args[i].includes('=')) return args[i].split('=')[1];
  return args[i + 1] ?? null;
};
const DRY_RUN = flag('dry-run');
const SKIP = (arg('skip') || '').split(',').filter(Boolean);
const ONLY = (arg('only') || '').split(',').filter(Boolean);

const TODAY = new Date().toISOString().slice(0, 10);

// ----------------------------------------------------------------------------
//  Skill catalog
// ----------------------------------------------------------------------------
const SKILLS = [
  {
    name: 'doc-consistency', prefix: 'DOC',
    runner: '.skills/trevu-doc-consistency/scripts/run-all.mjs',
    log: 'DOC_CONSISTENCY_LOG.md',
    extractors: [
      {
        category: 'broken-links', severity: '🟡', type: 'broken-link',
        match: /❌\s+(\d+)\s+törött link/i,
        examples: /^\s+([^\n:]+):(\d+)\s*\n\s+(\[[^\]]*\]\([^)]+\))/gm,
        title: 'Törött markdown linkek',
      },
      {
        category: 'stale-docs', severity: '🟡', type: 'freshness',
        match: /🟡\s+(\d+)\s+elavult/i,
        examples: /\s+(\d{2,5})\s+nap\s+(\d{4}-\d{2}-\d{2})\s+(.+)$/gm,
        title: 'Elavult dokumentáció (60 nap+)',
      },
      {
        category: 'untraced', severity: '🟠', type: 'traceability',
        match: /🟠\s+(\d+)\s+page nincs említve/i,
        examples: /\s+(\/[^\s]+)\s+\(([^)]+)\)/gm,
        title: 'Page-ek modul README-ben nem említve',
      },
      {
        category: 'untraced-tables', severity: '🟠', type: 'traceability',
        match: /🟠\s+(\d+)\s+DB tábla nincs említve/i,
        examples: /\s+(\w+)\s+\(([^)]+)\)/gm,
        title: 'DB táblák modul README-ben nem említve',
      },
      {
        category: 'status-divergence', severity: '🔴', type: 'status-sync',
        match: /❌\s+(\d+)\s+eltérés/i,
        examples: /^\s+(M\d{2,3})\s+\|/gm,
        title: 'Modul státusz divergencia (PM ↔ CLAUDE ↔ README)',
      },
    ],
  },
  {
    name: 'plan-consistency', prefix: 'PLAN',
    runner: '.skills/trevu-plan-consistency/scripts/run-all.mjs',
    log: 'PLAN_CONSISTENCY_LOG.md',
    extractors: [
      {
        category: 'screen-coverage', severity: '🔴', type: 'screen-coverage',
        match: /🔴\s+(\d+)\s+oldal nincs a pencil/i,
        examples: /^\s+([^\s]+)\s+(.+)$/gm,
        title: 'Pencil design hiányzik a kódban élő oldalakhoz',
      },
      {
        category: 'design-tokens-missing', severity: '🟠', type: 'token-drift',
        match: /🟠\s+(\d+)\s+token hiányzik/i,
        examples: /^\s+(--[a-z-]+):\s*(.+)$/gm,
        title: 'Design tokenek hiányoznak a globals.css-ből',
      },
      {
        category: 'design-tokens-drift', severity: '🟠', type: 'token-drift',
        match: /🟠\s+(\d+)\s+token érték eltér/i,
        examples: /^\s+(--[a-z-]+):\s*várt\s+(.+),\s+kapott\s+(.+)$/gm,
        title: 'Design tokenek érték drift',
      },
      {
        category: 'icon-bank-violations', severity: '🟠', type: 'icon-bank',
        match: /🟠\s+(\d+)\s+direct lucide-react/i,
        examples: /^\s+(.+):(\d+)$/gm,
        title: 'Lucide ikon közvetlen import (gateway megkerülve)',
      },
      {
        category: 'forbidden-icon-libs', severity: '🔴', type: 'icon-bank',
        match: /🔴\s+(\d+)\s+tiltott icon library/i,
        examples: /^\s+(.+):(\d+)$/gm,
        title: 'Tiltott icon library import (heroicons / react-icons / FA)',
      },
      {
        category: 'unbanked-icons', severity: '🟡', type: 'icon-bank',
        match: /🟡\s+(\d+)\s+<Icon name=/i,
        examples: /^\s+([\w.-]+)$/gm,
        title: '<Icon name="..."> nincs a Site-wide Icon Bankban',
      },
      {
        category: 'appheader-missing', severity: '🔴', type: 'appheader',
        match: /🔴\s+(\S+)\s+—\s+hiányzik <AppHeader/g,
        examples: /^🔴\s+(\S+)\s+—\s+hiányzik <AppHeader \/>/gm,
        title: 'AppHeader hiányzik page-ekből',
      },
      {
        category: 'hardcoded-colors', severity: '🟡', type: 'brand-color',
        match: /🟠\s+(\d+)\s+találat:/i,
        examples: /^\s+([^:]+):(\d+)\s+(#[0-9a-fA-F]{3,6})/gm,
        title: 'Hardcoded hex színek a kódban (token helyett)',
      },
    ],
  },
  {
    name: 'code-consistency', prefix: 'CODE',
    runner: '.skills/trevu-code-consistency/scripts/run-all.mjs',
    log: 'CODE_CONSISTENCY_LOG.md',
    extractors: [
      {
        category: 'i18n-missing-en', severity: '🔴', type: 'i18n-parity',
        match: /🔴\s+(\d+)\s+kulcs HU-ban van, de EN-ből hiányzik/i,
        examples: /^\s+([\w.]+)$/gm,
        title: 'i18n kulcsok HU-ban vannak de EN-ből hiányoznak',
      },
      {
        category: 'i18n-missing-hu', severity: '🔴', type: 'i18n-parity',
        match: /🔴\s+(\d+)\s+kulcs EN-ben van, de HU-ből hiányzik/i,
        examples: /^\s+([\w.]+)$/gm,
        title: 'i18n kulcsok EN-ben vannak de HU-ből hiányoznak',
      },
      {
        category: 'i18n-naming', severity: '🟡', type: 'i18n-parity',
        match: /🟡\s+(\d+)\s+kulcs nem felel meg.*naming/i,
        examples: /^\s+([\w.]+)$/gm,
        title: 'i18n kulcsok naming convention sértés',
      },
      {
        category: 'hardcoded-text', severity: '🟠', type: 'hardcoded-text',
        match: /🟠\s+(\d+)\s+gyanús előfordulás/i,
        examples: /\s+([^\s:]+):(\d+)\s+"([^"]+)"/gm,
        title: 'Hardcoded user-facing szöveg (i18n-ezni kell)',
      },
      {
        category: 'appheader-missing', severity: '🟠', type: 'appheader',
        match: /🟠\s+(\d+)\s+page-ből hiányzik <AppHeader/i,
        examples: /^\s+([^\s]+)$/gm,
        title: 'AppHeader hiányzik page-ekből',
      },
      {
        category: 'service-role-leak', severity: '🔴', type: 'supabase-client',
        match: /🔴\s+(\d+)\s+kritikus.*SERVICE_ROLE/i,
        examples: /^\s+([^\s]+)$/gm,
        title: 'SERVICE_ROLE_KEY \'use client\' fájlban — security blocker',
      },
      {
        category: 'create-client-direct', severity: '🟠', type: 'supabase-client',
        match: /🟠\s+(\d+)\s+createClient\(\)\s+közvetlen/i,
        examples: /^\s+(.+)$/gm,
        title: 'createClient() közvetlen használat (gateway helyett)',
      },
      {
        category: 'bare-update', severity: '🔴', type: 'upsert',
        match: /🔴\s+(\d+)\s+bare \.update\(\)/i,
        examples: /^\s+([^\s:]+):(\d+)\s+table=(\w+)/gm,
        title: 'Bare .update() UPSERT-required táblákon',
      },
      {
        category: 'id-trip-routes', severity: '🟠', type: 'routing',
        match: /🟠\s+(\d+)\s+sértés:/i,
        examples: /\s+\[(folder|href)\]\s+(.+)$/gm,
        title: 'ID-alapú trip routing (slug helyett)',
      },
    ],
  },
  {
    name: 'code-quality', prefix: 'CQ',
    runner: '.skills/trevu-code-quality/scripts/run-all.mjs',
    runnerArgs: ['--no-bundle'],
    log: 'CODE_QUALITY_LOG.md',
    extractors: [
      {
        category: 'lint-errors', severity: '🟠', type: 'lint',
        match: /🔴\s+Lint errors blokkolnak/i,
        examples: null,
        title: 'Lint errors (build blocker)',
      },
      {
        category: 'lint-warnings', severity: '🟡', type: 'lint',
        match: /Warnings:\s*(\d+)/i,
        examples: null,
        title: 'Lint warnings küszöb fölött',
      },
      {
        category: 'type-errors', severity: '🔴', type: 'typecheck',
        match: /🔴\s+Type errors/i,
        examples: null,
        title: 'TypeScript type errors',
      },
      {
        category: 'ts-ignore', severity: '🟡', type: 'typecheck',
        match: /@ts-ignore\/nocheck:\s*(\d+)/i,
        examples: /^\s+([^\s:]+):(\d+)$/gm,
        title: '@ts-ignore / @ts-nocheck használat',
      },
      {
        category: 'big-files', severity: '🟡', type: 'complexity',
        match: /🟡\s+(\d+)\s+fájl > \d+ sor/i,
        examples: /^\s+(\d+)\s+([^\s].*)$/gm,
        title: 'Fájlok > 500 sor (split candidate)',
      },
      {
        category: 'complex-fns', severity: '🟡', type: 'complexity',
        match: /🟡\s+(\d+)\s+függvény becsült CC/i,
        examples: /^\s+cc=(\d+)\s+([^\s:]+):(\d+)\s+(\w+)$/gm,
        title: 'Függvények cyclomatic complexity > 15',
      },
      {
        category: 'audit-critical', severity: '🔴', type: 'dep-audit',
        match: /🔴\s+critical:\s*(\d+)/i,
        examples: null,
        title: 'pnpm audit CRITICAL findings (web-security-guardian SEC-NNN is)',
      },
    ],
  },
  {
    name: 'dev-functional', prefix: 'DEV',
    runner: '.skills/trevu-dev-functional/scripts/run-all.mjs',
    runnerArgs: ['--no-flaky'],
    log: 'DEV_TEST_LOG.md',
    extractors: [
      {
        category: 'failed-tests', severity: '🔴', type: 'failing-test',
        match: /❌\s+failed:\s*(\d+)/i,
        examples: null,
        title: 'Vitest failed tests',
      },
      {
        category: 'untested-actions', severity: '🟠', type: 'coverage-gap',
        match: /🟠\s+(\d+)\s+action file teszt nélkül/i,
        examples: /^\s+([^\s].*)$/gm,
        title: 'Server action-ök teszt fájl nélkül',
      },
    ],
  },
  {
    name: 'user-flow', prefix: 'FLOW',
    runner: '.skills/trevu-user-flow/scripts/run-all.mjs',
    log: 'USER_FLOW_LOG.md',
    extractors: [
      {
        category: 'e2e-failures', severity: '🔴', type: 'flow-fail',
        match: /(\d+)\s+failed/i,
        examples: null,
        title: 'Playwright E2E failures',
      },
    ],
  },
  {
    name: 'usability', prefix: 'UX',
    runner: '.skills/trevu-usability/scripts/run-all.mjs',
    runnerArgs: ['--no-browser'],
    log: 'USABILITY_LOG.md',
    extractors: [
      {
        category: 'form-no-label', severity: '🟠', type: 'forms',
        match: /\[input-no-label\]\s+(\d+)\s+db/i,
        examples: /^\s+([^\s:]+):(\d+)\s+(<input[^]*?)$/gm,
        title: 'Input label nélkül (a11y blocker)',
      },
      {
        category: 'form-missing-autocomplete', severity: '🟡', type: 'forms',
        match: /\[missing-autocomplete\]\s+(\d+)\s+db/i,
        examples: /^\s+([^\s:]+):(\d+)/gm,
        title: 'Sensitive input autoComplete attribute nélkül',
      },
      {
        category: 'submit-no-name', severity: '🟡', type: 'forms',
        match: /\[submit-no-name\]\s+(\d+)\s+db/i,
        examples: /^\s+([^\s:]+):(\d+)/gm,
        title: 'Submit gomb meaningful név nélkül',
      },
      {
        category: 'missing-loading', severity: '🟡', type: 'loading-state',
        match: /\[missing-loading\]\s+(\d+)\s+db/i,
        examples: /^\s+(.+)$/gm,
        title: 'Loading state hiányzik page-ekről',
      },
      {
        category: 'missing-error-boundary', severity: '🟠', type: 'loading-state',
        match: /\[missing-error-boundary\]\s+(\d+)\s+db/i,
        examples: /^\s+(.+)$/gm,
        title: 'error.tsx hiányzik page-ekről',
      },
    ],
  },
];

// ----------------------------------------------------------------------------
//  Helpers
// ----------------------------------------------------------------------------

function captureSkill(skill) {
  const runner = join(PROJECT_ROOT, skill.runner);
  if (!existsSync(runner)) return null;
  const r = spawnSync(
    'node',
    [runner, ...(skill.runnerArgs || [])],
    { cwd: PROJECT_ROOT, encoding: 'utf8' },
  );
  return ((r.stdout || '') + '\n' + (r.stderr || '')).replace(/\r/g, '');
}

/**
 * Locate a section in the output starting at `match.index` and ending at the
 * next blank-line-followed-by-non-indented-line OR the next category-header
 * pattern (lines starting with an emoji + space). This isolates examples to
 * the matched section.
 */
function sliceSection(output, startIdx) {
  // start at the line containing matched
  const after = output.slice(startIdx);
  // section ends at next header line (line starting with one of the emojis we
  // use as section separators) OR at "---" OR at /^=={5,}/ summary divider
  // OR at empty-line-then-empty-line (paragraph break)
  const enders = [
    /\n(?:🟢|🟡|🟠|🔴|✅|❌|⚠️|👉)\s/,
    /\n=================/,
    /\n---/,
    /\n\n\n/,
  ];
  let end = after.length;
  for (const re of enders) {
    const m = after.match(re);
    if (m && m.index != null && m.index < end) end = m.index;
  }
  return after.slice(0, end);
}

function parseFindings(skill, output) {
  const findings = [];
  for (const ex of skill.extractors) {
    const re = new RegExp(ex.match.source, ex.match.flags.replace('g', ''));
    const matched = re.exec(output);
    if (!matched) continue;
    const count = matched[1] && /^\d+$/.test(matched[1]) ? Number(matched[1]) : null;
    let examples = [];
    if (ex.examples) {
      // Restrict example search to the section that follows the match.
      const section = sliceSection(output, matched.index);
      const exRe = new RegExp(ex.examples.source, ex.examples.flags);
      let m;
      while ((m = exRe.exec(section)) !== null && examples.length < 30) {
        examples.push(m[0].trim());
        if (m.index === exRe.lastIndex) exRe.lastIndex++; // safety against zero-width
      }
    }
    findings.push({
      category: ex.category,
      severity: ex.severity,
      type: ex.type,
      title: ex.title,
      count: count ?? examples.length,
      examples,
    });
  }
  return findings;
}

function highestNumber(text, prefix) {
  const re = new RegExp(`^##\\s+${prefix}-(\\d+)\\b`, 'gm');
  let max = 0, m;
  while ((m = re.exec(text)) !== null) max = Math.max(max, Number(m[1]));
  return max;
}

function findExistingEntry(text, prefix, title) {
  // looks for "## PREFIX-NNN — <title contains>" — we match by title substring
  const titleEsc = title.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^##\\s+${prefix}-(\\d+)\\s+—\\s+[^\\n]*${titleEsc}`, 'mi');
  const m = text.match(re);
  return m ? `${prefix}-${m[1]}` : null;
}

function newEntryBody(skill, finding, id) {
  const exampleBlock = finding.examples.length
    ? finding.examples.slice(0, 30).map((e) => `  - ${e}`).join('\n')
    : '_(részletekért: futtasd újra a skill-t)_';
  const overflow = finding.examples.length < (finding.count ?? 0)
    ? `  - … +${(finding.count ?? 0) - finding.examples.length} további\n`
    : '';
  return `
## ${id} — ${finding.title}

| Mező | Érték |
|------|-------|
| Felfedezve | ${TODAY} |
| Felfedezte | log-from-output |
| Súlyosság | ${finding.severity} |
| Státusz | 🆕 |
| Típus | ${finding.type} |
| Találatok száma | ${finding.count ?? '—'} |

**Probléma:**
${finding.title}. Részletes lista a Bizonyíték szakaszban.

**Bizonyíték (első ${Math.min(30, finding.examples.length)} találat):**
${exampleBlock}
${overflow}

**Javasolt megoldás:**
Lásd a megfelelő SKILL.md \`Workflow\` és \`references/\` mappa útmutatását.

**Verifikáció:**
- [ ] \`node ${skill.runner}\` újrafutása nem találja meg ezt a kategóriát.

**Napló:**
- ${TODAY}: bejegyzés létrehozva (${finding.count ?? 0} találat)
`;
}

function appendNaploEntry(existingBody, count) {
  // find the **Napló:** line and append below it
  const lines = existingBody.split('\n');
  const i = lines.findIndex((l) => /^\*\*Napló:\*\*\s*$/.test(l));
  if (i < 0) return existingBody;
  // collect existing dated lines
  const newLine = `- ${TODAY}: ismétlés-futás, jelenleg ${count ?? '—'} találat`;
  // avoid duplicate same-day line
  if (lines.slice(i).some((l) => l.startsWith(newLine.slice(0, 16)))) return existingBody;
  lines.splice(i + 1, 0, newLine);
  return lines.join('\n');
}

// In-memory cache of next-NNN per prefix, primed from disk on first read.
const NEXT_NNN_CACHE = new Map();
async function nextId(prefix, text) {
  if (!NEXT_NNN_CACHE.has(prefix)) NEXT_NNN_CACHE.set(prefix, highestNumber(text, prefix) + 1);
  const n = NEXT_NNN_CACHE.get(prefix);
  NEXT_NNN_CACHE.set(prefix, n + 1);
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

async function updateOrCreateEntry(skill, finding, dryRun) {
  const logPath = join(PROJECT_ROOT, skill.log);
  if (!existsSync(logPath)) return { kind: 'no-log' };
  let text = await readFile(logPath, 'utf8');
  const existing = findExistingEntry(text, skill.prefix, finding.title);
  if (existing) {
    // append to Napló
    const re = new RegExp(`(##\\s+${existing}\\s+—[\\s\\S]*?)(?=^##\\s+${skill.prefix}-\\d+|^##\\s+(?:Lezárt|Aktív)|$(?![\\s\\S]))`, 'm');
    const m = text.match(re);
    if (m) {
      const updated = appendNaploEntry(m[1], finding.count);
      if (updated !== m[1]) {
        text = text.replace(m[1], updated);
        if (!dryRun) await writeFile(logPath, text);
        return { kind: 'updated', id: existing, count: finding.count };
      }
    }
    return { kind: 'no-change', id: existing };
  }
  // create new entry
  const id = await nextId(skill.prefix, text);
  const body = newEntryBody(skill, finding, id);
  // insert before "## Lezárt bejegyzések" if present, otherwise before final hr
  let newText;
  if (/^##\s+Lezárt bejegyzések/m.test(text)) {
    newText = text.replace(/^##\s+Lezárt bejegyzések/m, body + '\n## Lezárt bejegyzések');
    // but first replace the "*Még nincs bejegyzés.*" marker if present in Aktív block
    newText = newText.replace(/(##\s+Aktív bejegyzések\s*\n\s*)\*Még nincs bejegyzés\.\*\s*\n/, '$1');
  } else {
    newText = text.replace(/^##\s+Aktív bejegyzések\s*\n\s*\*Még nincs bejegyzés\.\*\s*\n/m,
      `## Aktív bejegyzések\n${body}\n`);
    if (newText === text) newText = text + '\n' + body;
  }
  if (!dryRun) await writeFile(logPath, newText);
  return { kind: 'created', id, count: finding.count };
}

// ----------------------------------------------------------------------------
//  Main
// ----------------------------------------------------------------------------

console.log('\n🧾 log-from-output\n');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE'}`);
if (SKIP.length) console.log(`Skip: ${SKIP.join(', ')}`);
if (ONLY.length) console.log(`Only: ${ONLY.join(', ')}`);
console.log('');

let totalCreated = 0, totalUpdated = 0, totalSkilled = 0;
const summary = [];

for (const skill of SKILLS) {
  if (SKIP.includes(skill.name)) continue;
  if (ONLY.length && !ONLY.includes(skill.name)) continue;

  process.stdout.write(`▶ ${skill.name.padEnd(18)} `);
  const out = captureSkill(skill);
  if (out == null) {
    console.log('— runner missing, skip');
    continue;
  }
  const findings = parseFindings(skill, out).filter((f) => (f.count ?? 0) > 0);
  if (findings.length === 0) {
    console.log('✅ no findings');
    continue;
  }
  totalSkilled++;
  console.log(`${findings.length} kategória\n`);

  for (const f of findings) {
    const r = await updateOrCreateEntry(skill, f, DRY_RUN);
    const tag = r.kind === 'created' ? '🆕' : r.kind === 'updated' ? '🔁' : '➖';
    const id = r.id || '(skipped)';
    console.log(`    ${tag}  ${id.padEnd(10)}  ${f.severity}  ${f.title}  (count=${f.count})`);
    summary.push({ skill: skill.name, ...r, ...f });
    if (r.kind === 'created') totalCreated++;
    if (r.kind === 'updated') totalUpdated++;
  }
  console.log('');
}

console.log('\n=================================');
console.log(`  Skills with findings: ${totalSkilled}`);
console.log(`  New entries created:  ${totalCreated}`);
console.log(`  Existing updated:     ${totalUpdated}`);
console.log(`  Mode:                 ${DRY_RUN ? 'DRY RUN' : 'WRITTEN'}`);
console.log('=================================\n');

if (!DRY_RUN && (totalCreated + totalUpdated) > 0) {
  console.log('👉 Frissítsd a master riportot:');
  console.log('   node Ultimate-Adventure-Tool/scripts/qa-report.mjs --write\n');
}
