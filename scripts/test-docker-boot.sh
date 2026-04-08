#!/bin/bash
set -euo pipefail
echo "=== Test: Docker Container Boot ==="

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="test-docker-boot-$$"

# Create a temporary worktree
WORKTREE_DIR="$REPO_DIR/.sandcastle/worktrees/test-boot-$$"
git -C "$REPO_DIR" worktree add -b "test/boot-$$" "$WORKTREE_DIR" HEAD

cleanup() {
  docker rm -f "$CONTAINER" 2>/dev/null || true
  git -C "$REPO_DIR" worktree remove --force "$WORKTREE_DIR" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "test/boot-$$" 2>/dev/null || true
  git -C "$REPO_DIR" worktree prune 2>/dev/null || true
}
trap cleanup EXIT

# Start container with the worktree mounted
docker run -d --name "$CONTAINER" \
  -v "$WORKTREE_DIR:/home/agent/workspace" \
  -v "$REPO_DIR/.git:$REPO_DIR/.git" \
  -w /home/agent/workspace \
  sandcastle:ralph-test-harness

sleep 3

# Check 1: Container is running
STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER")
if [ "$STATUS" != "running" ]; then
  echo "  FAIL: Container status is '$STATUS', expected 'running'"
  docker logs "$CONTAINER"
  exit 1
fi
echo "  PASS: Container is running"

# Check 2: The .git file inside the container has a valid gitdir path
GIT_CONTENT=$(docker exec "$CONTAINER" cat /home/agent/workspace/.git 2>/dev/null || echo "")
if echo "$GIT_CONTENT" | grep -q '^gitdir: /'; then
  echo "  PASS: .git file contains valid Linux gitdir path"
  echo "        Content: $GIT_CONTENT"
else
  echo "  FAIL: .git file has unexpected content: $GIT_CONTENT"
  exit 1
fi

# Check 3: git status works inside container
docker exec "$CONTAINER" sh -c 'git config --global --add safe.directory /home/agent/workspace && git status' > /dev/null
echo "  PASS: git status works inside container"

echo ""
echo "=== Test PASSED: Docker Container Boot ==="
