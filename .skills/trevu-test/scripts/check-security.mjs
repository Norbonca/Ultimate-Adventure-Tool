#!/usr/bin/env node
/**
 * Trevu Security Pattern Scanner
 * Basic security hygiene check on source files.
 *
 * Checks: hardcoded secrets, .env in git, service role key exposure,
 *         missing input validation, dangerouslySetInnerHTML
 * Exit code 0 = all pass, 1 = issues found
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, dirname, relative, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

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

console.log('🔍 Trevu Security Pattern Scan\n');

// ── Check 1: Hardcoded secrets ───────────────────────────
console.log('── Hardcoded secrets ──');

const secretPatterns = [
  { name: 'API Key', pattern: /["'](?:sk|pk|api|key)[-_](?:live|test|prod)?[-_]?[a-zA-Z0-9]{20,}["']/i },
  { name: 'JWT Token', pattern: /["']eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}["']/i },
  { name: 'Connection String', pattern: /["'](?:postgres|mysql|mongodb|redis):\/\/[^"']{10,}["']/i },
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----/i },
  { name: 'AWS Key', pattern: /["']AKIA[0-9A-Z]{16}["']/i },
  { name: 'Supabase Key (hardcoded)', pattern: /["']eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+["']/i },
];

const allSourceFiles = walkDir(ROOT, ['.ts', '.tsx', '.js', '.jsx', '.mjs']).filter(f =>
  !f.includes('node_modules') && !f.includes('.next') && !f.includes('.git')
  && !f.includes('.skills')
);

let secretCount = 0;
for (const file of allSourceFiles) {
  const content = readFileSync(file, 'utf-8');
  const relPath = relative(ROOT, file);
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip env variable references
    if (line.includes('process.env')) continue;
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

    for (const { name, pattern } of secretPatterns) {
      if (pattern.test(line)) {
        fails.push({
          id: 'SEC-01',
          msg: `Potential ${name} in ${relPath}:${i + 1}`
        });
        secretCount++;
      }
    }
  }
}

console.log(secretCount === 0
  ? '  ✅ No hardcoded secrets detected'
  : `  ❌ ${secretCount} potential hardcoded secret(s)`);

// ── Check 2: .env files in git ───────────────────────────
console.log('\n── .env files protection ──');

const gitignorePath = resolve(ROOT, '.gitignore');
let envProtected = false;
if (existsSync(gitignorePath)) {
  const gitignore = readFileSync(gitignorePath, 'utf-8');
  envProtected = gitignore.includes('.env') || gitignore.includes('.env*');
}

// Check for actual .env files (they shouldn't be committed)
const envFiles = [];
try {
  const rootEntries = readdirSync(ROOT);
  for (const entry of rootEntries) {
    if (entry.startsWith('.env') && !entry.endsWith('.example')) {
      envFiles.push(entry);
    }
  }
  // Also check apps/web/
  const webDir = resolve(ROOT, 'apps/web');
  if (existsSync(webDir)) {
    const webEntries = readdirSync(webDir);
    for (const entry of webEntries) {
      if (entry.startsWith('.env') && !entry.endsWith('.example')) {
        envFiles.push(`apps/web/${entry}`);
      }
    }
  }
} catch (e) { /* ignore */ }

if (envProtected) {
  console.log('  ✅ .gitignore covers .env files');
} else {
  fails.push({ id: 'SEC-02', msg: '.gitignore does not cover .env files' });
  console.log('  ❌ .gitignore does not cover .env files');
}

if (envFiles.length > 0) {
  console.log(`  ℹ️  Found ${envFiles.length} .env file(s): ${envFiles.join(', ')}`);
  console.log('  (These should not be committed to git)');
}

// ── Check 3: Service role key in client code ─────────────
console.log('\n── Supabase service role key exposure ──');

const clientFiles = walkDir(resolve(ROOT, 'apps/web'), ['.tsx', '.ts']).filter(f =>
  !f.includes('node_modules') && !f.includes('.next')
  && (f.includes('/components/') || f.includes('/app/') || f.includes('/hooks/'))
  && !f.includes('server.ts') && !f.includes('actions.ts')
  && !f.includes('route.ts')
);

let serviceKeyCount = 0;
for (const file of clientFiles) {
  const content = readFileSync(file, 'utf-8');
  const relPath = relative(ROOT, file);

  if (content.includes('service_role') || content.includes('SUPABASE_SERVICE_ROLE')) {
    // Check if it's in a "use client" file
    if (content.includes('"use client"') || content.includes("'use client'")) {
      fails.push({
        id: 'SEC-03',
        msg: `Service role key reference in client code: ${relPath}`
      });
      serviceKeyCount++;
    }
  }
}

console.log(serviceKeyCount === 0
  ? '  ✅ No service role key in client code'
  : `  ❌ ${serviceKeyCount} service role key reference(s) in client code`);

// ── Check 4: Missing input validation on server actions ──
console.log('\n── Server action input validation ──');

const actionFiles = walkDir(resolve(ROOT, 'apps/web'), ['.ts', '.tsx']).filter(f =>
  f.includes('action') && !f.includes('node_modules')
);

let missingValidation = 0;
for (const file of actionFiles) {
  const content = readFileSync(file, 'utf-8');
  const relPath = relative(ROOT, file);

  // Find exported async functions (server actions)
  const actionMatches = content.matchAll(/export\s+async\s+function\s+(\w+)/g);
  for (const match of actionMatches) {
    const fnName = match[1];
    // Check if there's a .parse( or .safeParse( or zodSchema near this function
    const fnStart = match.index;
    const fnBlock = content.slice(fnStart, fnStart + 500);

    if (!fnBlock.includes('.parse(') && !fnBlock.includes('.safeParse(')
        && !fnBlock.includes('Schema') && !fnBlock.includes('schema')) {
      concerns.push({
        id: 'SEC-04',
        msg: `Server action "${fnName}" may lack Zod validation: ${relPath}`
      });
      missingValidation++;
    }
  }
}

console.log(missingValidation === 0
  ? '  ✅ All server actions appear to have validation'
  : `  ⚠️  ${missingValidation} server action(s) may lack input validation`);

// ── Check 5: dangerouslySetInnerHTML ─────────────────────
console.log('\n── dangerouslySetInnerHTML usage ──');

let dangerousCount = 0;
const allTsx = walkDir(resolve(ROOT, 'apps/web'), ['.tsx']).filter(f =>
  !f.includes('node_modules') && !f.includes('.next')
);

for (const file of allTsx) {
  const content = readFileSync(file, 'utf-8');
  const relPath = relative(ROOT, file);

  if (content.includes('dangerouslySetInnerHTML')) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('dangerouslySetInnerHTML')) {
        // Check if sanitization is nearby
        const context = content.slice(
          Math.max(0, content.indexOf(lines[i]) - 200),
          content.indexOf(lines[i]) + 200
        );
        const hasSanitize = /sanitize|DOMPurify|xss|escape/i.test(context);

        if (hasSanitize) {
          concerns.push({
            id: 'SEC-05',
            msg: `dangerouslySetInnerHTML (with sanitization) in ${relPath}:${i + 1}`
          });
        } else {
          fails.push({
            id: 'SEC-05',
            msg: `dangerouslySetInnerHTML WITHOUT sanitization in ${relPath}:${i + 1}`
          });
        }
        dangerousCount++;
      }
    }
  }
}

console.log(dangerousCount === 0
  ? '  ✅ No dangerouslySetInnerHTML usage'
  : `  ⚠️  ${dangerousCount} dangerouslySetInnerHTML usage(s)`);

// ── Summary ──────────────────────────────────────────────
console.log('\n── Summary ──');
console.log(`  Files scanned: ${allSourceFiles.length}`);
console.log(`  FAILs: ${fails.length}`);
console.log(`  CONCERNs: ${concerns.length}`);

if (fails.length > 0 || concerns.length > 0) {
  console.log('\n── Details ──');
  fails.forEach(f => console.log(`  ❌ [${f.id}] ${f.msg}`));
  concerns.forEach(c => console.log(`  ⚠️  [${c.id}] ${c.msg}`));
}

const result = {
  step: 'security',
  fails: fails.length,
  concerns: concerns.length,
  details: { fails, concerns },
  filesScanned: allSourceFiles.length,
};

console.log('\n' + JSON.stringify(result));
process.exit(fails.length > 0 ? 1 : 0);
