#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

print_bootstrap_guidance() {
	echo "Repair from the repo root with one of:" >&2
	echo "  npm install" >&2
	echo "  npm install --save-dev @brainwav/coding-harness" >&2
	echo "After the package is installed, rerun:" >&2
	echo "  bash scripts/harness-cli.sh <command>" >&2
	echo "  npm exec harness -- <command>" >&2
}

if ! command -v node >/dev/null 2>&1; then
	echo "Error: node is required to run scripts/harness-cli.sh." >&2
	echo "Install Node.js and retry." >&2
	exit 1
fi

set +e
CLI_PATH="$(
	REPO_ROOT="$REPO_ROOT" node <<'NODE'
const { createRequire } = require("node:module");
const { resolve } = require("node:path");

const repoRoot = process.env.REPO_ROOT;

try {
	const requireFromRepo = createRequire(resolve(repoRoot, "package.json"));
	process.stdout.write(
		requireFromRepo.resolve("@brainwav/coding-harness/dist/cli.js"),
	);
} catch (error) {
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		error.code === "MODULE_NOT_FOUND"
	) {
		process.exit(42);
	}

	console.error(error instanceof Error ? error.message : String(error));
	process.exit(43);
}
NODE
)"
resolution_status=$?
set -e

if [[ $resolution_status -eq 42 || -z "$CLI_PATH" ]]; then
	if command -v harness >/dev/null 2>&1; then
		set +e
		bash -lc 'harness "$@"' _ "$@"
		harness_status=$?
		set -e
		exit "$harness_status"
	fi
	if [[ "${CI:-}" == "true" ]]; then
		if ! command -v npx >/dev/null 2>&1; then
			echo "Error: npx is required for CI fallback when local harness package is missing." >&2
			print_bootstrap_guidance
			exit 1
		fi
		echo "Warning: local @brainwav/coding-harness missing; using pinned npx package fallback in CI." >&2
		set +e
		bash -lc 'npx --yes --package @brainwav/coding-harness harness "$@"' _ "$@"
		npx_status=$?
		set -e
		if [[ $npx_status -eq 0 ]]; then
			exit 0
		fi
		echo "Error: CI fallback failed to execute @brainwav/coding-harness via npx." >&2
		print_bootstrap_guidance
		exit "$npx_status"
	fi
	echo "Error: local @brainwav/coding-harness could not be resolved from this repo." >&2
	echo "This is a local install/bootstrap problem, not a harness command failure." >&2
	print_bootstrap_guidance
	exit 1
fi

if [[ $resolution_status -ne 0 ]]; then
	echo "Error: failed to resolve the local @brainwav/coding-harness CLI entrypoint." >&2
	echo "This indicates a local install/bootstrap problem, not a harness command failure." >&2
	print_bootstrap_guidance
	exit 1
fi

exec node "$CLI_PATH" "$@"
