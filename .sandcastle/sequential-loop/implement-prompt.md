# Context

## Issue

!`gh issue view {{ISSUE_NUMBER}} --repo schedl-benjamin/ralph-test-harness --json title,body`

## Recent Commits

!`git log -5 --oneline`

# Task

You are an implementer. Fix issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}.

## Workflow

1. **Explore** — read the issue carefully, explore the codebase to understand the area
2. **Plan** — decide what to change, design for testability
3. **Execute** — use red-green-refactor (one test at a time):
   - Write failing test -> make it pass -> repeat
   - Test through public interfaces
4. **Verify** — fix any failures:
   ```
   pnpm run typecheck && pnpm run test
   ```
5. **Commit** — make a single git commit:

   ```
   RALPH: [what you did]

   Key decisions: [what and why]
   Files changed: [list]
   Notes: [blockers or follow-ups]

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

6. **Close the issue**:
   ```
   gh issue close {{ISSUE_NUMBER}} --repo schedl-benjamin/ralph-test-harness --comment "Completed via RALPH sequential loop. See latest commit on master."
   ```

When complete, output:
<promise>COMPLETE</promise>
