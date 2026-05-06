---
schema_version: 1
title: "feat: Archscope agent review inevitability plan"
type: feat
status: draft
date: 2026-05-06
origin: docs/specs/2026-05-06-feat-archscope-agent-review-inevitability-spec.md
spec: docs/specs/2026-05-06-feat-archscope-agent-review-inevitability-spec.md
source_spec: docs/specs/2026-05-06-feat-archscope-agent-review-inevitability-spec.md
plan_route: fresh
plan_depth: deep
traceability_required: true
tracking_status: tracked
linear_status: created
linear_issue: JSC-280
linear_url: https://linear.app/jscraik/issue/JSC-280/make-archscope-inevitable-for-coding-agents-and-pr-reviewers
linear_team: Jscraik
linear_priority: Medium
branch: jscraik/jsc-280-make-archscope-inevitable-for-coding-agents-and-pr-reviewers
pr: pending
---

# feat: Archscope agent review inevitability plan

## Table of Contents

- [Plan Mode Decision](#plan-mode-decision)
- [Overview](#overview)
- [Problem Frame](#problem-frame)
- [Linear Work Item Contract](#linear-work-item-contract)
- [Source Trace](#source-trace)
- [Spec / Plan / PR Traceability](#spec--plan--pr-traceability)
- [Scope Boundaries](#scope-boundaries)
- [Assumptions](#assumptions)
- [Technical Review Summary](#technical-review-summary)
- [Key Technical Decisions](#key-technical-decisions)
- [High-Level Technical Design](#high-level-technical-design)
- [Implementation Units](#implementation-units)
- [Concrete Test Scenarios](#concrete-test-scenarios)
- [Acceptance Checklist](#acceptance-checklist)
- [System-Wide Impact](#system-wide-impact)
- [Risks & Dependencies](#risks--dependencies)
- [Rollback Plan](#rollback-plan)
- [Documentation / Operational Notes](#documentation--operational-notes)
- [Validation Ladder](#validation-ladder)
- [Phase Evidence](#phase-evidence)
- [Execution Checkpoints](#execution-checkpoints)
- [First he-work Handoff](#first-he-work-handoff)
- [Sources & References](#sources--references)

## Plan Mode Decision

**Mode:** fresh
**Depth:** deep
**Tracker:** JSC-280

This plan implements the deepened JSC-280 spec. It is intentionally deeper than
the prior product-sharpness plan because the work crosses CLI command identity,
machine output contracts, artifact schemas, PR review summaries, validation
truthfulness, and agent recovery behavior.

The implementation should still be sliced conservatively. The first successful
PR should make `archscope agent` and `archscope agent-pr` inevitable without
creating a second analysis pipeline.

## Overview

Make Archscope the obvious command to run before AI coding agents edit a repo
or reviewers approve a PR:

```bash
archscope agent .
archscope agent-pr . --base origin/main --head HEAD
```

Both commands must reuse the existing `scan` evidence workflow, write the same
core artifacts, and add enough prescriptive guidance that agents can decide
what to read, what to trust, what to skip, and what to do when blocked.

## Problem Frame

Archscope already produces useful evidence through `scan`, but agents still
need to know the product intent from docs and recipes. The command surface
should encode that intent directly. The artifact set also needs to move from
"these files exist" toward "here is the next safe thing to do."

The core implementation problem is delegation without drift:

```text
agent / agent-pr wrappers
  -> one shared scan execution path
  -> same manifest and artifacts
  -> wrapper-aware machine envelope
  -> structured next-safe-action and agent instructions
```

## Linear Work Item Contract

- `linear_status`: created
- Tracker of record: JSC-280
- Linear URL:
  https://linear.app/jscraik/issue/JSC-280/make-archscope-inevitable-for-coding-agents-and-pr-reviewers
- Team: Jscraik
- Priority: Medium
- Current state: Triage
- Branch:
  `jscraik/jsc-280-make-archscope-inevitable-for-coding-agents-and-pr-reviewers`
- PR: pending
- Handoff stage after this plan: `$he-work`

## Source Trace

- Spec:
  `docs/specs/2026-05-06-feat-archscope-agent-review-inevitability-spec.md`
- Prior product-sharpness spec:
  `docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md`
- Prior product-sharpness plan:
  `docs/plans/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-plan.md`
- Live CLI registration:
  `src/diagram.js`
- Current scan orchestration:
  `src/commands/scan.js`
- Machine envelope helper:
  `src/commands/output.js`
- Agent context writer:
  `src/artifacts/agent-context.js`
- Brief writer:
  `src/artifacts/brief.js`
- Evidence manifest writer:
  `src/artifacts/evidence-manifest.js`
- Existing focused tests:
  `test/scan-command.test.js`,
  `test/scan-manifest.test.js`,
  `test/scan-pr-evidence.test.js`,
  `test/scan-error-categories.test.js`,
  `test/scan-evidence-pack.test.js`,
  `test/scan-report-html.test.js`,
  `test/agent-context-contract.test.js`
- Session-collector refresh evidence from May 6, 2026:
  `/tmp/diagram-cli-session-collector.json` and
  `/tmp/diagram-cli-session-evidence/manifest.json`

## Spec / Plan / PR Traceability

| Requirement | Source acceptance IDs | Plan units | Plan acceptance IDs | PR evidence |
| --- | --- | --- | --- | --- |
| Agent entrypoints exist and delegate to scan | SA1-SA4 | P1, P6 | AC1-AC4 | pending |
| Agent context becomes prescriptive | SA5-SA6, SA11, SA17, SA22 | P3, P4 | AC5-AC8 | pending |
| Brief becomes a review decision artifact | SA7, SA11, SA17, SA23 | P4 | AC9-AC11 | pending |
| Terminal and machine output expose next safe action | SA8-SA11, SA20-SA23 | P2, P4 | AC12-AC16 | pending |
| Docs make agent and PR review front door obvious | SA12-SA13 | P5 | AC17-AC18 | pending |
| Validation truthfulness is explicit | SA14, SA20 | P5 | AC19-AC20 | pending |
| Compatibility and bounded architecture are preserved | SA3-SA4, SA15, SA24 | P0, P1, P6 | AC21-AC24 | pending |
| Linear/spec/plan/PR traceability is maintained | SA16, SA18-SA19 | P0, P6 | AC25-AC27 | pending |

## Scope Boundaries

In scope:

- `archscope agent [path]`.
- `archscope agent-pr [path] --base <ref> --head <ref>`.
- Shared scan execution or wrapper delegation with artifact parity.
- Structured `nextSafeAction`.
- Centralized operational blocker normalization.
- Prescriptive `agentInstructions` in `.diagram/agent-context.json`.
- Review-decision sections in `.diagram/brief.md`.
- Wrapper-aware machine envelopes.
- Docs and help ordering for the agent/PR review front door.
- Validation truthfulness around no-op scripts and blocked outcomes.
- Tests extending the existing scan and artifact fixture style.

Out of scope:

- Renaming `@brainwav/diagram`, `diagram-cli`, `.diagram`, or `.diagramrc`.
- Removing `diagram` compatibility.
- Removing media commands.
- Rewriting the analysis pipeline.
- Reworking `.diagram/report.html` visuals.
- Ingesting raw session history into Archscope runtime artifacts.
- Broad refactors under `src/core/analysis-generation-*`.

## Assumptions

- `scan` remains the canonical evidence workflow.
- Wrapper commands should have their own machine `command` identity while
  recording `scan` as delegated behavior.
- `agent-pr` should require `--base`; `--head` may default to `HEAD` only if
  this matches existing `scan` PR behavior during implementation discovery.
- Existing tests should be extended rather than replaced.
- Session-collector evidence is planning evidence, not a runtime dependency.

## Technical Review Summary

The spec review found one main architectural risk: `src/commands/scan.js`
currently holds the scan action inline inside Commander registration. Adding
wrappers by copying that body would create the drift this feature is trying to
avoid.

The preferred path is to extract a shared scan runner from `registerScanCommand`
and register `scan`, `agent`, and `agent-pr` over that runner. If extraction
becomes too large for the first slice, forwarding must be proven with artifact
parity tests and should still expose wrapper-aware machine envelopes.

Current artifact writers are good extension points:

- `src/artifacts/evidence-manifest.js` already models artifact state.
- `src/artifacts/agent-context.js` can own `agentInstructions`.
- `src/artifacts/brief.js` can own review-decision sections.
- `src/commands/output.js` can continue building the common envelope.

## Key Technical Decisions

1. **One evidence path:** `agent` and `agent-pr` must delegate to the scan
   evidence path and must not introduce a separate analysis pipeline.
2. **Wrapper identity remains visible:** machine output should use the invoked
   command name and include `data.delegatedCommand: "scan"`.
3. **Structured next-safe-action:** add an object, not just prose, so agents
   can branch safely.
4. **Central blocker normalization:** classify operational friction once and
   reuse it across terminal text, machine output, brief, and agent context.
5. **Manifest remains source of artifact truth:** do not create a second
   artifact-state contract.
6. **Validation truthfulness is product behavior:** no-op checks must be named
   as not configured when they appear in authoritative surfaces.

## High-Level Technical Design

```text
src/diagram.js
  registers scan, agent, agent-pr

src/commands/scan.js
  exports shared scan runner
  keeps scan command registration thin
  builds summary + machine envelope inputs

src/commands/agent.js or scan registration helper
  registers agent wrappers
  supplies invoked command and scanEquivalent metadata

src/commands/operational-friction.js
  normalizes errors and blockers
  returns OperationalFrictionSignal + NextSafeAction

src/artifacts/agent-context.js
  writes agentInstructions from manifest/errors/pr/nextSafeAction

src/artifacts/brief.js
  writes decision sections from manifest/errors/pr/nextSafeAction
```

Exact helper filenames may change during implementation, but the plan requires
one central normalization surface and one shared scan execution surface.

## Implementation Units

### P0. Planning Baseline and Guardrails

Purpose: lock the implementation boundary before code changes.

Files to inspect:

- `src/diagram.js`
- `src/commands/scan.js`
- `src/commands/output.js`
- `src/artifacts/agent-context.js`
- `src/artifacts/brief.js`
- `src/artifacts/evidence-manifest.js`
- `test/scan-command.test.js`
- `test/scan-manifest.test.js`
- `test/scan-pr-evidence.test.js`

Deliverables:

- Confirm whether shared scan runner extraction is small enough for P1.
- Confirm wrapper envelope command semantics.
- Confirm whether `agent-pr` requires both refs or defaults `--head HEAD`.

Acceptance:

- AC1: implementation starts from a documented scan-runner strategy.
- AC2: no source file under `src/core/analysis-generation-*` is touched unless
  a blocker is recorded.
- AC3: current untracked spec and plan files remain preserved.

### P1. Shared Scan Runner and Agent Entrypoints

Purpose: add `agent` and `agent-pr` without duplicating scan behavior.

Likely files:

- `src/commands/scan.js`
- `src/diagram.js`
- optional new `src/commands/agent.js`
- `test/scan-command.test.js`
- `test/scan-manifest.test.js`

Deliverables:

- Extract or expose a scan runner that accepts command identity metadata.
- Register `archscope agent [path]`.
- Register `archscope agent-pr [path] --base <ref> --head <ref>`.
- Preserve existing `archscope scan` behavior.
- Preserve `diagram` compatibility.

Acceptance:

- AC4: `archscope agent --help` and `archscope agent-pr --help` are available.
- AC5: `agent` writes the same required artifact set as `scan` for a repository
  fixture.
- AC6: `agent-pr` writes PR evidence through the existing workflow path.
- AC7: `scan` fixture snapshots do not lose existing fields.
- AC8: `diagram scan` compatibility still works.

### P2. Operational Friction and Next Safe Action Contract

Purpose: make blocked states machine-actionable.

Likely files:

- new `src/commands/operational-friction.js`
- `src/commands/scan.js`
- `src/commands/output.js`
- `test/scan-error-categories.test.js`
- `test/scan-pr-evidence.test.js`

Deliverables:

- Add `OperationalFrictionSignal` normalization for:
  `approval_required`, `network`, `permission`, `timeout`, `git_state`,
  `missing_file`, `lint_failure`, `test_failure`, `git_refs_missing`,
  `analysis_partial`, `artifact_write_failed`, and `internal_error`.
- Add structured `nextSafeAction`.
- Include `data.nextSafeAction` in machine output.
- Include a concise terminal next action derived from the same object.

Acceptance:

- AC9: missing refs produce `fetch_refs` or `rerun_repository_scan`.
- AC10: artifact write failures produce a retry or stop action based on whether
  required artifacts remain available.
- AC11: timeout, permission, network, and missing-file messages normalize to
  distinct categories.
- AC12: terminal text, machine output, and error objects agree on category.

### P3. Prescriptive Agent Context

Purpose: make `.diagram/agent-context.json` tell agents how to behave.

Likely files:

- `src/artifacts/agent-context.js`
- `src/schema/agent-context-v1.schema.json`
- `test/agent-context-contract.test.js`
- `test/scan-evidence-pack.test.js`
- `test/scan-pr-evidence.test.js`

Deliverables:

- Add `agentInstructions.readFirst`.
- Add `agentInstructions.safeToSkip`.
- Add `agentInstructions.beforeEditing`.
- Add `agentInstructions.whenBlocked`.
- Add `agentInstructions.partialEvidence`.
- Keep output deterministic when `--deterministic` is used.

Acceptance:

- AC13: repository scans include read-first and safe-skip instructions.
- AC14: PR scans include before-editing checks derived from risk and changed
  components.
- AC15: failed or partial artifacts generate partial-evidence instructions.
- AC16: schema validation covers the new object.

### P4. Review Decision Brief and Summary Output

Purpose: make the human brief a decision artifact.

Likely files:

- `src/artifacts/brief.js`
- `src/commands/scan.js`
- `test/scan-evidence-pack.test.js`
- `test/scan-pr-evidence.test.js`
- `test/scan-command.test.js`

Deliverables:

- Add explicit brief sections for review readiness, changed areas, risk and
  reasons, reviewer checks, evidence status, read next, and next safe action.
- Adjust terminal summaries so `agent-pr` leads with architecture review
  readiness and risk.
- Keep the brief concise enough for repeated agent reads.

Acceptance:

- AC17: PR brief answers whether review can proceed.
- AC18: incomplete PR evidence tells reviewers what is blocked.
- AC19: repository brief remains useful without PR refs.
- AC20: terminal text no longer buries PR risk below generic pack language.

### P5. Docs, Help, and Validation Truthfulness

Purpose: make the front door obvious and avoid fake assurance.

Likely files:

- `README.md`
- `docs/getting-started.md`
- `docs/cli-reference.md`
- `src/diagram.js`
- `package.json`
- `test/command-identity.test.js`
- `test/generated-output-identity.test.js`
- optional docs validation scripts if needed

Deliverables:

- Put `agent` and `agent-pr` ahead of generic diagram generation in first-run
  docs.
- Keep media commands available but secondary.
- Update unknown-command help with agent entrypoints.
- Make no-op validation scripts visibly `not_configured` where authoritative
  evidence could be inferred.

Acceptance:

- AC21: first-read docs show `archscope agent-pr . --base origin/main --head
  HEAD` as the strongest PR workflow.
- AC22: media commands remain documented as optional advanced media.
- AC23: no-op validation scripts no longer look like substantive green gates.
- AC24: docs and help still preserve compatibility command guidance.

### P6. Final Traceability and Release-Readiness Validation

Purpose: prove the feature is integrated and ready for PR review.

Likely files:

- this plan
- JSC-280
- PR description
- test and validation outputs

Deliverables:

- Update this plan's execution ledger during implementation.
- Link PR evidence back to JSC-280 and SA1-SA24.
- Record exact validation outcomes.

Acceptance:

- AC25: JSC-280 links spec, plan, and PR.
- AC26: implementation PR maps SA1-SA24 to completed evidence or explicit
  follow-up.
- AC27: validation outcomes include exact command text and pass/fail/blocked
  result.

## Concrete Test Scenarios

| Scenario | Input | Action | Expected outcome | Test file |
| --- | --- | --- | --- | --- |
| Repository wrapper parity | Minimal JS fixture repo | `node src/diagram.js agent <repo> --format json --deterministic` | Writes manifest, brief, agent context, architecture, report; envelope command is `agent`; delegated command is `scan`. | `test/scan-manifest.test.js` or new `test/agent-command.test.js` |
| PR wrapper parity | Git fixture with base/head refs | `node src/diagram.js agent-pr <repo> --base <base> --head HEAD --format json --deterministic` | Reuses workflow PR evidence, writes PR impact artifact, includes reviewer checks. | `test/scan-pr-evidence.test.js` |
| Missing PR refs | Fixture repo with invalid base ref | `agent-pr --base missing/ref --head HEAD --format json` | Outcome is partial/failed as appropriate, PR artifact failed with `git_refs_missing`, next action says fetch refs or rerun repository scan. | `test/scan-pr-evidence.test.js` |
| Permission failure | Fixture where output path cannot be written or is invalid | `agent <repo> --output-dir <blocked>` | Error category normalizes to permission or artifact write failure and next action avoids consuming hidden partial state. | `test/scan-error-categories.test.js` |
| Missing file signal | Fixture that triggers missing generated artifact or file reference | Run scan wrapper with controlled missing file condition | Category is `missing_file`; recovery says regenerate, fix reference, or mark blocked. | `test/scan-error-categories.test.js` |
| Partial evidence | Fixture that causes report write failure after agent context succeeds | `agent <repo> --format json` | Manifest primary human artifact falls back to brief; agent instructions mention partial evidence. | `test/scan-report-html.test.js` |
| Agent instructions | Repository and PR fixtures | Read `.diagram/agent-context.json` | Includes `readFirst`, `safeToSkip`, `beforeEditing`, `whenBlocked`, and `partialEvidence`. | `test/agent-context-contract.test.js` |
| Decision brief | PR fixture with risk reasons | Read `.diagram/brief.md` | Contains review readiness, changed areas, risk, reviewer checks, evidence status, read next, and next safe action. | `test/scan-pr-evidence.test.js` |
| Help output | CLI help | `node src/diagram.js --help` and unknown command | Lists agent entrypoints before optional media commands. | `test/command-identity.test.js` |
| Validation truthfulness | Package scripts and docs | Inspect authoritative validation docs/scripts | No-op lint/typecheck/docs-lint are marked not configured or removed from authoritative gates. | `test/generated-output-identity.test.js` or focused docs/script test |

## Acceptance Checklist

- AC1: scan-runner strategy is documented before implementation.
- AC2: no broad core analysis refactor is included.
- AC3: spec and plan artifacts are preserved.
- AC4: agent help is available.
- AC5: repository agent wrapper writes scan-equivalent artifacts.
- AC6: PR agent wrapper reuses workflow PR evidence.
- AC7: scan snapshots retain existing fields.
- AC8: `diagram` compatibility still works.
- AC9: missing refs produce actionable next safe action.
- AC10: artifact write failures preserve usable written evidence.
- AC11: session-derived blocker categories normalize distinctly.
- AC12: all output surfaces agree on category.
- AC13: repository scans include read-first and safe-skip instructions.
- AC14: PR scans include before-editing checks.
- AC15: partial artifacts generate partial-evidence instructions.
- AC16: agent-context schema validates new instructions.
- AC17: PR brief answers review readiness.
- AC18: incomplete PR evidence names the blocker.
- AC19: repository brief remains useful without PR refs.
- AC20: terminal PR risk is prominent.
- AC21: first-read docs feature agent PR workflow.
- AC22: media commands stay secondary.
- AC23: no-op validation is not presented as substantive evidence.
- AC24: compatibility guidance remains present.
- AC25: JSC-280 links spec, plan, and PR.
- AC26: PR maps SA1-SA24 to evidence.
- AC27: validation outcomes are exact and recorded.

## System-Wide Impact

- CLI command surface gains two new top-level commands.
- Machine output contract expands for wrapper commands and scan-derived agent
  guidance.
- `agent-context.json` schema changes and requires fixture updates.
- `brief.md` output changes and requires snapshot/assertion updates.
- Docs and help ordering change to favor agent/review entrypoints.
- Validation script posture may change for no-op lint/typecheck/docs lint.

## Risks & Dependencies

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Scan runner extraction grows too large | Wrapper work becomes risky and hard to review | Keep extraction mechanical; stop after P1 if needed and defer guidance changes. |
| Wrapper envelopes break existing scan expectations | Agents or tests may misread command identity | Add wrapper-only fields while preserving `scan` fields for scan command. |
| `nextSafeAction` becomes duplicated prose logic | Output surfaces drift | Centralize normalization and derive prose from structured data. |
| Agent context schema update breaks consumers | Existing parser tests fail | Version conservatively and keep existing fields stable. |
| Validation truthfulness expands scope | PR becomes mixed concern | Split P5 into a follow-up PR if P1-P4 are already large. |
| Local session evidence overfits private history | Product becomes too local | Use only normalized blocker categories, no raw telemetry. |

## Rollback Plan

- If wrapper commands fail late, remove only `agent` / `agent-pr` registration
  and keep scan behavior unchanged.
- If structured `nextSafeAction` causes compatibility concern, keep it additive
  under `data.nextSafeAction` while preserving existing prose `nextAction`.
- If agent-context schema changes break consumers, keep new
  `agentInstructions` additive and preserve current top-level fields.
- If validation truthfulness work is contentious, revert P5 changes separately
  and keep wrapper/artifact improvements.

## Documentation / Operational Notes

- README should lead with the agent PR command as the high-value workflow.
- CLI reference should keep `scan` visible as the delegated workflow.
- Getting started should explain that humans and agents consume the same
  evidence pack.
- Media commands should stay documented but clearly optional advanced media.
- Session collector evidence should be cited in planning and PR notes only as
  summarized blocker taxonomy evidence.

## Validation Ladder

Run in this order and stop at the first failure:

1. `npm test -- --grep "scan|agent|PR evidence|agent context|machine"`
2. `npm test`
3. `npm run test:deep`
4. `npm run docs:style:changed`
5. `bash scripts/verify-work.sh --fast`

Additional focused checks when touched:

- If CI artifact generation behavior changes: `npm run ci:artifacts`
- If package validation scripts change: inspect `package.json` and update
  documentation/tests in the same PR.
- If machine contracts change: `node scripts/validate-machine-contracts.js`

## Phase Evidence

### P0-P1 Wrapper Entrypoints

Status: complete on
`jscraik/jsc-280-make-archscope-inevitable-for-coding-agents-and-pr-reviewers`.

Implementation evidence:

- Chose shared scan runner extraction because the scan action body could be
  moved into `runScanCommand` without touching core analysis generation files.
- Added `archscope agent [path]` and `archscope agent-pr [path]` as thin
  wrappers over `scan`; wrapper machine envelopes identify the invoked command
  and record `data.delegatedCommand: scan`.
- `agent-pr` requires `--base <ref>` and defaults `--head` to `HEAD`, matching
  the P0 decision to keep common PR usage low-friction while preserving explicit
  base-ref intent.
- Preserved the manifest command as `scan` so artifact consumers continue to
  read one evidence-pack contract.

Review evidence:

- `$simplify` pass completed for the P0-P1 diff; no further behavior-changing
  simplification was applied after the focused cleanup.
- `$he-code-review` pass found no blocking P0-P1 findings before validation.

Validation evidence:

- Command:
  `npm test -- --grep "scan|agent|PR evidence|agent context|machine"` -> pass
  (`35 passing`).
- Command: `node scripts/validate-machine-contracts.js` -> pass
  (`status: pass`, `commandCount: 13`).
- Command: `npm test` -> pass (`190 passing`).
- Command: `npm run test:deep` -> pass (`deep-regression: OK`).
- Command: `npm run docs:style:changed` -> pass before staging
  (`No staged documentation changes detected for Vale`).
- Command: `bash scripts/verify-work.sh --fast` -> pass; optional Local Memory
  observe check reported `curl: (52) Empty reply from server` and
  `observe A failed`, then the wrapper continued in optional mode and completed
  successfully.
- Command: `npm run docs:style:changed` -> pass after staging
  (`0 errors, 0 warnings and 0 suggestions in 2 files`).
- Command: `npm run test:related` -> pass after staging; wrapper exited 0 and
  reported no Vitest-style test files while the Mocha-focused and full suites
  above covered the changed commands.
- Command: `bash scripts/verify-work.sh --fast` -> pass after staging with the
  same optional Local Memory observe warning and successful wrapper completion.

### P2 Operational Friction and Next Safe Action

Status: complete on
`jscraik/jsc-280-make-archscope-inevitable-for-coding-agents-and-pr-reviewers`.

Implementation evidence:

- Added `src/commands/operational-friction.js` to normalize blocker messages
  into stable categories:
  `approval_required`, `network`, `permission`, `timeout`, `git_state`,
  `missing_file`, `lint_failure`, `test_failure`, `git_refs_missing`,
  `analysis_partial`, `artifact_write_failed`, and `internal_error`.
- Added `data.nextSafeAction` to scan-family machine output while preserving
  existing error objects and artifact statuses.
- Text summaries now print the same next-action message plus category/action
  when an actionable blocker exists.
- Missing PR refs produce `fetch_refs` with `rerun_repository_scan` fallback.
- Artifact write failures distinguish retryable partial evidence from missing
  required evidence that should stop consumption.

Review evidence:

- `$simplify` pass attempted three scoped reviewers. Two reviewers returned
  orientation-only output and the third was stopped after no usable finding;
  inline simplify cleanup extracted artifact-write message selection.
- `$he-code-review` found and fixed one blocker-classification edge case:
  `ETIMEDOUT` must normalize to `timeout`, not `network`.

Validation evidence:

- Command:
  `npm test -- --grep "operational friction|scan error categories|scan PR evidence composition|scan evidence manifest"` -> pass
  (`18 passing`).
- Command: `npm test` -> pass (`193 passing`).
- Command: `npm run test:deep` -> pass (`deep-regression: OK`).
- Command: `npm run docs:style:changed` -> pass after staging
  (`0 errors, 0 warnings and 0 suggestions in 1 file`).
- Command: `npm run test:related` -> pass after staging; wrapper exited 0 and
  reported no Vitest-style test files while Mocha suites above covered the
  changed commands.
- Command: `git diff --cached --check` -> pass.
- Command: `bash scripts/verify-work.sh --fast` -> pass after staging; optional
  Local Memory observe check reported `curl: (52) Empty reply from server` and
  `observe A failed`, then the wrapper continued in optional mode and completed
  successfully.

### P3 Prescriptive Agent Context

Status: complete on
`jscraik/jsc-280-make-archscope-inevitable-for-coding-agents-and-pr-reviewers`.

Implementation evidence:

- Added `agentInstructions` to `agent-context.json` and its v1 schema with
  `readFirst`, `safeToSkip`, `beforeEditing`, `whenBlocked`,
  `partialEvidence`, and `nextSafeAction`.
- Repository scans now tell agents to read written evidence in manifest order,
  keep optional human/report/diagram artifacts skippable, and inspect artifact
  statuses before editing.
- PR scans now include changed-component and blast-radius guidance, reviewer
  checks, risk reasons, and missing-ref remediation.
- Partial evidence now lists blocked artifacts with stable status, reason, and
  category values so agents know what can be trusted and what must be reported.
- Manifest-write failures now refresh the already-written agent context so it
  does not tell agents to read a manifest that was not actually written.

Review evidence:

- `$simplify` pass launched three scoped reviewers for reuse, quality, and
  efficiency; all three stalled and were closed after two waits, so coverage
  continued as an inline simplify review.
- Inline simplify review found and fixed stale manifest-read guidance inside
  `agent-context.json` when final manifest writing fails.
- `$he-code-review` pass found no additional blocking P3 findings after the
  focused contract tests passed.

Validation evidence:

- Command:
  `npm test -- test/agent-context-contract.test.js test/scan-evidence-pack.test.js test/scan-pr-evidence.test.js test/scan-error-categories.test.js` -> pass
  (`12 passing`).
- Command: `npm test` -> pass (`193 passing`).
- Command: `npm run test:deep` -> blocked on first attempt after eight minutes
  of no output; process `67152` was stopped.
- Command: `node scripts/deep-regression.js` -> pass (`deep-regression: OK`).
- Command: `npm run test:deep` -> pass on retry (`deep-regression: OK`).
- Command: `npm run docs:style:changed` -> pass after staging
  (`0 errors, 0 warnings and 0 suggestions in 1 file`).
- Command: `npm run test:related` -> pass after staging; wrapper exited 0 and
  reported no Vitest-style test files while Mocha-focused and full suites above
  covered the changed commands.
- Command: `git diff --cached --check` -> pass.
- Command: `bash scripts/verify-work.sh --fast` -> pass after staging; optional
  Local Memory observe check reported `curl: (52) Empty reply from server` and
  `observe A failed`, then the wrapper continued in optional mode and completed
  successfully.

## Execution Checkpoints

- P0 complete: runner strategy and wrapper semantics confirmed.
- P1 complete: wrapper commands exist and pass parity tests.
- P2 complete: blocker normalization and `nextSafeAction` pass focused tests.
- P3 complete: agent context guidance validates against schema.
- P4 complete: brief and terminal output are review-decision oriented.
- P5 complete: docs/help/validation truthfulness updated.
- P6 complete: JSC-280, spec, plan, PR, and validation evidence align.

## First he-work Handoff

Start with P0-P1 only:

1. Inspect `registerScanCommand` and choose shared runner extraction versus
   forwarding.
2. Add `agent` and `agent-pr` without changing analysis semantics.
3. Prove artifact parity for repository and PR fixtures.
4. Stop before adding `agentInstructions` if wrapper parity is not clean.

Recommended first implementation branch:

```text
jscraik/jsc-280-make-archscope-inevitable-for-coding-agents-and-pr-reviewers
```

## Sources & References

- `docs/specs/2026-05-06-feat-archscope-agent-review-inevitability-spec.md`
- `docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md`
- `docs/plans/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-plan.md`
- `src/diagram.js`
- `src/commands/scan.js`
- `src/commands/output.js`
- `src/artifacts/agent-context.js`
- `src/artifacts/brief.js`
- `src/artifacts/evidence-manifest.js`
- `test/scan-command.test.js`
- `test/scan-manifest.test.js`
- `test/scan-pr-evidence.test.js`
- `test/scan-error-categories.test.js`
- `test/scan-evidence-pack.test.js`
- `test/scan-report-html.test.js`
- `test/agent-context-contract.test.js`
- JSC-280:
  https://linear.app/jscraik/issue/JSC-280/make-archscope-inevitable-for-coding-agents-and-pr-reviewers
