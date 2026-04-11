# Instruction map

## Table of Contents
- [Scope](#scope)
- [Discovery order](#discovery-order)
- [Route by task](#route-by-task)
- [Repo-local skill routing](#repo-local-skill-routing)

## Scope
Use this folder for progressive-disclosure guidance linked from root `AGENTS.md`.

## Discovery order
1. `../../AGENTS.md`
2. This `docs/agents/` folder
3. Linked task-specific docs and wrappers

## Route by task
- Tooling, shell, preflight, or package-manager concerns: [`02-tooling-policy.md`](02-tooling-policy.md)
- Repo-specific required tooling inventory (generated): [`tooling.md`](tooling.md)
- Validation and required checks: [`03-validation.md`](03-validation.md)
- MCP/external authentication and connectivity preflight: [`04-external-integrations.md`](04-external-integrations.md)
- Git-risk escalation and communication behavior: [`05-git-and-communication.md`](05-git-and-communication.md)
- Contradiction tracking and cleanup policy: [`06-contradictions-and-cleanup.md`](06-contradictions-and-cleanup.md)

## Repo-local skill routing
- Use [`config-drift-guard`](../../.codex/skills/config-drift-guard/SKILL.md) for tooling-envelope or projection drift in `scripts/check-environment.sh`, `scripts/codex-preflight.sh`, `scripts/verify-work.sh`, `docs/agents/tooling.contract.json`, or `.codex/environments/environment.toml`.
- Use [`validation-contract-check`](../../.codex/skills/validation-contract-check/SKILL.md) for validation/preflight contract drift across `AGENTS.md`, `README.md`, `Makefile`, `package.json`, `scripts/**`, and `docs/agents/**`.
- Use [`mcp-startup-triage`](../../.codex/skills/mcp-startup-triage/SKILL.md) for MCP startup failures, Local Memory listener issues, `mise` trust/runtime problems, or `codex mcp list` failures after baseline drift checks.
- Use [`ci-check-name-parity`](../../.codex/skills/ci-check-name-parity/SKILL.md) for required-check name changes across workflows, `.harness/ci-required-checks.json`, and `harness.contract.json`.
