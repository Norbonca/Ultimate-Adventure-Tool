# Trevu — Tesztelési Terv v1.0

> **Dátum:** 2026-03-22
> **Projekt:** Ultimate Adventure Tool (Trevu)
> **Verzió:** MVP (Fázis 1–2)

---

## 1. Áttekintés

### 1.1 Cél
Többszintű, automatizált tesztelési rendszer kiépítése, amely a technológiai helyesség mellett kiterjed a funkcionális integritásra, UX minőségre, nyelvi helyességre és infrastruktúra-ellenőrzésre.

### 1.2 Tesztelési piramis

```
         ┌─────────────┐
         │   E2E / UI   │  ← Playwright (böngésző szintű)
         ├─────────────┤
         │ Integration   │  ← Server action + API tesztek
         ├─────────────┤
         │    Unit       │  ← Validators, i18n, config, utils
         └─────────────┘

   +  Statikus analízis (lint, type-check, link-check, i18n-audit)
```

### 1.3 Technológiai stack

| Szint | Eszköz | Miért |
|-------|--------|-------|
| Unit + Integration | **Vitest** | Natív TS/ESM, gyors, Vite-kompatibilis |
| E2E / UI | **Playwright** | Multi-browser, screenshot, accessibility |
| Lint | **ESLint** (meglévő) | Kód minőség |
| i18n audit | **Egyedi script** | HU/EN kulcs-szinkron + nyelvi ellenőrzés |
| Link check | **Egyedi script** | Belső/külső linkek validálása |

### 1.4 Könyvtárstruktúra

```
Ultimate-Adventure-Tool/
├── testing/                          ← ÚJ: központi teszt könyvtár
│   ├── vitest.config.ts              ← Vitest konfiguráció
│   ├── setup.ts                      ← Globális test setup
│   │
│   ├── unit/                         ← L1: Unit tesztek
│   │   ├── validators.test.ts        ← Zod séma tesztek
│   │   ├── i18n.test.ts              ← Fordítás rendszer tesztek
│   │   ├── i18n-keys.test.ts         ← HU/EN kulcs szinkron
│   │   ├── i18n-quality.test.ts      ← Nyelvi minőség (magyartalan)
│   │   ├── config.test.ts            ← Kategóriák, konstansok
│   │   └── categories.test.ts        ← UI kategória konzisztencia
│   │
│   ├── integration/                  ← L2: Integrációs tesztek
│   │   ├── api-health.test.ts        ← API endpoint tesztek
│   │   ├── server-actions.test.ts    ← Trip CRUD server action tesztek
│   │   └── middleware.test.ts        ← Auth middleware tesztek
│   │
│   ├── e2e/                          ← L3: End-to-end tesztek
│   │   ├── playwright.config.ts      ← Playwright konfiguráció
│   │   ├── auth-flow.spec.ts         ← Login → Dashboard flow
│   │   ├── trip-wizard.spec.ts       ← Trip létrehozás teljes flow
│   │   ├── discover.spec.ts          ← Discover oldal + szűrés
│   │   ├── navigation.spec.ts        ← Összes link, routing
│   │   └── language.spec.ts          ← Nyelvváltás E2E
│   │
│   ├── audit/                        ← L4: Audit scriptek
│   │   ├── check-links.ts            ← Belső/külső link validáció
│   │   ├── check-i18n-sync.ts        ← HU/EN struktúra összehasonlítás
│   │   ├── check-i18n-quality.ts     ← Magyar nyelvi minőség
│   │   ├── check-dead-routes.ts      ← Hivatkozott de nem létező oldalak
│   │   └── check-accessibility.ts    ← Alapszintű a11y audit
│   │
│   └── fixtures/                     ← Teszt adatok
│       ├── valid-trip.ts             ← Helyes trip input minták
│       ├── invalid-inputs.ts         ← Hibás input minták
│       └── mock-user.ts             ← Mock felhasználó adatok
```

---

## 2. Fázisok

### FÁZIS 0 — Infrastruktúra (most)
> Vitest telepítés, konfig, CI integráció

| # | Feladat | Kockázat | Meglévő kódot érint? |
|---|---------|----------|---------------------|
| F0.1 | Vitest + @testing-library telepítés | Nincs | Nem — csak devDependency |
| F0.2 | `testing/vitest.config.ts` létrehozás | Nincs | Nem — új fájl |
| F0.3 | `pnpm test` script hozzáadás (root + turbo) | Nincs | Csak package.json script |
| F0.4 | CI workflow bővítés `pnpm test`-tel | Nincs | Csak ci.yml |
| F0.5 | `testing/` könyvtár scaffolding | Nincs | Nem — új mappa |

### FÁZIS 1 — Unit tesztek (azonnali, 0 kockázat)
> Tiszta package-ek tesztelése, DB nélkül

#### L1-A: Validators (`@uat/validators`)
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| VAL-01 | `loginSchema` — valid email + jelszó → PASS | Magas |
| VAL-02 | `loginSchema` — üres email → FAIL "Érvényes email szükséges" | Magas |
| VAL-03 | `loginSchema` — 5 karakteres jelszó → FAIL "Minimum 6 karakter" | Magas |
| VAL-04 | `registerSchema` — 1 karakteres név → FAIL | Magas |
| VAL-05 | `createTripSchema` — valid input minden kategóriával → PASS | Magas |
| VAL-06 | `createTripSchema` — érvénytelen kategória → FAIL | Magas |
| VAL-07 | `createTripSchema` — negatív maxParticipants → FAIL | Közepes |
| VAL-08 | `createTripSchema` — 501 résztvevő → FAIL | Közepes |
| VAL-09 | `createExpenseSchema` — 0 összeg → FAIL | Magas |
| VAL-10 | `createExpenseSchema` — érvénytelen splitType → FAIL | Magas |
| VAL-11 | Boundary tesztek: min/max értékek határán | Közepes |

#### L1-B: i18n rendszer (`@uat/i18n`)
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| I18N-01 | `t('auth.login')` → magyar szöveget ad vissza | Magas |
| I18N-02 | `setLocale('en')` → angol szöveget ad vissza | Magas |
| I18N-03 | Interpoláció: `t('key', { name: 'Anna' })` → behelyettesít | Magas |
| I18N-04 | Nem létező kulcs → kulcs stringet ad vissza | Magas |
| I18N-05 | `createT('en')` server-safe → angol szöveget ad | Magas |
| I18N-06 | Fallback: EN-ben hiányzó kulcs → HU-ból veszi | Közepes |
| I18N-07 | `getSection('categories')` → összes kategória nevet adja | Közepes |
| I18N-08 | `SUPPORTED_LOCALES` → `['hu', 'en']` | Alacsony |

#### L1-C: i18n kulcs szinkron audit
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| SYNC-01 | HU és EN fájl azonos top-level kulcsokat tartalmaz | Kritikus |
| SYNC-02 | HU és EN fájl azonos nested struktúrát tartalmaz | Kritikus |
| SYNC-03 | Nincs üres string érték egyik nyelvi fájlban sem | Magas |
| SYNC-04 | Interpoláció placeholder-ek (`{param}`) azonosak mindkét fájlban | Magas |
| SYNC-05 | Minden kulcsra létezik fordítás (nincs "TODO" vagy placeholder) | Közepes |

#### L1-D: i18n nyelvi minőség
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| LANG-01 | Magyar szöveg nem tartalmaz angol szavakat (kivéve szakkifejezések) | Magas |
| LANG-02 | Angol szöveg nem tartalmaz magyar szavakat | Magas |
| LANG-03 | Konzisztens megszólítás (tegezés vs. magázás — egységes-e?) | Közepes |
| LANG-04 | Ékezetes karakterek helyessége a magyar szövegekben | Közepes |
| LANG-05 | Nagybetű-használat konzisztenciája (gombok, címek) | Alacsony |

#### L1-E: Config és kategóriák (`@uat/config`)
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| CFG-01 | Minden `ADVENTURE_CATEGORIES` kulcsnak van emoji, szín és label | Magas |
| CFG-02 | `SUBSCRIPTION_TIERS` — minden tier tartalmaz LIMITS-et | Közepes |
| CFG-03 | Validators `category enum` ↔ `ADVENTURE_CATEGORIES` kulcsok egyeznek | Kritikus |
| CFG-04 | i18n `categories` szekció lefedi az összes kategóriát | Kritikus |
| CFG-05 | `lib/categories.ts` (UI) ↔ `config/categories.ts` konzisztencia | Magas |

### FÁZIS 2 — Statikus audit scriptek (alacsony kockázat)
> Nem tesztek, hanem ellenőrző scriptek — CI-ban is futtathatók

#### L4-A: Link audit
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| LINK-01 | Minden `<Link href="...">` mutat létező page.tsx-re | Kritikus |
| LINK-02 | Minden `href="#..."` fragment valódi ID-re mutat | Magas |
| LINK-03 | Külső URL-ek (Unsplash, Google Fonts) elérhetők (HTTP 200) | Közepes |
| LINK-04 | Hivatkozott de nem létező oldalak listázása (`/pricing`, `/community`, `/planner`) | Kritikus |
| LINK-05 | `router.push()` és `redirect()` hívások valid útvonalra mutatnak | Magas |

#### L4-B: Route konzisztencia
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| ROUTE-01 | Navigációs menü elemei mind létező oldalakra mutatnak | Kritikus |
| ROUTE-02 | Auth flow: `/login` → `/register` → `/callback` útvonalak léteznek | Magas |
| ROUTE-03 | Protected route-ok middleware-rel védettek | Magas |
| ROUTE-04 | Dinamikus route-ok (`[slug]`) kezelik a nem létező slug-ot (404) | Közepes |

#### L4-C: Workflow logika audit
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| FLOW-01 | Trip wizard: draft mentés → publikálás → megjelenik Discover-ben | Magas |
| FLOW-02 | Regisztráció → email megerősítés → profil kitöltés sorrend | Magas |
| FLOW-03 | Nyelvváltás: minden oldalon azonnal frissül a szöveg | Magas |
| FLOW-04 | Kijelentkezés utáni redirect → `/login` | Közepes |
| FLOW-05 | Nem bejelentkezett user protected route-on → redirect `/login` | Magas |

### FÁZIS 3 — Integrációs tesztek (közepes kockázat)
> Supabase mock-kal vagy local DB-vel

#### L2-A: API route tesztek
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| API-01 | `GET /api/v1/health` → 200 + valid JSON | Magas |
| API-02 | `GET /api/v1/reference` → countries, languages, currencies, timezones | Magas |
| API-03 | `POST /api/v1/auth/signout` → session törlés + redirect | Közepes |
| API-04 | Nem létező API route → 404 | Alacsony |

#### L2-B: Server action tesztek (mock DB-vel)
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| ACT-01 | `saveDraft()` — valid input → tripId visszaadása | Magas |
| ACT-02 | `saveDraft()` — hiányzó auth → error | Magas |
| ACT-03 | `publishTrip()` — draft → published státusz váltás | Magas |
| ACT-04 | `fetchCategories()` → aktív kategóriák listája | Közepes |
| ACT-05 | `uploadCoverImage()` — 10MB+ fájl → error | Közepes |
| ACT-06 | `uploadCoverImage()` — nem támogatott formátum → error | Közepes |
| ACT-07 | `fetchTripBySlug()` — nem létező slug → null/error | Közepes |
| ACT-08 | `fetchMyTrips()` — nincs auth → error | Magas |

### FÁZIS 4 — E2E tesztek (Playwright)
> Teljes böngésző flow-k, local dev environment-tel

#### L3-A: Auth flow
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| E2E-01 | Regisztráció form kitöltés → submit → redirect | Magas |
| E2E-02 | Login helyes adatokkal → dashboard | Magas |
| E2E-03 | Login hibás adatokkal → hibaüzenet | Magas |
| E2E-04 | Protected oldal nem bejelentkezve → redirect /login | Magas |

#### L3-B: Trip wizard flow
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| E2E-05 | Wizard 1-4 lépés végigkattintás → draft mentés | Magas |
| E2E-06 | Draft szerkesztés → módosítások megmaradnak | Közepes |
| E2E-07 | Publikálás → megjelenik a Discover oldalon | Magas |
| E2E-08 | Wizard validáció: kötelező mezők üresen → hibaüzenet | Közepes |

#### L3-C: Navigáció és UX
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| E2E-09 | Landing page összes CTA gomb → helyes céloldal | Magas |
| E2E-10 | Mobil menü megnyitás/bezárás | Közepes |
| E2E-11 | Nyelvváltás → szöveg frissül, oldal újratöltés nélkül | Magas |
| E2E-12 | Nyelvváltás megmarad oldal navigáció után | Magas |
| E2E-13 | Discover: kategória szűrés → helyes trip-ek | Közepes |

#### L3-D: Vizuális regresszió (opcionális)
| Teszt ID | Leírás | Prioritás |
|----------|--------|-----------|
| VIS-01 | Landing page screenshot összehasonlítás (desktop) | Alacsony |
| VIS-02 | Landing page screenshot összehasonlítás (mobil) | Alacsony |
| VIS-03 | Trip detail page screenshot | Alacsony |

---

## 3. Teszt protokollok

### 3.1 Fejlesztői teszt (minden commit előtt)
```bash
pnpm test                    # Unit tesztek (Vitest)
pnpm test:audit              # Statikus audit (linkek, i18n szinkron)
```

### 3.2 PR teszt (CI automatikusan)
```bash
pnpm lint                    # ESLint
pnpm type-check              # TypeScript strict
pnpm test                    # Unit + integration tesztek
pnpm test:audit              # Link + i18n audit
pnpm build                   # Build ellenőrzés
```

### 3.3 Release teszt (deploy előtt)
```bash
pnpm test                    # Minden unit + integration
pnpm test:e2e                # Playwright E2E (local dev env-vel)
pnpm test:audit              # Teljes audit
pnpm build                   # Production build
```

### 3.4 Nightly audit (opcionális, scheduled)
```bash
pnpm test:links-external     # Külső URL-ek elérhetőség
pnpm test:i18n-quality       # Nyelvi minőség részletes elemzés
```

---

## 4. Sikerkritériumok

### Fázis 0-1 (azonnali)
- [ ] `pnpm test` lefut hiba nélkül
- [ ] 100% validators coverage
- [ ] 0 hiányzó i18n kulcs (HU ↔ EN szinkronban)
- [ ] Minden belső link valid route-ra mutat

### Fázis 2-3 (1-2 hét)
- [ ] API endpoint-ok tesztelve
- [ ] Link audit 0 broken link
- [ ] Minden hivatkozott oldal létezik (vagy TODO-ként dokumentálva)

### Fázis 4 (folyamatos)
- [ ] Auth flow E2E zöld
- [ ] Trip wizard E2E zöld
- [ ] Nyelvváltás E2E zöld

---

## 5. Fájdalommentes bevezetés elve

**Amit NEM változtatunk meg:**
- Meglévő kódot, komponenseket, server action-öket
- Build konfigurációt (ignoreBuildErrors egyelőre marad)
- Fejlesztési workflow-t (local dev → PR → deploy)

**Amit HOZZÁADUNK:**
- `testing/` könyvtár (teljesen független)
- Vitest devDependency (build-et nem érinti)
- `pnpm test` script (opcionális futtatás)
- CI `test` lépés (`continue-on-error: true` eleinte)

---

---

## 6. Blox-skills audit eredmény

> A `TESTING_PLAN.md` ellenőrzése a `/blox:test`, `/blox:check` és `/blox:scan` szabványok alapján.

### 6.1 Egyezések (amit a tervünk JÓL fed le)

| Blox követelmény | Tervünk lefedettsége | Megjegyzés |
|-----------------|---------------------|------------|
| Tesztelési piramis (unit → integration → E2E) | ✅ TELJES | L1-L3 szintek megvannak |
| Framework detektálás (blox:test Step 1) | ✅ Vitest + Playwright | Jó választás Next.js-hez |
| Gap analysis prioritizálás P1-P4 | ✅ RÉSZLEGES | Van prioritás (Magas/Közepes/Alacsony), de nem P1-P4 formátum |
| Meglévő tesztek futtatása ELŐBB (blox:test invariáns) | ✅ Fázis 0 lefedi | F0 infra → F1 tesztek sorrend helyes |
| Forráskód olvasása tesztek ELŐTT (blox:test invariáns) | ✅ Implicit | A terv a létező kódot teszteli |
| Edge case-ek: null, boundary, error (blox:test Step 3) | ✅ RÉSZLEGES | VAL-07/08 boundary, de nincs null/undefined teszt |
| E2E user flow-k azonosítása (blox:test Step 5) | ✅ TELJES | Auth, trip wizard, discover, nyelv |
| Link audit | ✅ TELJES | LINK-01 – LINK-05 átfogó |
| i18n konzisztencia | ✅ TELJES | SYNC-01 – SYNC-05 + LANG-01 – LANG-05 (ez TÖBB mint amit blox kér) |
| CI integráció | ✅ TERVEZETT | Protokoll 3.2 — PR teszt |

### 6.2 Hiányosságok (amit a blox-skills elvár, de nálunk hiányzik)

#### KRITIKUS hiányok

| # | Blox követelmény | Forrás | Mi hiányzik | Javasolt kiegészítés |
|---|-----------------|--------|-------------|---------------------|
| H-01 | **Quality Score formula** — `max(0, 100 - 20×FAIL - 10×CONCERN)` | blox:check Step 7 | A tervben nincs minőségi pontszám rendszer | Hozzáadni: `QUALITY_SCORE.md` + formula a teszt eredmények összesítésére |
| H-02 | **Severity assessment** (S1-S4 skála) | blox:check Step 8 | Nincs severity szint definíció a teszt hibákhoz | Hozzáadni: S1 (minor) → S4 (catastrophic) besorolás |
| H-03 | **Pre-submission checklist** (8 pontos) | blox:check Step 2 | Nincs commit/PR előtti checklist | Hozzáadni: AC verified, clean code, config hygiene, tests pass, pattern reuse, architecture guard, docs updated, approach alignment |
| H-04 | **Cross-phase impact check** | blox:check S4 detection | Ha shared kód változik, más modulok tesztjeit is futtatni kell | Hozzáadni: shared package (validators, config, i18n) módosításánál MINDEN teszt fut |
| H-05 | **GOLDEN_PRINCIPLES.md** referencia | blox:check Step 3 | A tesztelés nem ellenőrzi az architekturális invariánsokat | Hozzáadni: invariáns ellenőrzés (pl. "UPSERT mindenhol", "Server Component ahol lehet") |

#### FONTOS hiányok

| # | Blox követelmény | Forrás | Mi hiányzik | Javasolt kiegészítés |
|---|-----------------|--------|-------------|---------------------|
| H-06 | **Security pattern scan** | blox:check Step 5e | Nincs biztonsági teszt a tervben | Hozzáadni: `audit/check-security.ts` — hardcoded secrets, SQL injection, XSS, missing input validation |
| H-07 | **Accessibility review** (WCAG 2.1 AA) | blox:check Step 5b | Csak alap `check-accessibility.ts` van tervezve, nincs részletezve | Kibővíteni: alt text, ARIA labels, keyboard nav, color contrast, heading hierarchy, focus indicators |
| H-08 | **Brand voice consistency** | blox:check Step 5a | Nincs brand hang ellenőrzés | Hozzáadni: `audit/check-brand-voice.ts` — tone match, terminológia, banned words (Trevu Brand Guide alapján) |
| H-09 | **Performance anti-pattern scan** | blox:check Step 5d | Nincs teljesítmény ellenőrzés | Hozzáadni: N+1 query, missing pagination, unoptimized images, missing lazy load, bundle size monitoring |
| H-10 | **Design consistency review** | blox:check Step 5c | Nincs design rendszer ellenőrzés | Hozzáadni: spacing tokens, color palette használat, responsive breakpoints |
| H-11 | **Test describe/it struktúra** | blox:test Step 4 | A teszt ID-k jók, de nincs `describe/it` nesting minta definiálva | Hozzáadni: kötelező struktúra — `describe("[Module]") > describe("[function]") > it("should ...")` |
| H-12 | **Bug reporting protokoll** | blox:test invariáns #5 | Ha teszt bugot talál: "report, don't fix" — nincs definiálva | Hozzáadni: bug → TECH_DEBT.md-be logolás, nem csendes javítás |

#### ALACSONY prioritású hiányok

| # | Blox követelmény | Forrás | Mi hiányzik |
|---|-----------------|--------|-------------|
| H-13 | AI attribúció check (G-18) | blox:scan Step 3 | Nincs teszt a "Co-Authored-By" / "Claude" / "Anthropic" szivárgásra forrásfájlokban |
| H-14 | Coverage report + per-file breakdown | blox:test Step 2 | Nincs coverage cél definiálva |
| H-15 | TECH_DEBT.md létrehozás | blox:check S2 | Nincs tech debt nyilvántartás terve |
| H-16 | Phase Memory pattern | blox knowledge patterns | Teszt fázisok tanulságai nincsenek rögzítve |

### 6.3 Ami a mi tervünkben JOBB mint a blox alap

| Terület | Miért jobb |
|---------|-----------|
| **i18n nyelvi minőség audit** (LANG-01–05) | A blox:check csak "brand voice"-t kér, mi ennél mélyebbre megyünk: magyartalan fordítások, tegezés/magázás konzisztencia, ékezetek |
| **Kategória konzisztencia** (CFG-03–05) | Cross-package konzisztencia ellenőrzés (validators ↔ config ↔ i18n ↔ UI) — a blox ezt nem kéri explicit |
| **Dead route detektálás** (LINK-04) | Hivatkozott de nem létező oldalak — ez proaktív, a blox csak létező linkeket ellenőriz |
| **Workflow logika audit** (FLOW-01–05) | User journey szintű logikai ellenőrzés — a blox inkább kód szinten gondolkodik |
| **Fájdalommentes bevezetés elve** (5. szekció) | Explicit garanciák hogy a tesztelés nem zavarja a fejlesztést — ez projektspecifikus bölcsesség |

### 6.4 Javasolt módosítások összefoglalása

**Azonnal beépítendő (Fázis 0-1 részeként):**
1. Quality Score formula bevezetése — `QUALITY_SCORE.md`
2. `describe/it` teszt struktúra minta definiálása
3. null/undefined edge case-ek hozzáadása a validator tesztekhez
4. AI attribúció check az audit scriptekhez

**Fázis 2-ben beépítendő:**
5. Security pattern scan (`check-security.ts`)
6. Accessibility részletezés (WCAG 2.1 AA szintű)
7. Pre-submission checklist (PR template-ként)
8. Cross-phase impact szabály

**Fázis 3-4-ben beépítendő:**
9. Performance anti-pattern audit
10. Brand voice consistency check
11. Coverage célok + per-file report
12. TECH_DEBT.md + bug reporting protokoll

### 6.5 Blox Quality Score a tervünkre

```
Kiindulás:                        100
H-01 Quality Score hiányzik:       -10 (CONCERN)
H-02 Severity assessment hiányzik: -10 (CONCERN)
H-03 Pre-submission checklist:     -10 (CONCERN)
H-06 Security scan hiányzik:       -10 (CONCERN)
H-07 A11y nem részletezett:        -10 (CONCERN)
H-11 Test struktúra minta:         -10 (CONCERN)
                                   ────
BECSÜLT SCORE:                     40/100 (Critical → Needs Work határán)
```

A terv alap struktúrája erős (piramis, fázisok, audit), de a blox:check domain minőségi ellenőrzéseket (security, a11y, performance, brand) és a formalizált scoring rendszert hiányolja.

A jó hír: ezek mind HOZZÁADHATÓK anélkül, hogy a meglévő tervet újra kellene írni — csak kiegészítések kellenek.

---

*Utolsó frissítés: 2026-03-22*
