#!/usr/bin/env node
/**
 * Setup script for simple-git-hooks in diagram-cli (npm-based repo).
 */

const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { execFileSync } = require("node:child_process");

const PACKAGE_JSON_PATH = resolve(process.cwd(), "package.json");

function main() {
	if (!existsSync(PACKAGE_JSON_PATH)) {
		console.error("Error: package.json not found in current directory");
		console.error("Run this script from the repository root.");
		process.exit(1);
	}

	let packageJson;
	try {
		packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf-8"));
	} catch {
		console.error("Error: Failed to parse package.json");
		process.exit(1);
	}

	let modified = false;

	if (!packageJson.devDependencies) {
		packageJson.devDependencies = {};
	}
	if (!packageJson.devDependencies["simple-git-hooks"]) {
		packageJson.devDependencies["simple-git-hooks"] = "^2.13.1";
		console.info("✓ Added simple-git-hooks to devDependencies");
		modified = true;
	} else {
		console.info("✓ simple-git-hooks already in devDependencies");
	}

	if (!packageJson.scripts) {
		packageJson.scripts = {};
	}
	if (!packageJson.scripts.postinstall) {
		packageJson.scripts.postinstall = "simple-git-hooks";
		console.info("✓ Added postinstall script");
		modified = true;
	} else if (!packageJson.scripts.postinstall.includes("simple-git-hooks")) {
		packageJson.scripts.postinstall = `simple-git-hooks && ${packageJson.scripts.postinstall}`;
		console.info("✓ Prepended simple-git-hooks to postinstall");
		modified = true;
	}

	const hookConfig = {
		"pre-commit": "npm test",
		"commit-msg": "node scripts/validate-commit-msg.js $1",
		"pre-push": "npm run test:deep",
	};
	if (!packageJson["simple-git-hooks"]) {
		packageJson["simple-git-hooks"] = hookConfig;
		console.info("✓ Added simple-git-hooks configuration for diagram-cli");
		modified = true;
	}

	if (modified) {
		writeFileSync(PACKAGE_JSON_PATH, `${JSON.stringify(packageJson, null, 2)}\n`);
		console.info("\n✓ package.json updated");
	}

	console.info("\nInstalling dependencies to activate hooks...");
	try {
		execFileSync("npm", ["install"], { stdio: "inherit" });
		console.info("\n✓ Git hooks installed and active!");
		console.info("\nHooks enabled:");
		console.info("  • pre-commit: npm test");
		console.info("  • commit-msg: validates conventional commit format");
		console.info("  • pre-push: npm run test:deep");
	} catch {
		console.error("\n⚠️ Failed to run npm install. Run it manually to activate hooks.");
	}
}

main();
