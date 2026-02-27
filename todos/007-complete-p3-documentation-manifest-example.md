---
status: complete
priority: p3
issue_id: "007"
tags: ["code-review", "documentation", "quality"]
dependencies: []
---

# Add manifest example path in documentation usage block

## Problem Statement

The “Documentation Plan” usage example shows a workflow command invocation but omits manifest-related usage, while debug guidance suggests checking `manifest.json`. New contributors may miss the default/optional manifest output contract and reproduce missing-manifest confusion.

## Findings

- **Location:** `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md:564-590`
- Usage snippet at line 584 demonstrates `diagram workflow state` without `--manifest` and without explicit default path explanation.
- Debug section references `manifest.json`, creating an implicit assumption that this path is always available.

## Proposed Solutions

### Option 1: Add explicit manifest examples

**Approach:** Extend usage examples to include both default and explicit `--manifest` invocations.

**Pros:**
- Improves discoverability and reduces support questions.

**Cons:**
- Slightly longer docs section.

**Effort:** Small

**Risk:** Low

### Option 2: Document strict default behavior near debugging section

**Approach:** Add a short “Default manifest output path” note immediately above debug steps.

**Pros:**
- Minimal doc delta with high clarity gains.

**Cons:**
- Still leaves some ambiguity for users who prefer examples only.

**Effort:** Small

**Risk:** Low

### Option 3: Add a dedicated manifest troubleshooting example

**Approach:** Add a troubleshooting snippet that demonstrates explicit manifest path and default path.

**Pros:**
- Operationally actionable for CI and local debugging.

**Cons:**
- Additional doc maintenance.

**Effort:** Medium

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
- `docs/README.md` (downstream user docs)

**Related Components:**
- Documentation and onboarding docs

**Database Changes:**
- No

## Acceptance Criteria

- [ ] Usage docs include at least one explicit manifest-path example.
- [ ] Debug guidance references the same default path used by the manifest contract.
- [ ] Example and debug text are consistent.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Reviewed Documentation Plan section for completeness and consistency.
- Confirmed mismatch between example usage and debug expectation.

**Learnings:**
- Explicit examples reduce onboarding friction and debugging ambiguity.

### 2026-02-26 - Implemented & Resolved

**By:** Codex Triage Resolver

**Actions:**
- Updated documentation usage examples to include explicit `--manifest` and `--json` examples.
- Clarified debug guidance with default manifest path behavior (`artifacts/manifest.json` when omitted).
- Confirmed diagnostic text now aligns with documented defaults.

**Learnings:**
- Explicitly documenting manifest defaults in usage and troubleshooting reduces operator confusion.

## Resources

- Review target: `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
- Planned CLI contract section on manifest defaults.

## Notes

- Source: `/prompts:workflow-review` document review.
