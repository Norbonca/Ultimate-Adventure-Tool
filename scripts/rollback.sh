#!/bin/bash
# ============================================================================
# UAT Rollback Script
# Biztonságos visszaállítás egy korábbi session-höz
# Használat: ./scripts/rollback.sh <session-szám>
#            ./scripts/rollback.sh list          — összes snapshot listázása
#            ./scripts/rollback.sh backups       — backup mappák listázása
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

COMMAND="${1:-list}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

case "$COMMAND" in
  list)
    echo -e "${CYAN}═══ Git Session Tagek ═══${NC}"
    git tag -l "session-*" --sort=-version:refname | while read -r tag; do
      COMMIT=$(git rev-list -1 "$tag" | head -c 7)
      DATE=$(git tag -l "$tag" --format='%(creatordate:short)')
      MSG=$(git tag -l "$tag" --format='%(contents:subject)')
      echo -e "  ${GREEN}${tag}${NC} (${COMMIT}) — ${DATE} — ${MSG}"
    done
    echo ""
    echo -e "${CYAN}═══ Backup Mappák ═══${NC}"
    if [ -d "$REPO_ROOT/.backups" ]; then
      ls -dt "$REPO_ROOT/.backups"/*/ 2>/dev/null | head -10 | while read -r d; do
        NAME=$(basename "$d")
        SIZE=$(du -sh "$d" | cut -f1)
        echo -e "  📁 ${NAME} (${SIZE})"
      done
    else
      echo -e "  ${YELLOW}Nincs backup mappa${NC}"
    fi
    ;;

  backups)
    if [ -d "$REPO_ROOT/.backups" ]; then
      ls -dt "$REPO_ROOT/.backups"/*/ 2>/dev/null | while read -r d; do
        NAME=$(basename "$d")
        SIZE=$(du -sh "$d" | cut -f1)
        FILES=$(find "$d" -type f | wc -l)
        echo -e "  📁 ${GREEN}${NAME}${NC} — ${FILES} fájl, ${SIZE}"
        [ -f "$d/MANIFEST.txt" ] && grep "Git HEAD:" "$d/MANIFEST.txt" | sed 's/^/     /'
      done
    else
      echo -e "${YELLOW}Nincs backup mappa.${NC}"
    fi
    ;;

  session-*|[0-9]*)
    # Session szám normalizálás
    if [[ "$COMMAND" =~ ^[0-9]+$ ]]; then
      TAG="session-${COMMAND}"
    else
      TAG="$COMMAND"
    fi

    if ! git tag -l | grep -q "^${TAG}$"; then
      echo -e "${RED}❌ Tag '${TAG}' nem létezik!${NC}"
      echo -e "Elérhető tagek:"
      git tag -l "session-*" --sort=-version:refname
      exit 1
    fi

    echo -e "${RED}╔══════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ⚠️  ROLLBACK: ${TAG}                  ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════╝${NC}"
    echo ""

    # MINDIG backup ELŐBB
    echo -e "${YELLOW}[1/3] Mentés a jelenlegi állapotról...${NC}"
    bash "$REPO_ROOT/scripts/backup.sh" "pre-rollback-to-${TAG}"

    echo -e "${YELLOW}[2/3] Jelenlegi állapot commitolása (ha van változás)...${NC}"
    DIRTY=$(git status -s | wc -l)
    if [ "$DIRTY" -gt 0 ]; then
      git add -A
      git commit -m "auto-save: pre-rollback to ${TAG}" || true
    fi

    echo -e "${YELLOW}[3/3] Visszaállítás: ${TAG}...${NC}"
    # Új branch-et csinálunk, NEM destructive reset
    BRANCH="rollback-${TAG}-$(date +%s)"
    git checkout -b "$BRANCH" "$TAG"

    echo ""
    echo -e "${GREEN}✅ Visszaállítva: ${TAG}${NC}"
    echo -e "   Branch: ${BRANCH}"
    echo -e "   Az eredeti main branch érintetlen maradt."
    echo -e ""
    echo -e "${CYAN}Ha az eredeti állapothoz akarsz visszatérni:${NC}"
    echo -e "  git checkout main"
    ;;

  *)
    echo -e "${RED}Ismeretlen parancs: ${COMMAND}${NC}"
    echo ""
    echo "Használat:"
    echo "  ./scripts/rollback.sh list           — tagek + backupok listázása"
    echo "  ./scripts/rollback.sh backups        — részletes backup lista"
    echo "  ./scripts/rollback.sh <session-szám> — visszaállítás session-höz"
    echo "  ./scripts/rollback.sh session-15     — visszaállítás tag alapján"
    exit 1
    ;;
esac
