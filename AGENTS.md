---
schema_version: 1
---

# Repository Guidelines

This repository contains the `diagram-cli` Node.js tool for static codebase architecture diagrams.

## Table of Contents

- [Mandatory workflow snippet](#mandatory-workflow-snippet)
- [Repo-local skills](#repo-local-skills)
- [Validation contract](#validation-contract)
- [Instruction discovery](#instruction-discovery)
- [Working rules](#working-rules)
- [CLI usage (robot mode)](#cli-usage-robot-mode)

## Mandatory workflow snippet

1. Explore project first, then invoke skill.
2. IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any React, Tauri, Apps-SDK-ui, Tailwind, Vite, Storybook + Chat Widget tasks.
3. Add a Table of Contents for docs you create or substantially rewrite.

## Repo-local skills

- Repo-local Codex skills for this repo live in `.codex/skills/`.
- They are authored and maintained inside this repository; do not treat `~/dev/agent-skills` as their source of truth.
- Use `$config-drift-guard` when work touches `docs/agents/tooling.contract.json`, `scripts/check-environment.sh`, `scripts/codex-preflight.sh`, `scripts/verify-work.sh`, `.codex/environments/environment.toml`, or docs that describe local projection/startup envelope behavior.
- Use `$validation-contract-check` when work changes `AGENTS.md`, `README.md`, `Makefile`, `package.json`, `scripts/codex-preflight.sh`, `scripts/verify-work.sh`, `scripts/check-environment.sh`, or validation/preflight instructions under `docs/agents/**`.
- Use `$mcp-startup-triage` when the task involves MCP startup failures, Local Memory listener failures, `mise` trust/runtime issues, hook startup failures, or `codex mcp list`.
- Use `$ci-check-name-parity` when work changes `.github/workflows/**`, `.harness/ci-required-checks.json`, `harness.contract.json`, or docs that describe required checks.

## Validation contract

- Run shell commands with `zsh -lc` and invoke script files explicitly with `bash`.
- Use `bash scripts/codex-preflight.sh --mode optional` before multi-step, destructive, or path-sensitive workflows.
- Do not source `scripts/codex-preflight.sh`; it is a CLI script, not a sourced shell helper.
- Baseline implementation validation: `npm test` and `npm run test:deep`.
- Contract-sensitive validation for docs/scripts/governance updates: `bash scripts/verify-work.sh --fast`.
- Tooling envelope validation when startup/environment surfaces change: `bash scripts/check-environment.sh`.
- If CI artifact generation behavior changes, run: `npm run ci:artifacts`.
- Do not commit timestamp-only churn in `artifacts/policy/environment-attestation.json`; keep attestation updates only when policy signal fields change.
- Report exact commands run and exact outcomes.

## Instruction discovery

1. Read this file for repo-wide constraints.
2. Read [docs/agents/01-instruction-map.md](docs/agents/01-instruction-map.md) for the front-door instruction map.
3. Open linked instruction docs only after the governing AGENTS file is read.
4. If this file tells you to use a repo-local skill, load the matching `.codex/skills/<skill>/SKILL.md` before deeper docs.

## Working rules

- Prefer repository evidence over memory or prior assumptions.
- Keep updates single-threaded unless the user explicitly requests parallelism.
- If instructions conflict across local docs, pause and ask which rule should win.

## CLI usage (robot mode)

When operating `diagram-cli` autonomously, use the normalized commands:

- `validate` (formerly `test`)
- `generate-all` (formerly `all`)
- `generate-video` (formerly `video`)
- `generate-animated` (formerly `animate`)

Use `--format <type>` instead of `--json`.

The CLI has fallback logic to forgive minor syntax mistakes with a helpful warning, and provides detailed error context when it completely misunderstands intent.
