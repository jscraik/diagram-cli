---
title: Archscope Repositioning and Compatibility Contract
type: feat
status: draft
date: 2026-04-11
deepened: 2026-04-11
origin: docs/brainstorms/2026-04-11-architecture-intelligence-cli-repositioning-requirements.md
risk: medium
spec_depth: lite
ui_required: false
---

# Archscope Repositioning and Compatibility Contract

## Enhancement Summary

**Deepened on:** 2026-04-11
**Mode:** targeted-confidence
**Key areas improved:** boundaries, lifecycle, failures, observability, validation

- Added explicit migration state model (`compatibility` -> `finalized`) with entry/exit rules and blocked transitions.
- Tightened machine-contract interface to a single envelope shape for all machine-mode commands, including PR workflow parity requirements.
- Expanded failure handling, observability, and acceptance criteria so release readiness is evidence-driven and auditable.
- Closed adversarial gaps around command-coverage scope, JSON output-channel safety, parser invariants, and immutable release-cycle evidence.
- Added explicit release-candidate window semantics (RC tag format, `releaseId` format, source of truth, and consecutiveness rule) so finalization eligibility is contract-auditable.

## Table of Contents
- [Enhancement Summary](#enhancement-summary)
- [Problem Statement](#problem-statement)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [System Boundary](#system-boundary)
- [Core Domain Model](#core-domain-model)
- [Migration Lifecycle States](#migration-lifecycle-states)
- [Main Flow and Lifecycle](#main-flow-and-lifecycle)
- [Interfaces and Dependencies](#interfaces-and-dependencies)
- [Invariants and Safety Requirements](#invariants-and-safety-requirements)
- [Failure Model and Recovery](#failure-model-and-recovery)
- [Observability](#observability)
- [Acceptance and Test Matrix](#acceptance-and-test-matrix)
- [Open Questions](#open-questions)
- [Definition of Done](#definition-of-done)

## Problem Statement
The current project identity (`diagram-cli`) describes only one capability (diagram rendering), while the product now also owns architecture policy validation, PR blast-radius/risk analysis, and AI context artifact generation.

This naming and framing mismatch weakens discovery and correct usage for both humans and AI agents. The contract in this spec defines a staged identity transition to `archscope` while preserving compatibility for current `diagram` users and preserving machine-consumable behavior guarantees.

## Goals
- Define a canonical product identity aligned to the full user job: architecture intelligence and governance.
- Preserve non-breaking compatibility for existing `diagram` command and workflow users during transition.
- Ensure machine output contracts are consistent across command surfaces that claim machine mode.
- Make migration state explicit and auditable so consumers can reason about risk.

## Non-Goals
- Implementing the migration mechanics (release scripts, package publishing choreography, code edits).
- Introducing new analysis features unrelated to identity and contract consistency.
- Redesigning UI surfaces or creating a companion UI specification.
- Finalizing post-transition hard-cut deprecation date in this stage.

## System Boundary
In scope:
- Product and CLI identity contract (canonical name, compatibility alias behavior, migration state).
- Machine output contract consistency requirements for commands supporting `--format json`.
- Documentation contract for first-impression positioning and migration guidance.

Out of scope:
- Internal algorithmic changes to analysis quality.
- Net-new workflow commands or major command semantics redesign.
- External website, marketing funnel, or pricing strategy.

## Core Domain Model
- `ProductIdentity`
  - `canonical_name`: `archscope`
  - `legacy_name`: `diagram-cli`
  - `positioning_statement`: single canonical sentence used across top-level docs.
- `CommandIdentity`
  - `primary_command`: `archscope` for new-user and canonical automation usage.
  - `compatibility_aliases`: includes `diagram` during `compatibility` and any documented legacy command synonyms.
  - `migration_state`: `compatibility` or `finalized`.
  - `alias_notice_policy`: compatibility aliases must emit an explicit runtime note indicating canonical replacement while still executing successfully; in machine mode (`--format json`), notices must be emitted on `stderr` only.
- `MachineContract`
  - `schema_version`: explicit version on machine responses.
  - `envelope_shape`: required top-level fields and deterministic behavior expectations.
  - `command_coverage_manifest`: `.diagram/contracts/machine-command-coverage.json` is the source of truth for covered machine-mode commands.
  - `coverage_completeness_rule`: `command_coverage_manifest` must be an exhaustive inventory of all CLI commands that currently support `--format json`; completeness validation fails on omissions or unexpected entries.
  - `coverage_expansion_criteria`: commands are added to `command_coverage_manifest` only when parser invariants, deterministic conformance, and output-channel safety checks pass and approval is recorded in release evidence.
- `MigrationWindow`
  - `start_condition`: canonical identity announced and documented.
  - `exit_condition`: compatibility guarantees met and an approved finalization policy artifact is published.
  - `minimum_window`: compatibility state remains active for at least two consecutive release candidates and 30 calendar days from compatibility declaration.
  - `rc_tag_format`: `v<major>.<minor>.<patch>-rc.<n>`.
  - `release_id_format`: `<major>.<minor>.<patch>-rc.<n>`.
  - `rc_source_of_truth`: git tags matching `rc_tag_format`.
  - `consecutive_rc_rule`: two or more RCs for the same base `<major>.<minor>.<patch>` with sequential `n` values and no gaps.
  - `window_clock`: UTC timestamps, with day-count measured from `compatibilityDeclaredAtUtc`.

## Migration Lifecycle States
State model:
  - `compatibility`
  - Entry criteria:
    - Canonical product identity (`archscope`) is primary in docs and help surfaces.
    - Primary command for examples/help is `archscope`; legacy command path (`diagram`) remains supported and tested.
    - Compatibility messaging is explicit and non-ambiguous.
  - Exit criteria:
    - Acceptance criteria SA1-SA14 pass for at least two consecutive release candidates that satisfy `MigrationWindow.consecutive_rc_rule`.
    - At least 30 calendar days have elapsed since `compatibilityDeclaredAtUtc` using `MigrationWindow.window_clock` semantics.
    - Published migration notice and approved finalization policy artifact communicate expected user impact and transition conditions.
- `finalized`
  - Entry criteria:
    - Compatibility-window exit criteria passed.
    - Finalization approval is recorded in immutable release evidence for the transition release.
    - Maintainers explicitly approve state transition.
  - Guardrail:
    - Transition to `finalized` is blocked if any compatibility or machine-contract gate is failing.

## Main Flow and Lifecycle
1. Identity Declaration
- Canonical identity (`archscope`) and value proposition are published in top-level entrypoints.
- Legacy identity is explicitly marked as compatibility path, not primary positioning.

2. Compatibility Operation
- Existing `diagram` invocation paths remain functional.
- Migration guidance is visible in docs and command help surfaces where relevant.

3. Contract Convergence
- Commands that support machine output align to a shared envelope contract and deterministic behavior expectations.
- Agent-facing summaries remain concise and stable across commands.
- Convergence is incomplete until PR workflow machine output matches the same envelope contract as other machine-mode commands.

4. Finalization Readiness
- Compatibility telemetry/signals and downstream readiness checks indicate low migration risk.
- Final hard-cut decisions (if any) are made only after readiness criteria pass.

## Interfaces and Dependencies
- CLI interface
  - Command invocation identity and alias expectations for human and CI users.
  - Compatibility aliases must preserve exit-code semantics and command behavior, apart from explicit deprecation messaging.
  - Canonical command invocation in docs and examples is `archscope`; `diagram` is explicitly compatibility-only during `compatibility`.
- Package interface
  - Published package metadata and naming continuity for existing consumers.
  - During `compatibility`, package identity changes must not require immediate consumer script rewrites.
- Documentation interface
  - README and command reference as source-of-truth for identity, migration state, and usage guidance.
- Machine contract interface
  - JSON output contracts consumed by agents, CI gates, and automation scripts.
  - Covered-command scope:
    - Covered commands are exactly those listed in `.diagram/contracts/machine-command-coverage.json`.
    - The manifest must remain exhaustive for all commands supporting `--format json`.
    - SA4, SA6, SA10, and SA11 evaluate against that manifest (not ad hoc subsets).
  - Output channel safety:
    - In machine mode (`--format json`), `stdout` is reserved for machine payload only.
    - Compatibility/deprecation notices must be emitted to `stderr` only in machine mode.
  - Canonical envelope shape:
    - `schemaVersion`
    - `command`
    - `status`
    - `meta` (`rootPath`, optional `generatedAt` when not deterministic)
    - `data`
    - `errors`
    - optional `agentSummary`
  - Parser invariants:
    - `status` is one of: `success`, `failure`.
    - `data` is always a JSON object (empty object allowed).
    - `errors` is always an array (empty array on success).
    - Each `errors[]` item is an object with `message` (string), optional `code` (string), optional `details` (object).
    - `agentSummary`, when present, is an object with `changedComponents` (number), `riskReasons` (string array), and `suggestedReviewerChecks` (string array).
  - Deterministic behavior requirement:
    - Deterministic mode removes volatile timestamps and normalizes ordering so repeated runs are parser-stable.
  - Evidence artifact contract:
    - Required immutable artifact per release: `.diagram/migration/releases/<releaseId>/migration-readiness.json`.
    - Required latest pointer artifact: `.diagram/migration/migration-readiness.json` referencing the immutable release record with integrity fields.
    - Required append-only ledger artifact: `.diagram/migration/releases/ledger.json` recording immutable release evidence hashes.
    - Required fields in immutable record: `schemaVersion`, `releaseId`, `migrationState`, `evaluatedAt`, `criteria`, `status`, `evidenceRefs`, `approvals`, `sourceCommit`, `releaseTag`, `contentHash`.
    - Integrity rule: `contentHash` is SHA-256 over canonicalized immutable-record content excluding `contentHash`; validation recomputes and must match.
    - Ledger rule: once a `releaseId` is recorded in `ledger.json`, its `contentHash` must never change; mismatches fail validation.
    - Pointer rule: latest pointer `releaseId`, `contentHash`, and `releaseTag` must match the immutable record and ledger entry.
  - Finalization policy artifact contract:
    - Required artifact: `.diagram/migration/finalization-policy.json`.
    - Required fields: `schemaVersion`, `policyId`, `effectiveFromState`, `minimumWindow`, `gatingCriteria`, `communicationRequirements`, `approvedBy`, `approvedAt`, `evidenceRefs`.
    - Semantic conformance rule: `effectiveFromState` must equal `compatibility`; `minimumWindow` must match `MigrationWindow.minimum_window`; `gatingCriteria` must include SA3-SA14 and `finalized` transition guard conditions.
- Governance dependencies
  - Existing repository validation flows and tests must remain authoritative for regression detection.

## Invariants and Safety Requirements
- `diagram` command compatibility must remain intact throughout the declared migration window.
- Machine outputs must include explicit schema versioning and deterministic mode behavior where supported.
- Identity transition must not silently alter command semantics unrelated to naming/contract alignment.
- Migration state must be explicitly documented (no implicit or ambiguous deprecation posture).
- Backward-compatible behavior must be testable in CI before any release is considered ready.
- Machine-mode command contracts must not diverge by command family once convergence is declared complete.

## Failure Model and Recovery
- Failure Class F1: Identity ambiguity
  - Symptom: docs and CLI help present conflicting primary names.
  - Detection: documentation consistency checks fail.
  - Recovery: block release until a single canonical identity statement is restored everywhere.
- Failure Class F2: Automation breakage
  - Symptom: existing `diagram` scripts fail during compatibility window.
  - Detection: compatibility-regression suite fails.
  - Recovery: restore alias path and release patch with migration clarification.
- Failure Class F3: Machine contract drift
  - Symptom: machine consumers require command-specific parsers due to inconsistent envelope shape.
  - Detection: cross-command envelope conformance checks fail.
  - Recovery: align outlier command payloads to canonical envelope contract before release.
- Failure Class F4: Migration uncertainty
  - Symptom: users cannot determine whether legacy name is supported.
  - Detection: migration-state marker missing or contradictory in any primary entrypoint.
  - Recovery: enforce explicit migration-state marker in docs/changelogs/help text.
- Failure Class F5: Finalization with incomplete evidence
  - Symptom: transition to `finalized` is attempted without complete SA gate evidence.
  - Detection: release-readiness review lacks required SA3-SA14 pass records.
  - Recovery: hold finalization and continue operating in `compatibility` until evidence is complete.

## Observability
- O1. Compatibility health is observable via automated command-level regression tests for legacy invocation paths.
- O2. Machine-contract consistency is observable via contract-shape tests across all commands listed in `.diagram/contracts/machine-command-coverage.json`, including PR workflow surfaces.
- O3. Migration-state clarity is observable via documentation checks ensuring canonical/legacy naming markers are present and non-contradictory.
- O4. Release readiness requires explicit pass/fail evidence for compatibility and contract checks.
- O5. Every release candidate records an auditable migration-state snapshot (`compatibility` or `finalized`) in immutable per-release evidence under `.diagram/migration/releases/<releaseId>/migration-readiness.json`, with pointer-hash and ledger integrity validation.
- O6. Deterministic-output conformance is observable via repeat-run diff checks on covered machine-mode commands.
- O7. Finalization-policy state assumptions are observable via `.diagram/migration/finalization-policy.json` schema plus lifecycle-semantic conformance checks.

## Acceptance and Test Matrix
| ID | Contract Requirement | Verification Method | Pass Condition |
| --- | --- | --- | --- |
| SA1 | Canonical product identity is `archscope` in primary docs. | Documentation assertion against top-level entrypoints. | Canonical identity appears consistently with no contradictory primary naming. |
| SA2 | Legacy identity is represented as compatibility path, not primary identity. | Documentation and help-surface checks. | Legacy naming exists only in compatibility context. |
| SA3 | Existing `diagram` command usage remains functional during compatibility state. | CLI compatibility regression tests. | Legacy invocation paths pass without behavior regression. |
| SA4 | Machine-mode commands expose explicit schema versioning and manifest completeness is enforced. | Contract tests against machine JSON outputs plus manifest-completeness validation against all `--format json` commands. | All JSON-capable commands are present in the manifest and include explicit schema-version field. |
| SA5 | Deterministic mode produces stable ordering/timestamp behavior per contract. | Deterministic output snapshot comparison. | Repeated deterministic runs produce contract-stable payloads. |
| SA6 | Machine output envelope shape and parser invariants are consistent across covered commands. | Cross-command contract conformance suite. | Consumers can parse all manifest-covered machine outputs with one envelope parser and invariant field types. |
| SA7 | Migration state is explicitly documented and auditable. | Docs and release-note verification. | Current migration state is present and unambiguous in canonical docs. |
| SA8 | No silent semantic changes are introduced under naming transition. | Behavior regression checks on core workflows. | Core workflow outcomes match pre-transition behavior expectations. |
| SA9 | Failure recovery path for compatibility regressions is defined and tested. | Runbook check + rollback simulation review. | Recovery procedure exists and is validated as executable. |
| SA10 | Release readiness requires compatibility and contract evidence gates. | Release gate checklist verification bound to immutable release evidence. | Release cannot pass without explicit SA3-SA14 evidence linked to the candidate `releaseId`. |
| SA11 | Machine envelope parity includes PR workflow machine output. | Cross-command contract conformance suite including PR workflow payloads. | PR workflow payload is consumable via the same envelope parser used for other machine-mode commands. |
| SA12 | Compatibility aliases preserve behavior parity and only add explicit migration messaging. | Alias-path behavior comparison tests plus machine-mode output-channel checks. | Legacy and canonical command paths produce equivalent outcomes and exit behavior, and machine-mode `stdout` remains parser-safe. |
| SA13 | Migration lifecycle transition is blocked when readiness evidence is incomplete or compatibility-window RC rules are unmet. | Release-readiness policy check with RC-sequence validation against git tags (`MigrationWindow.rc_source_of_truth`) and UTC-window validation. | `finalized` state cannot be entered without complete SA3-SA14 evidence, at least two consecutive RCs for one base version, and the 30-day UTC minimum window. |
| SA14 | Migration readiness and finalization policy artifacts are generated, semantically valid, and integrity-verifiable for each release candidate. | Evidence artifact schema + semantic validation, hash recomputation checks, immutable-ledger checks, policy-artifact conformance checks, and RC/releaseId format validation. | Immutable per-release record exists with valid hash fields, `releaseId` follows `MigrationWindow.release_id_format`, latest pointer and ledger entries match it, release hashes are append-only, RC tag parsing satisfies `MigrationWindow.rc_tag_format` + `consecutive_rc_rule`, and `.diagram/migration/finalization-policy.json` passes schema + lifecycle-semantic conformance validation. |

## Open Questions
None. Resolved decisions in this revision:
- D1. Package-level rename occurs in a separate migration window after CLI identity transition reaches `finalized`.
- D2. Minimum compatibility window is two consecutive release candidates and 30 calendar days from compatibility declaration.
- D3. Wave-2+ command additions are governed by `coverage_expansion_criteria` and must be recorded in immutable release evidence.

## Definition of Done
- All required sections in this spec are complete and internally consistent.
- SA1-SA14 have defined verification methods that planning can sequence without inventing behavior.
- Compatibility and contract invariants are explicit and testable.
- Machine coverage scope, parser invariants, and release evidence retention are explicit and auditable.
- No unresolved planning-blocking open questions remain.
- Next stage can proceed to execution sequencing without redefining product intent.
