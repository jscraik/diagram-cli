---
schema_version: 1
artifact_id: jsc-320-erd-source-kind-manifest-truth-technical-review
artifact_type: he-code-review
harness_stage: he-code-review
canonical_slug: jsc-320-erd-source-kind-manifest-truth
title: JSC-320 ERD Source-Kind and Manifest Truth Technical Review
status: complete
date: 2026-05-13
origin: he-spec technical review request
source_artifacts:
  - .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md
  - .harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md
traceability_required: true
linear_parent: JSC-318
linear_issue: JSC-320
linear_status: backlog
source_spec: .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md
review_type: technical_spec_review
confidence_percent: 92
---

# JSC-320 ERD Source-Kind and Manifest Truth Technical Review

## Table of Contents
- [Command Summary](#command-summary)
- [Review Scope](#review-scope)
- [Evidence Reviewed](#evidence-reviewed)
- [Findings](#findings)
- [Patches Applied](#patches-applied)
- [Residual Risks](#residual-risks)
- [Validation Evidence](#validation-evidence)
- [Operational Verdict](#operational-verdict)
- [Linear Work Item Contract](#linear-work-item-contract)
- [Linear Acceptance Traceability](#linear-acceptance-traceability)

## Command Summary

BLUF: Build the JSC-320 plan from the deepened spec only after preserving the structured source-evidence contract, because source-kind metadata would otherwise be easy to fake from filenames or Mermaid comments; the remaining blocker for higher confidence is implementation evidence, not spec shape.

Decision Needed: Use the deepened spec as the `he-plan` input. Stop if implementation requires a top-level manifest schema migration or context-pack behavior changes.

Top Risks: Source-kind truth guessed outside the extractor; generic manifest writer polluted with ERD-specific rules; no-source ERDs classified as useful because an `erd.mmd` file exists; mixed-source behavior left untested.

Next Action: Build `.harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md` from the updated spec and make tests prove the metadata contract before implementation closeout.

## Review Scope

This review covered the JSC-320 specification only. It did not implement JSC-320 and did not mutate Linear.

In scope:

- `.harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md`
- `src/core/analysis-generation-diagrams-erd.js`
- `src/core/analysis-generation-diagrams.js`
- `src/commands/generate-all.js`
- `src/schema/erd-extractor.js`
- `src/schema/erd-confidence.js`
- `test/generate-output-json.test.js`
- `test/evidence-manifest-parity.test.js`
- `.harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md`

Out of scope:

- JSC-320 implementation.
- JSC-321 context-pack fallback guidance.
- YAML or TypeScript source-kind support.
- Public CLI/config changes.
- Manifest schema migration.

## Evidence Reviewed

| Evidence | Classification | Impact |
| --- | --- | --- |
| `src/core/analysis-generation-diagrams-erd.js` | verified | ERD metadata is centralized in `buildErdMetadata`, making this the safest place for additive ERD truth. |
| `src/core/analysis-generation-diagrams.js` | verified | `toManifestEntry` generically preserves nested metadata and should remain ERD-agnostic. |
| `src/commands/generate-all.js` | verified | `generate-all` passes diagram metadata into manifest entries, so the spec can stay additive. |
| `src/schema/erd-extractor.js` | verified | Extractor exposes `sourceFiles` but not source-kind-to-file evidence; spec needed to close this ambiguity. |
| `src/schema/erd-confidence.js` | verified | Confidence outcomes already provide a deterministic basis for useful/degraded/unavailable mapping. |
| `test/generate-output-json.test.js` | verified | Existing test already asserts ERD manifest metadata for Prisma. |
| `test/evidence-manifest-parity.test.js` | verified | Existing test protects manifest disk/stdout parity and schema version. |
| Live Linear `JSC-320` | verified | Owning issue requires additive metadata, no schema migration, and manifest snippets as closeout evidence. |

## Findings

| Severity | Finding | Evidence | Patch Applied |
| --- | --- | --- | --- |
| High | Source-kind truth was under-specified: the spec required `sourceKinds` but did not require source-kind-to-file evidence, leaving implementers free to guess from Mermaid comments or generated artifact names. | `src/schema/erd-extractor.js` exposes `sourceFiles`; `src/core/analysis-generation-diagrams-erd.js` consumes extraction metadata. | Added `sourceFilesByKind` contract, conformance rules, and acceptance criteria. |
| Medium | Generic manifest writer boundary needed sharper protection. Without it, implementation could put ERD-specific logic in `toManifestEntry`, increasing coupling. | `src/core/analysis-generation-diagrams.js` currently keeps `toManifestEntry` generic. | Added interface rules and `SA-320-010` requiring the manifest writer to remain ERD-agnostic. |
| Medium | Mixed-source behavior was named but not acceptance-tested. | Source precedence supports multiple source kinds; JSC-320 requires source-kind truth. | Added `SA-320-009` and helper/fixture validation requirement for `sourceKindSummary: "mixed"`. |
| Medium | Availability downgrade rules were ambiguous around diagnostics. | `src/schema/erd-confidence.js` already has deterministic outcomes; parser diagnostics may be non-fatal. | Resolved open question: diagnostics alone do not downgrade useful output unless a tested stable reason is added. |
| Low | No-source behavior wording was too tentative about whether an ERD manifest entry exists. | `generate-all` maps all supported diagram types and writes included entries after budgeting. | Tightened scenario wording to reflect current generate-all behavior. |

## Patches Applied

| Area | Change |
| --- | --- |
| Metadata contract | Added required `sourceFilesByKind` field and JSON conformance rules. |
| Requirements | Added `FR-320-005`, `FR-320-012`, stricter no-source and JSON Schema acceptance, and deterministic source evidence requirements. |
| Acceptance criteria | Expanded from `SA-320-001` through `SA-320-008` to `SA-320-001` through `SA-320-010`. |
| Manifest boundary | Added explicit rule that `toManifestEntry` must not classify ERD availability. |
| Availability semantics | Resolved `failed_parse` as `unavailable` for JSC-320 and diagnostics-alone downgrade as not admitted. |
| Handoff | Added `must_prove` items for `he-plan`: structured source evidence, mixed-source test, no-source `{}`, and ERD-agnostic manifest writer. |

## Residual Risks

| Risk | Classification | Why It Remains |
| --- | --- | --- |
| Implementation may need extractor source evidence changes | requires implementation testing | Spec can define the contract, but code must prove the cleanest location. |
| Current implementation does not yet emit JSC-320 metadata | requires implementation testing | This review intentionally did not implement JSC-320. |
| Mixed-source fixture may need careful construction to avoid precedence surprises | requires implementation testing | Helper-level tests may be enough if fixture semantics are awkward. |
| Artifact persistence for `.harness/evals/**` and `.harness/solutions/**` remains a separate repo hygiene issue | adjacent blocker | Not part of JSC-320 spec scope, but should be fixed before packaging broader HE artifacts. |

## Validation Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Spec BLUF | pass | `python3 /Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/scripts/check_bluf_structure.py .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md --json` |
| Spec artifact shape | pass | `python3 /Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/scripts/check_generated_artifact_shape.py .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md --kind spec --json` |
| Spec artifact identity | pass | `python3 /Users/jamiecraik/dev/agent-skills/Infrastructure/scripts/validation-and-linting/he_artifact_identity_lint.py .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md` |
| Spec Linear traceability | pass | `python3 /Users/jamiecraik/dev/agent-skills/Infrastructure/scripts/validation-and-linting/he_linear_traceability_lint.py .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md` |
| Review BLUF | pass | `python3 /Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/scripts/check_bluf_structure.py .harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-technical-review.md --json` |
| Review artifact identity | pass | `python3 /Users/jamiecraik/dev/agent-skills/Infrastructure/scripts/validation-and-linting/he_artifact_identity_lint.py .harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-technical-review.md` |
| Review Linear traceability | pass | `python3 /Users/jamiecraik/dev/agent-skills/Infrastructure/scripts/validation-and-linting/he_linear_traceability_lint.py .harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-technical-review.md` |

## Operational Verdict

The deepened spec is implementation-ready for `he-plan` within available evidence. It is not implementation-complete and should not be treated as production evidence.

Confidence: 92%.

Higher confidence requires the JSC-320 plan and implementation to prove:

- JSON Schema fixture manifest metadata is useful and source-kind truthful.
- No-source fixture manifest metadata is unavailable and source-kind empty.
- Mixed-source behavior is deterministic.
- SQL/Prisma behavior remains compatible.
- `toManifestEntry` stays generic.

## Linear Work Item Contract

| Field | Value |
| --- | --- |
| Parent issue | `JSC-318` |
| Owning issue | `JSC-320` |
| Status | Backlog |
| Project | Diagram product surface and analysis workflow |
| Required next artifact | `.harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md` |
| External mutation status | No Linear mutation performed |

## Linear Acceptance Traceability

| Linear issue | Acceptance IDs | Review impact |
| --- | --- | --- |
| `JSC-318` | `SA-320-001` through `SA-320-010` contribute only the P1 slice | Parent remains open until JSC-319/JSC-320/JSC-321 evidence exists. |
| `JSC-320` | `SA-320-001` through `SA-320-010` | Technical review deepened source evidence, manifest boundary, and validation expectations. |
| `JSC-321` | `SA-320-007` | Context fallback remains blocked until JSC-320 metadata exists. |
