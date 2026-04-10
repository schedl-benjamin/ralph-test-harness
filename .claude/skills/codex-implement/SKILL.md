---
name: codex-implement
description: Run the Codex implementation loop — picks up Sandcastle-labeled issues and implements them using Codex CLI (GPT-5.4) with TDD, auto-merge on success.
user_invocable: true
---

# Codex Implement

Autonomous implementation loop using Codex CLI instead of Claude Code.

## What it does

1. **Plan** (Claude) — reads open `Sandcastle`-labeled GitHub issues, identifies unblocked ones
2. **Implement** (Codex) — runs `codex exec --full-auto` in a git worktree per issue
3. **Validate** — runs `pnpm typecheck` + `pnpm test` in the worktree
4. **Merge** — if validation passes, merges to master, pushes, closes the issue
5. **Repeat** — processes up to 5 issues sequentially

## Usage

```bash
pnpm ralph:codex
```

Or invoke via slash command: `/codex-implement`

## Prerequisites

- Codex CLI installed and authenticated (`codex login`)
- GitHub CLI authenticated (`gh auth status`)
- Open issues labeled `Sandcastle` in the repo
- Docker running (for the Claude planner phase)

## How it differs from `pnpm ralph`

| Aspect | `pnpm ralph` | `pnpm ralph:codex` |
|--------|-------------|-------------------|
| Implementer | Claude Code (Sonnet) in Docker | Codex CLI (GPT-5.4) on host |
| Commit prefix | `RALPH:` | `CODEX:` |
| Sandbox | Docker container | Codex --full-auto sandbox |
| Planner | Claude in Docker | Same (Claude in Docker) |
