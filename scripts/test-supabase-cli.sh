#!/bin/bash
set -euo pipefail
echo "=== Test: Supabase CLI in Container ==="

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="test-supabase-$$"

to_docker_vol() {
  echo "$1" | sed -E 's|^([A-Za-z]):|/\L\1|' | sed 's|\\|/|g'
}

WORKTREE_DIR="$REPO_DIR/.sandcastle/worktrees/test-sb-$$"
git -C "$REPO_DIR" worktree add -b "test/sb-$$" "$WORKTREE_DIR" HEAD

DOCKER_WORKTREE=$(to_docker_vol "$WORKTREE_DIR")
DOCKER_GIT=$(to_docker_vol "$REPO_DIR/.git")

cleanup() {
  MSYS_NO_PATHCONV=1 docker rm -f "$CONTAINER" 2>/dev/null || true
  git -C "$REPO_DIR" worktree remove --force "$WORKTREE_DIR" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "test/sb-$$" 2>/dev/null || true
  git -C "$REPO_DIR" worktree prune 2>/dev/null || true
}
trap cleanup EXIT

MSYS_NO_PATHCONV=1 docker run -d --name "$CONTAINER" \
  -v "$DOCKER_WORKTREE:/home/agent/workspace" \
  -v "$DOCKER_GIT:$DOCKER_GIT" \
  -w /home/agent/workspace \
  sandcastle:ralph-test-harness

sleep 3

# Check 1: supabase CLI exists
SB_VER=$(MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" supabase --version 2>&1 || echo "NOT FOUND")
echo "  Supabase version: $SB_VER"
if echo "$SB_VER" | grep -qi "supabase\|version"; then
  echo "  PASS: supabase CLI installed"
else
  echo "  FAIL: supabase CLI not found"
  exit 1
fi

echo ""
echo "=== Test PASSED: Supabase CLI in Container ==="
