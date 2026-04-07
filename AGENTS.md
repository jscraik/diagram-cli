---
schema_version: 1
---

# Repository Guidelines

This repository contains the `diagram-cli` Node.js tool for static codebase architecture diagrams.

## Table of Contents

- [Mandatory workflow snippet](#mandatory-workflow-snippet)
- [Required essentials](#required-essentials)
- [Global discovery order](#global-discovery-order)
- [Instruction docs](#instruction-docs)
- [Preflight Enforcement (REQUIRED)](#preflight-enforcement-required)
- [References (informational)](#references-informational)
- [CLI Usage (Robot Mode)](#cli-usage-robot-mode)

## CLI Usage (Robot Mode)

When operating `diagram-cli` autonomously, use the normalized commands:

- `validate` (formerly `test`)
- `generate-all` (formerly `all`)
- `generate-video` (formerly `video`)
- `generate-animated` (formerly `animate`)
Use `--format <type>` instead of `--json`.
The CLI has fallback logic to forgive minor syntax mistakes with a helpful warning, and provides detailed error context when it completely misunderstands your intent.

## Mandatory workflow snippet

1. Explore project first, then invoke skill.
2. IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any React, Tauri, Apps-SDK-ui, Tailwind, Vite, Storybook + Chat Widget tasks.
3. Add a Table of Contents for docs.

## Required essentials

- Package manager: npm.
- Default shell: `zsh -lc`.
- Preferred tools: `rg`, `fd`, `jq`.
- Execution mode: single-threaded by default; do not parallelize or spawn subagents unless explicitly requested.
- Validation baseline: run `npm test` and `npm run test:deep` after implementation changes.

## Global discovery order

1. `/Users/jamiecraik/.codex/AGENTS.md`
2. Nearest repo `AGENTS.md`
3. Linked instruction files under `docs/agents/`
4. If instructions conflict and precedence is unclear, pause and ask which one wins.

## Instruction docs

- [Instruction map](docs/agents/01-instruction-map.md)
- [Tooling and command policy](docs/agents/02-tooling-policy.md)
- [Validation and checks](docs/agents/03-validation.md)
- [External integrations](docs/agents/04-external-integrations.md)
- [Git workflow and communication](docs/agents/05-git-and-communication.md)
- [Contradictions and cleanup](docs/agents/06-contradictions-and-cleanup.md)

## Preflight Enforcement (REQUIRED)

- Use `scripts/codex-preflight.sh` before multi-step, destructive, or path-sensitive workflows.
- Source and run: `source scripts/codex-preflight.sh && preflight_repo`.
- If the helper is unavailable, run the manual checks documented in [tooling policy](docs/agents/02-tooling-policy.md).

## References (informational)

- Global protocol: `/Users/jamiecraik/.codex/AGENTS.md`
- Security baseline: `/Users/jamiecraik/.codex/instructions/standards.md`
- RVCP source of truth: `/Users/jamiecraik/.codex/instructions/rvcp-common.md`
