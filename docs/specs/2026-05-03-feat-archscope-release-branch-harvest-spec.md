---
schema_version: 1
title: Archscope Release Branch Harvest Contract
type: feat
status: draft
date: 2026-05-03
origin: Branch salvage review after main absorbed Archscope PRs #76-#79
risk: medium
spec_depth: full
ui_required: false
traceability_required: false
---

# Archscope Release Branch Harvest Contract

## Spec Mode Decision

**Mode:** standard-spec
**Depth:** full
**UI companion required:** no

This spec defines how to harvest worthwhile product ideas from the stale
`origin/release/v1.1.0` branch without merging, cherry-picking, or reviving its
older implementation shape. The branch is useful as source evidence for diagram
quality, AI-native type metadata, incremental cache behavior, and confidence
pipeline hardening. It is not a merge target for current `main`.

## Table of Contents

- [Spec Mode Decision](#spec-mode-decision)
- [Problem Statement](#problem-statement)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Linear Work Item Contract](#linear-work-item-contract)
- [System Boundary](#system-boundary)
- [Baseline Context](#baseline-context)
- [Source Evidence](#source-evidence)
- [Core Domain Model](#core-domain-model)
- [Branch Harvest Lifecycle](#branch-harvest-lifecycle)
- [Interfaces and Dependencies](#interfaces-and-dependencies)
- [Invariants / Safety Requirements](#invariants--safety-requirements)
- [Failure Model and Recovery](#failure-model-and-recovery)
- [Observability](#observability)
- [Acceptance and Test Matrix](#acceptance-and-test-matrix)
- [Linear Acceptance Traceability](#linear-acceptance-traceability)
- [First Slice Recommendation](#first-slice-recommendation)
- [Open Questions](#open-questions)
- [Planning and Implementation Handoff](#planning-and-implementation-handoff)
- [Definition of Done](#definition-of-done)

## Problem Statement

Current `main` has absorbed the Archscope repositioning, compatibility,
evidence-pack, identity-convergence, and product-sharpness work. Remaining
branches were reviewed for useful work that may not have landed. Most branches
are stale or superseded. The only branch with strategically interesting product
material is `origin/release/v1.1.0`, which contains a "gold-standard diagrams
+ AI-native types" direction plus cache, diff, and confidence hardening.

However, `origin/release/v1.1.0` diverges sharply from current `main`. Its
diff would delete or replace current Archscope artifacts, commands, specs,
plans, tests, schema files, and refactored command modules. Directly merging it
would undo important current product work and pull the implementation back
toward older monolithic `src/core/analysis-generation.js` and `src/diagram.js`
surfaces.

The product opportunity is therefore a harvest, not a merge:

```text
Extract the useful requirements from release/v1.1.0, then reimplement them
against current Archscope architecture and contracts.
```

## Goals

- Preserve the useful product intent from `origin/release/v1.1.0` without
  importing stale implementation structure.
- Define a bounded next feature lane for diagram quality, AI-native type
  evidence, incremental cache behavior, and confidence pipeline hardening.
- Keep Archscope's current north star intact: architecture evidence for humans
  and AI coding agents.
- Treat diagrams as one rendering of architecture evidence, not the primary
  internal product model.
- Provide acceptance IDs that can drive a future `$he-plan` without reopening
  the branch-pruning or merge decision.
- Make it explicit that stale branch code must be mined manually and
  reimplemented only where it still fits current `main`.

## Non-Goals

- Merging `origin/release/v1.1.0`.
- Cherry-picking `origin/release/v1.1.0` commits directly onto `main`.
- Reverting the merged Archscope work from PRs #76-#79.
- Restoring older monolithic implementations in `src/diagram.js`,
  `src/core/analysis-generation.js`, or `src/graph.js`.
- Deleting current artifacts, specs, plans, report generation, scan behavior,
  context packs, ERD schema support, or validation scripts.
- Renaming the npm package, GitHub repository, `.diagram`, or `.diagramrc`.
- Building a hosted service, daemon, database, or network-dependent workflow.
- Redesigning `.diagram/report.html`.
- Making video or animated diagram generation a core product path.

## Linear Work Item Contract

No Linear issue was supplied with this spec request.

- `traceability_required`: `false`
- Tracker of record: not supplied
- Planning status: allowed for local planning only
- Future PR delivery expectation: link this spec and the eventual tracked work
  item if one is created

## System Boundary

In scope:

- Requirements extraction from `origin/release/v1.1.0`.
- Current-main implementation of selected release-branch ideas.
- Diagram quality improvements that strengthen architecture evidence.
- AI-native type metadata in machine-readable artifacts.
- Incremental cache behavior that makes repeated evidence generation faster
  and more reliable.
- Confidence and diff pipeline hardening where it improves trust in generated
  evidence.
- Tests and docs proving the harvested behavior works on current `main`.

Out of scope:

- Direct branch merge or cherry-pick.
- Broad internal rewrite of the analysis subsystem.
- Compatibility finalization policy changes.
- Package/repo rename sequencing.
- Governance and migration ledger redesign.
- New UI companion work.

## Baseline Context

Live state at spec time:

- Current branch before editing was `main`, aligned with `origin/main`.
- `main` includes the merged Archscope compatibility, evidence experience,
  identity convergence, and product-sharpness PR work.
- No remaining branch was patch-identical to `main`.
- `origin/release/v1.1.0` is the only remaining branch with product ideas worth
  mining, but its diff is not safe to merge.
- `origin/release/v1.1.0` changes current-main files in ways that would remove
  many current Archscope modules and tests if applied wholesale.

Branch-diff evidence:

```text
git diff --name-status main..origin/release/v1.1.0
```

showed broad deletions across current artifacts, commands, docs, specs, tests,
schema files, context helpers, report rendering, and validation scripts.

Focused release-branch evidence:

```text
git show --stat --oneline --find-renames e4f8ff5
```

identified the main product-intent commit:

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
git show --stat --oneline --find-renames 4dbf4f3
```

identified the hardening commit:

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

Additional minor release-branch commits include:

- `69fd67d test: remove manifest command from deep-regression suite`
- `2da4639 Potential fix for code scanning alert no. 24`
- `8f0156b Update analysis-generation.js`

These may inform cleanup, but they do not define the core product opportunity.

## Source Evidence

The release branch suggests four harvestable themes.

### Theme 1: Gold-Standard Diagram Evidence

Useful intent:

- Generated diagrams should be good enough to support architecture review, not
  merely syntactically valid Mermaid.
- Diagram output should preserve meaningful architecture groupings, dependency
  direction, and readable labels.
- Diagram evidence should remain tied to machine-readable artifacts so humans
  and agents can cross-check claims.

Current-main interpretation:

- Improve diagram quality through current renderer and artifact contracts.
- Keep `.diagram/brief.md`, `.diagram/manifest.json`, and
  `.diagram/agent-context.json` as the primary evidence contract.
- Treat Mermaid diagrams as supporting evidence, not the source of truth.

### Theme 2: AI-Native Type Metadata

Useful intent:

- Agents benefit from explicit type or role metadata that describes what a
  component is, why it matters, and how confident Archscope is.
- Machine-readable output should expose stable fields instead of requiring
  agents to infer meaning from Mermaid labels or prose.

Current-main interpretation:

- Extend current evidence artifacts with typed component metadata only after
  inventorying existing fields in `agent-context`, manifest, PR impact, ERD,
  and scan JSON.
- Avoid a parallel schema that duplicates current artifacts.
- Keep deterministic output stable under `--deterministic`.

### Theme 3: Incremental Cache and Diff Reliability

Useful intent:

- Repeated scans should reuse trustworthy state where safe.
- Diff and PR evidence should avoid stale or misleading cache reads.
- Cache metadata should make invalidation understandable.

Current-main interpretation:

- Audit current `src/incremental/cache.js`, scan, workflow PR, and artifact
  generation paths before adding behavior.
- Prefer a small cache-validation contract before changing cache storage.
- Ensure cache use never hides partial analysis or stale PR refs.

### Theme 4: Confidence Pipeline Hardening

Useful intent:

- Evidence should expose confidence where analysis is inferred, partial, or
  degraded.
- Confidence should help humans and agents decide whether to trust, inspect, or
  rerun a result.

Current-main interpretation:

- Use existing `src/confidence/pipeline.js` and manifest warning/status
  contracts as the starting point.
- Surface confidence in the brief and machine artifacts only where it changes a
  decision.
- Do not add decorative confidence scores that are not tied to recovery or
  review behavior.

## Core Domain Model

- `BranchHarvestCandidate`
  - A requirement or implementation idea found on a stale branch.
  - Required fields: source branch, source commit, touched files, product
    intent, current-main fit, risk, and selected disposition.

- `HarvestDisposition`
  - Allowed values:
    - `discard`: obsolete, harmful, or already superseded.
    - `document`: useful only as context.
    - `reimplement`: useful behavior that should be rebuilt on current main.
    - `defer`: useful, but too broad for the next plan.

- `EvidenceTypeMetadata`
  - Stable machine-readable metadata that describes a component, relation,
    artifact, confidence reason, or review cue.
  - Must be consumed through current artifact contracts rather than Mermaid
    parsing.

- `DiagramQualityGate`
  - A focused validation that proves diagram output is readable, deterministic,
    and traceable to the underlying architecture model.
  - Must include both human-facing artifact review and machine-readable
    assertions.

- `CacheTrustBoundary`
  - The boundary where cached evidence is either accepted, invalidated, or
    marked degraded.
  - Must include repo path, relevant refs, config hash or equivalent signal,
    artifact schema version, and deterministic-mode behavior.

- `ConfidenceSignal`
  - A reasoned indicator that evidence is direct, inferred, partial, degraded,
    or unavailable.
  - Must drive a user or agent decision; otherwise it should not be surfaced.

## Branch Harvest Lifecycle

1. **Inventory**
   - Enumerate branch-only commits and touched files.
   - Classify each commit into the four harvest themes or discard it.
   - Record why direct merge/cherry-pick is unsafe.

2. **Extract**
   - Convert selected branch behavior into requirements.
   - Preserve examples, fixture ideas, and edge cases where useful.
   - Do not copy code before proving it fits current `main`.

3. **Map**
   - Map each selected requirement to current-main owners:
     - artifact schema
     - scan command
     - renderer
     - context pack
     - PR workflow
     - cache
     - confidence pipeline
     - tests

4. **Reimplement**
   - Patch the smallest current-main slice.
   - Prefer current helpers and command modules.
   - Avoid resurrecting old monolithic code paths.

5. **Validate**
   - Run focused tests for the touched behavior.
   - Run baseline validation when source behavior changes.
   - Prove deterministic output remains stable.

6. **Retire**
   - After all useful candidates are implemented, discarded, or explicitly
     deferred with evidence, mark `origin/release/v1.1.0` as safe to retain,
     archive, or prune.

## Interfaces and Dependencies

Candidate implementation surfaces:

- CLI:
  - `archscope scan .`
  - `archscope scan . --format json --deterministic`
  - `archscope scan . --base origin/main --head HEAD`
  - `archscope workflow pr . --base origin/main --head HEAD`
- Artifacts:
  - `.diagram/manifest.json`
  - `.diagram/brief.md`
  - `.diagram/agent-context.json`
  - `.diagram/architecture.mmd`
  - `.diagram/pr-impact/pr-impact.json`
- Code areas:
  - `src/artifacts/**`
  - `src/commands/scan.js`
  - `src/commands/workflow-pr.js`
  - `src/context/**`
  - `src/core/analysis-generation-*.js`
  - `src/incremental/cache.js`
  - `src/confidence/pipeline.js`
  - `src/renderers/**`
  - `src/workflow/**`
  - `src/schema/**`
- Tests:
  - scan evidence tests
  - agent context tests
  - manifest tests
  - PR impact tests
  - analysis generation snapshot/fixture tests
  - cache/confidence tests where present or newly required

## Invariants / Safety Requirements

- `origin/release/v1.1.0` must not be merged directly.
- Release-branch commits must not be cherry-picked without a current-main
  compatibility review.
- Current Archscope evidence artifacts must remain the primary contract.
- The implementation must not delete current scan, context, manifest, report,
  ERD, migration, validation, or spec/plan surfaces as a side effect.
- Any AI-native metadata must be deterministic and schema-versioned.
- Any cache use must be invalidated or degraded when refs, config, schema, or
  source inputs no longer match.
- Confidence signals must be actionable for humans or agents.
- Diagram improvements must not make agents parse Mermaid to recover facts that
  belong in JSON or manifest artifacts.
- Media commands remain secondary and must not become the center of this work.
- Validation evidence must be recorded before the release branch is pruned.

## Failure Model and Recovery

| Failure | Required behavior | Recovery |
| --- | --- | --- |
| Branch requirement is obsolete | Mark candidate `discard` with evidence. | Do not implement; record rationale in plan. |
| Branch behavior already exists on main | Mark candidate `document` or `discard`. | Add no code unless tests/docs are missing. |
| Branch code conflicts with current architecture | Mark candidate `reimplement`. | Rebuild behavior against current modules. |
| Candidate requires broad rewrite | Mark candidate `defer`. | Create a separate architecture spec before implementation. |
| Cache can return stale evidence | Treat as blocker for cache slice. | Add invalidation or disable cache use for that path. |
| Confidence signal is decorative | Do not surface it. | Keep confidence internal until it affects a decision. |
| Deterministic output becomes flaky | Treat as P1 implementation defect. | Sort fields, remove volatile timestamps, or use existing deterministic sentinel behavior. |
| Harvest cannot be validated | Stop before pruning release branch. | Keep branch until evidence is produced or the candidate is discarded. |

## Observability

Required human-visible evidence:

- A harvest inventory naming selected and discarded release-branch candidates.
- A brief implementation summary for each selected theme.
- Updated docs or artifact examples when user-facing behavior changes.

Required machine-visible evidence:

- Deterministic JSON or manifest fields for any added AI-native metadata.
- Tests proving cache invalidation or bypass decisions.
- Tests proving confidence categories or warnings are stable.
- Snapshot or fixture assertions for diagram quality changes.

Required release-branch closeout evidence:

- Source branch and commit IDs reviewed.
- Candidate dispositions recorded.
- Validation commands and outcomes recorded.
- Explicit decision on whether `origin/release/v1.1.0` can be deleted,
  retained, or archived.

## Acceptance and Test Matrix

| ID | Acceptance | Verification |
| --- | --- | --- |
| SA1 | A harvest inventory classifies `origin/release/v1.1.0` branch-only commits as discard, document, reimplement, or defer. | Review inventory artifact or plan section. |
| SA2 | The plan forbids direct merge and default cherry-pick of `origin/release/v1.1.0`. | Plan review. |
| SA3 | Gold-standard diagram requirements are mapped to current renderer/artifact owners rather than old monolithic files. | Plan review and changed-file review. |
| SA4 | AI-native type metadata requirements are mapped to existing artifact schemas or an explicit schema migration. | Schema/test review. |
| SA5 | Incremental cache requirements define trust boundaries and invalidation inputs before implementation changes cache behavior. | Cache plan and focused tests. |
| SA6 | Confidence pipeline requirements define actionable categories or warnings, not decorative scores. | Confidence tests and artifact review. |
| SA7 | First implementation slice changes no more than one product theme unless the plan records why coupling is unavoidable. | Diff review. |
| SA8 | Deterministic mode remains stable for any changed scan, manifest, agent context, PR impact, or diagram artifact. | Deterministic fixture or snapshot tests. |
| SA9 | Current compatibility surfaces remain intact: `archscope`, `diagram`, `@brainwav/diagram`, `.diagram`, and `.diagramrc`. | Compatibility tests and docs review. |
| SA10 | No current specs, plans, artifacts, commands, schemas, or tests are deleted as a side effect of branch harvest. | Changed-file review. |
| SA11 | Branch closeout records whether `origin/release/v1.1.0` should be retained, archived, or pruned after harvest. | Plan ledger or final report. |
| SA12 | Baseline validation is run for any source/runtime behavior change. | `npm test` and `npm run test:deep` outcomes when implementation touches runtime behavior. |

## Linear Acceptance Traceability

No Linear issue is attached.

| Tracker | Acceptance IDs | Status |
| --- | --- | --- |
| Untracked local spec | SA1-SA12 | Traceability pending future Linear issue |

## First Slice Recommendation

The first implementation plan should be a no-code or docs-light inventory
slice:

1. Generate a harvest inventory for `origin/release/v1.1.0`.
2. Classify each branch-only commit and touched file.
3. Select at most one implementation theme for the next phase.
4. Prefer the first implementation theme in this order:
   - AI-native type metadata if current artifacts lack stable fields agents need.
   - Diagram quality if fixtures prove current diagrams are hard to review.
   - Cache trust boundaries if repeated scans are measurably stale or slow.
   - Confidence pipeline hardening if current warnings are ambiguous.
5. Do not edit runtime code until the inventory is complete.

## Open Questions

- Which release-branch theme has the highest immediate product value after
  PR #79: AI-native metadata, diagram quality, cache, or confidence?
- Does current `agent-context.json` already contain enough type metadata for
  coding agents, or does it need a schema extension?
- Should cache behavior be part of the default `scan` path, or only an
  optimization behind explicit trust checks?
- What diagram quality threshold should count as "gold-standard" without
  turning the project back into a diagram-first tool?
- Should `origin/release/v1.1.0` be deleted after harvest, or archived as a
  historical release branch?

## Planning and Implementation Handoff

The paired HE plan should:

- Start from current `main`, not from `origin/release/v1.1.0`.
- Treat `origin/release/v1.1.0` as read-only source evidence.
- Produce a harvest inventory before source edits.
- Keep the first runtime implementation slice small and theme-specific.
- Run `$simplify`, `$he-code-review`, and `$he-fix-bugs` after each phase if
  the user routes the implementation through the standard heartbeat loop.
- Commit only current-main work with validation evidence.
- Stop before pruning `origin/release/v1.1.0` unless all selected candidates
  are implemented, discarded, or explicitly deferred.

## Definition of Done

- This spec has a paired HE plan.
- The plan includes a harvest inventory phase before runtime edits.
- Selected release-branch ideas are classified with source commit evidence.
- No stale branch code is merged or cherry-picked without current-main review.
- Any implemented behavior is rebuilt against current Archscope modules.
- Deterministic artifacts remain stable.
- Compatibility surfaces remain intact.
- Validation evidence is recorded.
- A final branch closeout decision is made for `origin/release/v1.1.0`.
