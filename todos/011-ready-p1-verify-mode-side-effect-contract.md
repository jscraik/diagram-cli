---
status: complete
priority: p1
issue_id: "011"
tags: ["code-review", "security", "architecture", "workflow"]
dependencies: []
---

# Enforce read-only semantics for `--verify`

## Problem Statement

The plan defines `--verify` as read-only, but still defines manifest/provenance defaults and `--manifest` behavior that can cause filesystem writes unless explicitly gated. This can undermine replay verification guarantees and make `--verify` unsuitable for trusted diff or integrity checks.

## Findings

- `--verify <path>` is documented as read-only in `Reproducibility & Attestation` section: line 352-354 states no launch and no side-effectful optional steps unless explicitly requested.
- `Manifest contract` lines 394-395 require default manifest emission when `--manifest` is omitted in V1 docs, and `--json`/`--manifest` are treated as independent output channels.
- `Acceptance criteria` and deep-review snippet include validate-only no-write behavior but do not include a strict no-write assertion for `--verify`.
- Inconsistent phase text includes execution steps and launch behavior (lines 446-447 and 703-705) that imply additional steps may run after validation, but `--verify` does not state an explicit denylist.

## Proposed Solutions

### Option 1: Add a hard `VERIFY_ONLY` mode that bypasses all writes and launches

**Approach:** Define explicit command mode precedence where `--verify` forces read-only pipeline: parse manifest/provenance, recompute digests, compare, emit diagnostics, and exit before any artifact render/write/open logic.

**Pros:**
- Preserves trust guarantees for replay checks.
- Makes `--verify` safe for CI and incident workflows.

**Cons:**
- Requires explicit branching in command/runner implementations and tests.

**Effort:** Small

**Risk:** Medium

---

### Option 2: Add explicit denylist of write/open hooks in verify path

**Approach:** Keep shared pipeline code but guard all write/open helpers behind `if (!verifyMode)` checks.

**Pros:**
- Minimal refactor to existing command flow.
- Centralizes enforcement if helper functions are reused.

**Cons:**
- More chances of accidental bypass if helper calls are missed.

**Effort:** Medium

**Risk:** Medium

### Option 3: Add a separate `--write` escape hatch for verify workflows

**Approach:** Keep current `--verify` model but add explicit `--verify --write` only when intentionally re-rendering outputs.

**Pros:**
- Keeps fast replay checks default-safe.
- Lets power users force regeneration when needed.

**Cons:**
- Adds one more CLI flag and edge-case in docs/tests.

**Effort:** Medium

**Risk:** Low

## Recommended Action

**Option 1 selected: Add a hard `VERIFY_ONLY` mode that bypasses all writes and launches**

Enforce an explicit `VERIFY_ONLY` execution mode at the command boundary so `--verify` performs only manifest/provenance parsing and digest comparisons, emits diagnostics, and exits before any manifest/provenance output, artifact render/write, open, or attest helpers are called. This provides a single, auditable no-side-effect path for CI and trusted replay checks.

## Technical Details

**Affected files:**
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md` (`Reproducibility & Attestation`, `Manifest contract`, `Output behavior contract`, `Technical Considerations`).
- Planned implementation in `src/diagram.js` and workflow runners.

**Related components:**
- Manifest/provenance writer
- Open helper helpers
- Exit-code and status mapping logic

## Acceptance Criteria

- [ ] `--verify` mode never creates/updates `--output`, `--manifest`, or provenance artifacts.
- [ ] `--verify` ignores `--open`, `--attest`, and any write-capable helper paths unless explicit override is added.
- [ ] Tests assert zero filesystem writes and zero launcher invocations during successful and failed `--verify` runs.
- [ ] `--verify` failure modes return a machine-readable mismatch report without writing side effects.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Reviewed plan sections for `--verify`, manifest defaults, and validation/output side-effect contracts.
- Identified conflicts between read-only guarantees and default manifest emission text.

**Learnings:**
- Side-effect-safe verify mode requires explicit mode gating, not inference from current prose alone.

## Resources

- Plan target: `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
- Exit/contract references: `--verify` and manifest sections in lines 334-361 and 393-397

### 2026-02-26 - Approved for Work

**By:** Codex Triage System

**Actions:**
- Issue approved during triage session
- Status changed from pending → ready
- Ready to be picked up and worked on

**Learnings:**
- Verify mode must be explicitly enforced as read-only to preserve integrity and audit trust boundaries.

### 2026-02-26 - Resolved

**By:** Codex Triage Resolution

**Actions:**
- Confirmed concrete implementation direction: Option 1 (`VERIFY_ONLY` hard read-only mode).
- Captured final contract text so `--verify` is treated as a strict no-write, no-launch path unless a future explicit override is added.

**Learnings:**
- Hard mode gating at pipeline entry is less error-prone than scattered helper guards for `--verify` side-effect protection.
