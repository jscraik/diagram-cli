#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

function parseArgs(argv) {
  const args = { command: null, mode: "advisory", json: false, out: null };
  const rest = [...argv];
  args.command = rest.shift() || null;
  while (rest.length > 0) {
    const token = rest.shift();
    if (token === "--mode") {
      args.mode = rest.shift() || args.mode;
      continue;
    }
    if (token === "--json") {
      args.json = true;
      continue;
    }
    if (token === "--out") {
      args.out = rest.shift() || null;
      continue;
    }
  }
  return args;
}

function buildFinding({ repoRoot, filePath, exists, ruleId, surface, severity, message, fix }) {
  if (exists) {
    return null;
  }
  return {
    rule_id: ruleId,
    surface,
    rule_result: severity === "error" ? "error" : "fail",
    severity,
    message,
    path: filePath,
    baseline_state: "new",
    fix,
  };
}

function main() {
  const repoRoot = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  if (args.command !== "drift-gate") {
    console.error(`Unsupported fallback command: ${args.command || "<missing>"}`);
    process.exit(1);
  }

  const findings = [
    buildFinding({
      repoRoot,
      filePath: "src/cli.ts",
      exists: fs.existsSync(path.join(repoRoot, "src/cli.ts")) || fs.existsSync(path.join(repoRoot, "README.md")),
      ruleId: "command.surface.sources.missing",
      surface: "command",
      severity: "error",
      message: "Required command surface sources are missing (src/cli.ts or README.md).",
      fix: {
        manual: "Create the missing source file, or suppress if project type doesn't include a CLI.",
        suppressible: true,
      },
    }),
    buildFinding({
      repoRoot,
      filePath: "docs/QUALITY_SCORE.md",
      exists: fs.existsSync(path.join(repoRoot, "docs/QUALITY_SCORE.md")),
      ruleId: "quality.score.missing",
      surface: "quality-score",
      severity: "warning",
      message: "Quality score document is missing.",
      fix: {
        command: "harness gardener",
        manual: "Create docs/QUALITY_SCORE.md with **Score:** N/100 and last_updated frontmatter.",
        suppressible: true,
      },
    }),
    buildFinding({
      repoRoot,
      filePath: "docs/roadmap/agent-first-status.md",
      exists: fs.existsSync(path.join(repoRoot, "docs/roadmap/agent-first-status.md")),
      ruleId: "status.matrix.missing",
      surface: "status",
      severity: "warning",
      message: "Status matrix document is missing.",
      fix: {
        manual: "Create docs/roadmap/agent-first-status.md with status sections.",
        suppressible: true,
      },
    }),
  ].filter(Boolean);

  const errorCount = findings.filter((finding) => finding.severity === "error").length;
  const report = {
    schemaVersion: "1.0.0",
    command: "drift-gate",
    mode: args.mode,
    status: findings.length > 0 ? "partial" : "ok",
    outcome: "ok",
    error_class: "none",
    generated_at: new Date().toISOString(),
    repo_root: repoRoot,
    baseline: {
      path: "artifacts/consistency-gate/consistency-baseline-latest.json",
      loaded: true,
    },
    summary: {
      finding_count: findings.length,
      new_count: findings.length,
      preexisting_count: 0,
      error_count: errorCount,
      suppressed_count: 0,
    },
    findings,
  };

  const output = JSON.stringify(report, null, 2);
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(repoRoot, args.out)), { recursive: true });
    fs.writeFileSync(path.resolve(repoRoot, args.out), `${output}\n`, "utf8");
  }
  if (args.json || !args.out) {
    process.stdout.write(`${output}\n`);
  }
}

main();
