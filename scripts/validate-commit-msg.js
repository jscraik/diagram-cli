#!/usr/bin/env node
/**
 * Commit message validation hook (CommonJS for Node 18+ compatibility).
 */

const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const commitMsgFile = process.argv[2];
const conventionalCommitRegex =
	/^(feat|fix|chore|docs|refactor|test|style|perf|ci|build|revert)(\(.+\))?!?:\s.+/;
const coAuthorRegex = /Co-authored-by:\s*.+/i;
const codexTrailerRegex = /Co-authored-by:\s*Codex <noreply@openai\.com>/i;

function main() {
	if (!commitMsgFile) {
		console.error("Usage: validate-commit-msg.js <commit-msg-file>");
		process.exit(1);
	}

	let commitMsg;
	try {
		commitMsg = readFileSync(commitMsgFile, "utf-8");
	} catch (error) {
		console.error(`Failed to read commit message file: ${error.message}`);
		process.exit(1);
	}

	const errors = [];
	const warnings = [];
	const lines = commitMsg.split("\n").filter((line) => !line.startsWith("#"));
	const subjectIndex = lines.findIndex((line) => line.trim() !== "");
	const subject = subjectIndex >= 0 ? lines[subjectIndex].trim() : "";

	if (!conventionalCommitRegex.test(subject)) {
		errors.push("First line must follow conventional commit format: type(scope)!: description");
	}

	if (subject.length > 72) {
		errors.push(`First line exceeds 72 characters (${subject.length} chars)`);
	}

	const bodyStartIndex = subjectIndex >= 0 ? subjectIndex + 1 : -1;
	if (bodyStartIndex >= 0 && lines.length > bodyStartIndex && lines[bodyStartIndex].trim() !== "") {
		warnings.push("Body should be separated from subject by a blank line for readability");
	}

	const hasCoAuthor = coAuthorRegex.test(commitMsg);
	const branchName = getBranchName();
	const isAgentBranch = /codex|claude|agent/i.test(branchName);
	if (isAgentBranch && !hasCoAuthor) {
		warnings.push("AI-assisted commit detected. Add a Co-authored-by trailer for transparency.");
	}
	if (isAgentBranch && hasCoAuthor && !codexTrailerRegex.test(commitMsg)) {
		warnings.push("Expected trailer: Co-authored-by: Codex <noreply@openai.com>");
	}

	if (errors.length > 0) {
		console.error("\n❌ Commit message validation failed:\n");
		for (const error of errors) {
			console.error(`  ✗ ${error}`);
		}
		console.error(
			"\nCommit message format example:\n  feat(scope): add feature\n\n  Why this change.\n\n  Co-authored-by: Codex <noreply@openai.com>",
		);
		process.exit(1);
	}

	if (warnings.length > 0) {
		console.info("\n⚠️ Commit message warnings:\n");
		for (const warning of warnings) {
			console.info(`  • ${warning}`);
		}
		console.info("");
	}
}

function getBranchName() {
	try {
		const output = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		return output.trim();
	} catch {
		return "";
	}
}

main();
