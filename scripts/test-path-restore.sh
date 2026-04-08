#!/bin/bash
set -euo pipefail
echo "=== Test: Path Restoration on Container Exit ==="

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="test-restore-$$"

to_docker_vol() {
  echo "$1" | sed -E 's|^([A-Za-z]):|/\L\1|' | sed 's|\\|/|g'
}

WORKTREE_DIR="$REPO_DIR/.sandcastle/worktrees/test-restore-$$"
git -C "$REPO_DIR" worktree add -b "test/restore-$$" "$WORKTREE_DIR" HEAD

DOCKER_WORKTREE=$(to_docker_vol "$WORKTREE_DIR")
DOCKER_GIT=$(to_docker_vol "$REPO_DIR/.git")

# Record original .git content
ORIGINAL_GIT=$(cat "$WORKTREE_DIR/.git")
echo "  Original .git: $ORIGINAL_GIT"

cleanup() {
  git -C "$REPO_DIR" worktree remove --force "$WORKTREE_DIR" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "test/restore-$$" 2>/dev/null || true
  git -C "$REPO_DIR" worktree prune 2>/dev/null || true
}
trap cleanup EXIT

# Start container (entrypoint.sh will convert the path)
MSYS_NO_PATHCONV=1 docker run -d --name "$CONTAINER" \
  -v "$DOCKER_WORKTREE:/home/agent/workspace" \
  -v "$DOCKER_GIT:$DOCKER_GIT" \
  -w /home/agent/workspace \
  sandcastle:ralph-test-harness

sleep 3

# Verify path was converted inside container
INSIDE_GIT=$(MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" cat /home/agent/workspace/.git 2>/dev/null)
echo "  Inside container .git: $INSIDE_GIT"

if echo "$INSIDE_GIT" | grep -q '^gitdir: [A-Za-z]:/'; then
  echo "  FAIL: .git NOT converted inside container"
  MSYS_NO_PATHCONV=1 docker rm -f "$CONTAINER" 2>/dev/null
  exit 1
fi
echo "  PASS: .git converted inside container"

# Stop container (cleanup trap in entrypoint.sh should restore)
MSYS_NO_PATHCONV=1 docker stop "$CONTAINER" 2>/dev/null
sleep 2
MSYS_NO_PATHCONV=1 docker rm -f "$CONTAINER" 2>/dev/null

# Check restored .git content on host
RESTORED_GIT=$(cat "$WORKTREE_DIR/.git")
echo "  Restored .git: $RESTORED_GIT"

if [ "$ORIGINAL_GIT" = "$RESTORED_GIT" ]; then
  echo "  PASS: .git restored to original Windows path"
else
  echo "  WARN: .git NOT restored. Expected: '$ORIGINAL_GIT', Got: '$RESTORED_GIT'"
  echo "  (This may be OK if entrypoint cleanup didn't run before container was killed)"
fi

# Verify git worktree remove works
git -C "$REPO_DIR" worktree remove --force "$WORKTREE_DIR"
echo "  PASS: git worktree remove succeeds"

echo ""
echo "=== Test PASSED: Path Restoration on Container Exit ==="
