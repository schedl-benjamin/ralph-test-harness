#!/bin/bash
# Fix Windows git worktree .git file paths for cross-OS compatibility.
# When Sandcastle creates a worktree on Windows, the .git file contains
# a Windows-style path like "gitdir: C:/dev/...". Inside the Linux
# container, this is interpreted as a relative path and fails.
#
# This converts "C:/" to "/c/" (MSYS-style), which resolves correctly
# in both the Linux container AND on the Windows host (Git for Windows
# understands MSYS paths natively via its MSYS2 runtime).
#
# On container stop, the original path is restored so the host-side
# `git worktree remove` can validate the .git file.

GIT_FILE="/home/agent/workspace/.git"
ORIGINAL=""

if [ -f "$GIT_FILE" ] && grep -q '^gitdir: [A-Za-z]:/' "$GIT_FILE"; then
  ORIGINAL=$(cat "$GIT_FILE")
  sed -E 's|^gitdir: ([A-Za-z]):/|gitdir: /\L\1/|' "$GIT_FILE" > "$GIT_FILE.tmp" \
    && mv "$GIT_FILE.tmp" "$GIT_FILE"
fi

cleanup() {
  if [ -n "$ORIGINAL" ]; then
    echo "$ORIGINAL" > "$GIT_FILE"
  fi
}
trap cleanup EXIT TERM INT

sleep infinity &
wait $!
