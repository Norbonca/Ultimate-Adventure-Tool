#!/usr/bin/env node
/**
 * scripts/qa-report.mjs
 *
 * Aggregates all *_LOG.md files into a single MASTER_TEST_LOG.md report.
 * Counts active findings per skill / severity, lists open critical items.
 *
 * Usage:
 *   node scripts/qa-report.mjs            # console
 *   node scripts/qa-report.mjs --write    # also overwrite MASTER_TEST_LOG.md
 */

import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(process.cwd(), '..');
const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');
const NO_SCAN = args.has('--no-scan');
const SCAN_ALL = args.has('--scan-all'); // include user-flow + usability (slow)

// ---------------------------------------------------------------------------
//  Pre-step: run log-from-output to refresh per-skill logs
// ---------------------------------------------------------------------------
if (!NO_SCAN) {
  console.log('🔄 Frissítés: log-from-output futtatása…\n');
  const scanArgs = SCAN_ALL ? [] : ['--skip', 'user-flow,usability'];
  const r = spawnSync(
    'node',
    [join(ROOT, 'Ultimate-Adventure-Tool', 'scripts', 'log-from-output.mjs'), ...scanArgs],
    { stdio: 'inherit' },
  );
  if (r.status !== 0 && r.status !== 1) {
    // exit 1 is "found findings" which is normal here; only abort on 2+
    console.warn('⚠️  log-from-output non-zero exit (continuing).\n');
  }
  console.log('');
}

const LOGS = [
  { file: 'DOC_CONSISTENCY_LOG.md',  skill: 'trevu-doc-consistency',  prefix: 'DOC' },
  { file: 'PLAN_CONSISTENCY_LOG.md', skill: 'trevu-plan-consistency', prefix: 'PLAN' },
  { file: 'CODE_CONSISTENCY_LOG.md', skill: 'trevu-code-consistency', prefix: 'CODE' },
  { file: 'CODE_QUALITY_LOG.md',     skill: 'trevu-code-quality',     prefix: 'CQ' },
  { file: 'DEV_TEST_LOG.md',         skill: 'trevu-dev-functional',   prefix: 'DEV' },
  { file: 'USER_FLOW_LOG.md',        skill: 'trevu-user-flow',        prefix: 'FLOW' },
  { file: 'USABILITY_LOG.md',        skill: 'trevu-usability',        prefix: 'UX' },
  { file: 'SECURITY_LOG.md',         skill: 'web-security-guardian',  prefix: 'SEC' },
];

const SEV = ['🔴', '🟠', '🟡', '🟢'];
const STATUS_ACTIVE = ['🆕', '🔧', '⏸️'];

const today = new Date().toISOString().slice(0, 10);
let summaryRows = [];
let criticalOpen = [];

for (const lg of LOGS) {
  const p = join(ROOT, lg.file);
  if (!existsSync(p)) {
    summaryRows.push({ ...lg, total: 0, active: 0, critical: 0, exists: false });
    continue;
  }
  const text = await readFile(p, 'utf8');
  // Split on `## PREFIX-NNN — ...` boundaries; collect body until next `## `.
  const headerRe = new RegExp(`^##\\s+${lg.prefix}-(\\d+)\\s+—\\s+([^\\n]+)$`, 'gm');
  const headers = [];
  let h;
  while ((h = headerRe.exec(text)) !== null) {
    headers.push({ index: h.index, end: h.index + h[0].length, id: `${lg.prefix}-${h[1]}`, title: h[2].trim() });
  }
  let total = 0, active = 0, critical = 0;
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].end;
    // body ends at next `## ` (any heading, not just same prefix) or EOF
    const nextHeader = text.indexOf('\n## ', start);
    const body = text.slice(start, nextHeader === -1 ? text.length : nextHeader);
    total++;
    const isActive = STATUS_ACTIVE.some((s) => body.includes(s));
    const isCritical = body.includes('🔴');
    if (isActive) active++;
    if (isCritical && isActive) {
      critical++;
      criticalOpen.push({ id: headers[i].id, title: headers[i].title, skill: lg.skill });
    }
  }
  summaryRows.push({ ...lg, total, active, critical, exists: true });
}

let report = `# Master QA Report

> Generated: ${today}
> Aggregated from skill-specific logs. Re-run with: \`node scripts/qa-report.mjs --write\`

## Skill summary

| Skill | Log | Total | Active | 🔴 Critical |
|-------|-----|-------|--------|-------------|
`;
for (const r of summaryRows) {
  report += `| [${r.skill}](.skills/${r.skill}/SKILL.md) | [${r.file}](${r.file}) | ${r.exists ? r.total : '—'} | ${r.exists ? r.active : '—'} | ${r.exists ? r.critical : '—'} |\n`;
}

report += `\n## Active critical (🔴) findings\n\n`;
if (criticalOpen.length === 0) {
  report += '_Nincs aktív 🔴 finding — production push gate zöld._\n';
} else {
  report += `**${criticalOpen.length} kritikus aktív bejegyzés:**\n\n`;
  for (const c of criticalOpen) {
    report += `- **${c.id}** — ${c.title}  _(${c.skill})_\n`;
  }
  report += '\n⚠️  **Production push gate piros** — előbb ezeket javítani.\n';
}

report += `\n## Quick run

\`\`\`bash
# riport frissítése (alapértelmezetten lefuttatja a scaneket is)
pnpm qa:report

# csak a meglévő logokat olvasd, ne futtasd újra
node scripts/qa-report.mjs --write --no-scan

# E2E + Lighthouse-t is bevenni a scanbe (lassú)
node scripts/qa-report.mjs --write --scan-all

# minden ellenőrzés stdout-tal együtt
./scripts/run-all-tests.sh
./scripts/run-all-tests.sh --quick
./scripts/run-all-tests.sh --consistency-only
\`\`\`

## Skillek

| Skill | Mit fed le |
|-------|------------|
| trevu-doc-consistency | Dokumentáció ↔ dokumentáció (link, status, freshness, traceability) |
| trevu-plan-consistency | Pencil design ↔ kód, design tokenek, AppHeader anchors, hardcoded színek |
| trevu-code-consistency | i18n, AppHeader használat, UPSERT, server action shape, route konvenció |
| trevu-code-quality | Lint, type, coverage, dep audit, complexity, bundle |
| trevu-dev-functional | Vitest unit + integration, server action coverage, flaky detect |
| trevu-user-flow | Playwright E2E, kritikus user journey-k |
| trevu-usability | axe-core a11y, Lighthouse perf, responsive, form ergonomics |
`;

console.log(report);

if (WRITE) {
  await writeFile(join(ROOT, 'MASTER_TEST_LOG.md'), report);
  console.log(`\n✅ MASTER_TEST_LOG.md frissítve.`);

  // Auto-generate the .docx companion (unless --no-docx)
  if (!args.has('--no-docx')) {
    const docxScript = join(ROOT, 'Ultimate-Adventure-Tool', 'scripts', 'qa-report-docx.mjs');
    if (existsSync(docxScript)) {
      const r = spawnSync('node', [docxScript], { stdio: 'inherit' });
      if (r.status !== 0) console.warn('⚠️  qa-report-docx hiba (continuing).');
    }
  }
}

process.exit(criticalOpen.length === 0 ? 0 : 1);
