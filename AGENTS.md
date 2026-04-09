# Ralph Test Harness

TypeScript + Vitest + Playwright. Minimal repo for validating autonomous loops.

## Feedback Loops (run these before committing)
1. `pnpm run typecheck` — fix all type errors
2. `pnpm run test` — fix all unit test failures
3. `pnpm run test:e2e` — fix all Playwright failures (requires dev server running)

## Running the app
- `pnpm dev` — starts Express server on port 3000

## Conventions
- Tests co-located: `my-module.ts` + `my-module.test.ts`
- E2E tests in `e2e/` directory
- Use Vitest `describe`/`it`/`expect` for unit tests
- Use Playwright `test`/`expect` for E2E tests
- Commit prefix: `CODEX: <description>`
- No external dependencies unless absolutely needed
