You are implementing GitHub issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}

## Issue Description

{{ISSUE_BODY}}

## Instructions

1. Read `AGENTS.md` for project conventions and feedback loops.
2. Explore the codebase to understand existing patterns.
3. Implement the issue using TDD (red-green-refactor):
   a. Write a failing test first
   b. Implement the minimum code to make it pass
   c. Refactor if needed
4. Run the feedback loops and fix any failures:
   - `pnpm run typecheck`
   - `pnpm run test`
5. Commit your changes with the prefix `CODEX:` — for example:
   `git commit -m "CODEX: Add power function with tests (#{{ISSUE_NUMBER}})"`
6. If the issue involves frontend changes, also ensure E2E tests pass:
   - `pnpm run test:e2e`

## Conventions

- Tests co-located: `my-module.ts` + `my-module.test.ts`
- Use Vitest `describe`/`it`/`expect`
- Keep it simple — no unnecessary abstractions
