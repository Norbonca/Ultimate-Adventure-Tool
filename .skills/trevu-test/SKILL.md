---
name: trevu-test
description: >
  Run the Trevu (Ultimate Adventure Tool) project quality audit — i18n sync, link validation,
  category consistency, security scan, architectural invariants, and Quality Score calculation.
  Use this skill whenever the user mentions testing, auditing, quality checking, or validating the
  UAT/Trevu project. Triggers: "teszt", "test", "tesztelés", "audit", "ellenőrizd", "quality check",
  "minőség", "quality score", "link check", "i18n check", "fordítás ellenőrzés". Also trigger when
  the user asks to verify something works correctly, check for broken links, find missing translations,
  or validate code before a PR/deploy. This skill is Trevu-specific — it knows the monorepo layout,
  packages, and conventions.
---

# Trevu Test — Project Quality Audit Skill

## What this skill does

This skill runs a multi-layer quality audit on the Trevu (Ultimate Adventure Tool) project.
It checks things that generic linters can't: i18n key sync between Hungarian and English,
dead internal links, category data consistency across packages, hardcoded UI text, security
patterns, and architectural rule compliance. It produces a Quality Score using a fixed formula
and a severity assessment.

The skill is designed for a Next.js 15 + Supabase + Drizzle + pnpm monorepo.
It is **read-only by default** — it reports issues but doesn't fix them.

## Project layout reference

```
Ultimate-Adventure-Tool/
├── apps/web/                        # Next.js app
│   ├── app/                         # App Router pages
│   │   ├── (auth)/                  # Login, register, callback
│   │   ├── (app)/                   # Protected: dashboard, profile, trips
│   │   ├── (marketing)/             # Public: discover
│   │   └── api/v1/                  # API routes: health, auth, reference
│   ├── components/                  # Shared components
│   ├── lib/                         # Utils: supabase clients, i18n hooks, categories
│   └── middleware.ts                # Auth session + route protection
├── packages/
│   ├── i18n/src/                    # hu.ts, en.ts, index.ts
│   ├── validators/src/              # Zod schemas (login, register, trip, expense)
│   ├── config/src/                  # ADVENTURE_CATEGORIES, SUBSCRIPTION_TIERS, LIMITS
│   ├── core/src/                    # Business logic interfaces (user, trip, expense, guide)
│   ├── db/src/                      # Drizzle schema + client
│   └── ui/src/                      # UI components (placeholder)
├── supabase/migrations/             # 16 SQL migrations
├── testing/                         # Test files (Vitest + audit scripts)
├── TESTING_PLAN.md                  # Full test plan with IDs
├── CLAUDE.md                        # Project conventions
└── .github/workflows/ci.yml        # CI pipeline
```

## Audit pipeline

Run these steps in order. Each step produces FAIL or CONCERN counts that feed into the
Quality Score at the end.

### Step 1: i18n Audit

This is the most valuable check because translation issues are invisible until a user
switches language.

**1a. Key sync** — The Hungarian and English translation files must have identical structure.

```bash
# Run from monorepo root:
node .skills/trevu-test/scripts/check-i18n-sync.mjs
```

What it checks (maps to TESTING_PLAN.md IDs):
- SYNC-01: Top-level keys match between hu.ts and en.ts
- SYNC-02: Nested key structure is identical (recursive deep comparison)
- SYNC-03: No empty string values in either file
- SYNC-04: Interpolation placeholders (`{param}`) are identical in both files
- SYNC-05: No "TODO", "FIXME", "xxx" placeholder values

Scoring:
- Missing key in one file → FAIL
- Empty string → CONCERN
- Mismatched placeholder → FAIL
- TODO/placeholder value → CONCERN

**1b. Language quality** — Detect language contamination and inconsistency.

```bash
node .skills/trevu-test/scripts/check-i18n-quality.mjs
```

What it checks:
- LANG-01: Hungarian values don't contain common English words (except allowed tech terms)
- LANG-02: English values don't contain Hungarian words
- LANG-03: Consistent form of address (tegezés vs. magázás in Hungarian)
- LANG-05: Capitalization consistency for buttons and headings

Allowed English terms in Hungarian text: "login", "email", "dashboard", "trip", "profile",
"GPS", "URL", "WiFi", "AI", "admin", "cookie", "online", "offline", "app", "web", "link",
"upload", "download", "slider", "scroll".

Scoring:
- Language contamination (non-allowed foreign word) → CONCERN
- Mixed tegezés/magázás in same section → CONCERN

### Step 2: Link & Route Audit

Dead links are one of the most common user-facing bugs in growing projects.

```bash
node .skills/trevu-test/scripts/check-links.mjs
```

What it checks:
- LINK-01: Every `<Link href="...">` and `href="..."` in .tsx files maps to an existing
  page.tsx or route.ts under `apps/web/app/`
- LINK-04: List all referenced but non-existent routes (like `/pricing`, `/community`)
- LINK-05: `router.push()` and `redirect()` calls reference valid routes
- ROUTE-01: Navigation menu items all point to existing pages

How route matching works:
1. Scan `apps/web/app/` recursively for `page.tsx` and `route.ts` files
2. Convert file paths to route patterns (strip `(group)` wrappers, handle `[param]`)
3. Scan all `.tsx` files for Link href, router.push, redirect values
4. Compare — any referenced route without a matching page is a DEAD LINK

Scoring:
- Dead internal link → FAIL
- External URL in code (not just assets) → CONCERN (should verify manually)

### Step 3: Category Consistency

The Trevu project defines adventure categories in 4 separate places. They must stay in sync
or the UI breaks silently.

```bash
node .skills/trevu-test/scripts/check-categories.mjs
```

Cross-reference points:
- `packages/validators/src/index.ts` → `createTripSchema.category` enum values
- `packages/config/src/categories.ts` → `ADVENTURE_CATEGORIES` keys
- `packages/i18n/src/hu.ts` → `categories` section keys
- `apps/web/lib/categories.ts` → `CATEGORY_DISPLAY` keys

What it checks:
- CFG-03: Validator enum values === ADVENTURE_CATEGORIES keys
- CFG-04: i18n categories section has entry for every category
- CFG-05: UI lib/categories.ts covers all categories

Scoring:
- Missing category in any source → FAIL
- Extra category in one source only → CONCERN

### Step 4: Architecture & Convention Compliance

These rules come from CLAUDE.md and keep the codebase consistent as it grows.

```bash
node .skills/trevu-test/scripts/check-architecture.mjs
```

What it checks:

**Hardcoded UI text** (most important):
- Scan all `.tsx` files under `apps/web/` for string literals in JSX
- Flag any user-visible text that isn't wrapped in `t('...')` or `{t('...')}`
- Exclude: className, href, src, alt (if it's a `t()` call), key, id, type, role,
  data-* attributes, console.log, comments
- Each hardcoded visible string → CONCERN

**Server component misuse:**
- Files with `"use client"` that only do data fetching (no useState/useEffect/onClick)
  → CONCERN (should be Server Component)

**UPSERT pattern:**
- Scan server actions for `.update(` without `.upsert(` nearby → CONCERN

**AI attribution leak:**
- Search source files for: "Co-Authored-By", "Claude", "Anthropic", "Generated by AI"
- Search in `.ts`, `.tsx`, `.js`, `.jsx`, `.md` (exclude CLAUDE.md, TESTING_PLAN.md, .skills/)
- Any match in source code → CONCERN

### Step 5: Security Pattern Scan

Basic security hygiene check — not a penetration test, but catches common mistakes.

```bash
node .skills/trevu-test/scripts/check-security.mjs
```

What it checks:
- Hardcoded secrets: strings matching API key patterns, JWT tokens, connection strings
- `.env` files in git: check .gitignore covers `.env*`
- Exposed Supabase keys: `supabase_service_role_key` in client-side code
- Missing input validation: server actions without Zod parse
- `dangerouslySetInnerHTML` usage without sanitization

Scoring:
- Hardcoded secret → FAIL
- Service role key in client code → FAIL
- Missing validation on server action → CONCERN
- dangerouslySetInnerHTML → CONCERN

### Step 6: Quality Score Calculation

After all steps, calculate the score using the blox-skills formula:

```
score = max(0, 100 - (20 × FAIL_count) - (10 × CONCERN_count))
```

Score ranges:
- 80–100: **Healthy** — Ready to deploy
- 50–79: **Needs Work** — Should address before next release
- 20–49: **Critical** — Significant issues, prioritize fixes
- 0–19: **Blocked** — Major failures, stop and fix

Severity assessment:
- Score ≥ 80 and 0 FAILs → **PASS**
- Score ≥ 80 with minor FAILs → **S1 (Minor)** — log and continue
- Score 50–79 → **S2 (Moderate)** — fix before deploy
- Score 20–49 → **S3 (Major)** — fix immediately
- Score 0–19 → **S4 (Catastrophic)** — stop all work, fix first

### Step 7: Report Assembly

Output a structured report:

```markdown
# Trevu Quality Report — [date]

## Summary
- Quality Score: XX/100 ([range label])
- Severity: [PASS | S1 | S2 | S3 | S4]
- FAILs: [count]
- CONCERNs: [count]

## Step Results
| Step | FAILs | CONCERNs | Details |
|------|-------|----------|---------|
| i18n Sync | X | Y | [summary] |
| i18n Quality | X | Y | [summary] |
| Links & Routes | X | Y | [summary] |
| Categories | X | Y | [summary] |
| Architecture | X | Y | [summary] |
| Security | X | Y | [summary] |

## Issues Found
| # | Step | Severity | Description | File | Line |
|---|------|----------|-------------|------|------|
| 1 | i18n | FAIL | Missing key 'pricing.title' in en.ts | packages/i18n/src/en.ts | — |
| ... |

## Recommendations
1. [Most urgent fix]
2. [Second priority]
3. [Third priority]
```

## Running modes

**Quick audit** (default when user says "teszt" or "ellenőrizd"):
- Steps 1–4 + Score
- Takes ~30 seconds

**Full audit** (when user says "teljes teszt" or "full audit"):
- All 7 steps including security scan
- Generates full report

**Single check** (when user asks about a specific area):
- "i18n check" → Step 1 only
- "link check" → Step 2 only
- "category check" → Step 3 only
- "security scan" → Step 5 only

## When a script doesn't exist yet

The audit scripts in `.skills/trevu-test/scripts/` may not all be created yet.
If a script is missing, run the check manually by:

1. Reading the relevant source files
2. Performing the comparison described in the step
3. Counting FAILs and CONCERNs
4. Including results in the report

This makes the skill useful immediately — the scripts are an optimization, not a requirement.

## What NOT to do

- Don't modify source code — this is a read-only audit
- Don't run database queries — the audit works on source files only
- Don't fix issues automatically — report them and let the user decide
- Don't run `pnpm build` or `pnpm dev` — those are separate concerns
- If a bug is found: log it to the report, suggest adding it to TECH_DEBT.md
