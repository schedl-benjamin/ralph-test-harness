#!/bin/bash
set -euo pipefail
echo "=== Test: Docker Container Boot + Path Conversion ==="

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="test-docker-boot-$$"

# Convert Windows path to Docker volume mount format
to_docker_vol() {
  echo "$1" | sed -E 's|^([A-Za-z]):|/\L\1|' | sed 's|\\|/|g'
}

# Create a temporary worktree
WORKTREE_DIR="$REPO_DIR/.sandcastle/worktrees/test-boot-$$"
git -C "$REPO_DIR" worktree add -b "test/boot-$$" "$WORKTREE_DIR" HEAD

DOCKER_WORKTREE=$(to_docker_vol "$WORKTREE_DIR")
DOCKER_GIT=$(to_docker_vol "$REPO_DIR/.git")

cleanup() {
  MSYS_NO_PATHCONV=1 docker rm -f "$CONTAINER" 2>/dev/null || true
  git -C "$REPO_DIR" worktree remove --force "$WORKTREE_DIR" 2>/dev/null || true
  git -C "$REPO_DIR" branch -D "test/boot-$$" 2>/dev/null || true
  git -C "$REPO_DIR" worktree prune 2>/dev/null || true
}
trap cleanup EXIT

# Start container with the worktree mounted
# MSYS_NO_PATHCONV prevents Git Bash from mangling /home/agent/workspace
MSYS_NO_PATHCONV=1 docker run -d --name "$CONTAINER" \
  -v "$DOCKER_WORKTREE:/home/agent/workspace" \
  -v "$DOCKER_GIT:$DOCKER_GIT" \
  -w /home/agent/workspace \
  sandcastle:ralph-test-harness

sleep 3

# Check 1: Container is running
STATUS=$(MSYS_NO_PATHCONV=1 docker inspect -f '{{.State.Status}}' "$CONTAINER")
if [ "$STATUS" != "running" ]; then
  echo "  FAIL: Container status is '$STATUS', expected 'running'"
  MSYS_NO_PATHCONV=1 docker logs "$CONTAINER"
  exit 1
fi
echo "  PASS: Container is running"

# Check 2: The .git file inside the container has been patched
GIT_CONTENT=$(MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" cat /home/agent/workspace/.git 2>/dev/null || echo "")
if echo "$GIT_CONTENT" | grep -q '^gitdir: [A-Za-z]:/'; then
  echo "  FAIL: .git file still contains Windows path: $GIT_CONTENT"
  exit 1
fi
echo "  PASS: .git file path converted to MSYS format"
echo "        Content: $GIT_CONTENT"

# Check 3: git status works inside container
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" sh -c 'git config --global --add safe.directory /home/agent/workspace && git status' > /dev/null
echo "  PASS: git status works inside container"

echo ""
echo "=== Test PASSED: Docker Container Boot + Path Conversion ==="
