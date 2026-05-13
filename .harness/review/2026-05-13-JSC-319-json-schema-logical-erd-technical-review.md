---
schema_version: 1
artifact_id: he-technical-review-jsc-319-json-schema-logical-erd
artifact_type: technical_review
canonical_slug: jsc-319-json-schema-logical-erd
title: JSC-319 JSON Schema Logical ERD Technical Review
status: strengthened_go_with_conditions
date: 2026-05-13
origin: he-technical-review
review_target: .harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md
linear_issue: JSC-319
linear_parent: JSC-318
safe_to_continue: true
blocked_reason: ""
verdict: go_with_conditions
---

# JSC-319 JSON Schema Logical ERD Technical Review

## Table of Contents
- [Command Summary](#command-summary)
- [Findings](#findings)
- [Review Basis](#review-basis)
- [Spec Deepening Applied](#spec-deepening-applied)
- [Residual Risks](#residual-risks)
- [Implementation Readiness](#implementation-readiness)
- [Validation](#validation)
- [Decision](#decision)

## Command Summary

BLUF: The strengthened JSC-319 spec is technically fit to enter implementation planning, provided the implementation keeps JSON Schema refs in-document only, emits deterministic unsupported-ref diagnostics, proves relationship provenance with tests, and preserves the current SQL/Prisma extractor contract.

Decision Needed: Proceed to `he-plan` for JSC-319 with the spec as the controlling artifact.

Top Risks: Scope creep into cross-file refs; accidental network-capable `$ref` behavior; fixture assertions that prove entity extraction but not relationship direction/cardinality/provenance; unintentional changes to current Prisma/SQL parser behavior.

Next Action: Build the implementation plan around tests first: source precedence, parser dispatch, contract-schema fixture, local JSON Pointer resolution, unsupported ref diagnostics, relationship provenance, and existing SQL/Prisma regression coverage.

## Findings

No blocking findings remain after the second review pass.

| Severity | Finding | Evidence | Required action |
| --- | --- | --- | --- |
| P2 resolved | The original spec left JSON Pointer scope too broad for a safe P0. It now limits supported refs to in-document JSON Pointers and explicitly excludes cross-file and remote refs. | Spec lines 129-131, 201-207, 298-302, 336-343, 357-360 | Keep implementation local-only; do not add file walking or network fetch behavior. |
| P2 resolved | The original spec did not force a deterministic choice for relationship properties that may also be attributes. It now requires focused tests to assert the chosen behavior. | Spec lines 325-330, 416, 448 | During implementation, choose one behavior and lock it in tests before relying on downstream manifest/context work. |
| P2 resolved | Acceptance metadata lagged behind the deepened acceptance criteria. Frontmatter, status block, traceability, and handoff now consistently name `SA-319-001` through `SA-319-007`. | Spec lines 27-34, 95, 497, 539-546 | Preserve this traceability in the next `he-plan`. |
| P2 resolved | The prior revision allowed unsupported refs to be skipped with optional diagnostics, which could make incomplete relationship coverage look complete. The spec now requires deterministic diagnostics and acceptance proof for unsupported, unresolved, cross-file, and remote refs. | Spec sections Requirements, Observability, Failure and Recovery, Validation Plan, Acceptance Criteria | Assert diagnostic behavior in focused extractor tests. |
| P2 resolved | Existing `*Id` inference could make a JSON Schema fixture pass relationship checks even if explicit `$ref` parsing failed. The spec now requires provenance-focused assertions so explicit relationships cannot be masked by inference. | Spec sections Assumptions and Constraints, Failure and Recovery, Validation Plan, Acceptance Criteria | Assert `provenance: explicit` for JSON Schema `$ref` relationships. |
| P3 residual | The spec allows all discovered Prisma, SQL, and JSON Schema sources to merge into one normalized model, but no conflict policy exists if contract entities normalize to the same names as database tables. | Spec lines 286, 312-314; normalizer merge behavior in `src/schema/erd-model.js` lines 79-92 | Acceptable for P0; avoid collision-prone fixtures and defer conflict policy unless implementation evidence makes it necessary. |

## Review Basis

Reviewed artifacts and code surfaces:

- Spec target: `.harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md`.
- Extractor registration path: `src/schema/erd-extractor.js` lines 15-19, 48-51, 342-345, 419-452.
- Extractor terminal behavior and diagnostics: `src/schema/erd-extractor.js` lines 472-486.
- Normalization and relationship filtering: `src/schema/erd-model.js` lines 79-123.
- Current extractor tests: `test/erd-extractor.test.js` lines 26-155 and helper coverage lines 157-205.
- Fixture inventory: `test/fixtures/erd/**`, currently Prisma/SQL/no-schema only.

The review target is a specification, not an implementation diff. This review therefore evaluates implementation readiness, ambiguity, traceability, rollback safety, and testability rather than claiming runtime behavior exists.

## Spec Deepening Applied

The spec was expanded from a lite handoff into a full implementation contract:

- Added in-document JSON Pointer boundaries and explicit `~0`/`~1` unescape requirements.
- Added unsupported cross-file ref, unsupported composition keyword, and remote ref behavior.
- Strengthened unsupported, unresolved, cross-file, and remote refs from silent/optional diagnostics to deterministic diagnostic evidence.
- Added fixture proof requirements for scalar attributes and local `$ref` relationships.
- Added deterministic relationship-property attribute behavior as an acceptance condition.
- Added relationship provenance checks so existing `*Id` inference cannot mask missing explicit JSON Schema `$ref` parsing.
- Updated metadata and handoff acceptance IDs to include `SA-319-006` through `SA-319-009`.
- Replaced unverified "live Linear" confidence language with local-artifact-scoped evidence language.
- Preserved `JSC-320` and `JSC-321` as downstream work instead of absorbing manifest truth or context fallback into P0.

## Residual Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Fixture proves happy path but not JSON Pointer edge cases | Medium | Medium | Include `~0`/`~1`, unresolved local refs, cross-file refs, and remote refs in focused parser tests. |
| Relationship cardinality semantics differ from contract-reader expectations | Medium | Low | Use the existing Mermaid ERD cardinality strings and document the P0 mapping in tests. |
| Parser grows into a JSON Schema validator | Low | Medium | Keep helpers local and data-only; ignore unsupported schema keywords. |
| Existing inferred relationship logic creates surprise links from JSON Schema `*Id` attributes | Medium | Medium | Add a fixture assertion that expected explicit relationships have `provenance: explicit` and inferred relationships do not mask parser mistakes. |

## Implementation Readiness

The spec is ready for `he-plan` with these conditions:

- Implementation must add `json-schema` after existing `prisma` and `sql` precedence, not before them.
- Implementation must use the existing `parseSchemaSource` and `normalizeErdModel` path.
- Implementation must not execute schemas, load target-repo modules, call validators, fetch remote refs, or resolve cross-file refs.
- Implementation tests must assert source precedence, parser dispatch, fixture output, local ref relationships, unsupported ref diagnostics, relationship provenance, JSON Pointer unescape behavior, and existing SQL/Prisma regression behavior.
- P1 manifest/source-kind truth and P2 context fallback must remain out of JSC-319.

## Validation

| Gate | Command | Expected |
| --- | --- | --- |
| Spec BLUF | `python3 /Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/scripts/check_bluf_structure.py .harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md --json` | pass |
| Review BLUF | `python3 /Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/scripts/check_bluf_structure.py .harness/review/2026-05-13-JSC-319-json-schema-logical-erd-technical-review.md --json` | pass |
| Acceptance metadata consistency | `rg -n 'SA-319-006|SA-319-007|spec_depth' .harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md` | pass; new acceptance IDs and full spec depth are present in metadata and handoff |
| Strengthened acceptance metadata consistency | `rg -n 'SA-319-008|SA-319-009|confidence_percent|Assumptions and Constraints|Observability' .harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md` | pass; new hardening IDs and sections are present |
| Stale live-claim search | `rg -n 'Live Linear|Linear fetch' .harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md` | pass; no matches |
| Repo fast verification | `bash scripts/verify-work.sh --fast` | pass; lint and typecheck report `not_configured` for this plain JS project, related tests report no staged `src/**` changes |

## Decision

Go with conditions. JSC-319 should move to implementation planning from the deepened spec, with the tests carrying the boundary discipline: local JSON Schema only, in-document refs only, and no claim that P1/P2 behavior is complete.
