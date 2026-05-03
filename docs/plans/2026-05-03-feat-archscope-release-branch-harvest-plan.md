---
schema_version: 1
title: "feat: Archscope release branch harvest plan"
type: feat
status: draft
date: 2026-05-03
origin: docs/specs/2026-05-03-feat-archscope-release-branch-harvest-spec.md
spec: docs/specs/2026-05-03-feat-archscope-release-branch-harvest-spec.md
source_spec: docs/specs/2026-05-03-feat-archscope-release-branch-harvest-spec.md
plan_route: fresh
plan_depth: standard
traceability_required: false
tracking_status: untracked
branch: codex/archscope-release-branch-harvest
deepened: 2026-05-03
---

# feat: Archscope release branch harvest plan

## Table of Contents

- [Plan Mode Decision](#plan-mode-decision)
- [Enhancement Summary](#enhancement-summary)
- [Overview](#overview)
- [Problem Frame](#problem-frame)
- [Linear Work Item Contract](#linear-work-item-contract)
- [Requirements Trace](#requirements-trace)
- [Spec / Plan Traceability](#spec--plan-traceability)
- [Scope Boundaries](#scope-boundaries)
- [Context & Research](#context--research)
- [Technical Review Summary](#technical-review-summary)
- [Key Technical Decisions](#key-technical-decisions)
- [High-Level Technical Design](#high-level-technical-design)
- [Inventory Artifact Contract](#inventory-artifact-contract)
- [Phase Gate Matrix](#phase-gate-matrix)
- [Implementation Units](#implementation-units)
- [Execution Checkpoints](#execution-checkpoints)
- [Acceptance Checklist](#acceptance-checklist)
- [System-Wide Impact](#system-wide-impact)
- [Risks & Dependencies](#risks--dependencies)
- [Documentation / Operational Notes](#documentation--operational-notes)
- [Validation Ladder](#validation-ladder)
- [Execution Ledger](#execution-ledger)
- [First he-work Handoff](#first-he-work-handoff)
- [Sources & References](#sources--references)

## Plan Mode Decision

**Mode:** fresh
**Deepening mode:** targeted-confidence
**Research execution mode:** direct

This is a new execution plan for the Archscope release-branch harvest spec. It
does not reopen the branch-pruning decision, Archscope compatibility work,
evidence-pack work, identity convergence, or product-sharpness work already
merged to `main`.

The plan starts with a no-runtime-code inventory slice. `origin/release/v1.1.0`
is read-only source evidence. Implementation must happen on the feature branch
created from current `main`, using current Archscope modules and tests.

## Enhancement Summary

This deepening pass strengthens execution confidence without changing product
intent.

Changes made:

- Defines the exact P0 harvest inventory artifact schema so `he-work` can
  produce a reviewable disposition record instead of a loose narrative.
- Adds a phase gate matrix that makes P1-P4 mutually gated by P0 selection,
  current-main ownership, focused validation, and compatibility constraints.
- Tightens implementation-unit entry and exit criteria so runtime work cannot
  begin from stale branch code or broaden across multiple themes by accident.
- Adds stop conditions for stale-branch churn, unsafe delete-heavy diffs,
  missing current-main owner mapping, and unvalidated deterministic output.
- Clarifies validation expectations for inventory-only work versus runtime
  behavior changes.

## Overview

Harvest useful ideas from `origin/release/v1.1.0` without importing stale code:

- classify every branch-only release commit before source edits;
- select one current-main implementation theme at a time;
- preserve Archscope's evidence-first product model;
- keep diagrams as supporting evidence, not the internal source of truth;
- improve AI-agent usefulness through stable metadata, trust boundaries, and
  actionable confidence only where current artifacts prove a gap;
- close out the release branch only after selected candidates are implemented,
  discarded, or explicitly deferred.

## Problem Frame

`origin/release/v1.1.0` contains useful intent, especially around
"gold-standard diagrams + AI-native types" and cache/confidence hardening. The
branch is also structurally stale: it heavily changes older monolithic
implementation surfaces and would delete many current Archscope files if merged
wholesale.

The safe workflow is therefore:

```text
inventory stale branch
extract intent
map to current owners
reimplement one theme at a time
validate current artifacts
decide whether to retain or prune release/v1.1.0
```

## Linear Work Item Contract

No Linear issue is attached to the source spec.

- Tracker of record: not supplied
- Traceability required: false
- Linear status: not tracked
- Branch: `codex/archscope-release-branch-harvest`, created from
  `main` per the updated user request
- Future tracking: if a Linear issue is created, update this section and add a
  Linear / Spec / Plan / PR traceability matrix before implementation closeout.

## Requirements Trace

- R1. Inventory `origin/release/v1.1.0` branch-only commits and classify each
  as `discard`, `document`, `reimplement`, or `defer`.
- R2. Forbid direct merge and default cherry-pick of `origin/release/v1.1.0`.
- R3. Map gold-standard diagram requirements to current renderer/artifact
  owners rather than old monolithic files.
- R4. Map AI-native type metadata requirements to existing artifact schemas or
  an explicit schema migration.
- R5. Define incremental cache trust boundaries and invalidation inputs before
  changing cache behavior.
- R6. Define actionable confidence categories or warnings before surfacing
  confidence in artifacts.
- R7. Keep the first implementation slice limited to one product theme unless
  the plan records unavoidable coupling.
- R8. Preserve deterministic output for scan, manifest, agent context, PR
  impact, and changed diagram artifacts.
- R9. Preserve compatibility surfaces: `archscope`, `diagram`,
  `@brainwav/diagram`, `.diagram`, and `.diagramrc`.
- R10. Prevent accidental deletion of current specs, plans, artifacts,
  commands, schemas, and tests during harvest.
- R11. Record a closeout decision for `origin/release/v1.1.0`.
- R12. Run baseline validation for any source/runtime behavior change.

## Spec / Plan Traceability

| Requirement | Source acceptance IDs | Plan units | Acceptance IDs |
| ----------- | --------------------- | ---------- | -------------- |
| R1          | SA1                   | P0         | AC1            |
| R2          | SA2                   | P0-P5      | AC2            |
| R3          | SA3                   | P0, P2     | AC3            |
| R4          | SA4                   | P0, P1     | AC4            |
| R5          | SA5                   | P0, P3     | AC5            |
| R6          | SA6                   | P0, P4     | AC6            |
| R7          | SA7                   | P1-P4      | AC7            |
| R8          | SA8                   | P1-P5      | AC8            |
| R9          | SA9                   | P5         | AC9            |
| R10         | SA10                  | P0-P5      | AC10           |
| R11         | SA11                  | P5         | AC11           |
| R12         | SA12                  | P1-P5      | AC12           |

## Scope Boundaries

In scope:

- Read-only analysis of `origin/release/v1.1.0`.
- A harvest inventory artifact or plan section.
- Small current-main implementation slices for selected themes.
- Artifact schema, scan, agent context, manifest, PR impact, cache, confidence,
  renderer, and fixture/test updates when selected by a phase.
- Validation evidence and release-branch closeout decision.

Out of scope:

- Direct merge of `origin/release/v1.1.0`.
- Default cherry-pick of stale release commits.
- Restoring old monolithic implementations in `src/diagram.js`,
  `src/core/analysis-generation.js`, or `src/graph.js`.
- Deleting current scan/context/report/schema/spec/plan/test surfaces.
- Package, repository, `.diagram`, or `.diagramrc` rename work.
- Report HTML redesign.
- Media command promotion.

## Context & Research

### Live Repo Evidence

- Current work is proceeding on
  `codex/archscope-release-branch-harvest`, created from `main` by
  user request.
- Current `main` exposes modular Archscope surfaces under:
  - `src/artifacts/**`
  - `src/commands/**`
  - `src/context/**`
  - `src/confidence/pipeline.js`
  - `src/incremental/cache.js`
  - `src/renderers/report-html.js`
  - `src/schema/**`
  - `src/workflow/**`
- The new governing spec is
  `docs/specs/2026-05-03-feat-archscope-release-branch-harvest-spec.md`.
- Current working tree also contains that new uncommitted spec.

### Branch Evidence

Branch-only release commits:

```text
8f0156b Update analysis-generation.js
73d24cc Update architecture.yml
69fd67d test: remove manifest command from deep-regression suite
4dbf4f3 fix: cache, diff, and confidence pipeline hardening
2da4639 Potential fix for code scanning alert no. 24: Unused variable, import, function or class
e4f8ff5 feat: v1.1.0 — gold-standard diagrams + AI-native types
```

Key release-branch stats:

```text
e4f8ff5 feat: v1.1.0 — gold-standard diagrams + AI-native types
.github/workflows/architecture.yml
CHANGELOG.md
package.json
src/config/diagramrc.js
src/core/analysis-generation.js
src/diagram.js
src/incremental/cache.js
```

```text
4dbf4f3 fix: cache, diff, and confidence pipeline hardening
src/confidence/pipeline.js
src/config/diagramrc.js
src/core/analysis-generation.js
src/diagram.js
src/graph.js
src/incremental/cache.js
src/workflow/git-helpers.js
```

Focused current-vs-release diff over likely product surfaces:

```text
scripts/deep-regression.js      |  193 +----
src/config/diagramrc.js         |    2 -
src/core/analysis-generation.js | 1478 ++++++++++++++++++++++++++++++++++++++-
src/diagram.js                  | 1203 ++++++++++++++++++++++++++-----
src/workflow/git-helpers.js     |  115 ++-
```

This confirms the branch contains substantial stale implementation shape and
must not be merged wholesale.

## Technical Review Summary

Planning review outcome:

- The spec is implementation-ready for planning.
- The plan must start with inventory because branch code is stale and risky.
- The first runtime implementation must select exactly one theme unless the
  inventory proves coupling is unavoidable.
- Direct merge and default cherry-pick are explicitly blocked.
- No UI companion is needed.

No blocking technical-review finding is known at plan creation time. A future
`$he-technical-review` should focus on whether P1-P4 are too broad after P0
inventory produces concrete candidate dispositions.

## Key Technical Decisions

1. **Branch posture:** `origin/release/v1.1.0` is read-only evidence, not a
   target branch.
2. **Execution posture:** proceed on
   `codex/archscope-release-branch-harvest`, created from `main`,
   because the user explicitly asked to create a feature branch before phased
   work.
3. **First slice:** P0 is inventory and disposition only; no runtime source
   changes.
4. **Implementation order:** prefer AI-native type metadata first if P0 proves
   current artifacts lack stable fields agents need.
5. **Architecture posture:** use current modular Archscope surfaces; do not
   revive old monolithic implementation.
6. **Validation posture:** docs/inventory validation for P0; focused plus
   baseline tests for any runtime behavior change.
7. **Closeout posture:** retain `origin/release/v1.1.0` until every selected
   candidate is implemented, discarded, or deferred with evidence.
8. **Delete-diff posture:** any candidate whose direct branch diff deletes
   current Archscope modules, tests, specs, plans, schemas, or validation
   scripts must be treated as `reimplement` or `discard`, never `cherry-pick`.
9. **Theme coupling posture:** if P0 finds a candidate that spans multiple
   themes, the next phase must split it into independent decisions unless the
   inventory records why the coupling is technically unavoidable.
10. **Current-owner posture:** no runtime phase may start until the selected
    candidate is mapped to current-main owning files, tests, and artifacts.

## High-Level Technical Design

The harvest flow is intentionally staged:

```text
release/v1.1.0 commits
  -> P0 harvest inventory
  -> theme-specific candidate selection
  -> current-main implementation owner
  -> focused validation
  -> baseline validation where runtime changes
  -> release branch closeout decision
```

Implementation must flow through current product surfaces:

```text
analysis facts
  -> current artifact/context/schema owners
  -> manifest / brief / agent-context / PR impact
  -> Mermaid or report renderers as supporting surfaces
```

## Inventory Artifact Contract

P0 must create
`docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md` with this
minimum structure:

- Frontmatter:
  - `schema_version: 1`
  - `title`
  - `date`
  - `source_branch: origin/release/v1.1.0`
  - `base_branch: main`
  - `status: draft | complete`
- Summary:
  - one-paragraph verdict on whether the branch is mergeable;
  - selected next implementation theme or `none`;
  - branch closeout provisional recommendation: `retain`, `archive`, or
    `prune-later`.
- Branch Evidence:
  - exact commands run;
  - branch-only commits;
  - aggregate diff stat;
  - high-risk delete/replace surfaces.
- Candidate Table:
  - source commit;
  - touched files;
  - theme;
  - product intent;
  - current-main owner files;
  - current-main tests;
  - disposition;
  - acceptance IDs;
  - rationale.
- Unsafe Import Notes:
  - explicit examples of stale code or delete-heavy diffs that must not be
    merged or cherry-picked.
- Next Theme Selection:
  - selected theme;
  - why this theme is selected first;
  - why other themes are deferred, documented, or discarded.
- Validation Evidence:
  - command;
  - outcome;
  - notes.

Allowed dispositions:

- `discard`: obsolete, harmful, duplicate, or superseded.
- `document`: useful context but no implementation planned.
- `reimplement`: useful behavior should be rebuilt on current `main`.
- `defer`: useful but too broad or dependent on a later spec/plan.

P0 cannot be marked complete unless every branch-only commit has a disposition
and every `reimplement` candidate has a current-main owner mapping.

## Phase Gate Matrix

| Phase | Entry gate | Exit gate | Blocking drift |
| --- | --- | --- | --- |
| P0 | Spec and plan exist; current branch is `codex/archscope-release-branch-harvest`; release branch is readable. | Inventory exists, all six commits classified, next theme selected or no-op recorded, inventory artifact check passes, `git diff --check` passes. | Missing release branch, unclassified commit, no current-main owner for a selected candidate. |
| P1 | P0 selects AI-native metadata and maps owners/tests. | Schema/artifact gap is documented; changes, if any, are deterministic and validated. | Parallel schema, Mermaid-derived facts, unversioned schema change. |
| P2 | P0 selects diagram quality and records concrete fixture gap. | Diagram change is traceable to machine artifacts and deterministic. | Broad `src/core` rewrite, visual-only fact, snapshot churn without rationale. |
| P3 | P0 selects cache trust and documents current cache behavior. | Trust boundary and invalidation behavior are tested or runtime change is explicitly deferred. | Cache hides stale refs, config drift, partial analysis, or artifact write failure. |
| P4 | P0 selects confidence actionability and records current signal inventory. | Confidence states are actionable and validated, or decorative signals are discarded. | Numeric/decorative score, non-deterministic warning order, no recovery guidance. |
| P5 | All selected candidates handled. | Compatibility and baseline validation recorded; branch closeout recommendation made. | Any `reimplement` candidate unresolved, failed compatibility gate, branch deletion without approval. |

## Implementation Units

### P0: Harvest Inventory And Candidate Disposition

**Goal:** Produce the source-of-truth inventory before any runtime edits.

**Scope:**

- Create: `docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md`
- Modify: this plan execution ledger
- Do not modify runtime source

**Implementation notes:**

- Enumerate every branch-only commit on `origin/release/v1.1.0`.
- Use the [Inventory Artifact Contract](#inventory-artifact-contract) exactly
  enough that a reviewer can trace every disposition to evidence.
- For each commit, record:
  - source commit
  - touched files
  - inferred product intent
  - current-main fit
  - selected disposition: `discard`, `document`, `reimplement`, or `defer`
  - acceptance IDs affected
- For every `reimplement` candidate, record current-main owner files and tests.
- For every `discard` candidate, record whether it is superseded, harmful,
  duplicated, or obsolete.
- For every `defer` candidate, record the missing prerequisite.
- Include a section explaining why direct merge/cherry-pick is blocked.
- Select no more than one theme for the next runtime phase.
- Recommended initial selection order:
  1. AI-native type metadata
  2. diagram quality
  3. cache trust boundaries
  4. confidence pipeline hardening

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| Branch commit inventory | `origin/release/v1.1.0` | List branch-only commits | Six branch-only commits are classified. |
| Merge safety | `main..origin/release/v1.1.0` diff | Review diff stats/name-status | Inventory records why direct merge is unsafe. |
| Theme selection | inventory dispositions | Choose next phase | At most one runtime theme is selected. |

**Validation:**

- `git log --oneline --cherry-pick --right-only main...origin/release/v1.1.0`
- `git diff --stat main..origin/release/v1.1.0`
- `git diff --name-status main..origin/release/v1.1.0`
- `git show --stat --oneline --find-renames e4f8ff5 4dbf4f3 69fd67d 73d24cc 8f0156b 2da4639`
- Manual inventory review: all six branch-only commits have dispositions and
  every selected candidate has owner files/tests.
- Inventory artifact hygiene:
  `git add -N docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md`
  then
  `git diff --check -- docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md`
- `git diff --check`

**Rollback:**

- Remove the inventory artifact and ledger updates. No runtime rollback
  expected.

### P1: AI-Native Type Metadata Gap Slice

**Goal:** Determine whether current artifacts need stable AI-native type
metadata, then implement the smallest schema/artifact extension only if P0
selects this theme.

**Scope candidates:**

- Inspect/modify: `src/artifacts/agent-context.js`
- Inspect/modify: `src/schema/agent-context-v1.schema.json`
- Inspect/modify: `src/artifacts/evidence-manifest.js`
- Inspect/modify: `src/workflow/pr-impact.js`
- Inspect/modify tests:
  - `test/agent-context-contract.test.js`
  - `test/scan-manifest.test.js`
  - `test/scan-pr-evidence.test.js`

**Implementation notes:**

- Start with an artifact-field inventory before editing.
- Confirm whether current `agent-context-v1.schema.json` already exposes
  component type, role, source, confidence, and next-read information.
- Confirm whether the selected candidate belongs in `agent-context`, manifest,
  PR impact, or a smaller documentation-only clarification.
- Prefer extending existing fields over adding a parallel schema.
- If schema changes are needed, add explicit version/compatibility handling.
- Metadata should describe component/relation/review cue type, source, and
  confidence or derivation only where useful to agents.
- Do not make agents parse Mermaid to recover type facts.

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| Agent context inventory | generated context fixture | Inspect schema/output | Existing fields are documented before changes. |
| Type metadata output | fixture repo | Run scan/context generation | Metadata is deterministic and schema-valid. |
| PR metadata output | PR fixture | Run PR scan | Metadata does not conflict with PR impact fields. |

**Validation:**

- Before editing, record artifact-field inventory in the phase ledger.
- `npm test -- test/agent-context-contract.test.js test/scan-manifest.test.js test/scan-pr-evidence.test.js`
- `npm test -- test/generate-output-json.test.js test/machine-command-coverage.test.js test/json-capability-discovery.test.js`
- `npm test`
- `npm run test:deep`

**Rollback:**

- Revert schema/artifact changes and any generated fixtures from this phase.

### P2: Diagram Quality Evidence Slice

**Goal:** Improve diagram quality only where fixtures prove the output is hard
to review, while keeping diagrams as supporting evidence.

**Scope candidates:**

- Inspect/modify: `src/core/analysis-generation-*.js`
- Inspect/modify: `src/renderers/**`
- Inspect/modify: `src/artifacts/brief.js`
- Inspect/modify tests:
  - `test/analysis-generation-diagrams-role-snapshots.test.js`
  - `test/analysis-generation-diagrams-core-sequence.test.js`
  - `test/analysis-generation-dispatcher.test.js`
  - `test/scan-evidence-pack.test.js`

**Implementation notes:**

- Start from current fixtures and snapshots, not release-branch code.
- P2 may only start after the inventory names the exact fixture or diagram type
  that is hard to review.
- Define what "gold-standard" means in a testable way:
  - readable labels
  - stable ordering
  - meaningful grouping
  - traceability to JSON artifacts
- Avoid broad rewrites of `src/core/analysis-generation-*`.
- Do not add visual-only detail that is absent from machine artifacts.

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| Diagram readability gap | existing fixtures | Inspect output/snapshots | Concrete improvement target is recorded. |
| Deterministic diagram | fixture repo | Generate twice | Output ordering is stable. |
| Artifact traceability | generated diagram + JSON | Cross-check facts | Diagram claims are present in machine artifacts. |

**Validation:**

- Before editing, record the concrete fixture/snapshot gap and expected
  improvement.
- `npm test -- test/analysis-generation-diagrams-role-snapshots.test.js test/analysis-generation-diagrams-core-sequence.test.js test/analysis-generation-dispatcher.test.js test/scan-evidence-pack.test.js`
- `npm test`
- `npm run test:deep`

**Rollback:**

- Revert renderer/analysis changes and snapshots from this phase.

### P3: Incremental Cache Trust Boundary Slice

**Goal:** Define and test when cached evidence is safe to reuse, invalidate, or
mark degraded.

**Scope candidates:**

- Inspect/modify: `src/incremental/cache.js`
- Inspect/modify: `src/commands/scan.js`
- Inspect/modify: `src/workflow/git-helpers.js`
- Inspect/modify: `src/workflow/pr-impact.js`
- Add/modify cache-focused tests if current coverage is missing.

**Implementation notes:**

- Start by documenting current cache inputs and invalidation behavior.
- P3 may only start if P0 selects cache trust boundaries or a prior phase
  exposes a deterministic stale-cache failure.
- Required trust inputs include repo path, relevant refs, config signal,
  artifact schema version, and deterministic-mode behavior.
- Cache must never hide stale PR refs, partial analysis, or artifact write
  failures.
- If current scan does not use cache in the selected path, record that and
  defer runtime work instead of inventing a new cache path.

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| Stable cache hit | unchanged fixture | Run twice | Cache is accepted only when trust inputs match. |
| Ref change | changed base/head | Run PR scan | Cache is invalidated or bypassed. |
| Config change | changed `.diagramrc` | Run scan | Cache is invalidated or marked degraded. |
| Partial evidence | artifact failure | Run scan | Cache does not hide degraded state. |

**Validation:**

- Before editing, record whether the selected scan/PR path currently uses
  `src/incremental/cache.js`.
- Focused cache tests added or updated in `test/**`.
- `npm test -- test/scan-command.test.js test/scan-manifest.test.js test/scan-pr-evidence.test.js`
- `npm test`
- `npm run test:deep`

**Rollback:**

- Revert cache behavior and tests from this phase.

### P4: Confidence Pipeline Actionability Slice

**Goal:** Surface confidence only where it helps humans or agents decide
whether to trust, inspect, rerun, or fail a gate.

**Scope candidates:**

- Inspect/modify: `src/confidence/pipeline.js`
- Inspect/modify: `src/artifacts/brief.js`
- Inspect/modify: `src/artifacts/agent-context.js`
- Inspect/modify: `src/artifacts/evidence-manifest.js`
- Inspect/modify tests:
  - confidence tests where present
  - scan manifest/context tests
  - PR impact tests

**Implementation notes:**

- Start with a current confidence-signal inventory.
- P4 may only start if P0 selects confidence actionability or a prior phase
  exposes a partial/degraded state that lacks recovery guidance.
- Allowed user-facing confidence states should be actionable, such as:
  - direct
  - inferred
  - partial
  - degraded
  - unavailable
- Do not expose numeric scores unless they already map to a decision or
  recovery behavior.
- Confidence must be deterministic under deterministic mode.

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| Direct evidence | fixture with explicit facts | Generate artifacts | Confidence signal is direct or omitted if obvious. |
| Inferred evidence | fixture requiring inference | Generate artifacts | Signal explains inference and next read. |
| Degraded evidence | partial analysis path | Generate artifacts | Signal drives inspect/rerun behavior. |

**Validation:**

- Before editing, record the current confidence-signal inventory and selected
  state vocabulary.
- `npm test -- test/scan-manifest.test.js test/scan-evidence-pack.test.js test/scan-pr-evidence.test.js`
- Any confidence-specific tests added by the phase.
- `npm test`
- `npm run test:deep`

**Rollback:**

- Revert confidence/artifact changes and any fixtures from this phase.

### P5: Compatibility, Closeout, And Release Branch Decision

**Goal:** Prove current-main compatibility remains intact and decide whether
`origin/release/v1.1.0` can be retained, archived, or pruned.

**Scope:**

- Modify: harvest inventory closeout section
- Modify: this plan execution ledger
- Modify runtime only if validation finds a defect

**Implementation notes:**

- Verify every selected candidate is implemented, discarded, or deferred.
- Confirm compatibility surfaces remain stable.
- Record exact validation evidence.
- Confirm `origin/release/v1.1.0` is still read-only evidence and no release
  commit was merged or blindly cherry-picked.
- If the closeout recommendation is `prune`, stop for explicit user approval
  before deleting any remote branch.
- Make a release-branch closeout recommendation:
  - `retain`: still contains unharvested useful evidence.
  - `archive`: evidence preserved elsewhere and branch should not be active.
  - `prune`: all useful candidates handled and branch can be deleted.

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| Candidate closeout | inventory | Review dispositions | No selected candidate is unaccounted for. |
| Compatibility | package/bin/artifacts | Run compatibility tests | Existing surfaces still work. |
| Branch decision | final inventory | Choose retain/archive/prune | Decision is evidence-backed. |

**Validation:**

- `npm test -- test/command-identity.test.js test/scan-command.test.js test/scan-manifest.test.js test/scan-pr-evidence.test.js`
- `npm test`
- `npm run test:deep`
- `npm run ci:artifacts`
- `git diff --check`

**Rollback:**

- Reopen any unresolved candidate and retain `origin/release/v1.1.0` until a
  later phase resolves it.

## Execution Checkpoints

- P0 complete only after the harvest inventory exists and classifies all six
  branch-only commits with dispositions, current-main owner mappings for
  `reimplement` candidates, validation evidence, and a selected next theme or
  no-op decision.
- P0 must update P1-P4 ledger states using the allowed states below so
  non-selected themes do not remain ambiguous:
  - `pending`: not evaluated yet.
  - `selected`: chosen by P0 for implementation.
  - `not_selected`: evaluated by P0 and intentionally skipped for this plan.
  - `deferred`: useful but blocked by a prerequisite or later spec/plan.
  - `complete`: implemented or closed with validation evidence.
- P1 starts only if P0 selects AI-native type metadata as the next runtime
  theme.
- P2 starts only if P0 or a later checkpoint selects diagram quality as the
  next runtime theme.
- P3 starts only if P0 or a later checkpoint selects cache trust boundaries as
  the next runtime theme.
- P4 starts only if P0 or a later checkpoint selects confidence pipeline
  actionability as the next runtime theme.
- P5 starts only after every selected candidate is implemented, discarded, or
  deferred, and P1-P4 have explicit `complete`, `not_selected`, or `deferred`
  ledger states.
- No phase may directly merge or blindly cherry-pick `origin/release/v1.1.0`.
- Stop before runtime work if the selected candidate cannot be mapped to
  current-main owner files and tests.
- Stop before branch closeout if any useful candidate remains unclassified,
  unimplemented, or undeferred.

## Acceptance Checklist

- [x] AC1: Harvest inventory classifies all branch-only release commits.
- [x] AC2: Plan and inventory forbid direct merge/default cherry-pick.
- [x] AC3: Diagram requirements are mapped to current owners.
- [x] AC4: AI-native metadata requirements are mapped to existing schemas or a
      schema migration.
- [ ] AC5: Cache trust boundaries are defined before cache behavior changes.
- [ ] AC6: Confidence signals are actionable before being surfaced.
- [x] AC7: First runtime implementation slice covers no more than one theme.
- [x] AC8: Deterministic output remains stable for changed artifacts.
- [x] AC9: Compatibility surfaces remain intact.
- [x] AC10: No current specs, plans, artifacts, commands, schemas, or tests are
      deleted as a branch-harvest side effect.
- [x] AC11: Release branch closeout decision is recorded.
- [x] AC12: Baseline validation is recorded for runtime changes.

## System-Wide Impact

- P0 is documentation/inventory only.
- P1-P4 may touch runtime artifact, schema, analysis, cache, confidence, and
  workflow behavior, but only one selected theme at a time.
- Any runtime phase can affect generated artifacts, deterministic snapshots, and
  agent-facing contracts.
- P5 may lead to pruning or archiving `origin/release/v1.1.0`, but only after
  explicit user approval for branch deletion.

## Risks & Dependencies

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Stale branch code looks tempting to cherry-pick | Current Archscope work could regress | P0 inventory and AC2 block direct cherry-pick. |
| Themes are too coupled | Slice grows into broad rewrite | P0 selects one theme; P1-P4 are gated. |
| AI metadata duplicates existing artifact fields | Agent contract becomes noisy | Inventory current schema before edits. |
| Diagram quality work becomes diagram-first product drift | Archscope north star blurs | Require JSON/artifact traceability for diagram claims. |
| Cache behavior hides stale evidence | PR review becomes misleading | Define trust boundary and invalidation tests first. |
| Confidence signals become decorative | Humans/agents get noise | Surface only actionable states. |
| Branch closeout deletes useful history too early | Lost product evidence | Retain branch unless all candidates are handled. |
| P0 inventory becomes subjective | Later work starts from vague intent | Require source commits, touched files, current owners, tests, and rationale per candidate. |
| Runtime phase starts without a measurable gap | Implementation becomes speculative | Phase entry gates require fixture, schema, cache, or confidence inventory first. |

## Documentation / Operational Notes

- Keep this spec/plan pair linked from any future harvest inventory.
- Do not update historical release notes to pretend the stale branch shipped.
- If a runtime phase changes README, package scripts, validation guidance, or
  preflight docs, run the repo-local `$validation-contract-check` workflow
  before closeout.
- If CI required-check names or workflows change, run `$ci-check-name-parity`.
- If branch pruning is requested after P5, use `$he-prune-branches` and require
  explicit user approval before deleting remote branches.

## Validation Ladder

1. P0 inventory validation:
   - `git log --oneline --cherry-pick --right-only main...origin/release/v1.1.0`
   - `git diff --stat main..origin/release/v1.1.0`
   - `git diff --name-status main..origin/release/v1.1.0`
   - `git show --stat --oneline --find-renames e4f8ff5 4dbf4f3 69fd67d 73d24cc 8f0156b 2da4639`
   - Manual inventory review: all branch-only commits have dispositions; every
     selected candidate has owner files and tests.
   - `git add -N docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md`
   - `git diff --check -- docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md`
   - `git diff --check`
2. P1 AI metadata validation:
   - `npm test -- test/agent-context-contract.test.js test/scan-manifest.test.js test/scan-pr-evidence.test.js`
   - `npm test -- test/generate-output-json.test.js test/machine-command-coverage.test.js test/json-capability-discovery.test.js`
   - `npm test`
   - `npm run test:deep`
3. P2 diagram quality validation:
   - `npm test -- test/analysis-generation-diagrams-role-snapshots.test.js test/analysis-generation-diagrams-core-sequence.test.js test/analysis-generation-dispatcher.test.js test/scan-evidence-pack.test.js`
   - `npm test`
   - `npm run test:deep`
4. P3 cache trust validation:
   - Focused cache tests added or updated in `test/**`
   - `npm test -- test/scan-command.test.js test/scan-manifest.test.js test/scan-pr-evidence.test.js`
   - `npm test`
   - `npm run test:deep`
5. P4 confidence validation:
   - `npm test -- test/scan-manifest.test.js test/scan-evidence-pack.test.js test/scan-pr-evidence.test.js`
   - Any confidence-specific tests added by the phase
   - `npm test`
   - `npm run test:deep`
6. P5 closeout validation:
   - `npm test -- test/command-identity.test.js test/scan-command.test.js test/scan-manifest.test.js test/scan-pr-evidence.test.js`
   - `npm test`
   - `npm run test:deep`
   - `npm run ci:artifacts`
   - `git diff --check`

## Execution Ledger

| Unit | Status | Evidence |
| --- | --- | --- |
| P0 | complete | Created `docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md`; classified all six branch-only commits; selected AI-native metadata for P1; deferred diagram quality, cache trust, and confidence actionability. Validation: `git log --oneline --cherry-pick --right-only main...origin/release/v1.1.0` pass; `git diff --stat main..origin/release/v1.1.0` pass; `git diff --name-status main..origin/release/v1.1.0` pass; `git show --stat --oneline --find-renames e4f8ff5 4dbf4f3 69fd67d 73d24cc 8f0156b 2da4639` pass; `git add -N docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md && git diff --check -- docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md` pass; `git diff --check` pass. |
| P1 | complete | Artifact-field inventory: `agent-context-v1` previously exposed summary counts, artifact paths/statuses, read order, warnings/errors, and PR-only changed-component data, but repository-mode agents had no schema-defined per-component type metadata. Implemented additive `components[]` metadata in `src/artifacts/agent-context.js` and `src/schema/agent-context-v1.schema.json` with deterministic path/name sorting, component kind, path, type, role tags, dependency count, source, and derivation; updated repository and PR scan tests. Validation: `npm test -- test/agent-context-contract.test.js test/scan-manifest.test.js test/scan-pr-evidence.test.js` failed once for expected analyzer output mismatch, then pass after aligning the assertion to current analyzer output; `npm test -- test/generate-output-json.test.js test/machine-command-coverage.test.js test/json-capability-discovery.test.js` pass; `npm test` pass (180 passing); `npm run test:deep` pass (`deep-regression: OK`). |
| P2 | deferred | Deferred by P0 until a concrete current diagram fixture or snapshot gap is recorded. |
| P3 | deferred | Deferred by P0 until current scan/PR cache usage and trust inputs are documented. |
| P4 | deferred | Deferred by P0 until current confidence signals are inventoried and tied to recovery behavior. |
| P5 | complete | Updated the harvest inventory with implemented P1 evidence, deferred P2-P4 evidence, and closeout recommendation: retain `origin/release/v1.1.0` as read-only evidence until deferred themes are separately planned, discarded, or closed with evidence and explicit approval exists for pruning. Compatibility/no-deletion evidence: `git diff --name-status origin/main...HEAD` shows only added docs and modified agent-context/schema/tests, with no deleted current surfaces. Validation: `npm test -- test/command-identity.test.js test/scan-command.test.js test/scan-manifest.test.js test/scan-pr-evidence.test.js` pass (15 passing); `npm test` pass (180 passing); `npm run test:deep` pass (`deep-regression: OK`); `npm run ci:artifacts` pass (`ci artifact assertions: OK`); `git diff --check` pass. |

## First he-work Handoff

Start with P0.

1. Re-read the governing spec and this plan.
2. Confirm current branch is still
   `codex/archscope-release-branch-harvest` and the working tree
   contains only expected spec/plan/inventory changes.
3. Create `docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md`.
4. Populate the inventory from:
   - `git log --oneline --cherry-pick --right-only main...origin/release/v1.1.0`
   - `git diff --stat main..origin/release/v1.1.0`
   - `git diff --name-status main..origin/release/v1.1.0`
   - focused `git show --stat --oneline --find-renames <commit>` calls
5. Select at most one next implementation theme.
6. Update this plan ledger and acceptance checklist only for completed,
   evidenced work.
7. Run inventory artifact hygiene:
   `git add -N docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md`.
8. Run `git diff --check -- docs/branch-harvest/2026-05-03-release-v1.1.0-harvest-inventory.md`.
9. Run `git diff --check`.

## Sources & References

- Governing spec:
  `docs/specs/2026-05-03-feat-archscope-release-branch-harvest-spec.md`
- Current product-sharpness plan:
  `docs/plans/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-plan.md`
- Release source branch:
  `origin/release/v1.1.0`
- Primary release product-intent commit:
  `e4f8ff5 feat: v1.1.0 — gold-standard diagrams + AI-native types`
- Primary release hardening commit:
  `4dbf4f3 fix: cache, diff, and confidence pipeline hardening`
