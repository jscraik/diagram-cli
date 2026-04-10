---
name: validation-contract-check
description: Validate and align the repo's validation and preflight guidance with the live command contract. Use this skill when AGENTS, README, Makefile, package scripts, validators, or preflight docs change.
metadata:
  skill-type: code_quality_review
---

# Validation Contract Check

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

Use this skill when docs or scripts describe how validation works in this repository. The goal is to keep AGENTS guidance, README guidance, package scripts, Makefile targets, and validator docs saying the same thing.

## When to use

- Editing `AGENTS.md`, `README.md`, `Makefile`, `package.json`, `scripts/codex-preflight.sh`, `scripts/verify-work.sh`, or `scripts/check-environment.sh`.
- Editing docs under `docs/agents/**` that mention preflight, validation, quality gates, or workflow entrypoints.
- Comparing wrapper behavior (`scripts/verify-work.sh`) with the baseline npm validation contract.

## Required inputs

- Repository root for the active checkout.
- The changed docs or scripts that mention validation.
- The current command contract from `package.json`, `Makefile`, and live scripts.

## Deliverables

- A reconciled validation contract summary with conflicts removed.
- Updated docs that match the live command contract and entrypoint scope.
- Exact validation evidence for the contract after edits.
- A machine-readable summary that includes `schema_version`.

## Workflow

1. Derive the live contract from `package.json`, `Makefile`, `README.md`, and live scripts before rewriting docs.
2. Check the root `AGENTS.md` and docs in `docs/agents/` for drift.
3. Reject stale sourced-shell examples. `scripts/codex-preflight.sh` is a CLI script and should be invoked with `bash`.
4. Scan shell scripts for `source .../scripts/codex-preflight.sh` and `. .../scripts/codex-preflight.sh` patterns. Treat matches as failures and replace with explicit `bash scripts/codex-preflight.sh ...` invocation.
5. If a workflow name or required-check name changes, route the check to [$ci-check-name-parity](../ci-check-name-parity/SKILL.md).
6. Do not leave duplicate commands with conflicting scopes unexplained.

## Validation

- Use fail-fast validation: stop at the first failed gate and fix it before continuing.
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `bash scripts/verify-work.sh --fast`

## References

- `references/alignment-checklist.md`
  Read when: you need the source-of-truth order or stale patterns to remove.
- `references/contract.yaml`
  Read when: you need the machine-checkable contract for triggers, outputs, and risks.
- `references/evals.yaml`
  Read when: you need routing or pressure cases for contract-drift work.

## Constraints and Safety

- Update lower-authority docs to match live scripts, not the other way around.
- Do not leave sourced-shell examples for `scripts/codex-preflight.sh`.
- Keep repo-wide docs and wrapper-based validation scopes separated when they are intentionally different.
- Redact secrets, tokens, and any sensitive identifiers from logs and documentation examples by default.

## Philosophy

- Derive truth from executable contracts first; docs are downstream artifacts.
- Prefer one explicit command contract per scope rather than duplicated variants.

## Examples

- "Can you help me validate whether AGENTS and README still match `package.json` and `verify-work.sh`?"
- "Please inspect and fix stale preflight instructions that still tell users to source a CLI script."

## Anti-patterns

- Updating docs without checking live scripts.
- Keeping contradictory command examples across repo-wide and codex-subtree docs.

## Failure mode

- If `package.json`, `Makefile`, README, and scripts disagree in a way you cannot resolve from repo evidence, stop and report the contradiction explicitly.
- If validation fails after doc edits, treat the docs as unverified and fix or revert the contract claim before handoff.
