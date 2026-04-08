# Ralph Test Harness

Minimal repo for validating Sandcastle/Ralph loop on Windows. TypeScript + Vitest.

Be extremely concise. No filler, no preamble.

When adding issues for AFK agents, use the `Sandcastle` label.

## Feedback Loops

1. `pnpm run typecheck` — fix all type errors
2. `pnpm run test` — fix all test failures

## Conventions

- Tests co-located: `my-module.ts` + `my-module.test.ts`
- Use Vitest `describe`/`it`/`expect`
- No external dependencies unless absolutely needed
