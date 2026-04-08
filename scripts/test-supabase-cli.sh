#!/bin/bash
set -euo pipefail
echo "=== Test: Supabase CLI in Container ==="

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="test-supabase-$$"

WORKTREE_DIR="$REPO_DIR/.sandcastle/worktrees/test-sb-$$"
git -C "$REPO_DIR" worktree add -b "test/sb-$$" "$WORKTREE_DIR" HEAD

cleanup() {
  docker rm -f "$CONTAINER" 2>/dev/null || true
  git -C "$REPO_DIR" worktree remove --force "$WORKTREE_DIR" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "test/sb-$$" 2>/dev/null || true
  git -C "$REPO_DIR" worktree prune 2>/dev/null || true
}
trap cleanup EXIT

docker run -d --name "$CONTAINER" \
  -v "$WORKTREE_DIR:/home/agent/workspace" \
  -v "$REPO_DIR/.git:$REPO_DIR/.git" \
  -w /home/agent/workspace \
  sandcastle:ralph-test-harness

sleep 3

# Check 1: supabase CLI exists
SB_VER=$(docker exec "$CONTAINER" supabase --version 2>&1 || echo "NOT FOUND")
echo "  Supabase version: $SB_VER"
if echo "$SB_VER" | grep -qE "supabase|version|[0-9]+\.[0-9]+\.[0-9]+"; then
  echo "  PASS: supabase CLI installed"
else
  echo "  FAIL: supabase CLI not found"
  exit 1
fi

echo ""
echo "=== Test PASSED: Supabase CLI in Container ==="
