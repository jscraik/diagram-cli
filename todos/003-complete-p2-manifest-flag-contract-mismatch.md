---
status: complete
priority: p2
issue_id: "REV-003"
tags: ["code-review", "architecture", "clarity"]
dependencies: []
---

# Inconsistent CLI contract for manifest generation flag

## Problem Statement

The plan mixes CLI contract conventions: shared flags include `--manifest`, but the planned command examples do not define `--manifest` usage, while manifest output is a central acceptance requirement. This inconsistency can lead to implementation drift or ambiguous API surface.

## Findings

- **Location:** `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md:91,185,186,430`
- SharedFlags list includes `--manifest`.
- Planned command examples for `workflow state` / `workflow pr` do not advertise `--manifest`.
- Acceptance criteria expects artifact manifest output in both workflows.

## Proposed Solutions

### Option 1: Define explicit manifest contract

**Approach:** Add explicit flag behavior (required/optional, path default, output location) and keep command examples aligned.

**Pros:**
- Clarifies expected interface immediately.
- Prevents agent-to-agent ambiguity during implementation.

**Cons:**
- Slightly increases documentation volume.

**Effort:** Small

**Risk:** Low

### Option 2: Make manifest always-on and remove `--manifest`

**Approach:** Remove `--manifest` from sharedFlags and define manifest output as a default artifact with optional alternate filename flag.

**Pros:**
- Simpler API for users.

**Cons:**
- Reduces flexibility for workflows that may not want manifest output.

**Effort:** Medium

**Risk:** Medium

### Option 3: Add `--emit-manifest` mode

**Approach:** Preserve `--manifest` and define behavior in `--manifest-only`/`--emit-manifest` mode with clear precedence rules.

**Pros:**
- Keeps explicitness while retaining flexibility.
**Cons:**
- Adds complexity to command semantics.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

**Approved:** Canonicalize and align manifest flag contract (`--manifest`) across shared flags, examples, and acceptance criteria before implementation.

## Technical Details

**Affected files:**
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
- Future implementation CLI docs and help output.

## Resources

- Plan sections: `Planned command surface (v1)` and `Acceptance Criteria`.

## Acceptance Criteria

- [ ] CLI contract lists manifest behavior consistently in one canonical place.
- [ ] `--manifest` and manifest output behavior are either both documented and supported, or both removed consistently.
- [ ] No contradictions remain between acceptance criteria and command examples.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Compared manifest references across plan sections for contract consistency.

**Learnings:**
- The plan should treat manifest as first-class output with a single, unambiguous CLI model.

### 2026-02-26 - Approved for Work
**By:** Codex Triage System
**Actions:**
- Issue approved during triage session
- Status changed from pending → ready
- Ready to be picked up and worked on

**Learnings:**
- Mixed documentation surfaces for the same CLI contract is a common source of implementation ambiguity.

### 2026-02-26 - Resolved
**By:** Codex Workflow Resolver
**Actions:**
- Issue implemented/triaged into plan updates and documentation artifacts.
- Status changed ready → complete.
- File renamed from pending/ready state to complete.

**Learnings:**
- Resolution was actioned directly in plan and supporting references.
