---
status: complete
priority: p2
issue_id: "REV-002"
tags: ["code-review", "security", "architecture", "documentation"]
dependencies: []
---

# Path validation guidance uses realpath on potentially non-existent output path

## Problem Statement

The proposed `safeOutputPath` example uses `fs.realpathSync` on `outputPath` directly, which throws when the target file/directory does not yet exist. If copied into implementation, this would block normal output-creation flows and weaken the path-hardening strategy.

## Findings

- **Location:** `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md:258-267`
- `safeOutputPath` resolves `outputPath` with `fs.realpathSync(...)` before ensuring file/parent existence.
- For new artifact output paths, callers commonly pass filenames that are not on disk yet.
- As written, this pattern can reject valid paths and produce confusing errors, reducing deterministic behavior.

## Proposed Solutions

### Option 1: Resolve parent path safely before canonicalizing target

**Approach:** Validate and canonicalize using `path.resolve` + parent realpath, and reject traversal only after confirming normalized path is under project root.

**Pros:**
- Handles new/non-existent output paths robustly.
- Keeps symlink checks feasible via parent-path resolution.

**Cons:**
- Slightly more verbose path handling logic.

**Effort:** Small-Medium (1-2 hrs)

**Risk:** Low

### Option 2: Use pre-checks and parent creation path

**Approach:** Pre-create/validate output directories with explicit checks, then canonicalize only existing roots.

**Pros:**
- Clear, auditable validation flow.

**Cons:**
- Potential side effects if performed outside validation-only mode.

**Effort:** Small

**Risk:** Medium

### Option 3: Use a path-safety helper utility

**Approach:** Introduce a shared `normalizeSafeOutputPath` helper and add property-based tests.

**Pros:**
- Reusable across command modes, easy to test.

**Cons:**
- Requires extra test file and usage migration.

**Effort:** Medium

**Risk:** Low

## Recommended Action

**Approved:** Path validation guidance should be hardened for non-existent output paths before implementation. 

## Technical Details

**Affected files (when implemented):**
- `docs/plans/...` (documentation update)
- Potentially `src/workflows/**/*` (if guidance is copied into implementation)

## Resources

- Node.js `fs.realpathSync` behavior docs.
- Security notes already referenced in the plan.

## Acceptance Criteria

- [ ] `safeOutputPath` logic supports non-existent output files.
- [ ] Traversal checks still block symlink/repo-escape attempts.
- [ ] Validation mode succeeds without requiring pre-existing output file.
- [ ] Add regression test for missing output directory behavior.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Inspected path validation pseudocode in Research Insights.
- Identified mismatch between canonicalization behavior and creation flows.

**Learnings:**
- Realpath-based checks need existing-path semantics; resolution strategy should be root-relative for not-yet-existing outputs.

### 2026-02-26 - Approved for Work
**By:** Codex Triage System
**Actions:**
- Issue approved during triage session
- Status changed from pending → ready
- Ready to be picked up and worked on

**Learnings:**
- Path checks should account for not-yet-created output targets; realpath requires existence and should be avoided in this spot.

### 2026-02-26 - Resolved
**By:** Codex Workflow Resolver
**Actions:**
- Issue implemented/triaged into plan updates and documentation artifacts.
- Status changed ready → complete.
- File renamed from pending/ready state to complete.

**Learnings:**
- Resolution was actioned directly in plan and supporting references.
