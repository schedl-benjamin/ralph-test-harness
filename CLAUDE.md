# Ralph Test Harness

Minimal repo for validating Sandcastle/Ralph loop. TypeScript + Vitest.

## Environment

This repo must live on WSL2's native ext4 filesystem (e.g., `~/ralph-test-harness/`),
NOT on `/mnt/c/`. Docker bind-mounts from the Windows filesystem cross the 9P bridge
and are ~10x slower.

Prerequisites: node 22+, pnpm 9.15+, git, gh, Docker Desktop with WSL2 integration.

Be extremely concise. No filler, no preamble.

When adding issues for AFK agents, use the `Sandcastle` label.

## Feedback Loops

1. `pnpm run typecheck` — fix all type errors
2. `pnpm run test` — fix all test failures

## Conventions

- Tests co-located: `my-module.ts` + `my-module.test.ts`
- Use Vitest `describe`/`it`/`expect`
- No external dependencies unless absolutely needed
