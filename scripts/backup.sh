#!/bin/bash
# ============================================================================
# UAT Module Backup Script
# Modulonkénti + kritikus fájlok snapshot mentése
# Használat: ./scripts/backup.sh [label]
# Példa:    ./scripts/backup.sh "before-profile-refactor"
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_ROOT="$REPO_ROOT/.backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LABEL="${1:-manual}"
BACKUP_DIR="$BACKUP_ROOT/${TIMESTAMP}_${LABEL}"

# Színek
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  UAT Backup — ${TIMESTAMP}  ║${NC}"
echo -e "${GREEN}║  Label: ${LABEL}${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"

mkdir -p "$BACKUP_DIR"

# --- 1. Kritikus konfigurációs fájlok ---
echo -e "${YELLOW}[1/5] Konfiguráció mentése...${NC}"
CONF_DIR="$BACKUP_DIR/config"
mkdir -p "$CONF_DIR"
for f in package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json .env.example; do
  [ -f "$REPO_ROOT/$f" ] && cp "$REPO_ROOT/$f" "$CONF_DIR/"
done
[ -f "$REPO_ROOT/apps/web/package.json" ] && cp "$REPO_ROOT/apps/web/package.json" "$CONF_DIR/web-package.json"
[ -f "$REPO_ROOT/apps/web/next.config.ts" ] && cp "$REPO_ROOT/apps/web/next.config.ts" "$CONF_DIR/"
[ -f "$REPO_ROOT/apps/web/middleware.ts" ] && cp "$REPO_ROOT/apps/web/middleware.ts" "$CONF_DIR/"

# --- 2. DB Migrations (teljes) ---
echo -e "${YELLOW}[2/5] Migrations mentése...${NC}"
if [ -d "$REPO_ROOT/supabase/migrations" ]; then
  mkdir -p "$BACKUP_DIR/migrations"
  cp -r "$REPO_ROOT/supabase/migrations/"* "$BACKUP_DIR/migrations/" 2>/dev/null || true
fi

# --- 3. Drizzle sémák ---
echo -e "${YELLOW}[3/5] Drizzle sémák mentése...${NC}"
if [ -d "$REPO_ROOT/packages/db/src/schema" ]; then
  mkdir -p "$BACKUP_DIR/drizzle-schema"
  cp -r "$REPO_ROOT/packages/db/src/schema/"* "$BACKUP_DIR/drizzle-schema/" 2>/dev/null || true
fi

# --- 4. i18n nyelvi fájlok ---
echo -e "${YELLOW}[4/5] i18n fájlok mentése...${NC}"
I18N_DIR="$BACKUP_DIR/i18n"
mkdir -p "$I18N_DIR"
[ -f "$REPO_ROOT/packages/i18n/src/hu.ts" ] && cp "$REPO_ROOT/packages/i18n/src/hu.ts" "$I18N_DIR/"
[ -f "$REPO_ROOT/packages/i18n/src/en.ts" ] && cp "$REPO_ROOT/packages/i18n/src/en.ts" "$I18N_DIR/"

# --- 5. Oldalak (page.tsx fájlok) ---
echo -e "${YELLOW}[5/5] Page componentek mentése...${NC}"
PAGES_DIR="$BACKUP_DIR/pages"
mkdir -p "$PAGES_DIR"
cd "$REPO_ROOT"
find apps/web/app -name "page.tsx" -o -name "layout.tsx" | while read -r f; do
  DEST_DIR="$PAGES_DIR/$(dirname "$f")"
  mkdir -p "$DEST_DIR"
  cp "$f" "$DEST_DIR/"
done

# --- 6. Components ---
if [ -d "$REPO_ROOT/apps/web/components" ]; then
  mkdir -p "$BACKUP_DIR/components"
  cp -r "$REPO_ROOT/apps/web/components/"* "$BACKUP_DIR/components/" 2>/dev/null || true
fi

# --- 7. Server actions ---
ACTIONS_DIR="$BACKUP_DIR/actions"
mkdir -p "$ACTIONS_DIR"
find apps/web/app -name "actions.ts" | while read -r f; do
  DEST_DIR="$ACTIONS_DIR/$(dirname "$f")"
  mkdir -p "$DEST_DIR"
  cp "$f" "$DEST_DIR/"
done

# --- Összesítés ---
FILE_COUNT=$(find "$BACKUP_DIR" -type f | wc -l)
SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

# Manifest írása
cat > "$BACKUP_DIR/MANIFEST.txt" << EOF
UAT Backup Manifest
====================
Timestamp: $TIMESTAMP
Label:     $LABEL
Files:     $FILE_COUNT
Size:      $SIZE
Git HEAD:  $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")
Git dirty: $(git status -s 2>/dev/null | wc -l) files

Contents:
- config/        — package.json, next.config, middleware, tsconfig
- migrations/    — Supabase SQL migrations (teljes)
- drizzle-schema/ — Drizzle ORM séma fájlok
- i18n/          — hu.ts + en.ts nyelvi fájlok
- pages/         — Minden page.tsx + layout.tsx
- components/    — Közös componentek
- actions/       — Server action fájlok
EOF

echo ""
echo -e "${GREEN}✅ Backup kész!${NC}"
echo -e "   📁 ${BACKUP_DIR}"
echo -e "   📄 ${FILE_COUNT} fájl, ${SIZE}"
echo ""

# Régi backupok takarítása (max 20 megtartása)
BACKUP_COUNT=$(ls -d "$BACKUP_ROOT"/*/ 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 20 ]; then
  echo -e "${YELLOW}🧹 Régi backupok törlése (20-nál több van: $BACKUP_COUNT)...${NC}"
  ls -dt "$BACKUP_ROOT"/*/ | tail -n +21 | xargs rm -rf
  echo -e "${GREEN}   Megőrizve: 20 legutóbbi${NC}"
fi
