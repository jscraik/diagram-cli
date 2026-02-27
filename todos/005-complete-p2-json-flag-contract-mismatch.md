---
status: complete
priority: p2
issue_id: "005"
tags: ["code-review", "architecture", "documentation"]
dependencies: []
---

# Unclear `--json` contract in planned workflow commands

## Problem Statement

The plan includes `--json` in the suggested shared flag set and best-practices notes, but the v1 command surface and acceptance criteria never define concrete `--json` behavior for either `workflow state` or `workflow pr`. This leaves implementation ambiguity about whether JSON output is expected, and if so, what schema/versioning and payload are required.

## Findings

- **Location:** `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md:76-92`, `:185-186`, `:461-484`
- The command pattern section lists `sharedFlags: ["--output", "--validate-only", "--json", "--manifest", "--version"]`.
- Planned command examples do not include `--json` and no acceptance criterion explicitly tests machine-readable JSON output.
- This mismatch can produce an implementation discrepancy between research intent and testable contract.

## Proposed Solutions

### Option 1: Define and keep `--json` as a required machine-output mode

**Approach:** Document exact JSON schema version, schema fields, and where `--json` output is written for both `workflow state` and `workflow pr`.

**Pros:**
- Clear machine-readable output path for automation.
- Reduces ambiguity for implementers and test writers.

**Cons:**
- Requires drafting and maintaining an additional contract document.

**Effort:** Medium

**Risk:** Medium

### Option 2: Remove `--json` from all planned interfaces

**Approach:** Strip `--json` from shared flags and best-practice notes, then keep manifest+artifact outputs as the machine interface.

**Pros:**
- Narrow interface scope in V1.
- Fewer flags to design and test.

**Cons:**
- Loses an explicit machine-output mode if needed by downstream tooling.

**Effort:** Small

**Risk:** Low

### Option 3: Introduce `--machine-output` instead of `--json`

**Approach:** Replace `--json` with a clearly versioned `--machine-output`/`--json-schema` pair.

**Pros:**
- Explicitly communicates machine-output intent and avoids overloading generic `--json` semantics.

**Cons:**
- Requires docs/spec updates across sections and examples.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows.md`
- Planned CLI implementation (`src/diagram.js`, command option definitions in implementation phase)
- Any schema/docs artifacts for machine output

**Related Components:**
- CLI flag/command design
- Automation/test contract definitions

**Database Changes:**
- No

## Acceptance Criteria

- [ ] Plan explicitly states whether `--json` is supported and stable.
- [ ] If supported, schema and output example are defined and testable.
- [ ] If not supported, all mentions of `--json` are removed from plan guidance.
- [ ] New acceptance test added for schema/flag behavior.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Reviewed command surface and command-pattern sections for flag contract consistency.
- Verified JSON-related references are present in early research insights but not in implementation details.

**Learnings:**
- Vague machine-output mentions in planning docs should be resolved before coding to avoid contract drift.

### 2026-02-26 - Implemented & Resolved

**By:** Codex Triage Resolver

**Actions:**
- Added an explicit `--json` machine-output contract in the plan with schema version `workflow.result/0.2.0`.
- Included shared plan coverage for both success and failure `--json` behavior.
- Updated command surface and acceptance criteria to validate JSON contract.

**Learnings:**
- Stable machine-output contracts prevent implementation ambiguity between docs and code.

## Resources

- Review target: `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
- `src/diagram.js` (planned command integration target)

## Notes

- Source: `/prompts:workflow-review` document review.
