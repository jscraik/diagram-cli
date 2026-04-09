# Tooling and command policy

## Table of Contents
- [Shell and command rules](#shell-and-command-rules)
- [Project tooling inventory](#project-tooling-inventory)
- [Command preflight checklist](#command-preflight-checklist)
- [Package-manager command map](#package-manager-command-map)
- [Dependency constraints](#dependency-constraints)
- [Path-sensitive operations](#path-sensitive-operations)

## Shell and command rules
- Run shell commands with `zsh -lc`.
- Prefer `rg`, `fd`, and `jq` for search, discovery, and JSON parsing.
- Check command resolution with `which` before considering installs.

## Project tooling inventory
- Use [`tooling.md`](tooling.md) as the repository-local tooling inventory.
- Regenerate it from [`tooling.contract.json`](tooling.contract.json) with `bash scripts/render-tooling-doc.sh`.

## Command preflight checklist
- Confirm `pwd` is `/Users/jamiecraik/dev/diagram-cli` before repo edits.
- Confirm required binaries for the task (`rg`, `fd`, `jq`, plus task-specific tools).
- Confirm target paths exist before edits (`AGENTS.md`, `docs/agents/`, `scripts/`).
- Fail fast and stop if any required preflight check is missing.

## Package-manager command map
- Install deps: `npm install`
- Run scripts: `npm run <script>`
- Execute binaries: `npm exec <command>`

## Dependency constraints
This project uses CommonJS. Keep these packages pinned to CJS-compatible ranges:
- `chai` at v4.x (v5+ is ESM-only)
- `chalk` at v4.x (v5+ is ESM-only)
- `glob` at v10.x (v11+ is ESM-only)

These constraints are enforced through `package.json` dependencies/overrides and repository automation.

## Path-sensitive operations
- Use `scripts/codex-preflight.sh` for multi-step or destructive workflows.
- Use `fd` to visually confirm paths before destructive file operations.
- Verify documented paths exactly before commit (for example `.diagram/` and `FORJAMIE.md` when relevant).
