#!/usr/bin/env bash
# scripts/run-all-tests.sh
#
# Orchestrator: runs every Trevu QA skill in sequence.
#
# Usage:
#   ./scripts/run-all-tests.sh                       # full run
#   ./scripts/run-all-tests.sh --quick               # static + unit only (no browser, no build)
#   ./scripts/run-all-tests.sh --consistency-only    # only consistency skills
#   ./scripts/run-all-tests.sh --skip e2e,usability  # skip listed
#
# Compatible with bash 3.2 (macOS default — no associative arrays).
# Exit code 0 if all skills pass, 1 if any fail.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="$(cd "$ROOT/.." && pwd)"
cd "$PROJECT_ROOT"

QUICK=false
CONSISTENCY_ONLY=false
SKIP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick) QUICK=true ;;
    --consistency-only) CONSISTENCY_ONLY=true ;;
    --skip) SKIP="$2"; shift ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *) echo "Unknown arg: $1"; exit 2 ;;
  esac
  shift
done

skip_has() {
  case ",$SKIP," in
    *",$1,"*) return 0 ;;
    *) return 1 ;;
  esac
}

# Parallel arrays (bash 3.2 compatible — no associative arrays)
SKILL_NAMES=(
  "doc-consistency"
  "plan-consistency"
  "code-consistency"
  "code-quality"
  "dev-functional"
  "user-flow"
  "usability"
)
SKILL_SCRIPTS=(
  ".skills/trevu-doc-consistency/scripts/run-all.mjs"
  ".skills/trevu-plan-consistency/scripts/run-all.mjs"
  ".skills/trevu-code-consistency/scripts/run-all.mjs"
  ".skills/trevu-code-quality/scripts/run-all.mjs"
  ".skills/trevu-dev-functional/scripts/run-all.mjs"
  ".skills/trevu-user-flow/scripts/run-all.mjs"
  ".skills/trevu-usability/scripts/run-all.mjs"
)
RESULT_NAMES=()
RESULT_STATUSES=()

echo
echo "==============================================="
if [ "$QUICK" = true ]; then
  MODE_LABEL="QUICK"
elif [ "$CONSISTENCY_ONLY" = true ]; then
  MODE_LABEL="CONSISTENCY-ONLY"
else
  MODE_LABEL="FULL"
fi
echo "  Trevu QA Orchestrator"
echo "  Mode: $MODE_LABEL"
echo "  Skip: ${SKIP:-(none)}"
echo "==============================================="

START_TS=$(date +%s)
INDEX=0
for name in "${SKILL_NAMES[@]}"; do
  script="${SKILL_SCRIPTS[$INDEX]}"
  INDEX=$((INDEX + 1))

  RESULT_NAMES+=("$name")

  if skip_has "$name"; then
    RESULT_STATUSES+=("skipped")
    continue
  fi
  if [ "$CONSISTENCY_ONLY" = true ]; then
    case "$name" in
      *consistency*) ;;
      *) RESULT_STATUSES+=("skipped"); continue ;;
    esac
  fi
  if [ "$QUICK" = true ]; then
    case "$name" in
      user-flow|usability) RESULT_STATUSES+=("skipped"); continue ;;
    esac
  fi

  echo
  echo "─── $name ───"

  # Build extra args for quick mode
  EXTRA_ARG=""
  if [ "$QUICK" = true ]; then
    case "$name" in
      code-quality)   EXTRA_ARG="--no-bundle" ;;
      dev-functional) EXTRA_ARG="--no-flaky" ;;
      usability)      EXTRA_ARG="--no-browser" ;;
    esac
  fi

  if [ -n "$EXTRA_ARG" ]; then
    if node "$script" "$EXTRA_ARG"; then
      RESULT_STATUSES+=("✅")
    else
      RESULT_STATUSES+=("❌")
    fi
  else
    if node "$script"; then
      RESULT_STATUSES+=("✅")
    else
      RESULT_STATUSES+=("❌")
    fi
  fi
done

END_TS=$(date +%s)
DURATION=$((END_TS - START_TS))

echo
echo "==============================================="
echo "  Trevu QA Summary  (${DURATION}s)"
echo "==============================================="
FAILED=0
i=0
for name in "${RESULT_NAMES[@]}"; do
  status="${RESULT_STATUSES[$i]}"
  i=$((i + 1))
  printf "  %-22s  %s\n" "$name" "$status"
  if [ "$status" = "❌" ]; then FAILED=$((FAILED + 1)); fi
done
echo

if [ "$FAILED" -eq 0 ]; then
  echo "✅ Minden skill zöld."
  exit 0
else
  echo "❌ $FAILED skill hibázott — a megfelelő *_LOG.md frissítendő."
  echo "   Master kollátor: node Ultimate-Adventure-Tool/scripts/qa-report.mjs --write"
  exit 1
fi
