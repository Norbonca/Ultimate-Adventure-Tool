#!/usr/bin/env bash
# ===========================================
# Ultimate Adventure Tool — Local Dev Setup
# ===========================================
# Futtatás: chmod +x scripts/setup-local-dev.sh && ./scripts/setup-local-dev.sh
#
# Ez a script:
# 1. Ellenőrzi az előfeltételeket (Docker, Supabase CLI, pnpm)
# 2. Létrehozza a .env.local fájlt (ha nincs)
# 3. Elindítja a local Supabase-t (Docker)
# 4. Lefuttatja a migration-öket
# 5. Telepíti a dependenciákat

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }
info() { echo -e "${BLUE}ℹ${NC} $1"; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Ultimate Adventure Tool — Local Setup   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ─── 1. Előfeltételek ───────────────────────────

info "Előfeltételek ellenőrzése..."

# Docker
if ! command -v docker &> /dev/null; then
  err "Docker nincs telepítve!
  → macOS: https://docs.docker.com/desktop/install/mac-install/
  → Windows: https://docs.docker.com/desktop/install/windows-install/
  → Linux: https://docs.docker.com/engine/install/"
fi

if ! docker info &> /dev/null 2>&1; then
  err "Docker Desktop nem fut! Indítsd el, majd próbáld újra."
fi
log "Docker OK"

# Supabase CLI
if ! command -v supabase &> /dev/null; then
  warn "Supabase CLI nincs telepítve. Telepítés..."

  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &> /dev/null; then
      brew install supabase/tap/supabase
    else
      err "Homebrew szükséges macOS-en. Telepítsd: https://brew.sh"
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux: npx-szel is megy, de jobb a natív
    if command -v brew &> /dev/null; then
      brew install supabase/tap/supabase
    else
      warn "npx supabase-t fogunk használni (lassabb, de működik)"
      SUPABASE_CMD="npx supabase"
    fi
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash / WSL)
    if command -v scoop &> /dev/null; then
      scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
      scoop install supabase
    else
      err "Scoop szükséges Windows-on. Telepítsd: https://scoop.sh
      Vagy használd WSL-t: brew install supabase/tap/supabase"
    fi
  fi
fi

SUPABASE_CMD="${SUPABASE_CMD:-supabase}"
log "Supabase CLI OK"

# pnpm
if ! command -v pnpm &> /dev/null; then
  warn "pnpm nincs telepítve. Telepítés..."
  npm install -g pnpm@9
fi
log "pnpm OK"

# Node version check
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  err "Node.js 20+ szükséges! Jelenlegi: $(node -v)"
fi
log "Node.js $(node -v) OK"

# ─── 2. .env.local ──────────────────────────────

if [ ! -f .env.local ]; then
  info ".env.local létrehozása..."
  cp .env.local.example .env.local
  log ".env.local létrehozva (.env.local.example alapján)"
else
  log ".env.local már létezik"
fi

# ─── 3. Supabase indítás ────────────────────────

info "Local Supabase indítása (ez első alkalommal 2-5 perc)..."

$SUPABASE_CMD start 2>&1 | tail -20

echo ""
log "Supabase fut! Szolgáltatások:"
echo ""
echo -e "  ${GREEN}API:${NC}        http://localhost:55321"
echo -e "  ${GREEN}DB:${NC}         postgresql://postgres:postgres@localhost:55322/postgres"
echo -e "  ${GREEN}Studio:${NC}     http://localhost:55323"
echo -e "  ${GREEN}Inbucket:${NC}   http://localhost:55324 (fake email)"
echo ""

# ─── 4. Migration-ök futtatása ───────────────────

info "Migration-ök futtatása..."

$SUPABASE_CMD db reset --no-seed 2>&1 || true

# Migration-ök egyenként (ha a reset nem kezeli)
for migration in supabase/migrations/*.sql; do
  if [ -f "$migration" ]; then
    filename=$(basename "$migration")
    info "Futtatás: $filename"
    $SUPABASE_CMD db execute --file "$migration" 2>/dev/null || warn "Már lefutott vagy hiba: $filename"
  fi
done

log "Migration-ök kész!"

# ─── 5. Dependenciák ────────────────────────────

info "pnpm install..."
pnpm install

log "Minden telepítve!"

# ─── 6. Összefoglaló ────────────────────────────

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Setup kész! Indítás:              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}Fejlesztés:${NC}   pnpm dev"
echo -e "  ${BLUE}DB Studio:${NC}    http://localhost:55323"
echo -e "  ${BLUE}Fake email:${NC}   http://localhost:55324"
echo -e "  ${BLUE}App:${NC}          http://localhost:3000"
echo ""
echo -e "  ${YELLOW}Leállítás:${NC}    supabase stop"
echo -e "  ${YELLOW}DB reset:${NC}     supabase db reset"
echo -e "  ${YELLOW}DB Studio:${NC}    pnpm db:studio"
echo ""
