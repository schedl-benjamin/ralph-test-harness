/**
 * Sequential RALPH Loop (Test Harness)
 *
 * Single-issue-at-a-time execution:
 *   1. Plan  — identify next highest-priority unblocked issue
 *   2. Implement — run ONE agent on temp branch (auto merge-back on success)
 *   3. Repeat until no more issues
 *
 * Usage: pnpm ralph
 */

import { run } from "@ai-hero/sandcastle";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .sandcastle/.env so host-side operations have credentials
try {
  const envPath = resolve(process.cwd(), ".sandcastle", ".env");
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {}

const MAX_ITERATIONS = 5;

const hooks = {
  onSandboxReady: [
    // Use a store dir outside the workspace to keep it separate from worktree cleanup.
    { command: "pnpm install --frozen-lockfile --store-dir /home/agent/.pnpm-store" },
  ],
};
const copyToSandbox: string[] = [];

async function main() {
  console.log("=== Sequential RALPH Loop (Test Harness) ===\n");


  // Pre-flight: verify frontend env is configured
  const frontendEnvPath = resolve(process.cwd(), "frontend", ".env.local");
  if (existsSync(resolve(process.cwd(), "frontend")) && !existsSync(frontendEnvPath)) {
    console.error("WARNING: frontend/.env.local missing — the app will render blank without Supabase credentials.");
    console.error("  Copy credentials from frontend/.env.example.");
  }

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    console.log(`\n--- Iteration ${iteration}/${MAX_ITERATIONS} ---\n`);

    // Phase 1: Plan — identify unblocked issues
    console.log("Phase 1: Planning...");
    const plan = await run({
      name: "Planner",
      imageName: "sandcastle:ralph-test-harness",
      promptFile: "./.sandcastle/plan-prompt.md",
      maxIterations: 1,
      model: "claude-sonnet-4-6",
      hooks,
      copyToSandbox,
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

    // Take only the first issue (sequential — one at a time)
    const issue = issues[0];
    console.log(`Phase 2: Implementing #${issue.number}: ${issue.title}`);

    // Phase 2: Implement on TEMP BRANCH (no explicit branch → auto merge-back)
    try {
      await run({
        name: `Implementer-${issue.number}`,
        imageName: "sandcastle:ralph-test-harness",
        promptFile: "./.sandcastle/sequential-loop/implement-prompt.md",
        promptArgs: {
          ISSUE_NUMBER: String(issue.number),
          ISSUE_TITLE: issue.title,
        },
        maxIterations: 50,
        model: "claude-sonnet-4-6",
        hooks,
        copyToSandbox,
      });

      const latestMsg = execSync("git log -1 --format=%s", {
        cwd: process.cwd(),
        encoding: "utf-8",
      }).trim();
      console.log(
        `\nImplementation of #${issue.number} complete — merged to master.`
      );
      console.log(`  Latest: ${latestMsg}`);
    } catch (err) {
      const msg = (err as Error).message || String(err);
      console.error(`\nImplementation FAILED for #${issue.number}:`);
      console.error(`  ${msg.split("\n")[0]}`);
      console.error("  Continuing to next iteration...\n");
      continue;
    }

    // Push to remote
    try {
      execSync("git push origin master", {
        cwd: process.cwd(),
        encoding: "utf-8",
        timeout: 60_000,
      });
      console.log("  Pushed to origin/master.");
    } catch (err) {
      console.error(
        "  Push failed:",
        (err as Error).message?.split("\n")[0]
      );
    }
  }

  console.log("\n=== Sequential RALPH loop finished ===\n");
}

main().catch(console.error);
