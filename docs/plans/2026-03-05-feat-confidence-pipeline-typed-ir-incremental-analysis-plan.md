---
title: "feat: Add confidence pipeline with typed IR and incremental analysis foundations"
type: feat
status: completed
date: 2026-03-05
---

# feat: Add confidence pipeline with typed IR and incremental analysis foundations

## Table of Contents

- [Overview](#overview)
- [Problem Statement / Motivation](#problem-statement--motivation)
- [Planning Inputs](#planning-inputs)
- [Research Summary and Decision](#research-summary-and-decision)
- [SpecFlow Analysis (User/System Flows)](#specflow-analysis-usersystem-flows)
- [Proposed Solution](#proposed-solution)
- [Technical Approach](#technical-approach)
  - [Architecture](#architecture)
  - [Implementation Phases](#implementation-phases)
- [Alternative Approaches Considered](#alternative-approaches-considered)
- [Open Questions](#open-questions)
- [System-Wide Impact](#system-wide-impact)
  - [Interaction Graph](#interaction-graph)
  - [Error & Failure Propagation](#error--failure-propagation)
  - [State Lifecycle Risks](#state-lifecycle-risks)
  - [API Surface Parity](#api-surface-parity)
  - [Integration Test Scenarios](#integration-test-scenarios)
- [Acceptance Criteria](#acceptance-criteria)
- [Success Metrics](#success-metrics)
- [Dependencies & Prerequisites](#dependencies--prerequisites)
- [Risk Analysis & Mitigation](#risk-analysis--mitigation)
- [Resource Requirements](#resource-requirements)
- [Future Considerations](#future-considerations)
- [Documentation Plan](#documentation-plan)
- [AI-Era Planning Notes](#ai-era-planning-notes)
- [Sources & References](#sources--references)

## Overview

Introduce a trustable confidence pipeline as the first milestone, then establish a typed architecture IR and plugin-analyzer boundaries, and finally add incremental/diff-first analysis paths for large repositories.

This plan intentionally follows the user-selected sequence:
1. Confidence pipeline first
2. Typed IR foundation second
3. Incremental/diff-first scaling third

## Problem Statement / Motivation

Current behavior gives useful outputs, but confidence is not explicit enough for strict CI gating and large-repo reliability:

- Validation fallback behavior can mask tool capability gaps (for example Mermaid validation path currently falls back silently in some cases).
- Core analysis and CLI orchestration are concentrated in large modules, increasing regression risk during feature growth.
- Analysis is primarily full-scan-first; large codebases need incremental/diff-first options for performance and determinism.
- Typed contracts between analysis, diffing, risk scoring, and artifact emission are implicit rather than formalized.

## Planning Inputs

### Brainstorm discovery

Checked `docs/brainstorms/*.md` (2026-03-05):
- `docs/brainstorms/2026-03-02-inward-only-directionality-brainstorm.md`
- `docs/brainstorms/2026-03-03-visual-explainer-integration-brainstorm.md`

No relevant brainstorm matched this feature scope (confidence pipeline + typed IR + incremental analysis), so this plan uses direct feature input and repo research.

### Feature intent carried into plan

- Preferred starting outcome: trust score + hard fail mode
- Compatibility posture: no breaking CLI changes
- Sequencing: A → B → C (confidence → typed IR → incremental)

## Research Summary and Decision

### Local repo findings

1. Core analysis and generation are centralized in:
   - `src/core/analysis-generation.js:451` (`analyze`)
   - `src/core/analysis-generation.js:1016` (`generate`)
   - `src/core/analysis-generation.js:1056` (`toManifestEntry`)

2. CLI command surface and path validation are centralized in:
   - `src/diagram.js:82` (`validateOutputPath`)
   - `src/diagram.js:192` (`validateMermaidSyntax`)
   - `src/diagram.js:291`, `:324`, `:439`, `:484` (main commands)

3. PR diff/snapshot/risk pipeline exists and is extensible:
   - `src/workflow/pr-command.js:23` (workflow command registration)
   - `src/workflow/git-helpers.js:292` (`analyzeAtRef`)
   - `src/workflow/pr-impact.js:1-240` (delta, blast radius, risk scoring)
   - `src/workflow/pr-impact.js:652` (`writePrImpactArtifacts`)

4. Existing policy/conventions relevant to rollout:
   - No breaking command behavior preferred for incremental delivery (`README.md`, current command docs)
   - Validation discipline and focused/broader checks required (`docs/agents/03-validation.md`)
   - Tooling/pinning constraints must be preserved (`docs/agents/02-tooling-policy.md`)

### Learnings repository check

- No `docs/solutions/` entries were found for this feature area.
- Institutional learnings source is effectively empty for this scope; this plan includes explicit risk tracking to compensate.

### External research decision

Skipped for v1 planning. Rationale:
- This work is primarily internal architecture evolution and CLI contract hardening.
- Existing code/documentation already provide strong local context.
- No external API, payment, or compliance-critical dependency is introduced in this feature scope.

## SpecFlow Analysis (User/System Flows)

### Primary user flows

1. **Developer confidence check flow**
   - User runs analysis/generation command.
   - System runs capability probes + validation mode checks.
   - System emits confidence report with explicit pass/warn/fail reasons.
   - Optional strict mode converts confidence failures to exit code 1.

2. **CI strict gating flow**
   - CI runs command with strict confidence flag.
   - Missing/invalid capabilities or contract violations fail deterministically.
   - Artifacts include machine-readable diagnostics for triage.

3. **Large-repo fast path flow**
   - User provides diff refs or incremental mode.
   - System computes changed-file subset and impacted components first.
   - System reuses index/IR cache when compatible.
   - System emits bounded output with truncation metadata.

### Key edge cases to cover

- Capability partially available (for example renderer installed but wrong flags/version behavior).
- Empty diffs and no-op scans under strict mode.
- Cache invalidation when parser/IR schema version changes.
- Renames/moves affecting incremental keys and blast radius.
- Fallback path must be explicit (never implied success).

## Proposed Solution

Implement a three-phase enhancement with stable CLI compatibility:

- **Phase 1 (Confidence Pipeline):** Add explicit capability probes, confidence scoring/reporting, and strict hard-fail mode.
- **Phase 2 (Typed IR + Plugin Boundaries):** Introduce a typed intermediate representation contract and analyzer-plugin interface without changing existing command signatures.
- **Phase 3 (Incremental/Diff-First):** Add optional incremental index and changed-file-first analysis for scale.

## Technical Approach

### Architecture

Define a new internal pipeline boundary model:

- **Capability Layer**
  - Detect tool/runtime capabilities and version-specific behavior.
  - Output structured capability report.

- **Confidence Layer**
  - Combine capability status + validation results + fallback usage into one score/report.
  - Enforce strict mode when requested.

- **Typed IR Layer**
  - Normalize analyzer output into versioned IR schema.
  - Preserve existing renderers via adapters during migration.

- **Analyzer Plugin Layer**
  - Introduce analyzer contract (`analyze(fileSet, options) -> IR fragments`).
  - Keep default regex heuristics as built-in plugin initially.

- **Incremental Engine Layer**
  - Persist index keyed by repo root + ref + file hash + IR schema version.
  - Compute changed-set first for diff-driven paths.

### Implementation Phases

#### Phase 1: Confidence pipeline foundation

Deliverables:
- Capability probe module (tool availability + invocation compatibility checks)
- Confidence report schema + output artifact
- CLI flags (non-breaking additions), e.g.:
  - `--confidence-report`
  - `--strict-confidence`
  - `--capability-check-only`
- Deterministic exit-code behavior for strict mode

Likely touch points (planning targets):
- `src/diagram.js`
- `src/workflow/pr-command.js`
- `src/workflow/pr-impact.js`
- `scripts/deep-regression.js`
- `test/` (new confidence-focused fixtures/specs)
- `docs/confidence-pipeline.md` (new)

Success criteria:
- Confidence report generated for target commands.
- Strict mode fails when confidence-critical checks fail.
- Existing default behavior remains backward compatible.

Estimated effort:
- Medium

#### Phase 2: Typed IR and plugin seams

Deliverables:
- IR schema (versioned JSON schema file)
- IR adapter for current analyzer output
- Plugin interface and built-in default analyzer plugin
- Regression suite validating parity against current outputs

Likely touch points (planning targets):
- `src/core/analysis-generation.js`
- `src/workflow/git-helpers.js`
- `src/workflow/pr-impact.js`
- `src/ir/` (new IR contracts/schema modules)
- `src/analyzers/` (new plugin boundary + default plugin)
- `test/` parity fixtures for current vs IR-backed outputs

Success criteria:
- Current outputs preserved via adapter path.
- New IR artifact can be emitted and validated.
- Plugin seam allows adding AST-backed analyzers without CLI break.

Estimated effort:
- Medium-High

#### Phase 3: Incremental/diff-first analysis

Deliverables:
- Local index/cache store with schema-versioned invalidation
- Diff-first traversal mode for workflow and optional local usage
- Truncation/partial-analysis metadata in artifacts

Likely touch points (planning targets):
- `src/workflow/git-helpers.js`
- `src/workflow/pr-command.js`
- `src/core/analysis-generation.js`
- `src/incremental/` (new index/cache modules)
- `test/` large-repo and rename-heavy fixtures

Success criteria:
- Large-repo analysis wall time reduced measurably.
- Deterministic output preserved for same input refs/options.
- Incremental mode has safe fallback to full scan.

Estimated effort:
- High

### Rollout & Rollback Strategy

- **Feature toggles:** keep new behaviors opt-in for initial rollout (`--strict-confidence`, `--confidence-report`, incremental mode flag).
- **IR migration toggle:** run dual-path mode during rollout (legacy analyzer output + IR-adapted output) and fail CI on mismatches only in dedicated parity jobs, not default user commands.
- **Rollback path:** one-command rollback to legacy path by disabling strict/incremental flags and IR output emission while preserving existing command contracts.
- **Cache policy:** default incremental cache path under `.diagram/cache/` with optional override via `DIAGRAM_CACHE_DIR`; in CI, incremental cache is disabled by default unless explicitly enabled.
- **Cache safety:** cache keys must include IR schema version + analyzer plugin version + options hash; mismatch forces full-scan fallback.

## Alternative Approaches Considered

### A) Confidence-first (selected)

Pros:
- Immediate trust and CI safety improvements
- Lowest compatibility risk

Cons:
- Does not alone solve long-term analyzer architecture debt

### B) Typed IR first (deferred to phase 2)

Pros:
- Strong long-term architecture cleanliness

Cons:
- Delays end-user trust improvements

### C) Incremental-first (deferred to phase 3)

Pros:
- Fastest path to performance wins

Cons:
- Higher complexity before confidence and contract hardening

## Open Questions

- Should strict confidence mode default to failing on capability mismatches only, or also on degraded fallbacks?
- What is the minimum stable IR schema surface for v1 (components/dependencies/roles only vs extended metadata)?
- After initial rollout, should CI enable incremental mode by default once cache stability SLOs are met?

## System-Wide Impact

### Interaction Graph

`CLI command` → `capability checks` → `analysis` → `IR normalization` → `confidence scoring` → `render/artifact writer` → `manifest/report output`

For PR flow: `workflow pr` additionally triggers `git ref validation` → `changed-file extraction` → `snapshot analysis` → `delta/risk` before confidence finalization.

### Error & Failure Propagation

- Capability check failures become structured confidence failures.
- Strict mode maps confidence-critical failures to exit code 1.
- Config/ref/path errors remain exit code 2.
- Artifact write failures remain terminal with explicit error context.

### State Lifecycle Risks

- Index corruption or stale cache can create incorrect confidence/analysis outputs.
- Mitigation: versioned cache keys, atomic writes, checksum verification, and auto-fallback to full scan.

### API Surface Parity

Must keep parity across:
- `analyze`, `generate`, `all`, `manifest` command family
- `workflow pr` artifact behavior and risk-gating contract
- Existing JSON/HTML artifact paths unless explicitly versioned

### Integration Test Scenarios

1. Strict mode on machine missing optional capability should fail with structured diagnostics.
2. Same refs/options produce deterministic confidence + PR artifacts across repeated runs.
3. Incremental cache invalidates when IR schema version changes.
4. Rename-heavy PR correctly updates delta and blast radius without stale cache pollution.
5. Mixed-mode run (incremental unavailable) falls back to full scan with explicit confidence warning.

## Acceptance Criteria

### Functional requirements

- [x] Confidence report artifact is written to `.diagram/confidence/confidence-report.json` and includes `schemaVersion`, capability checks, validation status, fallback usage, and confidence verdict.
- [x] Strict confidence mode returns **exit code 1** for confidence-critical failures while preserving **exit code 2** for usage/config/ref/path errors.
- [x] Existing default command behavior remains unchanged when new flags are not used.
- [x] Typed IR artifact is written to `.diagram/ir/architecture-ir.json` and includes a versioned `schemaVersion` field validated by fixture tests.
- [x] Analyzer plugin contract supports at least one built-in plugin path.
- [x] Incremental/diff-first mode is available behind explicit opt-in.
- [x] Incremental mode has explicit fallback to full scan when prerequisites are missing.
- [x] Existing PR artifacts remain stable: `.diagram/pr-impact/pr-impact.json` and `.diagram/pr-impact/pr-impact.html` continue to be emitted with current behavior when not using new opt-in flags.

### Non-functional requirements

- [x] Deterministic outputs for identical refs/options.
- [ ] No network dependency in analysis and confidence generation paths.
- [ ] Confidence report generation overhead remains bounded (target: <10% runtime overhead in default local repos).

### Quality gates

- [x] `npm test` passes.
- [x] `npm run test:deep` passes with confidence/IR/incremental coverage additions.
- [x] New schema and artifact contracts have fixture-based tests, including exact filename and `schemaVersion` assertions for confidence + IR artifacts.
- [x] CLI help/docs updated for any new flags.

## Success Metrics

- CI jobs can enforce strict confidence mode with actionable failure messages.
- Reduced false-confidence incidents (cases where fallback looked like success).
- Improved analysis runtime on large repos in incremental mode.
- No regressions in baseline command outputs for non-opt-in users.

## Dependencies & Prerequisites

- Stable schema versioning policy for IR and confidence artifacts.
- Consensus on confidence severity taxonomy (info/warn/fail).
- Cache storage location and invalidation contract.
- Test fixtures for large-repo and rename-heavy scenarios.

## Risk Analysis & Mitigation

- **Risk:** Overly strict defaults break existing workflows.
  - **Mitigation:** strict behavior only via opt-in flags.

- **Risk:** IR migration causes output drift.
  - **Mitigation:** adapter-based parity tests and fixture snapshots.

- **Risk:** Incremental cache introduces stale-analysis bugs.
  - **Mitigation:** schema-versioned keys + checksum verification + forced full-scan fallback.

- **Risk:** Confidence score becomes noisy or low-signal.
  - **Mitigation:** keep scoring transparent and expose per-factor diagnostics.

## Resource Requirements

- 1 maintainer-focused implementation stream across 3 phases.
- Test fixture expansion for CLI + workflow coverage.
- CI updates to optionally enforce strict confidence mode.

## Future Considerations

- Add AST-backed language plugins (TypeScript/Python first) once plugin contract stabilizes.
- Consider confidence trend reporting over time in CI artifacts.
- Evaluate richer diff-aware heuristics for blast radius accuracy.

## Documentation Plan

Update:
- `README.md` (new flags/artifacts + compatibility notes)
- `docs/architecture-testing.md` (strict confidence + incremental mode behavior)
- `CHANGELOG.md` (phased rollout notes)
- New doc: `docs/confidence-pipeline.md` (artifact schema + operator guidance)

## AI-Era Planning Notes

- Plan favors additive contracts and explicit artifacts to support fast AI-assisted iteration without hidden regressions.
- Require human review on scoring thresholds, fallback semantics, and cache invalidation rules.
- Preserve high-signal test coverage to counter rapid implementation drift.

## Sources & References

### Internal references

- Command orchestration and path/validation helpers:
  - `src/diagram.js:82`
  - `src/diagram.js:192`
  - `src/diagram.js:291`
  - `src/diagram.js:324`
  - `src/diagram.js:439`
  - `src/diagram.js:484`
  - `src/diagram.js:986`

- Core analysis + generation pipeline:
  - `src/core/analysis-generation.js:451`
  - `src/core/analysis-generation.js:1016`
  - `src/core/analysis-generation.js:1056`
  - `src/core/analysis-generation.js:1073`

- PR workflow, snapshot analysis, risk/artifact pipeline:
  - `src/workflow/pr-command.js:23`
  - `src/workflow/git-helpers.js:24`
  - `src/workflow/git-helpers.js:292`
  - `src/workflow/git-helpers.js:390`
  - `src/workflow/pr-impact.js:1`
  - `src/workflow/pr-impact.js:122`
  - `src/workflow/pr-impact.js:652`

- Project conventions:
  - `docs/agents/02-tooling-policy.md`
  - `docs/agents/03-validation.md`
  - `README.md`
  - `docs/architecture-testing.md`

### Learnings inventory

- `docs/solutions/` not present in this repository at planning time (2026-03-05).

### Related brainstorms reviewed (not selected)

- `docs/brainstorms/2026-03-02-inward-only-directionality-brainstorm.md`
- `docs/brainstorms/2026-03-03-visual-explainer-integration-brainstorm.md`
