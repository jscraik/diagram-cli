---
status: complete
priority: p1
issue_id: "008"
tags: ["code-review", "quality", "architecture"]
dependencies: []
---

# Align --validate-only to be side-effect free

## Problem Statement

The plan currently contains conflicting requirements: one section requires `--validate-only` to avoid all filesystem writes, while other sections imply emitting `manifest`/`manifest artifacts` in validate-only mode. This can lead to non-deterministic implementation behavior and breaks testability in CI where `--validate-only` is used for pure preflight checks.

## Findings

- **Locations:** `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md` lines 783-784, 548-552, 394-395, 665 (sample `if validateOnly { ... emitManifest(); return; }`), and phase text around 671-675.

## Proposed Solutions

### Option 1: Explicitly forbid all artifact writes in --validate-only

**Approach:** Define `--validate-only` and `--verify` as pure-read phases that validate inputs, resolve refs, and emit diagnostics only; move all manifest/provenance/artifact writes to the execution phase.

**Pros:**
- Enforces the requirement that validate-only produces zero side effects.
- Makes validation predictable in CI and automation.
- Simplifies idempotency and rollback behavior.

**Cons:**
- Reduces immediate visibility into expected manifest shape before execution.

**Effort:** Small

**Risk:** Medium

---

### Option 2: Scope `--manifest` to execution mode only

**Approach:** Keep `--manifest` optional in both modes but define that manifest is written only when not `--validate-only`; in validation mode render a manifest path in-memory summary in `--json` only.

**Pros:**
- Preserves the value of pre-flight validation while avoiding filesystem writes.
- Gives implementers a clear branch point for behavior.

**Cons:**
- Requires explicit schema for validation-only `--json` payload.

**Effort:** Small

**Risk:** Low

### Option 3: Remove validate-only manifest path requirement from acceptance criteria

**Approach:** Change acceptance to require manifests/artifacts only for execution mode and add explicit negative assertion that validate-only creates no files.

**Pros:**
- Simplifies implementation and aligns with minimal side-effect semantics.

**Cons:**
- Slightly weaker pre-execution confidence unless `--json` output includes sufficient validation summary.

**Effort:** Small

**Risk:** Medium

## Recommended Action

**Decision:** Option 1 selected. `--validate-only` and `--verify` are defined as strict read-only modes. All filesystem writes (including `manifest`, `artifacts`, and `output` emissions) are forbidden until execution mode. Validation may emit diagnostics only (including `--json` summaries), and all write paths such as `safeOutputPath` are evaluated only after validation succeeds in execute mode.

## Technical Details

**Affected files:**
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md` (validate-only contract, `Manifest contract`, `Acceptance Criteria`, `Implementation Phases` section)

**Related components:**
- `--validate-only` execution flow in `workflow state` and `workflow pr`

**Database changes:**
- No

## Resources

- Plan target: `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
- Related design notes: section `Output behavior contract (validate-only vs render)` and phase snippet under `## Implementation Phases`
- Review target plan file: `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
- Related existing todo: `todos/006-complete-p2-output-dir-creation-behavior.md` (for historical context)

## Acceptance Criteria

- [ ] Plan section `Technical Considerations` and `Acceptance Criteria` use the same wording for validate-only side effects.
- [ ] `safeOutputPath` call path and output emission are only executed after validation succeeds in execute mode.
- [ ] A dedicated validation-mode acceptance test asserts no files are created in `artifacts/` or target output directories.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Reviewed conflicting lines in plan around validate-only semantics and manifest emission.
- Identified duplicate, contradictory contracts that could cause side-effect violations if implementation follows phase-gate pseudocode.

**Learnings:**
- The plan needs one canonical contract for validate-only before implementation starts.

## Notes

### 2026-02-26 - Resolved

**By:** Codex Review

**Actions:**
- Marked TODO as complete and documented the final contract decision.
- Confirmed the side-effect strategy: `--validate-only`/`--verify` remain side-effect free.
- Codified that artifact and manifest filesystem output belongs exclusively to execute mode after validation passes.

**Learnings:**
- Validation determinism depends on a single canonical side-effect contract.

### 2026-02-26 - Approved for Work

**By:** Codex Triage System

**Actions:**
- Issue approved during triage session
- Status changed from pending → ready
- Ready to be picked up and worked on

**Learnings:**
- Validate-only behavior must be a strict read-only contract to preserve deterministic preflight checks.
