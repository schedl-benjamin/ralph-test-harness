---
name: codex-qa
description: Run the Codex QA verification loop — parses a QA plan GitHub issue into sections, dispatches Codex to verify each one via Playwright and browser interaction, files new issues for failures.
user_invocable: true
---

# Codex QA

Automated QA verification using Codex CLI.

## What it does

1. **Parse** — reads a QA plan GitHub issue and splits it into sections with checklist items
2. **Preflight** — starts the dev server and waits for it to be ready
3. **Verify** — for each section, dispatches Codex (read-only) to:
   - Run existing Playwright tests
   - Browse the app and manually verify checklist items
4. **Report** — files new GitHub issues (labeled `Sandcastle`) for any failures
5. **Summarize** — posts a summary table as a comment on the original QA issue

## Usage

```bash
pnpm qa:codex -- --issue 123
```

Or invoke via slash command: `/codex-qa`

## Prerequisites

- Codex CLI installed and authenticated (`codex login`)
- GitHub CLI authenticated (`gh auth status`)
- Playwright browsers installed (`npx playwright install chromium`)
- A QA plan issue with markdown checklist format

## QA Plan Format

The issue body should use this structure:

```markdown
## Section Title
### Subsection Title
- [ ] Checklist item 1
- [ ] Checklist item 2
```

Each subsection becomes one Codex verification task.

## Output

- New GitHub issues filed for failures (labeled `Sandcastle`)
- Summary comment posted on the QA plan issue
