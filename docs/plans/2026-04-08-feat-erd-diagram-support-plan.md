---
title: "feat: ERD diagram support for schema-aware onboarding"
type: feat
status: completed
date: 2026-04-08
origin: docs/brainstorms/2026-04-08-erd-diagram-support-requirements.md
requirements: docs/brainstorms/2026-04-08-erd-diagram-support-requirements.md
spec: docs/specs/2026-04-08-feat-erd-diagram-support-spec.md
deepened: 2026-04-08
---

# feat: ERD diagram support for schema-aware onboarding

## Table of Contents

- [Enhancement Summary](#enhancement-summary)
- [Overview](#overview)
- [Plan Mode Decision](#plan-mode-decision)
- [Problem Frame](#problem-frame)
- [Requirements Trace](#requirements-trace)
- [Scope Boundaries](#scope-boundaries)
- [Context & Research](#context--research)
- [Key Technical Decisions](#key-technical-decisions)
- [Open Questions](#open-questions)
- [Acceptance Checklist](#acceptance-checklist)
- [Implementation Units](#implementation-units)
- [System-Wide Impact](#system-wide-impact)
- [Risks & Dependencies](#risks--dependencies)
- [Documentation / Operational Notes](#documentation--operational-notes)
- [Execution Ledger (Planning Mode)](#execution-ledger-planning-mode)
- [Sources & References](#sources--references)

## Enhancement Summary

**Deepened on:** 2026-04-08  
**Deepening mode:** targeted-confidence  
**Research execution mode:** direct

Strengthened sections:
- Open-question handling upgraded to explicit decision gates with phase deadlines.
- Sequencing hardened with cross-phase evidence gates (`G0-G4`).
- System-wide impact expanded with failure-precedence and observability propagation rules.
- Risks and operational notes tightened around fallback posture and trust-protection behavior.

Why this improves execution confidence:
- Prevents phase progression with unresolved contract decisions.
- Makes evidence expectations explicit before entering each phase.
- Reduces trust regressions by making low-confidence/fail-confidence behavior operationally enforceable.

## Overview

Add a new `erd` diagram type that emits Mermaid `erDiagram` output from schema evidence while preserving current `database` mode behavior. This plan sequences CLI surfacing, schema extraction, confidence/failure policy, and verification so the implementation can proceed without contract drift from the deepened spec.

## Plan Mode Decision

- Selected mode: `standard-plan`
- Rationale:
  - Feature work spans CLI contract, parser/extractor logic, rendering, and diagnostics.
  - UI planning mode is not required (`ui_required: false` in source spec).
  - Risk profile is medium with trust-sensitive failure behavior (`publishable` / `publishable_with_marker` / `fail_confidence`).

## Problem Frame

`diagram-cli` currently provides a flow-oriented `database` diagram but does not provide a structural ERD artifact for onboarding. Teams need entity/key/cardinality visibility in one output without losing current behavior-flow insights.

The deepened spec requires deterministic confidence classification and fail-safe behavior when schema evidence is missing or inference dominates.

## Requirements Trace

- R1 -> Add distinct `erd` type without altering `database`.
- R2 -> Emit Mermaid `erDiagram` with entities/attributes/relationships.
- R3 -> Include key semantics (`PK`, `FK`, `UK`) when source evidence exists.
- R4 -> Preserve trust boundary between explicit and inferred relationships.
- R5 -> Keep existing `database` output unchanged.
- R6 -> Make `erd` vs `database` purpose explicit in CLI/docs.
- R7 -> Fail safely with actionable diagnostics when confidence is insufficient.

Spec acceptance reference set: `SA1-SA13` from `docs/specs/2026-04-08-feat-erd-diagram-support-spec.md`.

## Scope Boundaries

In scope:
- `diagram generate --type erd` end-to-end contract.
- ERD extraction/normalization/rendering path.
- Confidence policy outcomes and diagnostics for ERD mode.
- Docs updates for diagram-type semantics.

Out of scope:
- Replacing current `database` behavior-flow output.
- Non-relational visualization expansion.
- UI workflow or design-system changes.

## Context & Research

### Relevant Code and Patterns

- CLI type surfacing and generation path:
  - `src/diagram.js`
- Supported type list and renderer dispatch:
  - `src/core/analysis-generation.js`
- Existing confidence/fallback behavior patterns:
  - `src/confidence/pipeline.js`
  - `src/diagram.js`
- Existing docs listing diagram types:
  - `docs/cli-reference.md`

### Test Harness Baseline

- Current suite uses Mocha/Chai and file-level unit tests in `test/`.
- Existing tests cover confidence pipeline and workflow output contracts:
  - `test/confidence.test.js`
  - `test/pr-impact.test.js`

### Institutional Learnings

- No repo-local ERD extraction precedent detected in current `src/` or `test/` tree.
- Plan includes characterization coverage for `database` behavior to guard non-goal regressions.

## Key Technical Decisions

- Introduce ERD as a new diagram type rather than extending `database`.
  - Preserves behavior-flow semantics (`R5`, `SA4`).
- Add a dedicated schema extraction module for ERD inputs.
  - Avoids overloading existing component/dependency analyzer with ERD-only parsing concerns.
- Model ERD generation as a structured result with status metadata before rendering text.
  - Enables lifecycle/terminal-class policy without fabricating fallback diagrams (`SA6`, `SA10`, `SA11`).
- Keep confidence policy deterministic and explicit.
  - Implement normative `publishable` / `publishable_with_marker` / `fail_confidence` mapping (`SA13`).
- For `generate-all`, prioritize strict completeness over partial success.
  - If ERD resolves to `fail_confidence`, fail the full invocation and avoid emitting a success manifest for that run.

## Open Questions

### Resolved During Planning

- Source of truth for planning: use deepened spec as canonical contract plus brainstorm requirements.
- Mode selection: `standard-plan` is sufficient; no dedicated UI plan needed.
- `generate-all` completeness policy: strict completeness selected (fail whole run on ERD `fail_confidence`).

### Deferred to Implementation

- Exact v1 schema source ordering (for example Prisma first vs SQL migrations first) while keeping explicit/inferred provenance rules unchanged.
- Exact operator text wording for failure diagnostics, as long as required fields and terminal class are present.

### Decision Gates (Must Close by Phase)

- `DG1` (close by `P1` exit): v1 explicit schema source precedence is fixed and documented in tests/docs.
- `DG2` (close by `P2` exit): diagnostic payload shape is fixed for ERD terminal classes in text/json output paths.
- `DG3` (close by `P3` exit): observability field contract is finalized for success and failure artifact paths.

If a decision gate remains open at its deadline, the phase is not complete even if implementation appears functionally correct.

## Acceptance Checklist

- [x] `AC1` CLI and docs expose `erd` as a valid diagram type and distinguish it from `database`.  
  Trace: `R1`, `R6`, `SA1`.
- [x] `AC2` ERD output is valid Mermaid `erDiagram` containing entities, attributes, and relationships when evidence exists.  
  Trace: `R2`, `SA2`.
- [x] `AC3` Key flags (`PK`, `FK`, `UK`) appear only when supported by explicit source evidence.  
  Trace: `R3`, `SA3`.
- [x] `AC4` `database` generation behavior remains unchanged for equivalent inputs/options.  
  Trace: `R5`, `SA4`.
- [x] `AC5` Relationship provenance is explicit (`explicit` vs `inferred`) and never conflated.  
  Trace: `R4`, `SA5`, `SA12`.
- [x] `AC6` ERD runs with no schema evidence or `fail_confidence` classification fail safely with actionable diagnostics.  
  Trace: `R7`, `SA6`.
- [x] `AC7` ERD mode integrates with existing validate/render/output paths without breaking non-ERD modes.  
  Trace: `SA7`.
- [x] `AC8` Repeated ERD runs on identical inputs/options produce deterministic output and confidence classification.  
  Trace: `SA8`, `SA13`.
- [x] `AC9` Lifecycle guard conditions are enforced and failures map to a single dominant terminal class.  
  Trace: `SA9`, `SA10`.
- [x] `AC10` Observability includes provenance counts and terminal-state classification for success and failure paths.  
  Trace: `SA11`.
- [x] `AC11` `generate-all` follows strict completeness: if ERD resolves to `fail_confidence`, the whole run fails and no success manifest is emitted for that invocation.  
  Trace: `R7`, `SA6`, `SA7`, user decision (2026-04-08).

## Implementation Units

- [x] **P0 / Unit 1: CLI surface and type dispatch wiring**

**Goal:** Make `erd` a first-class diagram type in command surfacing and generator dispatch while preserving existing fallback behavior for unknown types.

**Requirements:** `R1`, `R5`, `R6`.

**Dependencies:** None.

**Files:**
- Modify: `src/core/analysis-generation.js`
- Modify: `src/diagram.js`
- Modify: `docs/cli-reference.md`
- Test: `test/erd-generation.test.js`

**Approach:**
- Add `erd` to supported type list and command help text.
- Extend `generate(...)` dispatch with an ERD branch.
- Keep unknown-type fallback-to-architecture behavior unchanged.

**Execution note:** Characterization-first for existing `database` generation behavior before ERD-specific assertions.

**Patterns to follow:**
- Existing type dispatch pattern in `src/core/analysis-generation.js`.
- Existing CLI option/documentation pattern in `src/diagram.js` and `docs/cli-reference.md`.

**Test scenarios:**
- `--type erd` routes to ERD generation path.
- Unsupported type still falls back with suggestion behavior.
- Diagram type table clearly differentiates `database` vs `erd`.

**Verification:**
- Unit tests pass for dispatch and non-regression cases.
- `AC1`, `AC4` satisfied.

**Exit criteria:**
- `erd` is recognized across CLI/type list/docs.
- Non-ERD outputs are unchanged in targeted characterization tests.

- [x] **P1 / Unit 2: Schema evidence extraction and ERD normalization**

**Goal:** Build a normalized ERD domain model with entities, attributes, keys, relationships, and provenance.

**Requirements:** `R2`, `R3`, `R4`.

**Dependencies:** `P0`.

**Files:**
- Create: `src/schema/erd-extractor.js`
- Create: `src/schema/erd-model.js`
- Modify: `src/core/analysis-generation.js`
- Test: `test/erd-extractor.test.js`
- Test: `test/erd-generation.test.js`

**Approach:**
- Add schema-source extraction module(s) that return a normalized model independent of output formatting.
- Encode field-level metadata (`type`, `nullable`, key flags) and relationship-level provenance.
- Keep extraction bounded to repo analysis scope and deterministic ordering.
- Use canonical fixture location `test/fixtures/erd/` with minimum set:
  - `explicit-schema`
  - `inferred-heavy`
  - `no-schema`

**Execution note:** Vertical slices by source family (one explicit source path at a time) to avoid horizontal slicing.

**Patterns to follow:**
- Existing deterministic ordering and escaping patterns in `src/core/analysis-generation.js`.
- Existing safe file-scan constraints from `analyze(...)`.

**Test scenarios:**
- Explicit schema fixture produces expected entities/keys/relationships.
- Inferred relationship path is marked inferred and never promoted to explicit.
- Missing schema fixture produces empty/diagnostic-ready model state.

**Verification:**
- Extractor tests validate normalized model contract.
- `AC2`, `AC3`, `AC5` partially satisfied (rendering policy finalized in `P2`).

**Exit criteria:**
- ERD model contract exists and is consumed by generator layer.
- Provenance and key metadata are preserved through normalization.

- [x] **P2 / Unit 3: Confidence policy, lifecycle guards, and failure semantics**

**Goal:** Enforce spec-defined confidence outcomes and deterministic terminal failure classes for ERD runs.

**Requirements:** `R4`, `R7`.

**Dependencies:** `P1`.

**Files:**
- Create: `src/schema/erd-confidence.js`
- Modify: `src/core/analysis-generation.js`
- Modify: `src/diagram.js`
- Test: `test/erd-confidence.test.js`
- Test: `test/erd-generation.test.js`

**Approach:**
- Implement normative policy outcomes:
  - `publishable`
  - `publishable_with_marker`
  - `fail_confidence`
- Add lifecycle guard checks before render/finalization.
- Return actionable diagnostics with dominant terminal class for failure paths.
- Enforce confidence-precedence matrix to avoid ambiguous mixed outcomes:
  - `ERD outcome=fail_confidence` -> terminal failure for ERD command path regardless of marker eligibility.
  - `ERD outcome=publishable_with_marker` + `--strict-confidence` degraded by global pipeline -> fail with strict-confidence semantics while preserving ERD terminal classification in diagnostics.
  - Validation failure after successful ERD model normalization -> validation/render failure class per existing command policy.
  - Command-level exit ownership remains stable: usage/config/path errors retain existing non-ERD exit behavior.

**Execution note:** Treat ERD policy as additive to existing confidence pipeline; avoid changing behavior for other diagram types.

**Patterns to follow:**
- Existing strict-confidence failure handling in `src/diagram.js`.
- Existing confidence report structure in `src/confidence/pipeline.js`.

**Test scenarios:**
- Deterministic policy classification for same normalized inputs.
- `fail_confidence` path exits safely with dominant terminal class.
- `publishable_with_marker` emits diagram with explicit confidence marker.

**Verification:**
- Policy tests assert one-and-only-one outcome classification.
- CLI-level tests assert failure exit behavior and diagnostics.
- `AC6`, `AC8`, `AC9` satisfied.

**Exit criteria:**
- ERD generation never emits fabricated structure in hard-fail states.
- Terminal classification is stable and deterministic.

- [x] **P3 / Unit 4: Rendering integration, observability, and operational docs**

**Goal:** Finalize ERD output integration into existing output/manifest paths with explicit observability and documentation updates.

**Requirements:** `R2`, `R4`, `R6`, `R7`.

**Dependencies:** `P2`.

**Files:**
- Modify: `src/core/analysis-generation.js`
- Modify: `src/diagram.js`
- Modify: `docs/cli-reference.md`
- Test: `test/erd-generation.test.js`
- Test: `test/confidence.test.js`

**Approach:**
- Ensure ERD output participates in text/json/output-file flows.
- Include provenance counts and terminal-state metadata in run/manifest observability surfaces.
- Update docs with operational guidance for `erd` and confidence semantics.
- Apply strict completeness for `generate-all`: ERD `fail_confidence` fails the invocation rather than producing a partial-success manifest.

**Execution note:** Keep artifact and manifest conventions aligned with current contracts instead of introducing new output locations unless necessary.

**Patterns to follow:**
- `toManifestEntry(...)` metadata shape and placeholder detection flow.
- Existing docs style and command reference structure in `docs/cli-reference.md`.

**Test scenarios:**
- `generate` and `generate-all` include ERD artifacts appropriately.
- Observability fields are present on both success and failure ERD runs.
- Existing non-ERD command outputs remain regression-safe.
- `generate-all` exits as failed when ERD is `fail_confidence` and does not emit a success manifest for that run.

**Verification:**
- Unit tests plus full repo validation:
  - `npm test`
  - `npm run test:deep`
- `AC7`, `AC10`, `AC11` satisfied and all prior ACs revalidated.

**Exit criteria:**
- ERD mode is operationally documented and verifiable end to end.
- Validation baseline passes with ERD coverage in place.

### Phase Gates and Progression Controls

- `G0` (enter `P1`): `P0` characterization confirms `database` outputs remain stable for baseline fixtures.
- `G1` (enter `P2`): normalized ERD model exists with deterministic ordering and provenance tagging.
- `G2` (enter `P3`): confidence policy tests prove one-and-only-one outcome classification and terminal-class stability.
- `G3` (ready for completion): ERD output is integrated across text/json/file/manifest surfaces with non-ERD regression checks passing.
- `G3a` (ready for completion): strict completeness behavior for `generate-all` is verified for ERD `fail_confidence`.
- `G4` (execution close): `npm test` and `npm run test:deep` both pass with ERD coverage included.

Stop rule:
- If any gate fails, do not advance to the next `P` unit; resolve the earliest failed gate and rerun its verification first.

## System-Wide Impact

- **Interaction graph:** `diagram generate --type erd` -> analysis scope -> ERD extraction/normalization -> policy classification -> Mermaid rendering -> output/validation/manifest.
- **Error propagation:** ERD-specific failures must resolve to a single terminal class and actionable diagnostics; non-ERD paths keep existing behavior.
- **State lifecycle risks:** Parsing partial schemas can create ambiguous models; policy gating prevents misleading outputs.
- **API surface parity:** Existing command family remains backward-compatible with additive `erd` type support.
- **Integration coverage:** Tests must cover dispatch, policy classification, failure handling, and non-regression for `database`.
- **Failure precedence contract:** extraction failures dominate policy failures, which dominate render/validation failures, aligned to the deepened spec.
- **Observability propagation:** provenance counts, confidence outcome, and terminal class must be consistent across CLI output and generated artifacts.

## Risks & Dependencies

- Risk: Source-format variance across schema families causes inconsistent extraction.
  - Mitigation: Start with bounded explicit source families and deterministic fallback/failure rules.
- Risk: ERD-specific failures leak into global command behavior.
  - Mitigation: Gate new logic on `type === 'erd'` and run characterization tests for existing types.
- Risk: `generate-all` policy drift creates contradictory operator expectations about partial output success.
  - Mitigation: encode strict completeness in acceptance + gate criteria and verify with explicit failing fixture coverage.
- Risk: Inference-heavy repos may produce plausible but low-trust ERDs.
  - Mitigation: enforce `publishable_with_marker` and `fail_confidence` behavior so trust never degrades silently.
- Risk: Phase drift can hide unresolved contract decisions until late verification.
  - Mitigation: block progression on unresolved `DG1-DG3` and enforce `G0-G4` evidence gates.
- Dependency: Stable schema fixtures for explicit/inferred/no-schema test cases.
- Dependency: Existing confidence pipeline conventions for diagnostics and strict-failure signaling.
- Dependency: Stable artifact metadata shape so ERD observability fields remain machine-consumable.

## Documentation / Operational Notes

- Keep `database` vs `erd` distinction explicit in command docs.
- Ensure failure messages include next-step guidance (missing schema source vs low confidence vs parse failure).
- Maintain validation baseline requirements for implementation handoff:
  - `npm test`
  - `npm run test:deep`
- Operational fallback posture:
  - if explicit schema evidence is absent, fail with diagnostics instead of fabricating ERD topology
  - if policy outcome is `publishable_with_marker`, emit explicit low-confidence signaling in operator-facing output
  - if policy outcome is `fail_confidence`, block ERD emission and preserve dominant terminal class in diagnostics

## Execution Ledger (Planning Mode)

STEP_ID | status (pending|in_progress|completed) | owner | evidence
P0 | completed | implementation | `erd` surfaced in CLI/type dispatch and docs; characterization check retained for `database`
P1 | completed | implementation | schema extraction + normalized ERD model shipped with fixture-backed tests (`explicit-schema`, `inferred-heavy`, `no-schema`)
P2 | completed | implementation | deterministic confidence policy + terminal-class handling implemented and validated
P3 | completed | implementation | observability/manifest integration shipped; strict `generate-all` completeness enforced and verified

## Sources & References

- Origin requirements: `docs/brainstorms/2026-04-08-erd-diagram-support-requirements.md`
- Canonical spec: `docs/specs/2026-04-08-feat-erd-diagram-support-spec.md`
- CLI contract surface: `src/diagram.js`
- Diagram type dispatch: `src/core/analysis-generation.js`
- Existing confidence contract: `src/confidence/pipeline.js`
- Command reference: `docs/cli-reference.md`
