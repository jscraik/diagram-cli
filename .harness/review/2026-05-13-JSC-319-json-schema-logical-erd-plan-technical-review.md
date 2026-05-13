---
schema_version: 1
artifact_id: he-review-jsc-319-json-schema-logical-erd-plan-technical-review
artifact_type: he-code-review
harness_stage: he-code-review
canonical_slug: jsc-319-json-schema-logical-erd-plan-technical-review
title: "JSC-319 JSON Schema Logical ERD Plan Technical Review"
status: reviewed_with_plan_and_spec_patches_applied
date: 2026-05-13
source_plan: ".harness/plan/2026-05-13-JSC-319-json-schema-logical-erd-plan.md"
source_spec: ".harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md"
source_architecture_review: ".harness/review/diagram-cli-architecture-review.md"
linear_issue: "JSC-319"
review_type: implementation_readiness
confidence: strong_candidate_with_validation_gaps
confidence_percent: 92
---

# JSC-319 JSON Schema Logical ERD Plan Technical Review

## Table of Contents

- [Executive Summary](#executive-summary)
- [Review Scope](#review-scope)
- [Findings](#findings)
- [Patch Summary](#patch-summary)
- [Residual Risks](#residual-risks)
- [Implementation Readiness Verdict](#implementation-readiness-verdict)
- [Validation Evidence](#validation-evidence)
- [Traceability Matrix](#traceability-matrix)

## Executive Summary

The JSC-319 plan is now implementation-ready for a narrow `he-work` pass. The first plan version had the right work-unit structure but was under-specified at the parser seam: it assumed JSON Schema diagnostics could simply appear, did not pin how parser context reaches a filename-based root entity, and referenced relationship labels that the current normalized ERD model does not preserve.

Those problems were fixable in the plan and associated specification, and both artifacts have been patched. The remaining risk is implementation execution: the code still needs tests and parser changes, and the full validation gates have not run because this review did not implement JSC-319.

## Review Scope

Reviewed artifacts:

- `.harness/plan/2026-05-13-JSC-319-json-schema-logical-erd-plan.md`
- `.harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md`
- `.harness/review/diagram-cli-architecture-review.md`
- `src/schema/erd-extractor.js`
- `src/schema/erd-model.js`
- `test/erd-extractor.test.js`
- `package.json`

Out of scope:

- Implementing JSON Schema extraction.
- Mutating Linear.
- Changing source or test implementation files.
- Running full implementation validation gates before implementation exists.

## Findings

### P1: Parser Diagnostics Were Not Actually Routed

Failure mode: the plan required deterministic diagnostics for remote, cross-file, unresolved, and unsupported JSON Schema references, but the current extractor only appends thrown parse errors. Parser-returned diagnostics would have been silently dropped without an explicit extractor-flow change.

Evidence:

- `src/schema/erd-extractor.js:342` calls the parser through `parseSchemaSource(source, content)`.
- `src/schema/erd-extractor.js:440` stores `const parsed = parseSchemaSource(source, content)`.
- `src/schema/erd-extractor.js:441` and `src/schema/erd-extractor.js:442` merge only `parsed.entities` and `parsed.relationships`.
- `src/schema/erd-extractor.js:482` and `src/schema/erd-extractor.js:484` append only `parseErrors`.

Impact: an implementation could pass entity/relationship tests while losing the operator diagnostics required by `FR-319-009`, `FR-319-012`, `FR-319-016`, and `SA-319-008`.

Patch applied: the plan and spec now include a parser return contract with optional `diagnostics` and explicitly require extractor-level merging of parser-returned diagnostics as non-fatal diagnostics.

Confidence after patch: high for planning; implementation still must prove it.

### P1: Parser Context Was Missing for Filename Fallback Naming

Failure mode: the spec requires root entity naming to fall back to the filename stem, but the current parser dispatch passes only file content. A JSON Schema parser cannot derive `manifest.schema.json -> manifest` without file context unless it reaches outward through globals or re-parses paths ad hoc.

Evidence:

- `src/schema/erd-extractor.js:342` defines `parseSchemaSource(source, content)`.
- `src/schema/erd-extractor.js:344` calls `parser(content)`.
- The spec requires filename fallback naming under its entity naming rules.

Impact: the implementation would either fail filename fallback behavior or introduce hidden coupling.

Patch applied: the plan and spec now require an internal parser dispatch context containing `absoluteFilePath`, `relativeFilePath`, and `rootPath`, while preserving the public `extractErdModel({ rootPath, ignore })` API.

Confidence after patch: high for planning; implementation still must wire it carefully for existing Prisma/SQL parsers.

### P2: Relationship Labels Were Implied but Not Supported by the Normalized Model

Failure mode: the first plan said to include labels from property names "where the current model supports it." The current model does not preserve relationship labels, and the Mermaid renderer labels relationships with provenance.

Evidence:

- `src/schema/erd-model.js:109` through `src/schema/erd-model.js:114` store only `fromEntity`, `toEntity`, `cardinality`, and `provenance`.
- `src/schema/erd-model.js:118` through `src/schema/erd-model.js:123` sort relationships without any label field.
- `src/schema/erd-model.js` renders relationships as provenance labels, not property labels.

Impact: a future implementation could waste effort widening the ERD model for a P0 requirement that does not need it, or write tests for data the model drops.

Patch applied: the plan and spec now forbid depending on labels in P0 unless a failing test proves they are necessary and the normalization/rendering contract is deliberately widened.

Confidence after patch: high.

### P2: No-Schema Diagnostic Would Become Stale After Source Registration

Failure mode: after adding `json-schema` to source discovery, the existing no-schema message would still say only `schema.prisma or .sql files`.

Evidence:

- `src/schema/erd-extractor.js:472` through `src/schema/erd-extractor.js:474` set `failed_no_schema` and emit the old message.

Impact: operator guidance would be wrong for a feature whose point is adding a third schema source kind.

Patch applied: the plan and spec now require updating the diagnostic to mention `schema.prisma`, `.sql`, and `.schema.json`, and require tests to catch stale guidance without overfitting the full sentence.

Confidence after patch: high.

### P2: CLI Smoke Command Needed to Avoid Mermaid CLI Rendering

Failure mode: the first plan's smoke command used `--output /private/tmp/diagram-cli-jsc-319-erd-smoke` with JSON format. In the current `generate` command, `--output` controls rendered file output and non-`.md`/`.mmd` outputs route through Mermaid CLI image rendering.

Evidence:

- `node src/diagram.js generate --help` reports `--output <file>` and `--format <type>`.
- `src/commands/generate.js` writes JSON to stdout when `--format json` and no output is provided.
- `src/commands/generate.js` routes non-`.md`/`.mmd` output through `runMermaidCli`.

Impact: the smoke could fail because of rendering dependencies rather than JSON Schema ERD behavior.

Patch applied: the plan and spec now use JSON stdout as the primary smoke command and keep `.mmd --force` as an optional file smoke.

Confidence after patch: high.

### P3: Attribute Type Semantics Needed More Precision

Failure mode: the first plan said to derive attribute types from JSON Schema `type`, `$ref`, `array`, or fallback `unknown`, but did not specify how mixed types, relationship refs, or arrays should appear in the existing normalized attribute model.

Evidence:

- `src/schema/erd-model.js` canonicalizes attribute types with `sanitizeToken`, so complex raw type strings are converted.
- `test/erd-extractor.test.js` currently asserts concrete normalized types for SQL cases.

Impact: implementation tests could become inconsistent or accidentally assert raw JSON Schema shapes that the model cannot preserve.

Patch applied: the plan and spec now include an attribute mapping table: scalar types preserve simple JSON Schema type names, `$ref` attributes use resolved target name or `ref`, arrays use `array`, unsupported/mixed shapes use `unknown`, and nullability remains governed by `required`.

Confidence after patch: medium-high; implementation may refine if tests reveal a clearer local convention.

## Patch Summary

| Problem | Plan Patch Applied | Expected Improvement |
| ------- | ------------------ | -------------------- |
| Parser diagnostics could be dropped | Added parser return contract and extractor diagnostic merge requirement | Prevents silent loss of unsupported-ref diagnostics |
| Parser lacked file context | Added internal parser dispatch context contract | Enables filename fallback naming without hidden coupling |
| Relationship labels not preserved | Removed label dependency and constrained any widening | Keeps P0 inside current ERD model |
| No-schema guidance stale | Added diagnostic update contract | Keeps operator guidance accurate |
| Smoke command could require Mermaid CLI | Replaced primary smoke with JSON stdout command | Tests ERD behavior instead of render dependencies |
| Attribute mapping under-specified | Added deterministic mapping table | Reduces implementation ambiguity and brittle tests |

## Residual Risks

| Risk | Status | Required Evidence |
| ---- | ------ | ----------------- |
| JSON Pointer resolver edge cases may still miss encoded paths | implementation-time risk | Focused tests for `~0` and `~1` pointers |
| Entity collisions may merge through `normalizeErdModel` | implementation-time risk | Fixture names must avoid accidental collisions unless collision behavior is intentionally tested |
| Parser diagnostics may be too brittle if tests assert whole prose strings | implementation-time risk | Tests should assert stable category tokens and key path fragments |
| Existing inferred relationship logic may mask missing explicit `$ref` relationships | implementation-time risk | Fixture must assert `provenance: explicit` and relationship pair/cardinality |
| Full repo health is unproven | validation gap | Run `npm test`, `npm run test:deep`, and `bash scripts/verify-work.sh --fast` after implementation |

## Implementation Readiness Verdict

Verdict: ready for `he-work`.

Confidence: 92%.

Why not higher:

- No implementation patch exists yet.
- Focused and baseline tests have not been run against JSON Schema behavior.
- CLI smoke cannot run until the fixture and parser exist.
- Runtime behavior remains unproven.

The plan is strong enough to execute because the remaining uncertainty is testable and bounded to the planned implementation surfaces.

## Validation Evidence

Checks run during plan review:

| Check | Result | Evidence |
| ----- | ------ | -------- |
| CLI command contract inspection | pass | `node src/diagram.js --help`; `node src/diagram.js generate --help` |
| Package script inspection | pass | `jq ".scripts" package.json` |
| Extractor source inspection | pass | `src/schema/erd-extractor.js` line-numbered reads |
| ERD model inspection | pass | `src/schema/erd-model.js` line-numbered reads |
| Existing test surface inspection | pass | `test/erd-extractor.test.js` read |
| Plan HE validators | pass | BLUF, artifact identity, and Linear traceability lint passed for the plan |
| Spec HE validators | pass | BLUF, artifact identity, and Linear traceability lint passed for the spec after adding Linear work-item sections |
| Repo fast verification | pass | `bash scripts/verify-work.sh --fast` |

Plan and spec validators were re-run after patching and are recorded in the closeout for this task.

## Traceability Matrix

| Review Finding | Source Requirement / Risk | Plan Area Patched |
| -------------- | ------------------------- | ----------------- |
| Parser diagnostics not routed | `FR-319-009`, `FR-319-012`, `FR-319-016`, `SA-319-008` | Detailed Implementation Contracts; `PU-319-002`; diagnostic taxonomy |
| Parser context missing | Entity naming contract; `FR-319-004` | Parser Dispatch Contract; `PU-319-003` |
| Relationship labels unsupported | Current `normalizeErdModel` contract | Relationship Contract; `PU-319-004` |
| No-schema diagnostic stale | `FR-319-011`; operator ergonomics | Existing Message Update Contract; `PU-319-001`; `PU-319-002` |
| Smoke command could require renderer | Validation reliability | Smoke Command Contract; validation tables |
| Attribute mapping under-specified | `FR-319-005`, `FR-319-006`, `FR-319-015` | Attribute Mapping Contract; `PU-319-003` |
