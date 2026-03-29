# Local Dev Environment Guide

> Projekt-specifikus portok: **55xxx** (más projektek használhatják az alap 54xxx-et)

---

## Első telepítés (egyszer kell)

### 1. Docker Desktop telepítése

- **macOS:** https://docs.docker.com/desktop/install/mac-install/
- **Windows:** https://docs.docker.com/desktop/install/windows-install/
- **Linux:** https://docs.docker.com/engine/install/

Telepítés után indítsd el a Docker Desktop-ot.

### 2. Supabase CLI telepítése

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux (Homebrew)
brew install supabase/tap/supabase

# Alternatíva: npx (bármilyen OS, de lassabb)
npx supabase --version
```

### 3. Automatikus setup

```bash
cd Ultimate-Adventure-Tool
pnpm local:setup
```

Ez elvégzi az összeset: env fájl, Supabase indítás, migration-ök, pnpm install.

### Vagy kézzel:

```bash
cp .env.local.example .env.local
supabase start          # Első alkalommal 2-5 perc (Docker image-ek)
pnpm install
pnpm dev                # → http://localhost:3000
```

---

## Napi használat

```bash
# Reggel: Supabase indítás + fejlesztés
pnpm local:start
pnpm dev

# Este: leállítás
pnpm local:stop
```

---

## Hasznos URL-ek (lokális)

| Szolgáltatás | URL | Mire jó |
|---|---|---|
| **App** | http://localhost:3000 | Next.js frontend |
| **Supabase Studio** | http://localhost:55323 | DB böngésző / tábla editor |
| **Inbucket** | http://localhost:55324 | Fake email (regisztráció tesztelés) |
| **API** | http://localhost:55321 | Supabase REST API |
| **DB direkt** | `localhost:55322` | PostgreSQL (user: postgres, pw: postgres) |

---

## Port térkép (több projekt kezeléséhez)

| Projekt | API | DB | Studio | Inbucket SMTP |
|---|---|---|---|---|
| **UAT (ez)** | 55321 | 55322 | 55323 | 55325 |
| Projekt 2 | 56321 | 56322 | 56323 | 56325 |
| Projekt 3 | 57321 | 57322 | 57323 | 57325 |
| (Supabase default) | 54321 | 54322 | 54323 | 54325 |

---

## DB parancsok

```bash
pnpm local:reset        # DB törlés + összes migration újrafuttatás
pnpm local:status       # Futó szolgáltatások listája
pnpm db:studio          # Drizzle Studio (alternatív DB néző)
pnpm db:generate        # Drizzle migration generálás
pnpm db:push            # Schema push (PRODUCTION — óvatosan!)
```

---

## Migration workflow (local)

```bash
# 1. Új migration fájl létrehozása
supabase migration new my_feature_name
# → supabase/migrations/YYYYMMDDHHMMSS_my_feature_name.sql

# 2. SQL megírása a fájlban

# 3. Tesztelés lokálban
supabase db reset       # Nulláról újraépíti az egészet

# 4. Ha jó: commit + push → Vercel deploy
# 5. Production-ön: supabase db push (vagy manuális SQL)
```

---

## Local vs Production

| | Local | Production |
|---|---|---|
| DB | Docker PostgreSQL (localhost:55322) | Supabase Cloud (Frankfurt) |
| Auth | Local Supabase Auth (nincs valódi email) | Supabase Auth + Google OAuth |
| Email | Inbucket (http://localhost:55324) | Resend.com (később) |
| Storage | Local Docker volume | Supabase Storage |
| URL | http://localhost:3000 | https://ttvk.hu |
| Deploy | Automatikus (pnpm dev) | Git push main → Vercel |

---

## Troubleshooting

**"port already in use"** → Másik projekt Supabase-e fut. Állítsd le: `supabase stop` a másik projektben.

**"Docker is not running"** → Indítsd el a Docker Desktop-ot.

**"migration failed"** → `supabase db reset` — nulláról újraépíti.

**Lassú első indítás** → Normális, a Docker image-eket tölti. Utána pillanatok alatt indul.
