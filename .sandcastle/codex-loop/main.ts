/**
 * Codex Implementation Loop
 *
 * Sequential issue-at-a-time execution using Codex CLI:
 *   1. Plan  — Claude reads Sandcastle-labeled issues, identifies unblocked
 *   2. Implement — Codex CLI works on issue in a git worktree
 *   3. Validate — typecheck + tests must pass
 *   4. Merge — merge worktree branch to master, push, close issue
 *   5. Repeat
 *
 * Usage: pnpm ralph:codex
 */

import { run } from "@ai-hero/sandcastle";
import { execSync, spawnSync } from "child_process";
import { readFileSync, mkdirSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";

// Load .sandcastle/.env for credentials
try {
  const envPath = resolve(process.cwd(), ".sandcastle", ".env");
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {}

const MAX_ITERATIONS = 5;
const WORKTREE_DIR = resolve(process.cwd(), ".codex-worktrees");
const PLAN_HOOKS = {
  onSandboxReady: [
    {
      command:
        "pnpm install --frozen-lockfile --store-dir /home/agent/.pnpm-store",
    },
  ],
};

function exec(cmd: string, cwd?: string): string {
  return execSync(cmd, {
    cwd: cwd ?? process.cwd(),
    encoding: "utf-8",
    timeout: 300_000,
    env: process.env,
  }).trim();
}

function cleanupWorktree(path: string, branch: string) {
  try {
    exec(`git worktree remove "${path}" --force`);
  } catch {}
  try {
    exec(`git branch -D "${branch}"`);
  } catch {}
}

function loadPromptTemplate(): string {
  const templatePath = resolve(
    process.cwd(),
    ".sandcastle",
    "codex-loop",
    "implement-prompt.md"
  );
  return readFileSync(templatePath, "utf-8");
}

function buildPrompt(
  template: string,
  issue: { number: number; title: string; body: string }
): string {
  return template
    .replace(/\{\{ISSUE_NUMBER\}\}/g, String(issue.number))
    .replace(/\{\{ISSUE_TITLE\}\}/g, issue.title)
    .replace(/\{\{ISSUE_BODY\}\}/g, issue.body);
}

async function main() {
  console.log("=== Codex Implementation Loop ===\n");

  if (!existsSync(WORKTREE_DIR)) {
    mkdirSync(WORKTREE_DIR, { recursive: true });
  }

  const promptTemplate = loadPromptTemplate();

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    console.log(`\n--- Iteration ${iteration}/${MAX_ITERATIONS} ---\n`);

    // Phase 1: Plan — use Claude to identify unblocked issues
    console.log("Phase 1: Planning (Claude)...");
    const plan = await run({
      name: "Planner",
      imageName: "sandcastle:ralph-test-harness",
      promptFile: "./.sandcastle/plan-prompt.md",
      maxIterations: 1,
      model: "claude-sonnet-4-6",
      hooks: PLAN_HOOKS,
      copyToSandbox: [],
    });

    const planMatch = plan.stdout.match(/<plan>([\s\S]*?)<\/plan>/);
    if (!planMatch) {
      console.log("No plan output found. All issues may be complete.");
      break;
    }

    const { issues } = JSON.parse(planMatch[1]) as {
      issues: { number: number; title: string; branch: string }[];
    };

    if (issues.length === 0) {
      console.log("No unblocked issues. Done.");
      break;
    }

    // Take first issue (sequential)
    const issue = issues[0];
    console.log(`\nPhase 2: Implementing #${issue.number}: ${issue.title}`);

    // Fetch full issue body
    let issueBody: string;
    try {
      issueBody = exec(
        `gh issue view ${issue.number} --json body --jq .body`
      );
    } catch {
      console.error(`  Failed to fetch issue #${issue.number} body. Skipping.`);
      continue;
    }

    const branch = `codex/issue-${issue.number}`;
    const worktreePath = resolve(WORKTREE_DIR, `issue-${issue.number}`);

    // Clean up any stale worktree
    cleanupWorktree(worktreePath, branch);

    // Create worktree
    try {
      exec(`git worktree add "${worktreePath}" -b "${branch}"`);
      console.log(`  Created worktree at ${worktreePath}`);
    } catch (err) {
      console.error(
        `  Failed to create worktree: ${(err as Error).message?.split("\n")[0]}`
      );
      continue;
    }

    // Install deps in worktree
    try {
      exec("pnpm install --frozen-lockfile", worktreePath);
    } catch {
      console.error("  pnpm install failed in worktree. Continuing anyway...");
    }

    // Build prompt
    const prompt = buildPrompt(promptTemplate, {
      number: issue.number,
      title: issue.title,
      body: issueBody,
    });

    // Phase 2: Run Codex
    // Write prompt to temp file to avoid shell escaping issues
    const promptFile = resolve(WORKTREE_DIR, `prompt-${issue.number}.md`);
    writeFileSync(promptFile, prompt, "utf-8");

    try {
      console.log("  Running Codex CLI...");
      // Codex built-in sandbox handles isolation.
      
      const sandboxFlag = "--full-auto";

      const result = spawnSync(
        "codex",
        [
          "exec",
          sandboxFlag,
          "-C", worktreePath,
          "-m", "gpt-5.4",
          "-o", resolve(WORKTREE_DIR, `result-${issue.number}.txt`),
          "-",  // read prompt from stdin
        ],
        {
          input: prompt,
          cwd: process.cwd(),
          encoding: "utf-8",
          timeout: 600_000, // 10 min
          env: process.env,
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(result.stderr?.split("\n")[0] || `Exit code ${result.status}`);
      }
      console.log("  Codex finished.");
    } catch (err) {
      console.error(
        `  Codex failed: ${(err as Error).message?.split("\n")[0]}`
      );
      cleanupWorktree(worktreePath, branch);
      continue;
    }

    // Phase 3: Validate
    console.log("  Validating...");
    try {
      exec("pnpm run typecheck", worktreePath);
      exec("pnpm run test", worktreePath);
      console.log("  Typecheck + tests PASS.");
    } catch (err) {
      console.error(
        `  Validation FAILED: ${(err as Error).message?.split("\n")[0]}`
      );
      cleanupWorktree(worktreePath, branch);
      continue;
    }

    // Phase 3.5: Commit changes from outside the sandbox
    // Codex sandbox makes .git worktree metadata read-only, so git commit
    // fails inside the sandbox. We commit here on the host instead.
    console.log("  Committing changes...");
    try {
      const status = exec("git status --porcelain", worktreePath);
      if (!status) {
        console.log("  No changes detected. Codex may not have made changes.");
        cleanupWorktree(worktreePath, branch);
        continue;
      }
      exec("git add -A -- ':!.codex'", worktreePath);
      exec(
        `git commit -m "CODEX: ${issue.title} (#${issue.number})"`,
        worktreePath
      );
      console.log("  Committed.");
    } catch (err) {
      console.error(
        `  Commit failed: ${(err as Error).message?.split("\n")[0]}`
      );
      cleanupWorktree(worktreePath, branch);
      continue;
    }

    // Phase 4: Merge to master
    console.log("  Merging to master...");
    try {
      // Check if there are commits on the branch
      const diff = exec(
        `git log master..${branch} --oneline`,
        worktreePath
      );
      if (!diff) {
        console.log("  No commits on branch. Codex may not have made changes.");
        cleanupWorktree(worktreePath, branch);
        continue;
      }

      exec(`git checkout master`, process.cwd());
      exec(`git merge ${branch} --no-ff -m "CODEX: Implement #${issue.number} — ${issue.title}"`, process.cwd());
      console.log(`  Merged ${branch} to master.`);

      // Push
      try {
        exec("git push origin master");
        console.log("  Pushed to origin/master.");
      } catch {
        console.error("  Push failed.");
      }

      // Close issue
      try {
        exec(`gh issue close ${issue.number} --comment "Implemented by Codex in the codex-implement loop."`);
        console.log(`  Closed issue #${issue.number}.`);
      } catch {
        console.error(`  Failed to close issue #${issue.number}.`);
      }
    } catch (err) {
      console.error(
        `  Merge failed: ${(err as Error).message?.split("\n")[0]}`
      );
    }

    // Cleanup
    cleanupWorktree(worktreePath, branch);
    console.log(`  Cleaned up worktree.`);
  }

  console.log("\n=== Codex Implementation Loop finished ===\n");
}

main().catch(console.error);
