#!/bin/bash
set -euo pipefail
echo "=== Test: GitHub CLI in Container ==="

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="test-gh-cli-$$"

to_docker_vol() {
  echo "$1" | sed -E 's|^([A-Za-z]):|/\L\1|' | sed 's|\\|/|g'
}

WORKTREE_DIR="$REPO_DIR/.sandcastle/worktrees/test-gh-$$"
git -C "$REPO_DIR" worktree add -b "test/gh-$$" "$WORKTREE_DIR" HEAD

DOCKER_WORKTREE=$(to_docker_vol "$WORKTREE_DIR")
DOCKER_GIT=$(to_docker_vol "$REPO_DIR/.git")

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
  -v "$DOCKER_WORKTREE:/home/agent/workspace" \
  -v "$DOCKER_GIT:$DOCKER_GIT" \
  -w /home/agent/workspace \
  sandcastle:ralph-test-harness

sleep 3

# Check 1: gh CLI installed
docker exec "$CONTAINER" gh --version > /dev/null
echo "  PASS: gh CLI installed"

# Check 2: gh auth status
AUTH_OUT=$(docker exec "$CONTAINER" gh auth status 2>&1 || true)
echo "  gh auth: $AUTH_OUT"
if echo "$AUTH_OUT" | grep -qi "logged in"; then
  echo "  PASS: gh authenticated"
else
  echo "  WARN: gh auth status unclear (may still work via GH_TOKEN)"
fi

# Check 3: List issues from the test repo
ISSUES=$(docker exec "$CONTAINER" gh issue list --repo schedl-benjamin/ralph-test-harness --label Sandcastle --state open --json number,title 2>&1)
echo "  Issues: $ISSUES"
if echo "$ISSUES" | grep -q "number"; then
  echo "  PASS: gh issue list returns issues"
elif echo "$ISSUES" | grep -q '\[\]'; then
  echo "  PASS: gh issue list works (no issues yet — expected before issue creation)"
else
  echo "  FAIL: gh issue list failed"
  exit 1
fi

echo ""
echo "=== Test PASSED: GitHub CLI in Container ==="
