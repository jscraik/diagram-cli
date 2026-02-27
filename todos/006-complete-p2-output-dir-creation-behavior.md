---
status: complete
priority: p2
issue_id: "006"
tags: ["code-review", "architecture", "quality"]
dependencies: []
---

# Undefined output-directory creation behavior for workflow artifacts

## Problem Statement

The path-hardening guidance resolves parents without documenting when and how non-existent output directories are created. This can leave the implementation with a behavior gap: either hard-failing unexpectedly on valid paths (if directories are not auto-created) or creating directories in unverified locations in validation mode.

## Findings

- **Location:** `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md:263-287`, `:260-274`
- `safeOutputPath` returns a resolved target path but does not define the contract for directory creation, and validation phase behavior is not explicitly specified.
- Acceptance criteria require predictable artifact emission, so directory behavior needs to be deterministic between `--validate-only` and render modes.

## Proposed Solutions

### Option 1: Define explicit create policy in validation phase

**Approach:** Specify that validation checks path safety only and does not mutate filesystem; render/write phase creates directories explicitly.

**Pros:**
- Keeps validation pure and deterministic.
- Reduces side effects before explicit execution.

**Cons:**
- Requires explicit error/retry flow when write stage fails.

**Effort:** Small

**Risk:** Low

### Option 2: Add explicit `--create-output-dir` flag

**Approach:** Decouple safety validation from creation by making directory creation opt-in.

**Pros:**
- Gives operators explicit control.
- Avoids surprise side effects.

**Cons:**
- Additional flag increases surface area.

**Effort:** Medium

**Risk:** Medium

### Option 3: Auto-create only on artifact render

**Approach:** Validate target path in check phase and create missing parents only during successful artifact render.

**Pros:**
- Simpler UX for common cases.
- Prevents stray directory creation in validation-only runs.

**Cons:**
- Requires explicit failure messaging and rollback strategy when partial writes occur.

**Effort:** Medium

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
- Planned workflow implementation in `src/diagram.js` and path handling utilities

**Related Components:**
- Command runner, artifact writer, manifest generation

**Database Changes:**
- No

## Acceptance Criteria

- [ ] Plan documents deterministic directory behavior for `--validate-only` and write phases.
- [ ] Plan documents error message for missing output directories in validation and render modes.
- [ ] Write phase handles missing directories safely and predictably.
- [ ] No filesystem mutations occur during validation-only path checks.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Checked `safeOutputPath` example and acceptance criteria for output lifecycle coverage.
- Confirmed missing definition of directory creation policy.

**Learnings:**
- Directory lifecycle policy should be explicitly documented to prevent inconsistent runtime behavior.

### 2026-02-26 - Implemented & Resolved

**By:** Codex Triage Resolver

**Actions:**
- Added explicit `validate-only` output behavior: no filesystem mutation during validation.
- Defined render-phase directory creation contract and partial-write cleanup guidance.
- Added concrete sample code path showing deferred creation (`createParents`) after successful validation.

**Learnings:**
- Separating validation and render side effects is key to predictable pipeline behavior.

## Resources

- Review target: `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
- Command contract sections: Planned command surface and Technical Considerations

## Notes

- Source: `/prompts:workflow-review` document review.
