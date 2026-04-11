# Validation and checks

## Table of Contents
- [Focused validation loop](#focused-validation-loop)
- [Required repository checks](#required-repository-checks)
- [Config and CI edits](#config-and-ci-edits)
- [Skill-gated validation](#skill-gated-validation)
- [Generated artifact hygiene](#generated-artifact-hygiene)
- [Failure reporting](#failure-reporting)

## Focused validation loop
- Run focused checks immediately after each edit.
- Run broader repository checks before final handoff.
- Prefer wrapper scripts for contract-sensitive work instead of ad-hoc command substitutions.

## Required repository checks
- Baseline checks for implementation changes:
  - `npm test`
  - `npm run test:deep`
- Wrapper-based contract check for governance/docs/script changes:
  - `bash scripts/verify-work.sh --fast`
- Tooling envelope check for environment/startup surfaces:
  - `bash scripts/check-environment.sh`
- If CI artifact generation behavior changes, run:
  - `npm run ci:artifacts`

## Config and CI edits
- For changes to `package.json`, workflow files, `.harness/ci-required-checks.json`, `harness.contract.json`, `AGENTS.md`, or `docs/agents/**`, run applicable validation and report pass/fail before committing.
- Never commit configuration or policy changes without validation evidence.

## Skill-gated validation
- Use [`validation-contract-check`](../../.codex/skills/validation-contract-check/SKILL.md) for command/preflight contract drift.
- Use [`config-drift-guard`](../../.codex/skills/config-drift-guard/SKILL.md) for tooling-envelope drift or local projection issues.
- Use [`mcp-startup-triage`](../../.codex/skills/mcp-startup-triage/SKILL.md) when startup failures remain after baseline drift checks.
- Use [`ci-check-name-parity`](../../.codex/skills/ci-check-name-parity/SKILL.md) when required-check naming changes.

## Generated artifact hygiene
- Treat `artifacts/policy/environment-attestation.json` as a signal artifact, not a heartbeat file.
- When it changes, inspect the diff before commit.
- If the diff is timestamp-only noise, restore it:
  - `git restore -- artifacts/policy/environment-attestation.json`
- Keep attestation changes only when non-timestamp policy signals changed and summarize that signal in validation evidence.

## Failure reporting
- Record exact failing command outputs for validation failures.
- Distinguish pre-existing failures from regressions introduced in the current run.
- Use explicit outcomes: `pass`, `fail`, or `blocked` with blocker reason.
