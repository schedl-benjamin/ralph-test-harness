#!/bin/bash
# QA Preflight — starts dev server and waits for it to be ready.
# Usage: source qa-preflight.sh [port]

PORT=${1:-3000}

echo "Starting dev server on port $PORT..."
PORT=$PORT pnpm dev &
DEV_PID=$!
echo $DEV_PID > /tmp/codex-qa-dev.pid

# Wait for server
for i in {1..30}; do
  if curl -s http://localhost:$PORT > /dev/null 2>&1; then
    echo "Dev server ready on port $PORT (PID: $DEV_PID)"
    exit 0
  fi
  sleep 1
done

echo "ERROR: Dev server did not start within 30 seconds"
kill $DEV_PID 2>/dev/null
exit 1
