---
status: complete
priority: p2
issue_id: "014"
tags: ["code-review", "quality", "architecture", "machine-output"]
dependencies: []
---

# Define deterministic mode precedence for combined flags (`--validate-only`, `--attest`, `--verify`, `--open`)

## Problem Statement

The plan references several execution modifiers but does not provide a strict precedence matrix. Without explicit sequencing, implementations risk mixing side-effect and verification behaviors (e.g., `--verify --attest`, `--validate-only --open`, or `--open` attempts during read-only paths).

## Findings

- `Reproducibility & Attestation` section includes a conditional statement for re-render in verify mode (“No re-render unless explicit `--validate-only`/`--attest` behavior requires it”, line 353-354) that is ambiguous.
- `Output behavior contract` and phase snippets show validate-only and manifest emission as separate branches (lines 546-551, 703-706).
- `Machine output contract` ties status to command-specific exit code but there is no explicit table of terminal states for every flag combination (lines 309-333).
- Acceptance criteria do not include a combined-flag matrix test set.

## Proposed Solutions

### Option 1: Add explicit mode state machine table

**Approach:** Introduce a table in the plan and implementation notes mapping mutually exclusive modes plus allowed combinations with outputs and side effects.

**Pros:**
- Removes ambiguity before implementation.
- Makes automated tests straightforward.

**Cons:**
- Adds documentation and test effort up front.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Make mode flags mutually exclusive where possible

**Approach:** Reject conflicting combinations at argument-parse layer (e.g., `--verify` with `--attest`, `--validate-only` with `--open`).

**Pros:**
- Simplifies runtime behavior and reduces bug surface.

**Cons:**
- Limits flexible usage patterns and may require user retries.

**Effort:** Small-Medium

**Risk:** Medium

### Option 3: Keep combinations allowed but fully partition side effects

**Approach:** Add explicit execution pipeline branches and tests for all combinations while still permitting all flag usage.

**Pros:**
- Most flexible for future extension.

**Cons:**
- Higher implementation complexity and larger decision matrix.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

**Approved:** Implement **Option 1** as an explicit mode-precedence state machine and terminal matrix.

Use a single deterministic matrix for all CLI mode combinations (`--validate-only`, `--attest`, `--verify`, `--open`), with:

- `--verify` as highest-precedence read-only terminal mode.
- `--validate-only` as validation-only terminal mode (no writes, no launch, no attest).
- `--attest` as a post-validation execution mode that is rejected when paired with `--verify` or `--validate-only` unless explicitly modeled as a separate allowed transition in the matrix.
- `--open` as a post-output side effect only when non-read-only mode allows rendering/output generation.
- Any unsupported or contradictory combination returning stable `E_MODE` diagnostics.
- For every supported combination, document terminal status + side effects + exit code in machine output and tests.

## Technical Details

**Affected files:**
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md` (`Reproducibility & Attestation`, `Output behavior contract`, `Machine output contract`).
- Planned workflow execution orchestration in `src/diagram.js` and downstream workflow modules.

## Acceptance Criteria

- [ ] A machine-readable matrix defines all flag-combination outcomes (status, side effects, outputs, exit code).
- [ ] Unsupported or contradictory combinations return stable `E_MODE` diagnostics.
- [ ] Add tests for at least `--validate-only --attest`, `--verify --open`, and `--verify --manifest` edge combinations.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Cross-referenced flag behavior declarations in execution contract and acceptance text.
- Identified missing precedence table for combined-mode command invocations.

**Learnings:**
- Mode precedence is a high-risk area for implementation drift in command-heavy plans.

## Resources

- Plan sections `### Machine output contract`, `### Reproducibility & Attestation`, `### Output behavior contract`.

### 2026-02-26 - Approved for Work

**By:** Codex Triage System

**Actions:**
- Issue approved during triage session
- Status changed from pending → ready
- Ready to be picked up and worked on

**Learnings:**
- Combined workflow flags need an explicit precedence matrix to prevent contradictory side-effect behavior.

### 2026-02-26 - Resolved

**By:** Codex Workflow Resolver

**Actions:**
- Replaced the placeholder recommended action with a concrete **Option 1** decision: introduce an explicit flag-combination state machine and precedence matrix (including `E_MODE` handling for invalid pairs).
- Updated this TODO status from `ready` to `complete`.
- Defined deterministic execution order and read-only terminal-mode rules for `--verify`, `--validate-only`, `--attest`, and `--open`.

**Learnings:**
- A single precedence contract is required before implementation to prevent mixed side-effect execution paths in combined-flag CLI runs.
