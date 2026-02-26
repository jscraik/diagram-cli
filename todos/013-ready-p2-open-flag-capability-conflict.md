---
status: complete
priority: p2
issue_id: "013"
tags: ["code-review", "quality", "product", "architecture"]
dependencies: []
---

# Clarify `--open` capability matrix and state-machine transitions when mode/outputs conflict

## Problem Statement

The plan accepts `--open` values globally (`html|video|all|auto|none`) but binds different output capabilities per workflow and includes non-viewable artifacts as launch candidates (`manifest`, `prompt-pack`). This leaves ambiguous runtime behavior for modes that request unsupported artifact kinds.

## Findings

- `Planned command surface` shows identical `--open` options for `workflow state` and `workflow pr` (line 245-249).
- `Auto launch` section defines behavior for `state` (`mermaid`, `video`) and `pr` (`html`, `manifest`, `prompt-pack`, `video`) candidates (lines 297-300).
- There is no explicit machine-readable capability map returned by `--json` to let callers query which kinds are currently available before deciding launch mode.
- Existing acceptance criteria requires `--open` behavior to be non-blocking, but no explicit rule is defined for unsupported combinations (e.g., `--open=html` on `workflow state`).

## Proposed Solutions

### Option 1: Add workflow-scoped launch capability in schema

**Approach:** Add a per-command `launchCandidates` field and validate requested `--open` mode against available artifact kinds.

**Pros:**
- Removes guesswork for tool callers and users.
- Keeps `--open=all` behavior deterministic.

**Cons:**
- Requires additional schema fields and tests.

**Effort:** Small

**Risk:** Low

---

### Option 2: Tighten `--open` enum per subcommand

**Approach:** Scope accepted values by subcommand (`state`: `none|auto|video|all` if mermaid preview is textual; `pr`: `none|html|all|auto|video` as supported).

**Pros:**
- Simplifies CLI help and prevents impossible requests.
- Fewer warning paths in runtime.

**Cons:**
- Reduces forward compatibility for future artifact additions.

**Effort:** Medium

**Risk:** Medium

### Option 3: Keep broad enum but require explicit warning code and no-op behavior

**Approach:** Keep current API and add deterministic warning and `launch.unsupported` diagnostics for unavailable artifacts.

**Pros:**
- Maximum forward compatibility with future outputs.
- Minimal CLI surface change.

**Cons:**
- Requires disciplined error-code coverage and consistent diagnostics format.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

**Approved:** Implement **Option 1** (workflow-scoped launch capability map in machine output and validation).

## Technical Details

**Affected files:**
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md` (sections `Artifact launch contract`, `Machine output contract`, `Acceptance Criteria`).
- Planned `workflow` command implementation and launch helper in `src/diagram.js` (or extracted workflow module).

## Acceptance Criteria

- [ ] Each workflow defines an explicit launch capability list and unsupported modes emit non-zero warning class codes.
- [ ] Unsupported `--open` for a given command is deterministic and documented (machine + human output).
- [ ] `--open` never attempts to launch non-viewable artifacts (`manifest`, `prompt-pack`) in V1 unless explicitly gated with a separate flag.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Reviewed launch contract and mode definitions.
- Checked for ambiguity between global flag shape and per-workflow artifact availability.

**Learnings:**
- A capability map in output significantly reduces downstream ambiguity.

## Resources

- Plan `Artifacts launch` sections: lines 250-306.
- Security report finding S2 (`security_best_practices_report.md`).

### 2026-02-26 - Approved for Work

**By:** Codex Triage System

**Actions:**
- Issue approved during triage session
- Status changed from pending → ready
- Ready to be picked up and worked on

**Learnings:**
- Launch behavior must be capability-aware per workflow to avoid ambiguous no-op vs warning outcomes.

### 2026-02-26 - Resolved

**By:** Codex Workflow Resolver

**Actions:**
- Chosen recommended action is **Option 1**: add a workflow-scoped launch capability map and validate `--open` values against available artifact kinds for each workflow.
- Updated TODO status from `ready` to `complete` to reflect triage decision and execution plan acceptance.

**Learnings:**
- Concrete `launchCandidates` metadata by workflow is the most deterministic path and scales cleanly for future artifact additions.
