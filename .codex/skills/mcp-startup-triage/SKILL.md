---
name: mcp-startup-triage
description: Diagnose and classify MCP and Local Memory startup failures in this repo. Use this skill when codex mcp list, Codex startup, hook startup, mise trust, or Local Memory listener checks fail.
metadata:
  skill-type: infrastructure_ops
---

# MCP Startup Triage

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

Use this skill to classify startup failures before editing config blindly. It separates path drift, `mise` trust/runtime selection, handshake incompatibility, auth or consent rejection, Local Memory listener failures, and login-shell drift.

## When to use

- `codex mcp list` fails or a new session dies during startup.
- Errors mention `connection closed: initialize response`, `user rejected MCP tool call`, `No version is set for shim`, or repeated hook startup failures.
- Local Memory checks fail on port `3002` or the preflight local-memory lane cannot complete.

## Required inputs

- The startup symptom or failing command output.
- Repo root, defaulting to `~/dev/diagram-cli`.
- Confirmation that config-drift baseline checks have run, or the evidence needed to run them first.

## Deliverables

- A startup blocker class, not just a loose symptom description.
- Command evidence for Local Memory, `mise`, and MCP startup surfaces.
- The smallest safe next action for the specific blocker class.
- A machine-readable summary that includes `schema_version`.

## Workflow

1. Run the tooling-envelope baseline first with [$config-drift-guard](../config-drift-guard/SKILL.md).
2. Classify the remaining failure using the taxonomy in [references/failure-taxonomy.md](./references/failure-taxonomy.md).
3. Verify Local Memory with `bash scripts/codex-preflight.sh --repo-fragment local-memory --mode optional` from the repo root.
4. Use `codex mcp list` to separate required-startup failures from later tool-call auth or consent failures.
5. Only change runtime selection, required flags, or wrappers after the blocker class is explicit.

## Validation

- Use fail-fast validation: stop at the first failed gate and fix it before continuing.
- `bash scripts/codex-preflight.sh --repo-fragment local-memory --mode optional`
- `codex mcp list`
- `lsof -nP -iTCP:3002`

## References

- `references/failure-taxonomy.md`
  Read when: you need to map a symptom to the correct startup blocker class.
- `references/contract.yaml`
  Read when: you need the machine-checkable trigger, output, and risk contract.
- `references/evals.yaml`
  Read when: you need routing and pressure-test cases for startup triage.

## Constraints and Safety

- Do not rewrite config or flip `required` flags before the blocker class is identified.
- Treat `codex mcp list` and Local Memory listener state as separate signals; one does not prove the other.
- Keep path-drift, handshake, and auth failures distinct in the final report.
- Redact secrets, tokens, and any sensitive identifiers from command output by default.

## Philosophy

- Separate symptom from cause: classify by blocker class before suggesting fixes.
- Preserve operator trust by avoiding speculative config edits.

## Examples

- "Can you diagnose why `codex mcp list` fails with `connection closed: initialize response` right after startup?"
- "Help me validate whether this is a Local Memory listener issue or an MCP handshake issue."

## Anti-patterns

- Disabling required servers before blocker classification.
- Treating `running` process state as proof that the listener is healthy.

## Failure mode

- If config-drift baseline has not run, stop and run it first.
- If the failure class is still ambiguous after the validation sequence, report the competing hypotheses explicitly instead of making a speculative config edit.
