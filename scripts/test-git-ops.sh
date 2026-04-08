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
  docker rm -f "$CONTAINER" 2>/dev/null || true
  git -C "$REPO_DIR" worktree remove --force "$WORKTREE_DIR" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "test/git-$$" 2>/dev/null || true
  git -C "$REPO_DIR" worktree prune 2>/dev/null || true
}
trap cleanup EXIT

docker run -d --name "$CONTAINER" \
  -v "$DOCKER_WORKTREE:/home/agent/workspace" \
  -v "$DOCKER_GIT:$DOCKER_GIT" \
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

# Check 4: Verify commit exists on host
COMMIT_MSG=$(git -C "$WORKTREE_DIR" log -1 --format=%s)
if [ "$COMMIT_MSG" != "test: verify git commit from container" ]; then
  echo "  FAIL: Commit message mismatch on host: '$COMMIT_MSG'"
  exit 1
fi
echo "  PASS: Commit visible on host worktree"

# Check 5: File visible on host
if [ -f "$WORKTREE_DIR/test-file.txt" ]; then
  echo "  PASS: File visible on host filesystem"
else
  echo "  FAIL: File not visible on host"
  exit 1
fi

echo ""
echo "=== Test PASSED: Git Operations in Container ==="
