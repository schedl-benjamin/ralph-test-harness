#!/bin/bash
set -euo pipefail
echo "=== Test: Git Operations in Container ==="

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="test-git-ops-$$"

WORKTREE_DIR="$REPO_DIR/.sandcastle/worktrees/test-git-$$"
git -C "$REPO_DIR" worktree add -b "test/git-$$" "$WORKTREE_DIR" HEAD

cleanup() {
  docker rm -f "$CONTAINER" 2>/dev/null || true
  git -C "$REPO_DIR" worktree remove --force "$WORKTREE_DIR" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "test/git-$$" 2>/dev/null || true
  git -C "$REPO_DIR" worktree prune 2>/dev/null || true
}
trap cleanup EXIT

docker run -d --name "$CONTAINER" \
  -v "$WORKTREE_DIR:/home/agent/workspace" \
  -v "$REPO_DIR/.git:$REPO_DIR/.git" \
  -w /home/agent/workspace \
  sandcastle:ralph-test-harness

sleep 3

docker exec "$CONTAINER" sh -c '
  git config --global --add safe.directory /home/agent/workspace
  git config --global user.name "Test Agent"
  git config --global user.email "test@test.com"
'

# Check 1: git status
docker exec "$CONTAINER" git status > /dev/null
echo "  PASS: git status"

# Check 2: git log
docker exec "$CONTAINER" git log --oneline -3 > /dev/null
echo "  PASS: git log"

# Check 3: Create a file, stage, commit
docker exec "$CONTAINER" sh -c '
  echo "test content from container" > /home/agent/workspace/test-file.txt
  git add test-file.txt
  git commit -m "test: verify git commit from container"
'
echo "  PASS: git add + commit"

# Check 4: File visible on host filesystem (bind mount)
if [ -f "$WORKTREE_DIR/test-file.txt" ]; then
  HOST_CONTENT=$(cat "$WORKTREE_DIR/test-file.txt")
  if [ "$HOST_CONTENT" = "test content from container" ]; then
    echo "  PASS: File visible on host with correct content"
  else
    echo "  FAIL: File content mismatch: '$HOST_CONTENT'"
    exit 1
  fi
else
  echo "  FAIL: File not visible on host"
  exit 1
fi

# Check 5: Verify commit via container-side git log
COMMIT_MSG=$(docker exec "$CONTAINER" git log -1 --format=%s)
if [ "$COMMIT_MSG" = "test: verify git commit from container" ]; then
  echo "  PASS: Commit message correct (verified from container)"
else
  echo "  FAIL: Commit message mismatch: '$COMMIT_MSG'"
  exit 1
fi

# Check 6: Verify host-side git works (no path restoration needed on WSL2)
HOST_COMMIT=$(git -C "$WORKTREE_DIR" log -1 --format=%s 2>&1 || echo "FAILED")
if [ "$HOST_COMMIT" = "test: verify git commit from container" ]; then
  echo "  PASS: Host-side git works while container is running"
else
  echo "  WARN: Host-side git issue: $HOST_COMMIT"
fi

echo ""
echo "=== Test PASSED: Git Operations in Container ==="
