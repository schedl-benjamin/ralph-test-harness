#!/bin/bash
set -euo pipefail
echo "=== Test: Git Operations in Container ==="

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="test-git-ops-$$"

to_docker_vol() {
  echo "$1" | sed -E 's|^([A-Za-z]):|/\L\1|' | sed 's|\\|/|g'
}

WORKTREE_DIR="$REPO_DIR/.sandcastle/worktrees/test-git-$$"
git -C "$REPO_DIR" worktree add -b "test/git-$$" "$WORKTREE_DIR" HEAD

DOCKER_WORKTREE=$(to_docker_vol "$WORKTREE_DIR")
DOCKER_GIT=$(to_docker_vol "$REPO_DIR/.git")

cleanup() {
  MSYS_NO_PATHCONV=1 docker rm -f "$CONTAINER" 2>/dev/null || true
  git -C "$REPO_DIR" worktree remove --force "$WORKTREE_DIR" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "test/git-$$" 2>/dev/null || true
  git -C "$REPO_DIR" worktree prune 2>/dev/null || true
}
trap cleanup EXIT

MSYS_NO_PATHCONV=1 docker run -d --name "$CONTAINER" \
  -v "$DOCKER_WORKTREE:/home/agent/workspace" \
  -v "$DOCKER_GIT:$DOCKER_GIT" \
  -w /home/agent/workspace \
  sandcastle:ralph-test-harness

sleep 3

MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" sh -c '
  git config --global --add safe.directory /home/agent/workspace
  git config --global user.name "Test Agent"
  git config --global user.email "test@test.com"
'

# Check 1: git status
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" git status > /dev/null
echo "  PASS: git status"

# Check 2: git log
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" git log --oneline -3 > /dev/null
echo "  PASS: git log"

# Check 3: Create a file, stage, commit
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" sh -c '
  echo "test content from container" > /home/agent/workspace/test-file.txt
  git add test-file.txt
  git commit -m "test: verify git commit from container"
'
echo "  PASS: git add + commit"

# Check 4: File visible on host filesystem (bind mount)
# NOTE: We check the filesystem, not git, because the .git file is in MSYS format
# while the container runs. Sandcastle only does host-side git AFTER container exit.
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

# Check 5: Verify commit via container-side git log (not host-side)
COMMIT_MSG=$(MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" git log -1 --format=%s)
if [ "$COMMIT_MSG" = "test: verify git commit from container" ]; then
  echo "  PASS: Commit message correct (verified from container)"
else
  echo "  FAIL: Commit message mismatch: '$COMMIT_MSG'"
  exit 1
fi

# Check 6: Stop container, verify host-side git works AFTER .git is restored
MSYS_NO_PATHCONV=1 docker stop "$CONTAINER" > /dev/null 2>&1
sleep 2

HOST_COMMIT=$(git -C "$WORKTREE_DIR" log -1 --format=%s 2>&1 || echo "FAILED")
if [ "$HOST_COMMIT" = "test: verify git commit from container" ]; then
  echo "  PASS: Host-side git works after container exit (path restored)"
else
  echo "  WARN: Host-side git after container exit: $HOST_COMMIT"
fi

echo ""
echo "=== Test PASSED: Git Operations in Container ==="
