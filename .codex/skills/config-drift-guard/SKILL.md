---
name: config-drift-guard
description: Validate and diagnose diagram-cli tooling-envelope drift in this repo. Use this skill when work touches docs/agents/tooling.contract.json, scripts/check-environment.sh, scripts/codex-preflight.sh, scripts/verify-work.sh, .codex/environments/environment.toml, or docs that describe local projection behavior.
metadata:
  skill-type: infrastructure_ops
---

# Config Drift Guard

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

Use this skill when a change could reintroduce tooling or startup-envelope drift in `diagram-cli`. Keep tooling contracts, preflight wrappers, and the local Codex environment projection aligned so startup failures are classified correctly.

## When to use

- Editing `docs/agents/tooling.contract.json`, `docs/agents/tooling.md`, `.codex/environments/environment.toml`, or `harness.contract.json` tooling policy sections.
- Editing `scripts/check-environment.sh`, `scripts/codex-preflight.sh`, or `scripts/verify-work.sh`.
- Investigating warnings about missing pinned tools, malformed Codex environment actions, or wrapper/preflight drift.

## Required inputs

- Repo root, defaulting to `~/dev/diagram-cli`.
- The changed files or failing startup/tooling symptoms.
- The current `~/.codex` projection state when the issue may be outside git-tracked files.

## Deliverables

- A classified drift summary tied to the exact failing layer.
- Command evidence for environment contract, preflight, and wrapper checks.
- The next skill handoff when the remaining issue is no longer envelope drift.
- A machine-readable summary that includes `schema_version`.

## Workflow

1. Start with focused surfaces: environment contract, preflight wrapper behavior, and local Codex projection.
2. Start from the repo root and inspect changed files plus current `~/.codex` symlink state.
3. Run the deterministic guard sequence with `bash .codex/skills/config-drift-guard/scripts/run_guard_checks.sh` before editing docs or startup flags.
4. Use the failure cues in [references/triage-sequence.md](./references/triage-sequence.md) to identify the first broken layer.
5. Resolve contradictions in this order: environment/tooling contract, preflight wrapper behavior, verify-work wrapper behavior, then remaining startup symptoms.
6. If environment and wrapper checks pass but startup still fails, switch to [$mcp-startup-triage](../mcp-startup-triage/SKILL.md).
7. Do not mark work complete until scripts, docs, and validator outputs agree on one contract.

## Validation

- Use fail-fast validation: stop at the first failed gate and fix it before continuing.
- `bash .codex/skills/config-drift-guard/scripts/run_guard_checks.sh`

## References

- `references/triage-sequence.md`
  Read when: the guard sequence found a failure and you need symptom-to-layer interpretation.
- `references/contract.yaml`
  Read when: you need the machine-checkable scope, outputs, or non-goals for this workflow.
- `references/evals.yaml`
  Read when: you need trigger coverage or negative/pressure cases for routing review.
- `.codex/skills/config-drift-guard/scripts/run_guard_checks.sh`
  Read when: you want the deterministic validator sequence instead of reconstructing it manually.

## Constraints and Safety

- Do not start by changing `required = false`, wrappers, or startup flags when environment or wrapper checks are still failing.
- Keep docs and scripts aligned in the same change when contract surfaces move.
- Keep `~/.codex` projection diagnostics read-only unless the task explicitly includes projection repair.
- Redact secrets, tokens, and any sensitive identifiers from diagnostics by default.

## Philosophy

- Classify first, edit second: fix the first broken layer before touching downstream flags.
- Prefer canonical contract corrections over workaround toggles.

## Examples

- "Can you validate why `scripts/check-environment.sh` and tooling docs keep drifting in this checkout?"
- "Please inspect preflight and local projection drift after edits to `.codex/environments/environment.toml`."

## Anti-patterns

- Flipping required MCP settings before baseline wrapper checks run.
- Editing docs while preflight and verify wrappers still disagree.

## Failure mode

- If the guard sequence fails, stop at the first broken layer and report it directly.
- If the guard sequence passes but startup still fails, route to `mcp-startup-triage` instead of editing config blindly.
