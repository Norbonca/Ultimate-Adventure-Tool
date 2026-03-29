#!/usr/bin/env node
/**
 * Trevu Link & Route Checker
 * Validates internal links against actual pages/routes.
 *
 * Checks: LINK-01, LINK-04, LINK-05, ROUTE-01 from TESTING_PLAN.md
 * Exit code 0 = all pass, 1 = issues found
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, dirname, relative, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const APP_DIR = resolve(ROOT, 'apps/web/app');
const WEB_DIR = resolve(ROOT, 'apps/web');

// ── Helpers ──────────────────────────────────────────────

function walkDir(dir, extensions) {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      results.push(...walkDir(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Discover all valid routes from the App Router file structure.
 * Strips (group) folders, handles [param] segments.
 */
function discoverRoutes(appDir) {
  const routes = new Set();
  const pageFiles = walkDir(appDir, ['page.tsx', 'page.ts', 'route.ts', 'route.tsx']);

  for (const file of pageFiles) {
    let route = relative(appDir, dirname(file));
    // Strip route groups: (auth), (app), (marketing) etc.
    route = route.replace(/\([^)]+\)\/?/g, '');
    // Normalize
    route = '/' + route.replace(/\\/g, '/');
    if (route.endsWith('/')) route = route.slice(0, -1);
    if (route === '') route = '/';

    routes.add(route);

    // Also add parameterized version as pattern
    if (route.includes('[')) {
      const pattern = route.replace(/\[[^\]]+\]/g, '*');
      routes.add(pattern);
    }
  }
  return routes;
}

/**
 * Extract href/push/redirect values from source files.
 */
function extractLinks(files) {
  const links = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const relPath = relative(ROOT, file);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match <Link href="/something">
      const hrefMatches = line.matchAll(/href=["']([^"']+)["']/g);
      for (const m of hrefMatches) {
        if (m[1].startsWith('/') && !m[1].startsWith('//')) {
          links.push({ href: m[1], file: relPath, line: i + 1, type: 'Link href' });
        }
      }

      // Match router.push("/something")
      const pushMatches = line.matchAll(/router\.push\(["']([^"']+)["']\)/g);
      for (const m of pushMatches) {
        if (m[1].startsWith('/')) {
          links.push({ href: m[1], file: relPath, line: i + 1, type: 'router.push' });
        }
      }

      // Match redirect("/something")
      const redirectMatches = line.matchAll(/redirect\(["']([^"']+)["']\)/g);
      for (const m of redirectMatches) {
        if (m[1].startsWith('/')) {
          links.push({ href: m[1], file: relPath, line: i + 1, type: 'redirect' });
        }
      }
    }
  }
  return links;
}

/**
 * Check if a link matches a known route (including parameterized routes).
 */
function routeMatches(href, routes) {
  // Strip query string and hash
  const cleanHref = href.split('?')[0].split('#')[0];
  if (routes.has(cleanHref)) return true;

  // Check against parameterized patterns
  for (const route of routes) {
    if (!route.includes('[') && !route.includes('*')) continue;
    const pattern = route.replace(/\[[^\]]+\]/g, '[^/]+').replace(/\*/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(cleanHref)) return true;
  }

  // API routes
  if (cleanHref.startsWith('/api/')) {
    const apiPath = resolve(APP_DIR, cleanHref.slice(1));
    if (existsSync(apiPath + '/route.ts') || existsSync(apiPath + '/route.tsx')) return true;
  }

  return false;
}

// ── Main ─────────────────────────────────────────────────

const fails = [];
const concerns = [];

console.log('🔍 Trevu Link & Route Check\n');

// Step 1: Discover routes
const routes = discoverRoutes(APP_DIR);
console.log(`── Routes discovered: ${routes.size} ──`);
for (const r of [...routes].sort()) {
  console.log(`  📄 ${r}`);
}

// Step 2: Find all .tsx files and extract links
const tsxFiles = walkDir(WEB_DIR, ['.tsx', '.ts']).filter(f =>
  !f.includes('node_modules') && !f.includes('.next')
);
const links = extractLinks(tsxFiles);
console.log(`\n── Links found: ${links.length} ──`);

// Step 3: LINK-01 / LINK-04 / LINK-05: Validate each link
console.log('\n── LINK-01/04/05: Dead link check ──');
const deadLinks = [];
const externalLinks = [];

for (const link of links) {
  if (link.href.startsWith('http://') || link.href.startsWith('https://')) {
    externalLinks.push(link);
    continue;
  }

  if (!routeMatches(link.href, routes)) {
    deadLinks.push(link);
    fails.push({
      id: 'LINK-01',
      msg: `Dead link: ${link.href} (${link.type} in ${link.file}:${link.line})`
    });
  }
}

if (deadLinks.length === 0) {
  console.log('  ✅ All internal links resolve to existing routes');
} else {
  console.log(`  ❌ ${deadLinks.length} dead link(s):`);
  for (const dl of deadLinks) {
    console.log(`     ${dl.href} — ${dl.type} in ${dl.file}:${dl.line}`);
  }
}

if (externalLinks.length > 0) {
  console.log(`\n  ℹ️  ${externalLinks.length} external URL(s) found (manual verification recommended)`);
  for (const el of externalLinks) {
    concerns.push({ id: 'LINK-04', msg: `External URL: ${el.href} in ${el.file}:${el.line}` });
  }
}

// ── Summary ──────────────────────────────────────────────
console.log('\n── Summary ──');
console.log(`  Routes: ${routes.size}`);
console.log(`  Internal links: ${links.length - externalLinks.length}`);
console.log(`  External links: ${externalLinks.length}`);
console.log(`  FAILs: ${fails.length}`);
console.log(`  CONCERNs: ${concerns.length}`);

if (fails.length > 0 || concerns.length > 0) {
  console.log('\n── Details ──');
  fails.forEach(f => console.log(`  ❌ [${f.id}] ${f.msg}`));
  concerns.slice(0, 10).forEach(c => console.log(`  ⚠️  [${c.id}] ${c.msg}`));
  if (concerns.length > 10) console.log(`  ... and ${concerns.length - 10} more concerns`);
}

const result = {
  step: 'links',
  fails: fails.length,
  concerns: concerns.length,
  details: { fails, concerns },
  routes: routes.size,
  linksChecked: links.length,
};

console.log('\n' + JSON.stringify(result));
process.exit(fails.length > 0 ? 1 : 0);
