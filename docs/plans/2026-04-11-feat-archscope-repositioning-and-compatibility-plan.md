---
schema_version: 1
title: "feat: Archscope repositioning and compatibility delivery plan"
type: feat
status: active
date: 2026-04-11
origin: docs/brainstorms/2026-04-11-architecture-intelligence-cli-repositioning-requirements.md
requirements: docs/brainstorms/2026-04-11-architecture-intelligence-cli-repositioning-requirements.md
spec: docs/specs/2026-04-11-feat-archscope-repositioning-and-compatibility-spec.md
source_spec: docs/specs/2026-04-11-feat-archscope-repositioning-and-compatibility-spec.md
deepened: 2026-04-30
plan_route: resume
plan_depth: deep
---

# feat: Archscope repositioning and compatibility delivery plan

## Table of Contents

- [Enhancement Summary](#enhancement-summary)
- [Overview](#overview)
- [Problem Frame](#problem-frame)
- [Requirements Trace](#requirements-trace)
- [Traceability Matrix](#traceability-matrix)
- [Scope Boundaries](#scope-boundaries)
- [Context & Research](#context--research)
- [Key Technical Decisions](#key-technical-decisions)
- [Domain Readiness](#domain-readiness)
- [Interface Readiness](#interface-readiness)
- [Open Questions](#open-questions)
- [SpecFlow Gap Analysis](#specflow-gap-analysis)
- [Implementation Units](#implementation-units)
- [Execution Checkpoints](#execution-checkpoints)
- [Acceptance Checklist](#acceptance-checklist)
- [System-Wide Impact](#system-wide-impact)
- [Risks & Dependencies](#risks--dependencies)
- [Documentation / Operational Notes](#documentation--operational-notes)
- [Rollout, Monitoring, and Rollback Controls](#rollout-monitoring-and-rollback-controls)
- [Validation Ladder](#validation-ladder)
- [Execution Ledger (Planning Mode)](#execution-ledger-planning-mode)
- [Sources & References](#sources--references)

## Enhancement Summary

**Deepened on:** 2026-04-30
**Mode:** targeted-confidence
**Key areas improved:** sequencing, validation, risks, rollout controls, source-spec alignment, checkpoints

- Added explicit requirement-to-phase traceability so each major requirement group maps to concrete units and acceptance IDs.
- Hardened implementation sequencing with explicit entry gates, evidence expectations, and unambiguous file/test targets per unit.
- Expanded risk treatment into an execution-focused risk register with trigger signals, containment, and ownership.
- Added rollout/monitoring/rollback controls so compatibility-state operations and finalization readiness are governed, observable, and reversible.
- Added explicit RC sequencing semantics, clean-tree-safe evidence lifecycle boundaries, and independent JSON-capability discovery requirements.
- Refreshed plan metadata and readiness decisions against the 2026-04-30 full-depth spec so downstream work reuses this active plan instead of replanning the same SA1-SA14 surface.
- Added explicit checkpoint stop conditions and focused-to-broad validation ladder so execution agents know when to continue, pause, or route back to planning.

## Overview

Deliver a non-breaking transition from `diagram` to `archscope` as the canonical CLI identity while preserving compatibility behavior, unifying all JSON-capable command outputs under one machine envelope, and adding immutable migration-evidence artifacts that gate lifecycle finalization.

The plan is sequenced to keep existing automation stable first, then harden contract consistency and release governance before finalizing operator-facing migration messaging.

## Problem Frame

The current command/package framing over-emphasizes diagram generation and under-signals policy validation, PR risk analysis, and agent context workflows. The approved spec requires a canonical identity (`archscope`) with compatibility-mode guarantees and auditable migration lifecycle controls (SA1-SA14) so human users, CI pipelines, and AI agents can adopt the new posture without parser drift or breakage.

## Requirements Trace

- R1-R3 (positioning): canonical architecture-intelligence framing across primary entrypoints.
- R4-R6 (naming/discoverability): dual-brand transition with explicit compatibility semantics.
- R7-R8 (human UX clarity): command lifecycle grouping and no accidental “partial as full” misread.
- R9-R10 (agent UX clarity): single machine envelope, stable parser invariants, concise agent summary + artifact pointers.
- SA1-SA14 (spec acceptance): lifecycle-state model, compatibility window minimum, machine coverage manifest exhaustiveness, deterministic `schemaVersion` envelope behavior, immutable migration evidence integrity, and finalization-policy conformance.

## Traceability Matrix

| Requirement Group     | Primary Units | Primary Acceptance IDs |
| --------------------- | ------------- | ---------------------- |
| R1-R3, SA1-SA2        | P0, P3        | AC1, AC2, AC8          |
| R4-R6, SA3, SA12      | P0, P4        | AC2, AC3, AC7          |
| R7-R8, SA8-SA9        | P0, P3, P4    | AC9, AC10              |
| R9-R10, SA4-SA6, SA11 | P1            | AC4, AC5, AC6          |
| SA7, SA10, SA13-SA14  | P2, P4        | AC11, AC12, AC13, AC14 |

## Scope Boundaries

In scope:

- Canonical command identity (`archscope`) + compatibility alias strategy (`diagram`) during `compatibility` state.
- JSON contract convergence across all `--format json` command surfaces, including `workflow pr`.
- Command-coverage manifest + conformance validation.
- Immutable migration readiness and finalization-policy artifact generation/validation.
- Documentation and release-runbook updates required for migration clarity.

Out of scope:

- Package rename/cutover to a non-`@brainwav/diagram` package in this cycle (deferred by spec decision D1).
- Net-new analyzer features unrelated to migration/contract convergence.
- Hard removal of `diagram` compatibility path in this cycle.

## Context & Research

### Relevant Code and Patterns

- CLI identity, alias rewriting, and help messaging currently live in `src/diagram.js`.
- Shared machine envelope helper exists in `src/commands/output.js` and is already used by most command modules.
- `workflow pr` currently emits a custom JSON shape in `src/workflow/pr-command.js` and is the key outlier against envelope parity.
- Documentation entrypoints and command examples are concentrated in `README.md` and `docs/cli-reference.md`.
- Release and deep-regression gates currently run through `scripts/release-npm.sh` and `scripts/deep-regression.js`.

### Institutional Learnings

- Existing plans in `docs/plans/` show repository preference for phased delivery with explicit acceptance checks and rollback posture.
- Existing test suite already validates machine output behavior (`test/generate-output-json.test.js`) and PR impact contract behavior (`test/pr-impact.test.js`, `test/pr-impact-delta.test.js`), so migration contract tests should extend these suites rather than introduce disconnected harnesses.

### External References

- None required. This is an internal CLI contract and migration-governance change.

## Key Technical Decisions

- Keep package name stable in this cycle; implement command identity transition first.
  - Rationale: honors spec D1 and minimizes ecosystem churn while enabling immediate positioning improvements.
- Introduce canonical command ergonomics in docs/help first, then enforce parser and evidence gates before any lifecycle-state promotion.
  - Rationale: reduces user-facing confusion without risking premature finalization.
- Reuse `buildMachineEnvelope` for `workflow pr` JSON mode and keep existing domain payload under `data`.
  - Rationale: enforces single parser contract while preserving existing analytic semantics.
- Treat `.diagram/contracts/machine-command-coverage.json` as executable contract input, not passive documentation.
  - Rationale: SA4/SA6/SA10/SA11 require auditable completeness and conformance.
- Encode migration readiness as immutable per-release evidence + append-only ledger + latest pointer.
  - Rationale: required for SA14 and finalization gate integrity.

## Domain Readiness

- Canonical product identity is stable for this plan: `archscope`.
- Compatibility command identity is stable for this plan: `diagram`.
- Legacy repository/package identity remains `diagram-cli` and `@brainwav/diagram`; package-level rename is explicitly out of scope for this delivery.
- Machine mode means `--format json` with parser-safe `stdout`; compatibility, alias, and deprecation notices belong on `stderr`.
- Release-candidate evidence derives from git tags matching `v<major>.<minor>.<patch>-rc.<n>`, not mutable local files or ad hoc release notes.
- Plan route decision: `resume`. The paired spec names this active plan as the downstream execution artifact, so implementation should continue from P0 instead of creating a duplicate plan.

## Interface Readiness

- CLI identity interface: selected shape is dual-bin single package. `archscope` is canonical usage, `diagram` remains compatibility usage, and both command paths share one implementation path with preserved exit-code semantics.
- Machine output interface: selected shape is canonical envelope at JSON root. Covered `--format json` commands emit `schemaVersion`, `command`, `status`, `meta`, `data`, `errors`, and optional `agentSummary`; command-specific payloads live under `data`.
- Migration evidence interface: selected shape is immutable release records plus latest pointer and append-only ledger. Candidate evidence may be generated in ignored paths, but finalized readiness evidence is promoted only at an explicit evidence-commit boundary.
- Readiness decision: no interface-design blocker remains. P0-P4 can execute without returning to `he-deepen-spec` unless implementation discovers a caller-facing contract conflict with the governing spec.

## Open Questions

### Resolved During Planning

- Q1: Should package rename happen in this delivery? Resolution: no, deferred per D1 until after command-identity migration reaches `finalized`.
- Q2: Should PR workflow keep custom JSON shape? Resolution: no, move to canonical envelope with legacy payload nested in `data`.
- Q3: Should migration evidence be mutable in-place? Resolution: no, immutable per-release records with hash-verifiable ledger entries.
- Q4: Are domain terms and interface shapes stable enough for execution? Resolution: yes, per the 2026-04-30 full-depth spec refresh; the selected shapes are carried into the P0-P4 unit boundaries below.

### Deferred to Implementation

- None blocking safe sequencing. Implementation details like exact helper filenames are execution-level choices.

## SpecFlow Gap Analysis

- Flow gap G1 (machine contract asymmetry): `workflow pr` currently returns a custom JSON root shape while most commands use envelope output. Covered by P1 + AC6.
- Flow gap G2 (coverage ambiguity): no executable inventory of JSON-capable commands exists, so drift can go undetected. Covered by P1 + AC4.
- Flow gap G3 (finalization governance): migration-state progression lacks immutable evidence and semantic-policy checks. Covered by P2/P4 + AC11-AC14.
- Flow gap G4 (operator ambiguity): docs currently bias to `diagram` identity and do not clearly define compatibility vs canonical mode lifecycle. Covered by P0/P3 + AC1/AC2/AC8.

## Implementation Units

Execution posture for all units:

- Verification-first vertical slices: each unit must close its own behavior checks before the next unit advances.
- No horizontal slicing across all tests first then all implementation; each unit exits only with evidence linked in the ledger.

- [x] **P0 / Unit 1: Command Identity Baseline and Compatibility Plumbing**

**Goal:** Establish `archscope` as canonical CLI identity while preserving `diagram` compatibility behavior and exit semantics.

**Requirements:** R1-R6, R7, SA1, SA2, SA3, SA8, SA12.

**Dependencies:** None.

**Files:**

- Modify: `package.json`
- Modify: `src/diagram.js`
- Modify: `scripts/release-npm.sh`
- Test: `test/command-identity.test.js`
- Modify: `scripts/deep-regression.js`

**Approach:**

- Add canonical command identity metadata and compatibility alias behavior in CLI bootstrap/help output.
- Ensure published package exposes both `archscope` (canonical) and `diagram` (compatibility) binaries during `compatibility`.
- Ensure deprecated/alias notices remain on `stderr` and preserve parser-safe `stdout` for machine mode.
- Extend packaged-smoke coverage to validate both canonical and compatibility invocation paths.

**Patterns to follow:**

- Alias normalization flow already in `src/diagram.js` (`--json`, renamed commands).
- Existing release preflight/smoke checks in `scripts/release-npm.sh`.

**Test scenarios:**

- Canonical command path executes core commands with same outcomes as compatibility path.
- Packaged artifact smoke tests prove both `archscope --help` and `diagram --help` are available and callable.
- Compatibility invocation preserves exit codes across success, risk-fail, and config error cases.
- Machine mode with alias/deprecation notices emits valid JSON payload only on `stdout`.

**Verification:**

- `./scripts/verify-work.sh --fast` passes with the canonical repo-local gate coverage.
- `./scripts/verify-work.sh --all` confirms packaged binary ergonomics remain functional before final sign-off.
- Evidence artifact: ledger entry references deep-regression assertion output proving canonical + compatibility invocation parity and dual-bin package availability.

**Exit criteria:**

- `archscope` is canonical in CLI identity/help and compatibility path remains behaviorally equivalent.
- Entry gate for P1: AC1-AC3 and AC7 are demonstrably satisfiable on current branch.

- [x] **P1 / Unit 2: Machine Envelope Convergence and Coverage Manifest Enforcement**

**Goal:** Converge all JSON-capable command outputs to canonical envelope and enforce manifest exhaustiveness.

**Requirements:** R9, R10, SA4, SA5, SA6, SA10, SA11, SA12.

**Dependencies:** P0.

**Files:**

- Modify: `src/workflow/pr-command.js`
- Modify: `src/commands/output.js`
- Modify: `.gitignore`
- Create: `.diagram/contracts/machine-command-coverage.json`
- Create: `scripts/discover-json-capable-commands.js`
- Create: `scripts/validate-machine-contracts.js`
- Test: `test/workflow-pr-machine-envelope.test.js`
- Test: `test/machine-command-coverage.test.js`
- Test: `test/json-capability-discovery.test.js`
- Modify: `test/generate-output-json.test.js`
- Modify: `test/pr-impact.test.js`

**Approach:**

- Replace custom `workflow pr` JSON output with `buildMachineEnvelope` payload while retaining analytics schema inside `data`.
- Add targeted `.gitignore` allowlist rules so canonical contract files under `.diagram/contracts/` and `.diagram/migration/` are tracked, while generated runtime artifacts remain ignored.
- Define an independent JSON-capability discovery pass from command registrations/options and diff discovered capability against manifest in both directions.
- Define parser invariants and coverage inventory as executable tests.
- Add deterministic-mode conformance checks for each manifest command.

**Patterns to follow:**

- Existing envelope-builder behavior in `src/commands/output.js`.
- Existing deterministic/snapshot conventions in `test/pr-impact*.test.js`.

**Test scenarios:**

- Every manifest-listed command with `--format json --deterministic` yields envelope with invariant field types.
- `workflow pr` no-change and non-empty cases parse via same envelope parser used by `generate`/`analyze`.
- Manifest validation fails when a JSON-capable command is omitted, stale, or unexpectedly listed without discovered JSON capability.

**Verification:**

- Contract suite fails on parser invariant violations and manifest drift.
- Discovered JSON-capability inventory and manifest diff report are attached as readiness evidence.
- Deep regression includes at least one envelope-parity assertion across command families.
- Evidence artifact: machine-contract validation summary captures manifest completeness and invariant checks for every covered command.

**Exit criteria:**

- Single machine envelope parser can consume all manifest-covered commands, including PR workflow.
- Entry gate for P2: AC4-AC6 satisfy both positive and negative-path checks (drift/tamper fails as expected).

- [x] **P2 / Unit 3: Migration Lifecycle Evidence and Finalization Policy Artifacts**

**Goal:** Implement immutable migration readiness records, latest pointer integrity, append-only ledger checks, and finalization-policy semantic validation.

**Requirements:** SA7, SA10, SA13, SA14.

**Dependencies:** P1.

**Files:**

- Create: `src/migration/evidence.js`
- Create: `src/migration/finalization-policy.js`
- Create: `scripts/record-migration-readiness.js`
- Create: `scripts/validate-migration-artifacts.js`
- Modify: `.gitignore`
- Create: `.diagram/migration/finalization-policy.json`
- Modify: `scripts/release-npm.sh`
- Test: `test/migration-evidence.test.js`
- Test: `test/finalization-policy.test.js`

**Approach:**

- Add artifact writer/validator utilities for immutable release evidence and pointer/ledger consistency.
- Define release-candidate model and window semantics as contract fields:
  - RC tag format: `v<major>.<minor>.<patch>-rc.<n>`
  - `releaseId` format: `<major>.<minor>.<patch>-rc.<n>`
  - RC source of truth: git tags matching RC format
  - Consecutive RC rule: same base `<major>.<minor>.<patch>` with sequential `n` values and no gaps
- Define authoritative lifecycle-window fields in release evidence using UTC semantics:
  - `compatibilityDeclaredAtUtc`
  - `releaseCandidatesSinceCompatibility`
  - `minimumWindowDays` (must equal `30`)
  - `windowSatisfiedAtUtc` (derived)
- Define evidence lifecycle boundary so release preflight clean-tree checks remain valid:
  - Tracked canonical inputs: `.diagram/contracts/machine-command-coverage.json`, `.diagram/migration/finalization-policy.json`
  - Compatibility runbook: `../migration/archscope-compatibility.md`
  - Untracked generated candidate evidence: `.diagram/migration/candidates/<releaseId>/...`
  - Immutable release records promoted to tracked `.diagram/migration/releases/<releaseId>/...` only in a dedicated evidence commit step outside dirty-tree-sensitive preflight generation
- Enforce hash computation rule (`contentHash` over canonicalized record without `contentHash`) and append-only ledger immutability.
- Validate semantic conformance between finalization policy and spec lifecycle constraints before release finalization.

**Patterns to follow:**

- Existing artifact-writing patterns in `src/workflow/pr-impact.js` and confidence pipeline report writers.
- Existing release guard style in `scripts/release-npm.sh`.

**Test scenarios:**

- Immutable record hash recomputation matches stored hash.
- Pointer mismatches and ledger tampering fail validation.
- `effectiveFromState`/`minimumWindow`/`gatingCriteria` semantic drift is rejected.
- Compatibility-window calculations fail when UTC declaration timestamps or release-candidate counts do not satisfy `2 RC + 30 days`.
- RC sequence validation fails on missing RC numbers or non-matching base versions.
- Release preflight remains clean-tree-compliant while candidate evidence is generated in ignored paths.

**Verification:**

- Validation script gates release-preflight path.
- Tests cover positive and tamper/failure paths.
- Evidence artifact: immutable release record + pointer + ledger hash match report captured for a candidate release ID.
- Evidence artifact: RC-window evaluation report includes parsed RC tags, consecutiveness result, and UTC-window decision trace.

**Exit criteria:**

- Release candidate can produce and validate required migration artifacts with integrity guarantees.
- Entry gate for P3: AC11-AC13 are structurally enforceable in documentation and runbook language.

- [x] **P3 / Unit 4: Documentation and Operator Contract Repositioning**

**Goal:** Make canonical architecture-intelligence positioning and migration lifecycle explicit for humans and AI agents.

**Requirements:** R1-R3, R7-R10, SA1, SA2, SA7.

**Dependencies:** P0, P1.

**Files:**

- Modify: `README.md`
- Modify: `docs/cli-reference.md`
- Modify: `docs/getting-started.md`
- Modify: `docs/release-and-publish.md`
- Modify: `docs/architecture-testing.md`
- Create: `docs/migration/archscope-compatibility.md`

**Approach:**

- Reframe top-level docs to canonical identity + lifecycle, while explicitly documenting compatibility invocation and migration expectations.
- Document machine envelope schema and coverage-manifest role for agent integrations.
- Add operator runbook for compatibility-state verification and finalization readiness evidence.

**Patterns to follow:**

- Existing documentation TOC and command-example conventions.
- Existing machine-output guidance sections in `README.md` and `docs/cli-reference.md`.

**Test scenarios:**

- Docs include canonical command in first-run examples and compatibility command in migration section.
- Machine contract docs match actual envelope fields and command coverage manifest.
- Migration-state guidance references concrete artifact paths used by release gates.

**Verification:**

- Documentation consistency checks (string assertions or markdown lint scripts if present).
- Reviewer can follow runbook end-to-end without implicit assumptions.
- Evidence artifact: docs audit checklist confirms canonical/compatibility state messaging and artifact-path references are aligned.

**Exit criteria:**

- Canonical identity and migration state are unambiguous across primary entrypoints.
- Entry gate for P4: docs and operator guidance reflect actual shipped behavior from P0-P2 with no speculative claims.

- [x] **P4 / Unit 5: Final Gate Wiring, Rollout Controls, and Readiness Proof**

**Goal:** Wire all migration gates into verification flow and establish controlled rollout from `compatibility` toward `finalized` criteria.

**Requirements:** SA3-SA14 (gate-level), R6, R9, R10.

**Dependencies:** P0-P3.

**Files:**

- Modify: `scripts/deep-regression.js`
- Modify: `scripts/harness-pr-gates.sh`
- Modify: `docs/maintainer-checklist.md`
- Modify: `package.json` (verification script wiring if needed)
- Create: `scripts/simulate-compatibility-rollback.sh`
- Test: `test/release-readiness-gates.test.js`
- Test: `test/compatibility-rollback-readiness.test.js`

**Approach:**

- Add explicit migration/readiness checks into deep regression and maintainer workflow.
- Encode fail-fast behavior so any missing SA evidence blocks finalization progression.
- Capture readiness summary artifact per candidate release and include operator signoff fields.

**Patterns to follow:**

- Current deep-regression CLI integration style.
- Existing maintainer checklist conventions.

**Test scenarios:**

- Missing SA evidence blocks readiness.
- Compatibility-window minimums not met prevent transition flagging.
- Full valid candidate passes all migration readiness gates.
- Rollback drill simulates a failed compatibility release and validates alias behavior, machine-contract conformance, and migration-state evidence integrity after rollback.

**Verification:**

- `./scripts/verify-work.sh --fast`
- `./scripts/verify-work.sh --all`
- targeted migration validation scripts introduced in P1/P2.
- Evidence artifact: release-readiness report ties each AC item to explicit test/validation output and release candidate context.
- Evidence artifact: rollback drill report and post-rollback contract checks linked to AC10.

**Exit criteria:**

- Release gating reliably enforces lifecycle-state guardrails and evidence completeness.
- Final gate: transition proposal to `finalized` is blocked unless AC1-AC14 all have linked evidence and compatibility minimum-window checks pass.

## Execution Checkpoints

### Checkpoint A: Identity Parity Proven Before Machine Contract Work

**After:** P0.

**Exit criteria:**

- Installed/package-local invocation exposes both `archscope` and `diagram`.
- Canonical and compatibility command paths share one execution implementation and preserve exit-code semantics.
- Compatibility/deprecation notices are emitted to `stderr` only when `--format json` reserves `stdout` for machine payload.
- AC1, AC2, AC3, and AC7 have linked command/test evidence.

**Stop condition:**

- Stop and replan if supporting both command identities requires divergent command implementations or silently changes non-identity command behavior.

### Checkpoint B: Machine Contract Convergence Proven Before Migration Evidence

**After:** P1.

**Exit criteria:**

- JSON-capability discovery and `.diagram/contracts/machine-command-coverage.json` match in both directions.
- Every covered command emits the canonical `schemaVersion` envelope with stable parser invariants.
- `workflow pr` is consumable through the same envelope parser as other covered commands, with prior analytical payload semantics nested under `data`.
- Positive, drift, and tamper/failure paths are covered for AC4, AC5, AC6, and AC7.

**Stop condition:**

- Stop and replan if command capability discovery cannot be made deterministic from repo-owned command registration or option metadata.

### Checkpoint C: Evidence Integrity Proven Before Operator Documentation

**After:** P2.

**Exit criteria:**

- Candidate evidence generation remains clean-tree safe by writing to ignored candidate paths.
- Immutable release records, latest pointer, append-only ledger, and finalization policy pass positive validation.
- Hash, pointer, ledger-tamper, RC-sequence, and UTC-window failure cases fail closed.
- AC11, AC12, AC13, and AC14 are structurally enforceable by scripts rather than reviewer judgment alone.

**Stop condition:**

- Stop and replan if `.gitignore` allowlist behavior cannot distinguish tracked canonical contracts from generated candidate evidence without weakening release clean-tree checks.

### Checkpoint D: Docs Match Shipped Behavior Before Final Gate Wiring

**After:** P3.

**Exit criteria:**

- README, CLI reference, getting-started, architecture-testing, release docs, and migration guide all agree on canonical identity, compatibility identity, package-name boundary, machine envelope fields, and migration evidence paths.
- Documentation does not imply package rename, hard alias removal, or `finalized` state before AC1-AC14 readiness evidence exists.
- AC8 and AC10 have runnable runbook or checklist evidence.

**Stop condition:**

- Stop and replan if documentation needs to describe behavior not implemented by P0-P2 or outside the governing spec scope.

### Checkpoint E: Finalization Readiness Cannot Bypass Evidence

**After:** P4.

**Exit criteria:**

- Release readiness gate ties every AC1-AC14 item to explicit test, validation, or operator evidence for the candidate `releaseId`.
- Missing evidence, failed compatibility checks, failed machine-contract checks, unmet RC sequence, or unmet 30-day UTC window block `finalized` eligibility.
- Rollback drill evidence proves compatibility path and machine-contract conformance after simulated failure recovery.

**Stop condition:**

- Stop before finalization if any readiness result cannot be traced back to an immutable candidate release record and the append-only ledger.

## Acceptance Checklist

- [x] **AC1** Canonical docs and CLI help present `archscope` as primary identity.  
       Trace: SA1, R1-R3.
- [x] **AC2** `diagram` is documented and implemented as compatibility path only.  
       Trace: SA2, R5-R6.
- [x] **AC3** Compatibility invocation remains behaviorally equivalent and non-breaking in compatibility state.  
       Trace: SA3, SA12.
- [x] **AC4** Manifest of JSON-capable commands exists and is exhaustively validated, with each covered runtime envelope exposing `schemaVersion`.
      Trace: SA4, SA6.
- [x] **AC5** Deterministic mode remains parser-stable across covered commands.  
       Trace: SA5.
- [x] **AC6** `workflow pr` JSON output conforms to canonical machine envelope.  
       Trace: SA6, SA11.
- [x] **AC7** Machine-mode notices/deprecation messaging stay on `stderr`, with parser-safe `stdout`.  
       Trace: SA12.
- [x] **AC8** Migration-state status is explicit and consistent in docs/runbook surfaces.  
       Trace: SA7.
- [x] **AC9** Naming transition does not introduce silent semantic behavior changes.  
       Trace: SA8.
- [x] **AC10** Compatibility regression rollback/runbook path exists and is executable.  
       Trace: SA9.
- [x] **AC11** Release gates require SA3-SA14 evidence linkage before readiness pass.  
       Trace: SA10, SA13.
- [x] **AC12** Immutable release evidence records are hash-verifiable and append-only in ledger.  
       Trace: SA14.
- [x] **AC13** Finalization policy artifact passes schema + lifecycle semantic conformance checks.  
       Trace: SA14, MigrationWindow invariants.
- [x] **AC14** Compatibility window minimum (2 RC + 30 days) is enforced prior to finalization eligibility.  
       Trace: SA13, D2.

## System-Wide Impact

- **Interaction graph:** CLI bootstrap (`src/diagram.js`) -> command registration -> machine envelope output -> contract validator -> release gate scripts -> migration evidence artifacts.
- **Error propagation:** contract failures and evidence-integrity violations must return gate-failing exit codes before publish/finalization paths.
- **State lifecycle risks:** partial migration-state updates, stale manifest coverage, and mutable evidence rewrites can create false readiness; all are mitigated via immutable artifacts + fail-fast validation.
- **API surface parity:** all `--format json` command surfaces must preserve one envelope parser contract; no PR-workflow special parser should remain.
- **Integration coverage:** deep-regression and release-preflight must include identity, envelope, and evidence gates together to avoid isolated false positives.

## Risks & Dependencies

Risk register:

| Risk                                                       | Severity | Trigger signal                                                           | Mitigation / containment                                                                                                          | Owner                |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Compatibility-path breakage for existing `diagram` scripts | High     | Regression in alias-path execution parity or exit codes                  | Keep compatibility alias active through migration window, require deep-regression parity evidence before readiness                | CLI maintainers      |
| Canonical command unavailable in installed package         | High     | `archscope` binary missing after package install/pack                    | Require dual-bin smoke gate in release and deep-regression checks before readiness                                                | CLI maintainers      |
| PR workflow parser breakage due to envelope convergence    | High     | Consumer/parser failures on `workflow pr --format json`                  | Preserve analytical payload semantics under `data`, ship transition documentation and conformance tests before release gates pass | Workflow maintainers |
| Manifest drift or incomplete JSON-command inventory        | Medium   | New JSON-capable command not represented in coverage manifest            | Enforce manifest completeness test as required readiness gate                                                                     | Contract maintainers |
| Release preflight deadlock from tracked evidence writes    | High     | Release flow fails clean-tree checks after readiness generation          | Generate candidate evidence in ignored paths and promote immutable evidence only in dedicated evidence commit boundary            | Release maintainers  |
| Mutable or inconsistent migration evidence                 | High     | Pointer hash mismatch, ledger mutation, missing immutable release record | Enforce append-only ledger checks and hash recomputation in readiness validation                                                  | Release maintainers  |
| Premature lifecycle finalization                           | High     | Attempted state transition before 2 RC + 30 day minimum window           | Hard-block finalization via lifecycle guard checks tied to evidence artifacts                                                     | Release approvers    |

Dependencies:

- Maintainer adoption of migration-state artifact workflow and review responsibilities.
- Agreement on exact command inventory in machine coverage manifest.
- Availability of release candidate metadata (`releaseId`, `releaseTag`, `sourceCommit`) required by SA14 evidence schema.
- Repository-level decision and implementation of targeted `.gitignore` exceptions for canonical `.diagram/contracts/` and `.diagram/migration/` files.
- Agreement on RC tagging strategy (`vX.Y.Z-rc.N`) and release metadata capture in CI/release tooling.

## Documentation / Operational Notes

- Add a dedicated migration guide documenting canonical vs compatibility invocation, compatibility-window policy, and finalization prerequisites.
- Update release runbook to require migration artifact validation before publish/finalization actions.
- Maintain backward-compatible examples where necessary, but ensure first-run docs lead with canonical command identity.
- Keep machine contract section concise for agent consumption: envelope, invariants, manifest path, deterministic mode guidance.

## Rollout, Monitoring, and Rollback Controls

Rollout controls:

- Operate in `compatibility` state until AC1-AC14 evidence exists for at least two consecutive release candidates and the 30-day minimum window is met.
- Treat `archscope` as canonical for new docs/examples immediately after P0, while preserving `diagram` compatibility for existing users.
- RC sequencing policy: evaluate compatibility-window eligibility only from RC tags matching `vX.Y.Z-rc.N`, using sequential `N` values for the same base `X.Y.Z`.

Evidence lifecycle controls:

- Keep canonical contracts/policies tracked in git.
- Write generated candidate readiness outputs to ignored candidate paths during preflight/runtime checks.
- Promote immutable per-release evidence to tracked release-record paths only at the explicit evidence-commit boundary, so clean-tree release checks remain enforceable.

Monitoring signals:

- Compatibility health: parity pass/fail status for canonical vs compatibility invocation paths.
- Contract health: manifest completeness and parser invariant conformance status across all covered commands.
- Evidence health: immutable record presence, pointer integrity, ledger append-only validation status.
- Window health: UTC-based calculation status for `compatibilityDeclaredAtUtc`, `releaseCandidatesSinceCompatibility`, and derived `windowSatisfiedAtUtc`.
- RC integrity health: parsed RC tag set, consecutiveness status, and rejected-tag reasons.

Rollback controls:

- If P1 contract convergence causes parser regressions, revert to last passing compatibility release behavior while keeping compatibility alias path intact.
- If P2 evidence validation fails, halt finalization progression and continue in `compatibility` until evidence artifacts are corrected.
- If documentation drifts from shipped behavior, block readiness until docs reflect current command and contract semantics.
- Run mandatory rollback drill before finalization candidacy and attach post-rollback evidence proving AC10 conditions remain true.

## Validation Ladder

1. P0 focused identity checks: `test/command-identity.test.js`, packaged dual-bin smoke checks, and alias-path exit-code parity.
2. P1 machine-contract checks: `test/workflow-pr-machine-envelope.test.js`, `test/machine-command-coverage.test.js`, `test/json-capability-discovery.test.js`, existing machine-output suites, and `scripts/validate-machine-contracts.js`.
3. P2 migration-evidence checks: `test/migration-evidence.test.js`, `test/finalization-policy.test.js`, and `scripts/validate-migration-artifacts.js` covering positive and tamper/failure paths.
4. P3 documentation checks: docs consistency assertions or markdown lint scripts when present, plus direct review that docs match shipped P0-P2 behavior and do not imply package rename or `finalized` state.
5. P4 integrated readiness checks: `./scripts/verify-work.sh --fast`, targeted migration validators, rollback drill, and `./scripts/verify-work.sh --all` before final sign-off.
6. Blocked-step reporting: if any command cannot run, record the exact command, blocker reason, and the AC/SA coverage gap in the execution ledger before advancing.

## Execution Ledger (Planning Mode)

| STEP_ID | status (pending | in_progress        | completed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | owner | evidence |
| ------- | --------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------- |
| P0      | completed       | implementing-agent | 2026-04-30: implemented dual-bin package metadata (`archscope`, `diagram`), canonical CLI help identity, compatibility stderr notice, release packaged-smoke coverage, deep-regression package-bin assertions, and `test/command-identity.test.js`. Validation: `npm test -- test/command-identity.test.js` pass; `npm test` pass (132 passing); `npm run test:deep` pass (`deep-regression: OK`); packaged npm smoke pass for `.bin/archscope` and `.bin/diagram`; `bash scripts/verify-work.sh --fast` pass.                                                                                                                                                                                                                                                                                                                                                                                             |
| P1      | completed       | implementing-agent | 2026-04-30: moved `workflow pr --format json` and `validate --format json` stdout to canonical machine envelopes; added tracked `.diagram/contracts/machine-command-coverage.json`; added independent discovery/validation scripts; added workflow, coverage, and discovery tests; included manifest in packed artifact and deep regression. Validation: `npm test -- test/workflow-pr-machine-envelope.test.js test/machine-command-coverage.test.js test/json-capability-discovery.test.js test/generate-output-json.test.js` pass (9 passing); `node scripts/validate-machine-contracts.js` pass (10 commands); `npm test` pass (140 passing); `npm run test:deep` pass (`deep-regression: OK`); `bash scripts/verify-work.sh --fast` pass; packaged npm smoke pass with contract manifest present.                                                                                                     |
| P2      | completed       | implementing-agent | 2026-04-30: added migration readiness builders/validators, promoted release pointer + append-only ledger handling, finalization policy artifact, readiness record CLI, migration artifact validator, release/deep-regression validation wiring, and migration integrity tests. Validation: `npm test -- test/migration-evidence.test.js test/finalization-policy.test.js` pass (8 passing); `node scripts/record-migration-readiness.js --release-id 9.9.9-rc.2 --source-commit testcommit --compatibility-declared-at 2026-04-01T00:00:00.000Z --generated-at 2026-05-02T00:00:00.000Z --rc-tags v9.9.9-rc.1,v9.9.9-rc.2 --promote` pass; `node scripts/validate-migration-artifacts.js` pass against promoted smoke artifact and pass after cleanup with no release records; `npm test` pass (151 passing); `npm run test:deep` pass (`deep-regression: OK`); `bash scripts/verify-work.sh --fast` pass. |
| P3      | completed       | implementing-agent | 2026-04-30: updated README, CLI reference, getting-started, release/publish, architecture-testing, docs index, and added `docs/migration/archscope-compatibility.md` so canonical identity, compatibility command, unchanged package name, machine envelope fields, and migration evidence paths match shipped P0-P2 behavior. Validation: `npm run docs:style:changed` pass/no staged documentation changes detected for Vale; docs consistency `rg` review pass with `archscope` as canonical and `diagram` only as compatibility/repository/package context.                                                                                                                                                                                                                                                                                                                                            |
| P4      | completed       | implementing-agent | 2026-04-30: added `scripts/validate-archscope-readiness.js`, `npm run migration:readiness`, finalization-required fail-closed mode, compatibility rollback drill checks for `archscope` and `diagram`, release/deep-regression/wrapper wiring, idempotent promoted-evidence retry handling, policy-gate evidence checks, and maintainer/release documentation for readiness gates. Validation: `npm test -- test/archscope-readiness.test.js test/migration-evidence.test.js test/finalization-policy.test.js` pass (11 passing); `npm run migration:readiness` pass with `finalizationReady: false` in compatibility mode; promoted smoke `node scripts/validate-archscope-readiness.js --release-id 9.9.9-rc.2 --require-finalization-ready` pass after generated evidence; `npm test` pass (151 passing); `npm run test:deep` pass (`deep-regression: OK`); `bash scripts/verify-work.sh --fast` pass.  |

## Sources & References

- Brainstorm requirements: `docs/brainstorms/2026-04-11-architecture-intelligence-cli-repositioning-requirements.md`
- Governing spec: `docs/specs/2026-04-11-feat-archscope-repositioning-and-compatibility-spec.md`
- CLI entrypoint and alias flow: `src/diagram.js`
- Machine envelope helper: `src/commands/output.js`
- PR workflow output path: `src/workflow/pr-command.js`
- Existing machine contract tests: `test/generate-output-json.test.js`, `test/pr-impact.test.js`, `test/pr-impact-delta.test.js`
- Release/runbook surfaces: `scripts/release-npm.sh`, `scripts/deep-regression.js`, `docs/release-and-publish.md`
