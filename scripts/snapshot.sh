#!/bin/bash
# ============================================================================
# UAT Session Snapshot Script
# Git commit + tag + backup egy lépésben
# Használat: ./scripts/snapshot.sh <session-szám> "<leírás>"
# Példa:    ./scripts/snapshot.sh 16 "Verziókezelés bevezetése"
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

SESSION="${1:-}"
MSG="${2:-}"

# Színek
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ -z "$SESSION" ] || [ -z "$MSG" ]; then
  echo -e "${RED}Használat: ./scripts/snapshot.sh <session-szám> \"<leírás>\"${NC}"
  echo -e "Példa:    ./scripts/snapshot.sh 16 \"Verziókezelés bevezetése\""
  exit 1
fi

TAG="session-${SESSION}"
DATE=$(date +"%Y-%m-%d %H:%M")

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  UAT Session Snapshot — S${SESSION}        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"

# --- 1. Backup ELŐBB ---
echo -e "${YELLOW}[1/4] Backup készítése snapshot előtt...${NC}"
bash "$REPO_ROOT/scripts/backup.sh" "pre-S${SESSION}"

# --- 2. Git status ---
echo -e "${YELLOW}[2/4] Git állapot...${NC}"
DIRTY=$(git status -s | wc -l)
echo -e "   Módosított/új fájlok: ${DIRTY}"

if [ "$DIRTY" -eq 0 ]; then
  echo -e "${GREEN}   Nincs változás — csak tag készül.${NC}"
else
  # --- 3. Stage + Commit ---
  echo -e "${YELLOW}[3/4] Git commit...${NC}"
  git add -A
  git commit -m "session(S${SESSION}): ${MSG}

Session: S${SESSION}
Date: ${DATE}
Files changed: ${DIRTY}"
  echo -e "${GREEN}   ✅ Commit kész${NC}"
fi

# --- 4. Tag ---
echo -e "${YELLOW}[4/4] Git tag: ${TAG}...${NC}"
if git tag -l | grep -q "^${TAG}$"; then
  echo -e "${YELLOW}   ⚠️  Tag '${TAG}' már létezik — kihagyva${NC}"
else
  git tag -a "$TAG" -m "Session ${SESSION}: ${MSG} (${DATE})"
  echo -e "${GREEN}   ✅ Tag '${TAG}' létrehozva${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Snapshot kész!                       ║${NC}"
echo -e "${GREEN}║  Commit: $(git rev-parse --short HEAD)                       ║${NC}"
echo -e "${GREEN}║  Tag:    ${TAG}                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Rollback ehhez a ponthoz:${NC}"
echo -e "  git checkout ${TAG}"
echo -e "  # vagy: git reset --hard ${TAG}"
