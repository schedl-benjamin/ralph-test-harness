#!/bin/bash
set -euo pipefail
echo "=== Test: GitHub CLI in Container ==="

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="test-gh-cli-$$"

WORKTREE_DIR="$REPO_DIR/.sandcastle/worktrees/test-gh-$$"
git -C "$REPO_DIR" worktree add -b "test/gh-$$" "$WORKTREE_DIR" HEAD

# Read GH_TOKEN from .sandcastle/.env
GH_TOKEN=$(grep '^GH_TOKEN=' "$REPO_DIR/.sandcastle/.env" | cut -d= -f2)

cleanup() {
  docker rm -f "$CONTAINER" 2>/dev/null || true
  git -C "$REPO_DIR" worktree remove --force "$WORKTREE_DIR" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "test/gh-$$" 2>/dev/null || true
  git -C "$REPO_DIR" worktree prune 2>/dev/null || true
}
trap cleanup EXIT

docker run -d --name "$CONTAINER" \
  -e "GH_TOKEN=$GH_TOKEN" \
  -v "$WORKTREE_DIR:/home/agent/workspace" \
  -v "$REPO_DIR/.git:$REPO_DIR/.git" \
  -w /home/agent/workspace \
  sandcastle:ralph-test-harness

sleep 3

# Check 1: gh CLI installed
docker exec "$CONTAINER" gh --version > /dev/null
echo "  PASS: gh CLI installed"

# Check 2: gh auth status
AUTH_OUT=$(docker exec "$CONTAINER" gh auth status 2>&1 || true)
if echo "$AUTH_OUT" | grep -qi "logged in"; then
  echo "  PASS: gh authenticated"
else
  echo "  WARN: gh auth unclear — trying issue list anyway"
fi

# Check 3: List issues from the test repo (empty list is valid — just verifies the query runs)
ISSUES=$(docker exec "$CONTAINER" gh issue list --repo schedl-benjamin/ralph-test-harness --label Sandcastle --state open --json number,title 2>&1)
echo "  Issues: $ISSUES"
if echo "$ISSUES" | grep -qE '^\['; then
  echo "  PASS: gh issue list returns valid JSON"
else
  echo "  FAIL: gh issue list failed: $ISSUES"
  exit 1
fi

echo ""
echo "=== Test PASSED: GitHub CLI in Container ==="
