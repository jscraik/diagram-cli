---
status: complete
priority: p2
issue_id: "010"
tags: ["code-review", "product", "quality"]
dependencies: []
---

# Limit V1 launch modes to outputs available today

## Problem Statement

The plan includes V1 `--open` values and launch candidates (`video`, `prompt-pack`, `manifest`) before a release-ready definition of output format and availability. This creates potential user-facing ambiguity and risks acceptance failures if implementations cannot satisfy the documented contract.

## Findings

- **Locations:** `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md` lines 249-248, 258-299, 998-1004.
- No V1 implementation target list in the same section documents concrete `video` output generation.

## Proposed Solutions

### Option 1: Constrain `--open` to currently defined outputs in V1

**Approach:** Keep `--open` limited to `none|auto|html|all` for PR and `none|auto|html|all` for state, where `all` currently means only supported artifact kinds.

**Pros:**
- Clear user contract for V1.
- Easier automated testing with deterministic outputs.

**Cons:**
- Slightly less future-proof; `video` support deferred.

**Effort:** Small

**Risk:** Low

### Option 2: Mark `video` and non-html/mermaid opens as opt-in V2 behavior

**Approach:** Preserve existing syntax for future compatibility but add docs/validation that these kinds are unsupported until v2, returning `E_OPEN_UNSUPPORTED` while continuing command success.

**Pros:**
- Avoids breaking command surface stability for planned extension.
- Clear migration path without forcing new flags immediately.

**Cons:**
- Requires additional validation + compatibility tests.

**Effort:** Medium

**Risk:** Medium

### Option 3: Introduce explicit output capability metadata in `--json`

**Approach:** Add machine output field listing available launch candidates for each invocation and use it to gate `--open` behavior.

**Pros:**
- Allows tooling to inspect capability before invoking open mode.
- Scales cleanly when video output is introduced later.

**Cons:**
- More schema complexity for `workflow.result`/manifest contract.

**Effort:** Medium

**Risk:** Low

## Recommended Action

**Approved:** Constrain V1 `--open` values to currently guaranteed outputs (`none|auto|html|all`) and treat any V2-only values (`video`, non-HTML/manifest candidates) as unsupported with deterministic non-blocking warning behavior (`E_OPEN_UNSUPPORTED`) until explicitly introduced in V2.

## Technical Details

**Affected files:**
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md` (sections: `### Artifact launch contract`, `### Auto launch of HTML/video artifacts`, `## Documentation Plan`)
- Planned command implementation for launch helper in `src/diagram.js`

**Related components:**
- Artifact emitters for Mermaid and PR HTML outputs.

**Database changes:**
- No

## Resources

- Review target: `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
- Planned documentation updates for `docs/README.md`

## Acceptance Criteria

- [ ] V1 launch matrix includes only output kinds that are guaranteed to exist in V1.
- [ ] Unsupported `--open` requests return deterministic warnings, not failure.
- [ ] Docs and examples reflect deferred V2 `video` behavior clearly.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Reviewed launch contract and output candidate definitions in the plan.
- Compared against current V1 output set for state and pr flows.

**Learnings:**
- Explicit capability scoping prevents user-facing ambiguity and acceptance mismatches.

## Notes


### 2026-02-26 - Approved for Work

**By:** Codex Triage System

**Actions:**
- Issue approved during triage session
- Status changed from pending → ready
- Ready to be picked up and worked on

**Learnings:**
- V1 launch modes should only advertise artifacts guaranteed by the V1 capability set.

### 2026-02-26 - Resolved

**By:** Codex Workflow Resolver

**Actions:**
- Chosen concrete V1 launch policy: `--open` shall only accept values backed by guaranteed V1 outputs.
- Defined explicit deferred support handling for `video` and other V2-only launch modes via deterministic unsupported warnings.
- Issue status updated from `ready` → `complete`.

**Learnings:**
- Deferring unsupported launch kinds through warning-only behavior preserves the command surface for future V2 expansion while keeping V1 deterministic.
