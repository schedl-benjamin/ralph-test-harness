#!/bin/bash
set -uo pipefail

echo "============================================"
echo "  Ralph Test Harness — Component Tests"
echo "============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0
FAIL=0

run_test() {
  local name="$1"
  local script="$2"
  echo ""
  echo "--- Running: $name ---"
  if bash "$SCRIPT_DIR/$script"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "^^^ FAILED: $name ^^^"
  fi
}

run_test "Docker Boot + Path Conversion" "test-docker-boot.sh"
run_test "Git Operations in Container" "test-git-ops.sh"
run_test "GitHub CLI in Container" "test-gh-cli.sh"
run_test "Supabase CLI in Container" "test-supabase-cli.sh"
run_test "Path Restoration on Exit" "test-path-restore.sh"

echo ""
echo "============================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  echo "  Fix failures before running the full Ralph loop."
  exit 1
fi

echo "  All component tests passed!"
