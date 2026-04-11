---
name: ci-check-name-parity
description: Validate and align required-check names across GitHub workflows, .harness/ci-required-checks.json, harness.contract.json, and repo docs. Use this skill when CI check names or required-check policy changes.
metadata:
  skill-type: ci_cd_deployment
---

# CI Check Name Parity

## Table of Contents
- [When to use](#when-to-use)
- [Required inputs](#required-inputs)
- [Deliverables](#deliverables)
- [Workflow](#workflow)
- [Validation](#validation)
- [References](#references)
- [Constraints and Safety](#constraints-and-safety)
- [Philosophy](#philosophy)
- [Examples](#examples)
- [Anti-patterns](#anti-patterns)
- [Failure mode](#failure-mode)

## Overview

Use this skill when work changes the names or meaning of required checks. It prevents CI policy drift by forcing workflow jobs, required-check declarations, harness contract entries, and docs to stay aligned or to document an intentional mapping explicitly.

## When to use

- Editing `.github/workflows/**`.
- Editing `.harness/ci-required-checks.json` or `harness.contract.json`.
- Editing docs that list required checks or explain the PR pipeline.

## Required inputs

- Repo root, defaulting to `~/dev/diagram-cli`.
- The workflow or policy files that changed.
- Any intended mapping when names differ on purpose.

## Deliverables

- A report of workflow names versus required-check policy names.
- Explicit documentation or propagation changes for any intended rename.
- Validation evidence showing the check-name report and repo test outcome.
- A machine-readable summary that includes `schema_version`.

## Workflow

1. Generate the current name report with `bash .codex/skills/ci-check-name-parity/scripts/report_check_name_drift.sh`.
2. Compare workflow job names, `.harness/ci-required-checks.json`, and `harness.contract.json` using the matrix in [references/comparison-matrix.md](./references/comparison-matrix.md).
3. If names differ intentionally, document the mapping in repo docs instead of leaving silent drift.
4. If a check is renamed, propagate that rename across every source of truth in the same change.
5. Re-run repo validation after the rename or mapping change lands.

## Validation

- Use fail-fast validation: stop at the first failed gate and fix it before continuing.
- `bash .codex/skills/ci-check-name-parity/scripts/report_check_name_drift.sh`
- `npm test`
- `rg -n "pr-template|risk-policy-gate|dependency-(review|scan)|actions-pinning|orb-pinning|consistency-drift-(advisory|health)|docs-gate|security-scan|CodeRabbit" .github/workflows .harness/ci-required-checks.json harness.contract.json AGENTS.md docs/agents -g "*.md" -g "*.json" -g "*.yml"`

## References

- `references/comparison-matrix.md`
  Read when: you need the source map and naming rule before changing policy names.
- `references/contract.yaml`
  Read when: you need the machine-checkable purpose, outputs, and non-goals.
- `references/evals.yaml`
  Read when: you need routing or pressure cases for check-name drift.
- `.codex/skills/ci-check-name-parity/scripts/report_check_name_drift.sh`
  Read when: you want the current mismatch report instead of reconstructing it manually.

## Constraints and Safety

- Do not silently preserve mismatched names across workflow, policy, and docs surfaces.
- If the names differ intentionally, write the mapping down in docs in the same change.
- Treat workflow `name:` values, not just job IDs, as the user-facing required-check surface.
- Redact secrets, tokens, and any sensitive identifiers from logs and reports by default.

## Philosophy

- Treat check-name drift as a contract bug: validate first, then update policy/docs atomically.
- Prefer explicit mapping notes over implicit exceptions when names intentionally differ.

## Examples

- "Can you validate that `pr-pipeline` in GitHub Actions still matches required checks in both policy files?"
- "Help me inspect why `dependency-review` and `dependency-scan` are out of sync across docs and CI config."

## Anti-patterns

- Renaming a workflow check without propagating the change to policy and docs.
- Accepting mismatches with no documented mapping rationale.

## Failure mode

- If the report shows drift and there is no documented intentional mapping, treat that as unresolved policy debt.
- If repo tests fail after a rename, do not claim the policy update is complete.
