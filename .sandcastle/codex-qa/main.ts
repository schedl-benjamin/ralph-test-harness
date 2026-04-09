/**
 * Codex QA Loop
 *
 * Reads a QA plan GitHub issue, parses it into sections, and dispatches
 * individual Codex verification tasks. Files new issues for failures.
 *
 * Usage: pnpm qa:codex -- --issue 123
 */

import { execSync, spawnSync, spawn, ChildProcess } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .sandcastle/.env for credentials
try {
  const envPath = resolve(process.cwd(), ".sandcastle", ".env");
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

interface QASection {
  id: string;
  title: string;
  items: string[];
}

function exec(cmd: string, cwd?: string): string {
  return execSync(cmd, {
    cwd: cwd ?? process.cwd(),
    encoding: "utf-8",
    timeout: 300_000,
    env: process.env,
  }).trim();
}

/**
 * Parse a QA plan markdown body into sections with checklist items.
 * Splits by ### headers (subsections), extracts - [ ] items.
 */
function parseQAPlan(body: string): QASection[] {
  const sections: QASection[] = [];
  const lines = body.split("\n");
  let currentSection: QASection | null = null;

  for (const line of lines) {
    // Match ### or #### headers as section boundaries
    const headerMatch = line.match(/^#{2,4}\s+(.+)/);
    if (headerMatch) {
      // Only create sections for ### and #### (subsection level)
      if (line.startsWith("### ") || line.startsWith("#### ")) {
        if (currentSection && currentSection.items.length > 0) {
          sections.push(currentSection);
        }
        const title = headerMatch[1].trim();
        const id = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        currentSection = { id, title, items: [] };
      }
      continue;
    }

    // Match checklist items
    const itemMatch = line.match(/^-\s+\[[ x]\]\s+(.+)/);
    if (itemMatch && currentSection) {
      currentSection.items.push(itemMatch[1].trim());
    }
  }

  // Don't forget the last section
  if (currentSection && currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Start the dev server and wait for it to be ready.
 */
function startDevServer(): ChildProcess {
  console.log(`Starting dev server on port ${PORT}...`);
  const proc = spawn("pnpm", ["dev"], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: { ...process.env, PORT: String(PORT) },
    shell: true,
  });

  proc.stdout?.on("data", (data: Buffer) => {
    const msg = data.toString();
    if (msg.includes("Server running")) {
      console.log(`  Dev server ready on port ${PORT}.`);
    }
  });

  proc.stderr?.on("data", (data: Buffer) => {
    // Suppress noisy stderr unless it's an error
    const msg = data.toString();
    if (msg.includes("Error") || msg.includes("error")) {
      console.error(`  Dev server error: ${msg.trim()}`);
    }
  });

  return proc;
}

/**
 * Wait for the server to respond on the given port.
 */
async function waitForServer(
  port: number,
  maxRetries = 30
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://localhost:${port}`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/**
 * Build verification prompt for a QA section.
 */
function buildVerifyPrompt(section: QASection): string {
  const template = readFileSync(
    resolve(process.cwd(), ".sandcastle", "codex-qa", "verify-prompt.md"),
    "utf-8"
  );

  const itemsList = section.items.map((item, i) => `${i + 1}. ${item}`).join("\n");

  return template
    .replace(/\{\{SECTION_TITLE\}\}/g, section.title)
    .replace(/\{\{CHECKLIST_ITEMS\}\}/g, itemsList)
    .replace(/\{\{PORT\}\}/g, String(PORT));
}

/**
 * Run Codex to verify a QA section. Returns pass/fail results.
 */
function runCodexVerify(
  section: QASection
): { passed: string[]; failed: string[] } {
  const prompt = buildVerifyPrompt(section);
  const outputFile = `/tmp/codex-qa-${section.id}.txt`;

  try {
    const isWindows = process.platform === "win32";
    const sandboxFlag = isWindows
      ? "--dangerously-bypass-approvals-and-sandbox"
      : "--full-auto";

    const result = spawnSync(
      "codex",
      [
        "exec",
        sandboxFlag,
        "--sandbox", "read-only",
        "-m", "gpt-5.4",
        "-o", outputFile,
        "-",  // read prompt from stdin
      ],
      {
        input: prompt,
        cwd: process.cwd(),
        encoding: "utf-8",
        timeout: 300_000,
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    if (result.error) throw result.error;

    // Read result
    let result: string;
    try {
      result = readFileSync(outputFile, "utf-8");
    } catch {
      result = "";
    }

    // Parse results — look for PASS/FAIL markers in output
    const passed: string[] = [];
    const failed: string[] = [];

    for (const item of section.items) {
      // Simple heuristic: if the item text appears near a FAIL/FAILING/ERROR marker, it failed
      // Otherwise assume it passed (optimistic)
      const itemLower = item.toLowerCase();
      const resultLower = result.toLowerCase();

      if (
        resultLower.includes(`fail`) &&
        resultLower.includes(itemLower.slice(0, 30))
      ) {
        failed.push(item);
      } else {
        passed.push(item);
      }
    }

    // If Codex output is empty or couldn't parse, mark all as needing manual check
    if (!result.trim()) {
      return { passed: [], failed: section.items };
    }

    return { passed, failed };
  } catch (err) {
    console.error(
      `  Codex verify failed for "${section.title}": ${(err as Error).message?.split("\n")[0]}`
    );
    return { passed: [], failed: section.items };
  }
}

/**
 * File a GitHub issue for QA failures.
 */
function fileFailureIssue(
  section: QASection,
  failedItems: string[],
  qaIssueNumber: number
): number | null {
  const body = `## QA Failure: ${section.title}

The following checks from QA plan #${qaIssueNumber} failed:

${failedItems.map((item) => `- [ ] ${item}`).join("\n")}

### Context
- QA Plan: #${qaIssueNumber}
- Section: ${section.title}
- Verified by Codex QA loop

### Expected
All checklist items should pass verification.

---
Filed automatically by the Codex QA loop.`;

  try {
    const result = exec(
      `gh issue create --title "QA Failure: ${section.title}" --body "${body.replace(/"/g, '\\"')}" --label Sandcastle`
    );
    const issueMatch = result.match(/(\d+)/);
    const num = issueMatch ? parseInt(issueMatch[1]) : null;
    if (num) console.log(`  Filed issue #${num} for failures in "${section.title}"`);
    return num;
  } catch (err) {
    console.error(
      `  Failed to file issue: ${(err as Error).message?.split("\n")[0]}`
    );
    return null;
  }
}

async function main() {
  // Parse --issue argument
  const issueArg = process.argv.find((a) => a.startsWith("--issue"));
  let issueNumber: number;

  if (issueArg) {
    const idx = process.argv.indexOf(issueArg);
    if (issueArg.includes("=")) {
      issueNumber = parseInt(issueArg.split("=")[1]);
    } else {
      issueNumber = parseInt(process.argv[idx + 1]);
    }
  } else {
    console.error("Usage: pnpm qa:codex -- --issue <number>");
    process.exit(1);
  }

  if (isNaN(issueNumber)) {
    console.error("Invalid issue number.");
    process.exit(1);
  }

  console.log(`=== Codex QA Loop — Issue #${issueNumber} ===\n`);

  // Fetch QA plan issue
  console.log("Fetching QA plan...");
  let issueBody: string;
  try {
    issueBody = exec(
      `gh issue view ${issueNumber} --json body --jq .body`
    );
  } catch {
    console.error(`Failed to fetch issue #${issueNumber}.`);
    process.exit(1);
  }

  // Parse into sections
  const sections = parseQAPlan(issueBody);
  console.log(`Parsed ${sections.length} QA sections.\n`);

  if (sections.length === 0) {
    console.log("No checklist sections found in issue body.");
    process.exit(0);
  }

  // Start dev server
  const devServer = startDevServer();
  const serverReady = await waitForServer(PORT);
  if (!serverReady) {
    console.error(`Dev server did not start on port ${PORT} within 30s.`);
    devServer.kill();
    process.exit(1);
  }

  // Process each section
  const summary: { section: string; passed: number; failed: number; issueNum: number | null }[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    console.log(
      `\n[${i + 1}/${sections.length}] Verifying: ${section.title} (${section.items.length} items)`
    );

    const result = runCodexVerify(section);
    console.log(
      `  Results: ${result.passed.length} passed, ${result.failed.length} failed`
    );

    let issueNum: number | null = null;
    if (result.failed.length > 0) {
      issueNum = fileFailureIssue(section, result.failed, issueNumber);
    }

    summary.push({
      section: section.title,
      passed: result.passed.length,
      failed: result.failed.length,
      issueNum,
    });
  }

  // Post summary comment on the QA issue
  console.log("\n--- QA Summary ---\n");
  const totalPassed = summary.reduce((sum, s) => sum + s.passed, 0);
  const totalFailed = summary.reduce((sum, s) => sum + s.failed, 0);

  const summaryLines = summary.map((s) => {
    const status = s.failed === 0 ? "PASS" : "FAIL";
    const issueRef = s.issueNum ? ` → #${s.issueNum}` : "";
    return `| ${s.section} | ${s.passed} | ${s.failed} | ${status}${issueRef} |`;
  });

  const commentBody = `## Codex QA Results

| Section | Passed | Failed | Status |
|---------|--------|--------|--------|
${summaryLines.join("\n")}

**Total: ${totalPassed} passed, ${totalFailed} failed**

---
Generated by the Codex QA loop.`;

  console.log(commentBody);

  try {
    exec(
      `gh issue comment ${issueNumber} --body "${commentBody.replace(/"/g, '\\"')}"`
    );
    console.log(`\nPosted summary comment on issue #${issueNumber}.`);
  } catch {
    console.error("Failed to post summary comment.");
  }

  // Cleanup
  devServer.kill();
  console.log("\n=== Codex QA Loop finished ===\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
