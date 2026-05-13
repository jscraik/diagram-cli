---
schema_version: 1
artifact_id: jsc-321-erd-unavailable-context-fallback-eval
artifact_type: he-eval-report
canonical_slug: jsc-321-erd-unavailable-context-fallback
title: JSC-321 ERD Unavailable Context Fallback Eval
harness_stage: he-eval-report
status: draft
date: 2026-05-13
traceability_required: true
origin: .harness/plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md
linear_issue: JSC-321
linear_milestone: none
---

<!-- markdownlint-disable MD025 -->

# JSC-321 ERD Unavailable Context Fallback Eval

## Command Summary

BLUF: This report evaluates the JSC-321 P2 implementation that makes the generated agent context pack expose ERD availability truth from manifest metadata. The local implementation proof is strong: focused tests, full tests, deep regression, fast verify, and two corrected context-output smoke checks all pass, and the source diff stays inside the approved context-pack consumer boundary. The Linear closure recommendation is Blocked for now, not because the code evidence failed, but because Jamie has not yet accepted, challenged, or requested rework on this eval and because commit, PR, and live Linear mutation were explicitly not performed by the phase heartbeat. The main operational risk is bundling unrelated dirty files or treating this child-slice proof as parent JSC-318 closure. The next action is for Jamie to accept, challenge, or request rework on this report before any commit, PR, or Linear status update.

Decision Needed: accept, challenge, or rework.

Top Risks: Unrelated dirty files could be accidentally bundled into the JSC-321 delivery; local proof does not close parent JSC-318 because JSC-318 has multiple child slices and external PR/Linear state; corrected smoke commands are local plan truth and should be preserved so future agents do not repeat the invalid absolute-output path.

Next Action: Jamie reviews this eval, then explicitly chooses accept, challenge, or rework before commit/PR/Linear handoff.

## Executive Eval Summary

Summary: JSC-321 has local validation-complete implementation evidence for context-pack ERD availability guidance, but external closure remains blocked pending human steering and delivery authorization.

Status: local implementation proof complete; closure steering pending.

Linear Completion Recommendation: Blocked.

Primary Blockers: Jamie has not yet accepted/challenged/reworked this eval; commit, PR, and live Linear updates were not authorized or performed; unrelated dirty files exist outside this slice.

Confidence: 93%; high local confidence from passing focused, baseline, deep, verify, smoke, and artifact gates, capped by missing human acceptance, no commit/PR evidence, and no live Linear closure mutation.

## Evaluated Slice

Summary: Evaluate exactly JSC-321: add context-pack guidance for unavailable, degraded, missing, and unknown ERD availability metadata while keeping useful ERDs quiet.

Linear Project: Diagram product surface and analysis workflow.

Linear Milestone: none.

Linear Parent Issue: JSC-318.

Linear Sub-Issues: JSC-321 evaluated here; JSC-319 and JSC-320 are prerequisite completed local slices; parent JSC-318 is not evaluated for closure here.

Refactor Program: .harness/refactors/2026-05-12-JSC-318-contract-schema-erd-refactor.md.

Plugin Harness Engineering Spec: .harness/specs/2026-05-13-JSC-321-erd-unavailable-context-fallback-spec.md.

Affected Files/Modules: src/context/build-context-pack.js; test/context-pack.test.js; .harness/plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md; .harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md.

Affected Workflows: context-pack generation, ERD availability warning surface, deterministic context output, JSC-321 smoke validation commands.

Related ADRs: none found or loaded for this slice.

Related Core Invariants: no extractor/parser changes; no public CLI changes; no manifest schema migration; no renderer changes; no `.diagram/agent-context.json` changes; no Linear/GitHub mutation during phase work.

## Linear Definition of Done Status

Summary: Local implementation DoD is satisfied, but Linear closure is blocked until steering and external delivery are explicitly approved.

Artifact Path: .harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md.

Definition of Done Status: local implementation proof satisfied; Linear DoD not complete because this report has not been accepted and no commit/PR/Linear evidence exists.

Closure Safety: safe to proceed to human acceptance and delivery handoff; unsafe to mark JSC-321 Done from this report alone.

## Linear Backlink Map

Summary: Local traceability is complete enough for JSC-321 eval; live Linear backlink mutation was not performed.

Linear Project: Diagram product surface and analysis workflow.

Linear Milestone: none.

Linear Parent Issue: JSC-318.

Linear Sub-Issues: JSC-319, JSC-320, JSC-321.

Linear Status Recommendation: Blocked until Jamie accepts/challenges/reworks this eval and approves external mutation.

Proof Artifact Links: .harness/specs/2026-05-13-JSC-321-erd-unavailable-context-fallback-spec.md; .harness/plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md; .harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md.

Missing Identifiers: no commit SHA, PR URL, or live Linear status-update identifier for JSC-321.

Traceability Repair: after acceptance, commit only the JSC-321 scoped files and link the eval, validation evidence, commit, and PR to JSC-321 before moving the Linear issue.

## Source Artifact Trace

Summary: The spec and plan support the implementation scope and closure limits.

Linear Plan: .harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md identifies JSC-321 as the P2 context fallback slice under JSC-318.

Refactor Program: .harness/refactors/2026-05-12-JSC-318-contract-schema-erd-refactor.md separates logical JSON Schema ERD extraction, manifest truth, and context fallback into distinct slices.

Plugin HE Spec: .harness/specs/2026-05-13-JSC-321-erd-unavailable-context-fallback-spec.md defines manifest-metadata-driven context guidance, stable labels, useful-ERD silence, missing/unknown conservative behavior, and no public CLI/schema widening.

ADRs: none required or discovered for this slice.

Core Invariants: preserve public CLI, manifest schema, parser/extractor, renderer, and agent-context surfaces; keep output relative-path based; use manifest metadata and existing sorted diagram order.

Other Source Artifacts: .harness/plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md; current git diff for src/context/build-context-pack.js and test/context-pack.test.js; prior JSC-319 and JSC-320 eval artifacts.

## Planned Proof Check

Summary: The planned proof was produced after correcting stale smoke commands in the plan.

Promised Proof From Source Artifacts: prerequisite metadata probe, focused context-pack tests, baseline tests, deep regression, fast verify, no-schema context smoke, useful JSON Schema negative smoke, diff boundary check, simplify review, bug-fix only for concrete failing evidence, code review, and exact validation recording.

Proof Planned Before Implementation: yes.

Proof Produced: all required local validation gates passed after the plan smoke commands were corrected to use ignored fixture-copy workspaces and direct context-pack manifest consumption.

Proof Missing: human acceptance/challenge/rework decision, commit evidence, PR evidence, live Linear status/backlink mutation, and CI evidence.

Interpretation: sufficient for local JSC-321 implementation proof; insufficient for external closure or parent JSC-318 completion.

Blocks Closure: yes, because steering and delivery proof are missing.

## Functional Validation Results

Summary: Functional validation supports the JSC-321 implementation.

Command or Method: `rg -n "availability|availabilityReason|sourceKinds|sourceFilesByKind" src/core/analysis-generation-diagrams-erd.js test/generate-output-json.test.js`; `npm test -- test/context-pack.test.js`; `npm test`; `npm run test:deep`; `bash scripts/verify-work.sh --fast`; corrected no-schema context smoke; corrected useful JSON Schema context smoke; plan artifact validators; `git diff --check`.

Result: pass for all final local gates.

Evidence: active session output on 2026-05-13 reported prerequisite metadata probe pass; focused context-pack suite 14 passing; full suite 210 passing; `npm run test:deep` reported `deep-regression: OK`; `bash scripts/verify-work.sh --fast` completed successfully; no-schema smoke found `Status: unavailable`, `Reason: no_supported_schema_sources`, and `Fallback evidence`; useful JSON Schema smoke printed `expected negative assertion passed`; plan BLUF/artifact/identity/Linear-traceability validators passed; `git diff --check` passed.

Confidence: high for local behavior covered by fixtures and smoke output.

Blocks Closure: no for local implementation proof; yes for Linear closure until steering and delivery evidence exist.

## Eval Gate Matrix

Summary: Implementation and artifact gates pass; closure/delivery gates remain blocked.

Gate: Metadata prerequisite probe

Expected: JSC-320 ERD metadata fields are present before JSC-321 implementation proceeds.

Actual: `rg` found `availability`, `availabilityReason`, `sourceKinds`, and `sourceFilesByKind` in `src/core/analysis-generation-diagrams-erd.js` and `test/generate-output-json.test.js`.

Status: pass

Evidence: active session output from `rg -n "availability|availabilityReason|sourceKinds|sourceFilesByKind" src/core/analysis-generation-diagrams-erd.js test/generate-output-json.test.js`.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: Focused context-pack tests

Expected: unavailable, degraded, useful, missing metadata, and unknown metadata behaviors are tested and pass.

Actual: `npm test -- test/context-pack.test.js` reported 14 passing.

Status: pass

Evidence: active session output from 2026-05-13.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: Full repository test suite

Expected: baseline test suite passes after implementation.

Actual: `npm test` reported 210 passing.

Status: pass

Evidence: active session output from 2026-05-13.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: Deep regression

Expected: deep regression completes successfully.

Actual: `npm run test:deep` reported `deep-regression: OK`.

Status: pass

Evidence: active session output from 2026-05-13.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: Fast repo verify

Expected: repository fast verification passes or reports a concrete blocker.

Actual: `bash scripts/verify-work.sh --fast` passed; lint and typecheck remain repo-declared `not_configured` checks for the plain JS project, and Local Memory REST health passed despite a stopped-status warning.

Status: pass

Evidence: active session output from 2026-05-13.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: No-schema context smoke

Expected: generated context pack from no-schema fixture surfaces unavailable ERD guidance and fallback evidence.

Actual: corrected smoke sequence found `Status: unavailable`, `Reason: no_supported_schema_sources`, and `Fallback evidence` in `diagram-context.md`.

Status: pass

Evidence: active session output from corrected `.harness/tmp/jsc-321-no-schema-*` smoke command.

Confidence: high

Blocks Closure: no

Required Action: preserve corrected smoke command shape in the plan.

Gate: Useful JSON Schema context smoke

Expected: generated context pack from useful JSON Schema fixture emits no unavailable/degraded warning labels.

Actual: corrected negative smoke printed `expected negative assertion passed: useful ERD emitted no unavailable/degraded guidance`.

Status: pass

Evidence: active session output from corrected `.harness/tmp/jsc-321-contract-schema-json-*` smoke command.

Confidence: high

Blocks Closure: no

Required Action: preserve negative assertion handling.

Gate: Plan artifact validators

Expected: the revised plan remains structurally valid after smoke-command correction.

Actual: BLUF structure, generated artifact shape, artifact identity lint, and Linear traceability lint passed.

Status: pass

Evidence: active session output from `check_bluf_structure.py`, `check_generated_artifact_shape.py`, `he_artifact_identity_lint.py`, and `he_linear_traceability_lint.py`.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: Diff boundary and whitespace

Expected: diff remains scoped to approved files and contains no whitespace errors.

Actual: source/test diff is scoped to `src/context/build-context-pack.js` and `test/context-pack.test.js`; plan diff is scoped to smoke-command correction; `git diff --check` passed.

Status: pass

Evidence: `git diff --stat` and `git diff --check` outputs from active session.

Confidence: high

Blocks Closure: no

Required Action: stage only scoped files after acceptance.

Gate: Eval report artifact validators

Expected: eval report validator, artifact identity lint, and frontmatter safety lint pass for this report.

Actual: eval report validator, artifact identity lint, frontmatter safety lint, and BLUF structure check passed.

Status: pass

Evidence: `validate_eval_report.py --json` returned status pass with no warnings; `he_artifact_identity_lint.py` returned PASS; `he_frontmatter_safety_lint.py` returned PASS; `check_bluf_structure.py --json` returned status pass.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: Commit, PR, CI, and Linear mutation

Expected: external delivery evidence exists before tracker closure.

Actual: not performed; heartbeat explicitly forbade commit, push, and external tracker mutation.

Status: not-run

Evidence: active heartbeat reports and current git status show local dirty work only.

Confidence: high

Blocks Closure: yes

Required Action: after acceptance, commit/push/PR and Linear update only with explicit approval.

## Agentic Eval Validity

Summary: The phase work is a valid agentic eval of context-pack ERD guidance, but it is not a multi-trial benchmark.

Evaluated Capability / Task: An agent implements a bounded HE plan slice that consumes ERD manifest availability metadata and surfaces safe context-pack guidance.

Task Validity: valid; the task maps directly to JSC-321 spec acceptance IDs and plan units.

Outcome Validity: valid for local behavior; tests and smoke commands exercise unavailable, degraded, useful, missing, and unknown metadata paths.

Trajectory / Transcript Evidence: phase heartbeats recorded tests-first failure, implementation, review tightening, smoke blocker discovery, plan correction, and final validation.

Grader Coverage: focused mocha tests, full mocha suite, deep regression script, fast verify wrapper, smoke grep assertions, and HE artifact validators.

Trial Policy: single implementation trajectory; not a statistical pass@k eval.

Pass@k / Pass^k Reporting: not applicable; no multi-sample benchmark was run.

Authorization Validator: phase heartbeat authorization allowed local code/spec/test/report edits and forbade external mutation, commit, push, and destructive cleanup.

Saturation / Maintenance Signal: no remaining local implementation phase remains; future work is delivery/closure, not additional unattended implementation.

Blocks Completion: yes

Required Action: Jamie must accept/challenge/rework before completion recommendation can move beyond Blocked.

## Side-Effect Authorization

Summary: Protected external side effects were not performed.

Protected Action: commit, push, PR creation, Linear mutation, GitHub mutation, deployment, secret access, destructive cleanup.

User Authorization Evidence: no explicit approval for these actions during this eval request.

Agent Justification: local proof writing is allowed; external mutation is not needed for eval generation.

External Party Influence: none.

Validator Decision: blocked

Validator Confidence: high

Suggested Next Step: ask for explicit approval before delivery mutation after Jamie accepts this eval.

Blocks Completion: yes

## Domain Model Integrity Check

Summary: The ERD availability domain remains coherent.

Conclusion: pass for local implementation; ERD availability is treated as manifest metadata truth rather than inferred Mermaid text.

Bounded Context: diagram artifact context generation and ERD metadata consumption.

Aggregate Invariants: `availability` states `useful`, `degraded`, `unavailable`, and conservative `unknown` handling remain distinct; useful ERDs stay quiet; fallback evidence excludes the ERD itself.

Translation Evidence: JSC-320 producer metadata is read through `entry.metadata`; tests intentionally use the manifest metadata shape observed in `test/generate-output-json.test.js`.

Scenario or Test Evidence: focused context-pack tests cover unavailable, degraded, useful, missing, and unknown metadata paths.

Confidence: high.

Blocks Completion: no for local proof.

## Drift Validation

Summary: The implementation improves context and agent-native behavior while preserving other drift surfaces.

Architecture Drift: Neutral

Routing Drift: Neutral

Context Drift: Improved

Governance Drift: Neutral

Agent-Native Drift: Improved

Moat Drift: Improved

## Architecture Integrity Check

Summary: Architecture boundaries were preserved.

Conclusion: acceptable for the slice.

Evidence: diff touches `src/context/build-context-pack.js` and `test/context-pack.test.js`; no extractor, parser, renderer, manifest schema, CLI, or `.diagram/agent-context.json` changes were made.

Blocks Completion: no for local proof.

## Routing Determinism Check

Summary: No user-facing routing or command syntax changed.

Conclusion: deterministic enough for JSC-321.

Evidence: implementation reuses `sortByPriority` output already consumed by the context pack; tests assert stable labels and useful-ERD silence; no command registration files changed.

Blocks Completion: no.

## Context Load Check

Summary: The context pack now carries more accurate trust metadata with bounded extra text.

Conclusion: improved.

Evidence: guidance is added near the diagram index only when the ERD row is included and non-useful or unknown; useful ERDs add no warning section; existing compact-header tests still pass.

Blocks Completion: no.

## Agent-Native Check

Summary: The change improves agent reasoning safety.

Conclusion: improved.

Evidence: no-schema smoke proves agents see unavailable status and fallback evidence; useful JSON Schema smoke proves agents are not over-warned when ERD output is useful.

Blocks Completion: no.

## Governance Simplicity Check

Summary: Governance stayed simple after one necessary plan repair.

Conclusion: acceptable.

Evidence: stale smoke commands were corrected in the owning plan instead of changing CLI path-safety behavior or inventing a new validator.

Blocks Completion: no for local proof; yes for closure until acceptance.

## Moat Protection Check

Summary: The work strengthens the project moat by improving evidence quality, not by adding complexity for its own sake.

Conclusion: improved.

Evidence: agents now receive explicit context-trust guidance from structured metadata; validation catches stale command assumptions; implementation stayed local and test-backed.

Blocks Completion: no.

## Proof Artifacts

Summary: Local proof artifacts exist; external delivery artifacts are missing.

Produced: .harness/specs/2026-05-13-JSC-321-erd-unavailable-context-fallback-spec.md; .harness/plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md; .harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md; active-session validation outputs.

Required: focused tests, broad tests, deep tests, fast verify, smoke checks, source diff, eval report, report validators, commit/PR/Linear proof before external closure.

Missing: accepted steering, commit SHA, PR URL, CI checks, Linear backlink/status update.

Planned Before Implementation: yes.

Generated Media Cache Source: not applicable.

Repository Media Path: not applicable.

Prompt Metadata Path: not applicable.

Media Sidecar Path: not applicable.

Repository Media Exists: not applicable.

Blocks Completion: yes for Linear closure; no for local proof.

Attach or Link Back to Linear: link this eval and eventual commit/PR to JSC-321 after acceptance.

## Failures / Regressions

Summary: No implementation regression remains; validation-command drift was found and fixed.

Failure or Regression: original smoke commands used absolute `/private/tmp/...` output paths rejected by CLI path validation.

Evidence: prior smoke attempt failed with `Configuration error: Invalid path: directory traversal detected`; plan was corrected to copy fixtures into ignored `.harness/tmp` workspaces and use relative `--output-dir diagrams`.

Required Corrective Action: preserve corrected plan commands and avoid changing CLI path safety to satisfy stale validation prose.

Follow-Up Justified: no separate issue needed unless this pattern appears in other HE plans.

Blocks Closure: no after correction and passing smoke gates.

## Linear Completion Recommendation

Summary: Do not close JSC-321 until Jamie accepts this report and delivery evidence exists.

Classification: Blocked

Recommended Linear Status: keep current status until acceptance and delivery approval.

Required Linear Comment/Update: after acceptance, post/link this eval plus exact validation commands, commit SHA, and PR URL to JSC-321.

Issues to Close: none from this eval alone.

Issues to Reopen: none.

Issues to Leave Open: JSC-321 until accepted and delivered; JSC-318 parent until child-slice and PR closure evidence are complete.

New Follow-Up Issues: none required by local proof; optional follow-up only if other plans contain the same invalid absolute-output smoke shape.

Labels to Add/Remove: none from this eval.

Milestone Completion: not applicable.

Project Status Change: none from this eval.

Status Update Needed: yes after acceptance and external mutation approval.

Proof Artifacts to Attach or Link: this eval; corrected JSC-321 plan; focused/baseline/deep/verify/smoke evidence; future commit/PR.

## Follow-Up Work

Summary: Follow-up is delivery/closure work, not implementation rework.

Classification: Do Not Create

Target Linear Project: Diagram product surface and analysis workflow.

Parent Issue or Milestone: JSC-318.

Reason: no new product or code gap remains; missing work is acceptance, commit, PR, CI, and Linear update.

Agent-Safe or Human Review Required: human acceptance required before external mutation; agent can perform delivery after explicit approval.

## Core / ADR Update Recommendation

Summary: No core or ADR update is required for this bounded context-pack consumer change.

Core Update: no.

ADR Update: no.

Reason: the change preserves existing architecture and public contracts; the corrected plan command belongs in the plan/eval evidence, not an ADR.

## Evidence & Traceability Matrix

Summary: Material claims are backed by local artifact, diff, and command evidence.

Conclusion: sufficient for local implementation proof; blocked for Linear closure.

Fact: JSC-321 implementation is scoped to context-pack source/tests and plan smoke repair.

Interpretation: the change satisfies the JSC-321 local implementation contract.

Assumption: live Linear state still matches local JSC-321 identifiers because this eval did not reread or mutate Linear.

Evidence: `.harness/specs/2026-05-13-JSC-321-erd-unavailable-context-fallback-spec.md`; `.harness/plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md`; git diff for `src/context/build-context-pack.js` and `test/context-pack.test.js`; validation command outputs from 2026-05-13.

Affected Files/Modules: src/context/build-context-pack.js; test/context-pack.test.js; .harness/plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md; .harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md.

Command or Inspection Method: source artifact inspection, git diff, focused test suite, full test suite, deep regression, fast verify, smoke generation, HE artifact validators.

Confidence: 93%.

Operational Impact: agents receive explicit ERD trust/fallback guidance in context packs; useful ERDs avoid false warnings; stale validation command drift is repaired.

Blocks Completion: yes for Linear closure until acceptance and delivery proof exist.
