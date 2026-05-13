---
schema_version: 1
artifact_id: he-spec-review-loop-jsc-319-json-schema-logical-erd
artifact_type: review_loop_report
canonical_slug: jsc-319-json-schema-logical-erd
title: JSC-319 Spec Review Loop Report
status: optimal_within_available_evidence
date: 2026-05-13
review_target: .harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md
media_status: generated-persistence-blocked
---

# JSC-319 Spec Review Loop Report

## Table of Contents
- [Command Summary](#command-summary)
- [1. Pre-Review Routing & Evidence Check](#1-pre-review-routing--evidence-check)
- [2. Evidence Discovery & Validation Reporting](#2-evidence-discovery--validation-reporting)
- [3. Initial Confidence Assessment](#3-initial-confidence-assessment)
- [4. Specification Intent, Scope & Ownership](#4-specification-intent-scope--ownership)
- [5. Full Specification Review](#5-full-specification-review)
- [6. Repository & Implementation Evidence Review](#6-repository--implementation-evidence-review)
- [7. Spec Structure & Completeness Requirements](#7-spec-structure--completeness-requirements)
- [8. Adversarial Review Findings](#8-adversarial-review-findings)
- [9. Evidence & Standards Check](#9-evidence--standards-check)
- [10. Patch & Improve the Specification](#10-patch--improve-the-specification)
- [11. Revised Specification](#11-revised-specification)
- [12. Iterative Re-Review Loop](#12-iterative-re-review-loop)
- [13. Operational Readiness Review](#13-operational-readiness-review)
- [14. Final Confidence Report](#14-final-confidence-report)
- [15. Before / After Impact Table](#15-before--after-impact-table)
- [16. Media Artifact Result](#16-media-artifact-result)

## Command Summary

BLUF: The JSC-319 spec is now optimal within available evidence for implementation planning, with confidence raised from 88% to 91% by replacing stale live-evidence claims, requiring unsupported-ref diagnostics, and preventing `*Id` inference from masking missing JSON Schema `$ref` parsing.

Decision Needed: Proceed to `he-plan`/implementation planning only after accepting that runtime correctness remains unproven until the focused JSON Schema extractor tests exist and pass.

Top Risks: No JSON Schema parser implementation yet; no dedicated spec schema/link/prose validator; no fresh external Linear read in this pass; generated media cannot be persisted as a repository PNG because the active image tool exposes no cache path.

Next Action: Implement JSC-319 test-first from `SA-319-001` through `SA-319-009`, with unsupported-ref diagnostics and explicit relationship provenance as mandatory proof.

## 1. Pre-Review Routing & Evidence Check

Input classification: single canonical spec file inferred from `current`: `.harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md`.

Request type: improve, audit, implementation-readiness review, technical review, media generation.

Side effects: spec-write, review-artifact-write, media-sidecar-write. No external writes, destructive actions, validator changes, package installs, or runtime projection edits.

Canonical source: clear. Generated/runtime projections: not edited. Applicable repo instructions: root `AGENTS.md` and `docs/agents/01-instruction-map.md`; this was not a `codex/**` subtree task.

## 2. Evidence Discovery & Validation Reporting

| Validator / Check | Available | Result | Evidence | Notes |
| --- | ---: | --- | --- | --- |
| Repo instruction discovery | yes | pass | `sed -n '1,220p' AGENTS.md`; `sed -n '1,220p' docs/agents/01-instruction-map.md` | Root validation contract used. |
| HE routing | yes | blocked | `route_skillset.py ...` returned `low_confidence` | Proceeded from explicit user scope and clear canonical source. |
| Spec BLUF | yes | pass | `check_bluf_structure.py ...spec.md --json` | Accepted revised spec. |
| Review BLUF | yes | pass | `check_bluf_structure.py ...technical-review.md --json` | Accepted review artifact. |
| Acceptance metadata check | yes | pass | `rg -n 'SA-319-008|SA-319-009|confidence_percent|Assumptions and Constraints|Observability' ...spec.md` | New hardening IDs/sections present. |
| Stale live-claim check | yes | pass | `rg -n 'Live Linear|Linear fetch' ...spec.md` returned no matches | Exit code 1 means no matches. |
| Docs style changed | yes | pass | `npm run docs:style:changed` | Reported no staged documentation changes for Vale. |
| Repo fast verification | yes | pass | `bash scripts/verify-work.sh --fast` | Lint/typecheck are configured no-ops; preflight passed. |
| Baseline test | yes | pass | `npm test` | 196 passing. |
| Deep regression | yes | pass | `npm run test:deep` | `deep-regression: OK`. |
| Dedicated spec schema lint | no | blocked | no dedicated schema validator found | BLUF validator is available, not full spec schema validation. |
| Link check | no | blocked | no dedicated link checker found | Not claimed as passed. |
| Spelling/prose check | no | blocked | no dedicated spelling/prose checker found | Not claimed as passed. |
| Image persistence | unknown | blocked | image generation tool does not expose cache path in this environment | Prompt and sidecar persisted before final image invocation. |

## 3. Initial Confidence Assessment

Initial confidence: 88%, strong candidate with validation gaps.

Why it was likely to succeed: the previous spec already matched current extractor architecture, source precedence, parser dispatch, normalizer behavior, and existing extractor tests.

Evidence: `src/schema/erd-extractor.js`, `src/schema/erd-model.js`, `test/erd-extractor.test.js`, `.harness/linear/...`, existing strategy/refactor/spec/review artifacts.

Confidence blockers: implementation not written; JSON Schema runtime behavior not tested; no dedicated spec schema/link/prose validator; external Linear not freshly read in this pass.

## 4. Specification Intent, Scope & Ownership

Spec type: feature spec with API/interface, data-contract, validation, and operational-readiness concerns.

Purpose: define JSC-319 P0 JSON Schema logical ERD extraction for `diagram-cli`.

Operator: repository user or agent running ERD generation. Implementer: `diagram-cli` maintainer/agent.

Owner: JSC-319 under parent JSC-318. Downstream owners remain JSC-320 for manifest truth and JSC-321 for context fallback.

Stopping condition: tests prove JSON Schema source discovery, parser dispatch, local `$ref` relationships, diagnostics, and SQL/Prisma regression safety.

Rollback: remove source kind, parser helpers, fixture, and focused tests.

## 5. Full Specification Review

The spec was implementable and mostly testable before this pass, but still had three material weaknesses:

- Stale evidence language claimed live Linear proof without a current external read.
- Unsupported refs could be silently skipped or only optionally diagnosed.
- Existing `*Id` inference could make relationship tests pass even if explicit JSON Schema `$ref` parsing failed.

No accessibility or security gaps required broad redesign; both were tightened around diagnostics and remote ref handling.

## 6. Repository & Implementation Evidence Review

Source-of-truth:

- `.harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md`
- `AGENTS.md`
- `docs/agents/03-validation.md`
- `package.json`
- `src/schema/erd-extractor.js`
- `src/schema/erd-model.js`
- `test/erd-extractor.test.js`

Supporting evidence:

- `.harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md`
- `.harness/review/2026-05-13-JSC-319-json-schema-logical-erd-technical-review.md`

Missing but needed for implementation closeout:

- JSON Schema parser implementation.
- Contract-schema fixture.
- Focused JSON Schema extractor tests.
- Manifest/context validation under JSC-320/JSC-321.

## 7. Spec Structure & Completeness Requirements

Repository spec format was preserved. Added sections:

- `Assumptions and Constraints`
- `Observability`

Structure remains BLUF-first, traceable, and handoff-oriented.

## 8. Adversarial Review Findings

| Priority | Failure mode | Blast radius | Mitigation | Spec changed |
| --- | --- | --- | --- | --- |
| P2 | Unsupported refs silently skipped, making incomplete ERDs look complete | Operator trust and generated artifact quality | Deterministic unsupported/ref diagnostics and acceptance `SA-319-008` | yes |
| P2 | `*Id` inference masks missing explicit JSON Schema `$ref` parsing | False-positive tests | Require provenance-focused assertions and acceptance `SA-319-009` | yes |
| P2 | Stale “Live Linear” wording overclaims current evidence | Traceability confidence | Replace with local-artifact-scoped evidence language | yes |
| P3 | Mixed SQL/Prisma/JSON entities may collide through normalization | Model fidelity in mixed repos | Keep collision policy out of P0; avoid collision-prone fixtures | yes, residual |

## 9. Evidence & Standards Check

| Claim | Classification | Evidence | Risk | Spec Impact |
| --- | --- | --- | --- | --- |
| Current extractor supports only Prisma/SQL | verified | `src/schema/erd-extractor.js` | low | none |
| Normalizer merges duplicate entity names | verified | `src/schema/erd-model.js` | medium | residual risk noted |
| Existing tests cover Prisma/SQL/no schema | verified | `test/erd-extractor.test.js` | low | none |
| JSC-319/JSC-320/JSC-321 exist live now | blocked | no fresh external Linear read in this pass | medium | wording changed to local artifact evidence |
| JSON Schema parser behavior works | blocked | implementation absent | high | validation gates required |
| Remote refs are never fetched | blocked until implementation | spec requirement only | high | security requirement retained |

## 10. Patch & Improve the Specification

| Problem | Why It Matters | Recommended Fix | Expected Improvement | Validation Method | Applied? |
| --- | --- | --- | --- | --- | --- |
| Stale live evidence wording | Overstates current proof | Replace with local artifact evidence | Honest confidence | `rg` stale-claim check | yes |
| Optional unsupported-ref diagnostics | Silent incompleteness | Require deterministic diagnostics | Better operator trust | BLUF + targeted `rg` + review | yes |
| Inference masking risk | False-positive tests | Require explicit provenance assertions | Better testability | Acceptance metadata check | yes |
| Confidence overgeneralized as `high` | Can imply implementation proof | Add 90% and validation-gap band | Better confidence discipline | BLUF + review | yes |
| Missing observability section | Weak operational evidence | Add text-artifact diagnostics rules | Better debuggability | BLUF + review | yes |

## 11. Revised Specification

Edited directly:

- `.harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md`
- `.harness/review/2026-05-13-JSC-319-json-schema-logical-erd-technical-review.md`
- `.harness/review/2026-05-13-JSC-319-spec-review-loop-report.md`
- `.harness/media/2026-05-13-jsc-319-from-local-erd-spec-to-evidence-gated-contract-prompt.md`
- `.harness/media/2026-05-13-jsc-319-from-local-erd-spec-to-evidence-gated-contract.md`

## 12. Iterative Re-Review Loop

| Pass | Main Issues Found | Fixes Applied | Validators / Checks Re-run | Confidence After Pass | Stop / Continue Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | Stale live evidence wording, optional diagnostics, inference masking | Added assumptions, observability, FR/NFR/SA hardening | BLUF checks, targeted `rg` | 90% | Continue for validation table self-reference |
| 2 | Validation row could self-match stale terms | Replaced stale-row wording and ran direct stale search | BLUF checks, targeted `rg`, `verify-work`, `npm test`, `test:deep` | 91% | Stop: remaining issues require implementation or unavailable validators |

Loop outcome: optimal within available evidence.

## 13. Operational Readiness Review

Implementation readiness: strong for planning, not complete for runtime.

Maintainability: improved by local helper constraint and downstream boundaries.

Governance: improved by local evidence language and JSC-320/JSC-321 separation.

Observability: improved by deterministic diagnostics and source-file requirements.

Accessibility: improved by non-color diagnostic requirements and parseable text labels.

Security/privacy: improved by no network, no code execution, no cross-file walking, and sanitized remote-ref diagnostic requirements.

Reliability/testability: improved by explicit unsupported-ref and provenance tests.

Rollback: clear and bounded.

## 14. Final Confidence Report

Final confidence: 91%.

Confidence band: 90-97%, implementation-ready only with strong evidence.

Why confidence improved: the spec now distinguishes local artifact evidence from live external proof, requires diagnostics for skipped refs, and prevents relationship inference from masking parser failures.

Remaining risks:

- JSON Schema support is not implemented.
- Dedicated spec schema, link, spelling, and prose validators are unavailable.
- External Linear state was not refreshed.
- Runtime behavior still needs focused implementation tests.

Confidence ceiling: 94% until implementation tests pass; 97% until repeatable runtime behavior and dedicated spec validation exist.

## 15. Before / After Impact Table

| Area | Before Patch | After Patch | Expected Improvement |
| --- | --- | --- | --- |
| Evidence quality | Claimed live Linear evidence from prior context | Scoped to local Linear artifact | Less overclaiming |
| Confidence | Generic `high` | 90%/91% with validation gaps | Better calibration |
| Scope control | Local refs bounded, but diagnostics weak | Unsupported refs require diagnostics | Less silent incompleteness |
| Testability | Fixture could pass via inference | Explicit provenance acceptance | Stronger tests |
| Observability | No standalone section | Source-file and diagnostic rules | Better debugging |
| Accessibility | Basic artifact clarity | Non-color, parseable diagnostic labels | Better operator/agent readability |
| Security | No network/code execution | Adds sanitized remote-ref diagnostics | Lower data exposure risk |
| Long-term quality | P0/P1/P2 separated | Separation preserved and reinforced | Less scope creep |

## 16. Media Artifact Result

Media status: generated-persistence-blocked.

Reason: direct image generation is invoked as the final action, but the active image tool does not expose a generated bitmap cache path that can be copied into `.harness/media/` in this environment. Prompt metadata and sidecar are persisted; repository PNG existence is blocked.
