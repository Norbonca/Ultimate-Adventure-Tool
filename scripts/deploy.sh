#!/bin/bash
# ============================================================================
# UAT Deploy Script — teljes production deploy egy paranccsal
# Használat: ./scripts/deploy.sh
# Mit csinál:
#   1. git status ellenőrzés (clean kell legyen)
#   2. supabase db push (pending migrationök production-ra)
#   3. git push origin main (Vercel auto-deploy indul)
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  UAT Production Deploy${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# 1. Git status check
echo -e "\n${YELLOW}[1/3] Git status ellenőrzés...${NC}"
DIRTY=$(git status --porcelain 2>/dev/null | grep -v "^??" | head -1)
if [ -n "$DIRTY" ]; then
  echo -e "${RED}✗ Uncommitted változások vannak! Előbb commit.${NC}"
  git status --short
  exit 1
fi
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo -e "${RED}✗ Nem main branch-en vagy! (current: $BRANCH)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Git clean, main branch${NC}"

# 2. Migration ellenőrzés + push
echo -e "\n${YELLOW}[2/3] Supabase migration push...${NC}"
PENDING=$(supabase migration list 2>/dev/null | grep -v "Remote" | awk '{if ($1 != "" && $3 == "") print $1}' | head -5)
if [ -z "$PENDING" ]; then
  echo -e "${GREEN}✓ Nincs pending migration (production naprakész)${NC}"
else
  echo -e "${YELLOW}  Pending migrationök: $PENDING${NC}"
  supabase db push --yes
  echo -e "${GREEN}✓ Migrationök alkalmazva${NC}"
fi

# 3. Git push → Vercel deploy
echo -e "\n${YELLOW}[3/3] Git push → Vercel deploy indul...${NC}"
COMMIT=$(git log --oneline -1)
git push origin main
echo -e "${GREEN}✓ Pushed: $COMMIT${NC}"

echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Deploy kész! Vercel build folyamatban.${NC}"
echo -e "${GREEN}  DB + Kód egyszerre frissítve.${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "  Vercel: https://vercel.com/norbertjurancsik/ultimate-adventure-tool"
echo "  Éles:   https://ttvk.hu"
echo ""
