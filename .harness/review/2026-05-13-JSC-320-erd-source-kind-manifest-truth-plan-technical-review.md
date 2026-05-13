---
schema_version: 1
artifact_id: jsc-320-erd-source-kind-manifest-truth-plan-technical-review
artifact_type: he-code-review
harness_stage: he-code-review
canonical_slug: jsc-320-erd-source-kind-manifest-truth
title: JSC-320 ERD Source-Kind and Manifest Truth Plan Technical Review
status: complete
date: 2026-05-13
origin: he-plan professional confidence review request
source_artifacts:
  - .harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md
  - .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md
  - .harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-technical-review.md
  - .harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md
traceability_required: true
linear_parent: JSC-318
linear_issue: JSC-320
linear_status: backlog
source_plan: .harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md
source_spec: .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md
review_type: technical_plan_review
confidence_percent: 92
---

# JSC-320 ERD Source-Kind and Manifest Truth Plan Technical Review

## Table of Contents
- [Command Summary](#command-summary)
- [1. Initial Confidence Assessment](#1-initial-confidence-assessment)
- [2. Plan Intent & Scope Check](#2-plan-intent--scope-check)
- [3. Issues and Loopholes Found](#3-issues-and-loopholes-found)
- [4. Evidence Check](#4-evidence-check)
- [5. Recommended Fixes](#5-recommended-fixes)
- [6. Revised Plan](#6-revised-plan)
- [7. Associated Spec Update](#7-associated-spec-update)
- [8. Iterative Re-review Loop](#8-iterative-re-review-loop)
- [9. Final Confidence Report](#9-final-confidence-report)
- [10. Before / After Impact Table](#10-before--after-impact-table)
- [11. Infographic / `$imagegen` Artifact](#11-infographic--imagegen-artifact)
- [Linear Work Item Contract](#linear-work-item-contract)
- [Linear Acceptance Traceability](#linear-acceptance-traceability)

## Command Summary

BLUF: The JSC-320 plan is implementation-ready after one material hardening patch: phase-exit ownership now explicitly requires simplify review, code review, bug-fix only from concrete failing evidence, exact validation outcomes, and artifact persistence checks before closeout; confidence remains capped because implementation and runtime behavior are still unproven.

Decision Needed: Proceed to `he-work` for JSC-320 only. Stop before implementation if live tracker scope changes, JSC-319 proof is challenged, additive metadata cannot satisfy the spec, or any path requires public CLI/config changes, manifest schema migration, JSC-321 context fallback, YAML, TypeScript, remote refs, or unrelated repo cleanup.

Top Risks: The plan could appear complete after tests pass while review evidence is missing; no-source ERDs could be marked useful because `erd.mmd` exists; source kinds could be guessed outside the extractor; artifact closeout could cite ignored `.harness/evals/**` or `.harness/solutions/**` files.

Next Action: Start `he-work` with `PU-320-001` contract-first tests, record the expected initial missing-metadata failure once, then continue through the ordered plan units.

## 1. Initial Confidence Assessment

| Field | Assessment |
| --- | --- |
| Initial confidence | 91% |
| Initial band | strong candidate with validation gaps |
| Evidence supporting confidence | Current plan, associated spec, spec technical review, live Linear `JSC-320` fetch, source evidence around ERD metadata and manifest writer, focused baseline test evidence recorded in the plan |
| Confidence blockers | JSC-320 implementation has not run; runtime manifest behavior for new metadata is untested; phase-exit ownership and artifact persistence were under-specified before this review |
| Associated spec status | present and aligned |
| Source of truth | clear: `.harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md` and `.harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md` |

## 2. Plan Intent & Scope Check

The plan's goal is to execute the JSC-320 P1 slice: add truthful ERD source-kind, source evidence, and useful/degraded/unavailable metadata to `generate-all` manifest entries without a manifest schema migration or public CLI/config change.

| Area | Classification |
| --- | --- |
| Plan type | implementation-ready execution plan |
| Target system | `diagram-cli` ERD extraction, ERD artifact metadata, and `generate-all` manifest output |
| Intended implementer | HE implementer / Codex working in repo |
| Intended operator | Jamie and future agents consuming `.harness` and manifest evidence |
| Expected outputs | production code/test changes, exact validation evidence, manifest snippets or artifact paths |
| Out of scope | JSC-321 context fallback, YAML, TypeScript, remote/cross-file refs, public CLI/config changes, schema migration, renderer rewrite |
| Spec coverage | aligned; no spec patch needed from this plan hardening |

## 3. Issues and Loopholes Found

| Severity | Failure Mode | Blast Radius | Likelihood | Impact | Confidence Killer | Mitigation | Spec Change Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Medium | Phase could close after tests pass without simplify/code-review evidence. | JSC-320 closeout quality and future PR confidence. | Medium | Medium | Review gates become advisory rather than exit criteria. | Patched plan with explicit ownership and phase-exit rules. | no |
| Medium | Bug-fix pass could become speculative cleanup rather than evidence-led repair. | Scope creep into unrelated files. | Medium | Medium | Bug-fix gate lacks concrete trigger. | Patched plan to run bug-fix only when validators, smoke commands, or reviews produce failing evidence. | no |
| Low-medium | Closeout artifacts under `.harness/evals/**` or `.harness/solutions/**` could be cited while ignored or not persisted. | Evidence trail reliability. | Medium | Low-medium | Artifact existence is mistaken for trackability. | Patched plan to verify persistence or mark blocked before claiming artifact evidence. | no |
| Medium | Initial TDD failure could be rerun repeatedly without new information. | Heartbeat/operator time. | Medium | Low-medium | Repeated deterministic failure adds no evidence. | Patched `PU-320-001` to record expected failure once, then require production-code change before rerun. | no |

## 4. Evidence Check

| Claim | Classification | Evidence | Risk | Spec Impact |
| --- | --- | --- | --- | --- |
| Live `JSC-320` exists and is Backlog under `JSC-318`. | verified | Linear fetch `issue:JSC-320` on 2026-05-13 returned title, parent `JSC-318`, status `Backlog`, priority High. | low | none |
| JSC-320 scope is additive metadata with no schema migration. | verified | Live Linear text and `.harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md`. | low | none |
| `toManifestEntry` currently preserves metadata generically. | verified | `src/core/analysis-generation-diagrams.js` source review; plan and spec cite this boundary. | medium until implementation diff reviewed | none |
| Current extractor exposes `sourceFiles` but not `sourceFilesByKind`. | verified | `src/schema/erd-extractor.js` source review and tests asserting `sourceFiles`. | medium | none; spec already requires structured evidence |
| Plan validation gates are concrete and repo-local. | verified | Plan `Validation Gates` lists HE validators, focused tests, full tests, deep tests, `bash scripts/verify-work.sh --fast`, and smoke commands. | low | none |
| JSC-320 implementation correctness is proven. | blocked | Implementation has not been performed in this review. | high if claimed | none; plan marks implementation evidence blocked |

## 5. Recommended Fixes

| Problem | Why It Matters | Recommended Fix | Expected Improvement | Validation Method | Spec Update Needed |
| --- | --- | --- | --- | --- | --- |
| Phase-exit gate not strict enough | Plan could finish without review evidence | Add ownership and exit rules for simplify, code review, bug-fix trigger, and validation outcome recording | Stronger implementation closeout discipline | Plan lint and re-review | no |
| TDD initial failure could be stale-noise | Repeated failure without production changes wastes heartbeat cycles | Record expected failure once; rerun only after implementation changes | Cleaner evidence trail | Plan review | no |
| Artifact persistence risk not named in plan | Evidence artifacts can be local but ignored | Require persistence check for `.harness/evals/**` or `.harness/solutions/**` if used | More reliable closeout evidence | Plan review and future git status check | no |

## 6. Revised Plan

The revised canonical plan is saved at `.harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md`.

Material changes applied:

- Added the plan technical review artifact to `source_artifacts`.
- Raised plan confidence from 91% to 92%, matching the evidence ceiling for unimplemented runtime behavior.
- Added `phase_exit_reviews` to the status block.
- Added `Ownership and Approval Boundaries`.
- Made the expected pre-implementation TDD failure a one-time evidence capture, not a repeatable loop.
- Added explicit review exit rules before commit/PR closeout.
- Added risks for missing review evidence and ignored closeout/eval artifacts.

## 7. Associated Spec Update

Status: aligned.

No spec edit was required. The plan hardening changed execution discipline, ownership, phase-exit gates, and evidence recording. It did not change JSC-320 scope, requirements, field names, architecture, acceptance criteria, public interfaces, data contract, rollback posture, or validation expectations in a way that requires a spec patch.

## 8. Iterative Re-review Loop

| Pass | Main Issues Found | Fixes Applied | Spec Changes Applied | Confidence After Pass | Stop/Continue Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | Phase-exit evidence, bug-fix trigger, TDD failure recording, and artifact persistence were too implicit. | Patched plan ownership, exit rules, one-time failure recording, and risk register. | none | 92% | Continue to validator rerun. |
| 2 | Re-reviewed plan/spec pair for contradictions after patch. | No material fixable-now issue remained. | none | 92% | Stop: remaining confidence blockers require implementation/runtime evidence. |

Loop outcome: optimal within available evidence.

## 9. Final Confidence Report

| Field | Assessment |
| --- | --- |
| Final confidence | 92% |
| Final band | strong candidate with validation gaps |
| Why confidence improved | Review found and patched concrete operating-model gaps without changing the spec contract. |
| Remaining risks | Implementation may reveal cleaner helper placement; mixed-source proof may need a fixture or helper test; generic manifest writer boundary must be verified against the actual diff. |
| Assumptions still in place | JSC-319 local proof remains valid; additive nested metadata remains sufficient; no Linear scope change occurs before implementation starts. |
| What would increase confidence | JSC-320 tests implemented and passing, smoke manifest snippets captured, simplify/code review completed, full/deep/fast validation passed. |
| What cannot yet be proven | Runtime manifest metadata correctness, SQL/Prisma compatibility under the new fields, and final review quality over the implementation diff. |

## 10. Before / After Impact Table

| Area | Before Patch | After Patch | Expected Improvement |
| --- | --- | --- | --- |
| Clarity | Review gates listed but exit authority was implicit | Ownership and phase-exit rules are explicit | Less closeout ambiguity |
| Implementation readiness | Strong plan with some heartbeat/operator gaps | Strong plan with stricter evidence discipline | Safer unattended execution |
| Spec alignment | Aligned | Aligned | No drift introduced |
| Reliability | Repeated expected TDD failures possible | Initial failure is recorded once, then rerun requires new code evidence | Less stale validation noise |
| Safety | Bug-fix pass could be interpreted broadly | Bug-fix pass requires concrete failing evidence | Lower scope-creep risk |
| Observability | Closeout evidence required | Closeout evidence plus artifact persistence checks | More trustworthy trace |
| Validation strength | Commands listed | Commands plus review exit semantics | Better pass/fail/blocked discipline |
| Confidence level | 91% | 92% | Higher but still capped by untested implementation |

## 11. Infographic / `$imagegen` Artifact

Status: not applicable for this review request.

The latest operator request asked to deepen the plan and run technical review. The canonical plan already includes a Mermaid execution diagram, and no generated media artifact was explicitly required for this turn. No image generation was invoked and no `.harness/media/**` artifact is claimed.

## Linear Work Item Contract

| Field | Value |
| --- | --- |
| Parent issue | `JSC-318` |
| Owning issue | `JSC-320` |
| Status | Backlog |
| Project | Diagram product surface and analysis workflow |
| Required next artifact | JSC-320 implementation evidence from `he-work` |
| External mutation status | No Linear mutation performed |

## Linear Acceptance Traceability

| Linear issue | Acceptance IDs | Review impact |
| --- | --- | --- |
| `JSC-318` | `SA-320-001` through `SA-320-010` contribute only the P1 slice | Parent remains open until JSC-319/JSC-320/JSC-321 evidence exists. |
| `JSC-320` | `SA-320-001` through `SA-320-010` | Plan review hardened execution discipline without changing the acceptance contract. |
| `JSC-321` | `SA-320-007` | Context fallback remains blocked until JSC-320 metadata proof exists. |
