---
status: complete
priority: p2
issue_id: "009"
tags: ["code-review", "architecture", "quality"]
dependencies: []
---

# Unify workflow exit-code and status schema mapping

## Problem Statement

The plan defines multiple conflicting workflow result contracts (`0/1/2`, `workflow.result` statuses, and an example `partialSuccess: 4` exit map). Without one canonical matrix, implementation and tests may diverge, producing unstable automation and unclear recovery behavior.

## Findings

- **Locations:** `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md` lines 493, 98-99, 175-179, 310-319, 503-506, 519-523.
- No single table maps every terminal condition (validate-only success, parse failure, verification drift, open launch failure, partial artifact success) to both `status` and CLI exit code.

## Proposed Solutions

### Option 1: Keep existing CLI exit conventions and keep partial results in `--json`

**Approach:** Use only existing CLI exit codes (`0` success, `1` validation/input failure, `2` usage/config failure) and model partial output conditions as non-blocking diagnostics in `--json` + warnings.

**Pros:**
- Aligns with existing `diagram.js` command style already planned in acceptance criteria.
- Minimal CLI behavior change from baseline, easier migration.

**Cons:**
- Partial success conditions become implicit and may be under-tested without clear status taxonomy.

**Effort:** Small

**Risk:** Low

### Option 2: Expand and version exit-code contract explicitly

**Approach:** Define and document a versioned matrix including a dedicated partial-success code (or explicit status-to-exit mapping) and apply it consistently across both workflows.

**Pros:**
- Explicitly communicates nuanced outcomes (`validation-only`, `verify-failed`, partial launch failures).
- Better machine-driven orchestration semantics.

**Cons:**
- Requires updating existing command callers and tests.
- Potentially increases consumer migration effort.

**Effort:** Medium

**Risk:** Medium

### Option 3: Introduce a separate `--json`-only result contract and keep CLI exit stable

**Approach:** Add strict `workflow.result` status taxonomy but preserve CLI exits to baseline values; use status detail/`diagnostic.code` for precision.

**Pros:**
- Stable user-facing CLI semantics with machine-parseable rich status.
- Easier backward compatibility.

**Cons:**
- Consumers must read `--json` for full fidelity.

**Effort:** Small

## Recommended Action

**Approved:** Adopt **Option 3** as the canonical contract (`workflow.result` controls nuance; CLI exits remain stable `0/1/2`).

Use one terminal mapping table for both `workflow state` and `workflow pr`:
- `validate-only` success, full success, and `ok` + non-blocking launch/optional-artifact warnings: `status` = `ok`, `exitCode` = `0`
- Validation/parsing/schema failure: `status` = `validation-failed`, `exitCode` = `1`
- Usage/config/policy/precondition failure (missing required paths, binary policy, malformed CLI combinations): `status` = `config-error`, `exitCode` = `2`
- Verification drift (`--verify` mismatch): `status` = `verification-failed`, `exitCode` = `1`
- Partial artifact completion (manifest exists but non-critical output missing/skipped): `status` = `partial-success`, `exitCode` = `0` with `warnings[]` diagnostics
- Remove `partialSuccess: 4` from docs and `commandExit` examples to avoid contract conflict.

Document this in both the command pattern and `--json` schema sections, and require tests to assert both `status` and exit code for every terminal outcome.

## Technical Details

**Affected files:**
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md` (sections: `## Technical Considerations`, `### Machine output contract (\`--json\`)`, `## Acceptance Criteria`)
- Planned command implementation (`src/diagram.js`) and workflow runners

**Related components:**
- CLI exit handling and diagnostic code taxonomy.

**Database changes:**
- No

## Resources

- Review target: `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
- Existing command conventions in `src/diagram.js`
- CLI guidance: `clig.dev`

## Acceptance Criteria

- [ ] One canonical mapping table defines exit code + `--json.status` for all terminal outcomes.
- [ ] Plan explicitly documents that partial launch failures do not mutate exit code unless execution fails.
- [ ] Tests assert this mapping in both workflow state and workflow pr.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Reviewed conflicting status and exit-code representations in the plan.
- Identified missing explicit mapping for verify and partial-output scenarios.

**Learnings:**
- Inconsistent status models are a frequent source of integration defects.

## Notes


### 2026-02-26 - Approved for Work

**By:** Codex Triage System

**Actions:**
- Issue approved during triage session
- Status changed from pending → ready
- Ready to be picked up and worked on

**Learnings:**
- Exit-code and machine status contracts need one canonical mapping to keep CI/tooling behavior deterministic.

### 2026-02-26 - Resolved

**By:** Codex Workflow Resolver

**Actions:**
- Chosen a concrete recommended action: **Option 3** with explicit terminal status mapping (`ok`, `validation-failed`, `config-error`, `verification-failed`, `partial-success`) over stable CLI exits `0/1/2`.
- Removed the ambiguous `partialSuccess: 4` conflict by making partial conditions a machine-status variant (`partial-success`) that stays at exit `0` unless execution truly fails.
- Updated this TODO status to `complete` and appended a resolved decision log for audit continuity.

**Learnings:**
- A single canonical table reduces ambiguity between `workflow.result.status` and command exit semantics, especially for optional post-render side effects.
