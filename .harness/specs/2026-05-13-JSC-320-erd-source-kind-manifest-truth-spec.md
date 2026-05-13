---
schema_version: 1
artifact_id: he-spec-jsc-320-erd-source-kind-manifest-truth
artifact_type: he-spec
harness_stage: he-spec
canonical_slug: jsc-320-erd-source-kind-manifest-truth
title: JSC-320 ERD Source-Kind and Manifest Truth Specification
status: ready_for_he_plan
date: 2026-05-13
origin: he-spec
spec_mode: standard-spec
spec_depth: full
risk: medium
ui_spec: false
accessibility_scope: operator_artifact_only
traceability_required: true
linear_parent: JSC-318
linear_issue: JSC-320
linear_issue_url: https://linear.app/jscraik/issue/JSC-320/jsc-318-p1-make-erd-source-kind-and-unavailable-state-truthful
linear_status: backlog
linear_downstream_issues:
  - JSC-321
linear_mutation_status: not_needed
linear_action_required: "None for this spec pass; live Linear JSC-320 exists under JSC-318 and this local spec does not mutate Linear."
source_linear_plan: .harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md
source_parent_spec: .harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md
spec_path: .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md
safe_to_continue: true
blocked_reason: ""
acceptance_ids:
  - SA-320-001
  - SA-320-002
  - SA-320-003
  - SA-320-004
  - SA-320-005
  - SA-320-006
  - SA-320-007
  - SA-320-008
  - SA-320-009
  - SA-320-010
handoff: he-plan
confidence: strong_candidate_with_validation_gaps
confidence_percent: 92
blackboard_delta: "JSC-320 is the additive manifest-truth slice after JSC-319: expose ERD source-kind, source evidence, and useful/degraded/unavailable state in ERD metadata and generate-all manifest entries without public CLI flag changes, manifest schema migration, JSC-321 context copy, YAML support, TypeScript extraction, or renderer rewrite."
---

# JSC-320 ERD Source-Kind and Manifest Truth Specification

## Table of Contents
- [Command Summary](#command-summary)
- [Status Block](#status-block)
- [Purpose](#purpose)
- [Problem Statement](#problem-statement)
- [User / Operator Scenarios](#user--operator-scenarios)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Current State / Evidence](#current-state--evidence)
- [Proposed Behavior](#proposed-behavior)
- [Requirements](#requirements)
- [Interfaces](#interfaces)
- [Data / Domain Contract](#data--domain-contract)
- [Security, Privacy, and Safety](#security-privacy-and-safety)
- [Accessibility and Operator Ergonomics](#accessibility-and-operator-ergonomics)
- [Failure and Recovery](#failure-and-recovery)
- [Validation Plan](#validation-plan)
- [Acceptance Criteria](#acceptance-criteria)
- [Visual References / Diagrams](#visual-references--diagrams)
- [Implementation Notes](#implementation-notes)
- [Open Questions](#open-questions)
- [Decision](#decision)
- [Evidence and References](#evidence-and-references)
- [Linear Work Item Contract](#linear-work-item-contract)
- [Linear Acceptance Traceability](#linear-acceptance-traceability)
- [Appendix A. Harness Metadata / Traceability](#appendix-a-harness-metadata--traceability)
- [Appendix B. Review Outcomes](#appendix-b-review-outcomes)
- [Appendix C. he-plan Handoff](#appendix-c-he-plan-handoff)

## Command Summary

BLUF: Plan JSC-320 as the narrow P1 artifact-truth slice that makes ERD source kind, source evidence, and useful/degraded/unavailable state explicit in generated metadata and `generate-all` manifest entries, because otherwise JSC-321 would have to infer operational truth from fragile Mermaid comments or placeholder heuristics; the main risk is accidentally turning this additive metadata slice into a breaking manifest schema migration.

Decision Needed: Admit this spec to `he-plan` for implementation planning after validating artifact shape and traceability. Stop for owner decision if implementation proves the required truth cannot be represented additively under existing manifest schema version `1.0`.

Top Risks: Smuggling a manifest schema migration into an additive metadata slice; treating `isPlaceholder` as the only availability signal; marking JSON Schema ERDs useful while no-source ERDs remain indistinguishable from normal generated diagrams; changing SQL/Prisma metadata compatibility.

Next Action: Build an `he-plan` for JSC-320 that starts with focused manifest tests for contract-heavy JSON Schema and no-source ERD cases, then adds the smallest metadata fields needed to make those tests pass.

## Status Block

| Field | Value |
| --- | --- |
| `interactive_status` | ready_for_plan |
| `selection_evidence` | Live `JSC-320` Linear issue; `.harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md`; JSC-319 local implementation proof; source review of ERD metadata and manifest writer |
| `route` | he-spec -> he-plan |
| `stage` | specification |
| `scope` | additive ERD metadata and generate-all manifest truth for useful/degraded/unavailable ERD states |
| `traceability` | JSC-318 parent; JSC-320 P1; JSC-319 prerequisite; JSC-321 downstream consumer |
| `validation` | BLUF, artifact shape, identity lint, Linear traceability lint; implementation validation defined below |
| `safe_to_continue` | true |
| `blocked_reason` | none |
| `linear_mutation_status` | not_needed |
| `linear_action_required` | none for this spec pass |
| `spec_path` | `.harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md` |
| `acceptance_ids` | `SA-320-001` through `SA-320-010` |
| `handoff` | he-plan |
| `confidence` | 92%; strong candidate with validation gaps because the spec is grounded in live Linear, local source evidence, and technical review, but implementation tests have not been written or run for JSC-320 |

## Purpose

This specification defines the JSC-320 behavior contract for truthful ERD metadata in `diagram-cli` generated artifacts.

JSC-319 proves JSON Schema can produce a logical ERD. JSC-320 makes generated artifact consumers able to tell whether an ERD is useful, degraded, or unavailable, which source kinds contributed to it, and which relative source paths support that conclusion. The output must stay compatible with existing machine-output consumers by adding metadata rather than changing command names, diagram files, top-level manifest schema, or public CLI flags.

## Problem Statement

`generate-all` can write an `erd.mmd` and a manifest entry even when the ERD has no supported source or is low-confidence. Today, consumers mainly infer usefulness through Mermaid placeholder text, `isPlaceholder`, and nested ERD metadata such as `terminalClass`, `schemaSources`, `sourcePrecedence`, and `confidence`.

That is too implicit for a contract-schema workflow. Agents and humans need a first-class, stable signal that distinguishes:

- useful ERD output from Prisma, SQL, JSON Schema, or mixed supported sources;
- degraded ERD output where extraction occurred but confidence is low or diagnostics matter;
- unavailable ERD output where no supported source exists or parsing produced no model.

Without this truth surface, downstream JSC-321 context guidance would have to scrape comments, inspect Mermaid text, or invent state from fragile heuristics.

## User / Operator Scenarios

1. Contract-heavy JSON Schema repository:
   - An operator runs `generate-all` against a repo whose useful ERD comes from `*.schema.json`.
   - The `erd` manifest entry explicitly reports that the ERD is useful and that `json-schema` contributed source evidence.

2. Existing database-backed repository:
   - An operator runs `generate-all` against a repo with Prisma or SQL schema sources.
   - Existing ERD output remains compatible, and additive metadata reports database source kinds without changing prior top-level manifest fields.

3. No supported ERD source:
   - An operator runs `generate-all` against a repo with no Prisma, SQL, or JSON Schema sources.
   - The `erd` manifest entry remains present because `generate-all` currently generates every supported diagram type, but its metadata explicitly reports unavailable state and no source kinds rather than pretending the diagram is useful.

4. Mixed supported sources:
   - A repository contains more than one supported ERD source kind.
   - Metadata reports all detected source kinds in precedence order and exposes a mixed-source state without changing parser precedence.

5. Downstream context generation:
   - JSC-321 can later consume the manifest metadata to write fallback guidance.
   - JSC-320 does not add or edit that guidance.

## Goals

- Add explicit ERD source-kind truth to ERD metadata and generated manifest entries.
- Add explicit source evidence that maps each contributed source kind to relative source paths.
- Add explicit ERD availability truth for useful, degraded, and unavailable states.
- Preserve the current `generate-all` manifest schema version unless a separate owner decision admits a migration.
- Ensure JSON Schema ERD output from the JSC-319 fixture is not classified as unavailable or placeholder.
- Ensure no-source ERD output remains visibly unavailable/degraded through metadata.
- Keep SQL/Prisma behavior compatible and regression-tested.
- Provide stable acceptance IDs and validation gates for implementation planning.

## Non-Goals

- JSC-321 agent-context fallback copy.
- YAML schema parsing.
- TypeScript contract extraction.
- Remote or cross-file JSON Schema `$ref` support.
- New public CLI flags or public config fields.
- Breaking `manifest.schemaVersion` changes.
- Removing `erd.mmd` generation from `generate-all`.
- Renderer rewrite or Mermaid syntax redesign.
- Closing JSC-318 parent issue.

## Current State / Evidence

| Evidence | Source | Spec impact |
| --- | --- | --- |
| Live Linear `JSC-320` exists under `JSC-318` with goal, scope, validation, and closeout evidence | Linear fetch `issue:JSC-320` on 2026-05-13 | Spec is tracked work and must align to additive metadata/non-breaking scope |
| Approved next slice is `JSC-320` | `.harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md` | This is the next spec target after JSC-319 proof |
| ERD artifact metadata currently includes `source`, `extractionInvoked`, `terminalClass`, `schemaSources`, `sourcePrecedence`, `compactEligible`, and `confidence` | `src/core/analysis-generation-diagrams-erd.js` | JSC-320 should extend this object rather than inventing a parallel manifest contract |
| `generate-all` passes diagram artifact metadata into `toManifestEntry` | `src/commands/generate-all.js` | Manifest entries can carry additive ERD truth under nested `metadata` |
| Manifest entries already include top-level `source`, `isPlaceholder`, `sourceHash`, size, token, purpose, and nested `metadata` | `src/core/analysis-generation-diagrams.js` | New truth should avoid breaking existing top-level fields |
| Missing ERD source produces `failed_no_schema` and diagnostic text including `.schema.json` | `src/schema/erd-extractor.js` after JSC-319 work | No-source state can be classified deterministically |
| Confidence returns `publishable`, `publishable_with_marker`, or `fail_confidence` | `src/schema/erd-confidence.js` | Availability mapping should reuse confidence and terminal class instead of duplicating heuristics |
| Existing generate-all test checks ERD metadata for Prisma fixture | `test/generate-output-json.test.js` | JSC-320 should extend generate-all manifest assertions |
| Existing parity test checks manifest sorting, schema version, and disk/stdout parity | `test/evidence-manifest-parity.test.js` | JSC-320 must preserve manifest writer semantics |
| JSC-319 fixture provides useful JSON Schema ERD output | `test/fixtures/erd/contract-schema-json/manifest.schema.json` and `test/erd-extractor.test.js` | Use this fixture for contract-heavy manifest proof |
| Current extractor exposes `sourceFiles` but not a source-kind-to-file mapping | `src/schema/erd-extractor.js` | JSC-320 must add structured source evidence or prove deterministic derivation in tests |

## Proposed Behavior

ERD generation MUST compute a compact availability summary from extraction result, source files, source kinds, diagnostics, and confidence. That summary MUST be included in ERD artifact metadata and therefore appear in `generate-all` manifest entries under the existing nested `metadata` object.

The proposed additive metadata shape is:

```json
{
  "metadata": {
    "source": "schema_extraction",
    "sourceKinds": ["json-schema"],
    "sourceKindSummary": "json-schema",
    "sourceFilesByKind": {
      "json-schema": ["manifest.schema.json"]
    },
    "availability": "useful",
    "availabilityReason": "completed_with_explicit_entities",
    "terminalClass": "completed",
    "schemaSources": ["manifest.schema.json"],
    "sourcePrecedence": ["prisma", "sql", "json-schema"],
    "confidence": {
      "outcome": "publishable"
    }
  }
}
```

The exact field names are binding for this spec unless implementation proof exposes a collision or a better local naming convention. If the implementation chooses different field names, the spec MUST be revised before planning proceeds.

Implementation MUST derive source-kind metadata from structured extractor evidence, not from Mermaid comments or manifest filenames. The preferred internal shape is `extraction.sourceFilesByKind`, a plain object keyed by supported source kind with sorted relative path arrays. If implementation derives source kinds directly from `sourceFiles`, tests MUST prove deterministic handling for `schema.prisma`, `.sql`, and `.schema.json` paths and the spec MUST be updated to document that derivation rule.

## Requirements

### Functional Requirements

| ID | Requirement | Validation |
| --- | --- | --- |
| FR-320-001 | ERD artifact metadata MUST include `sourceKinds`, an array of supported source-kind tokens that contributed parsed source files for the generated ERD. | Focused generate-all manifest test for Prisma/SQL and JSON Schema fixtures |
| FR-320-002 | ERD artifact metadata MUST include `sourceKindSummary`, with enum values `none`, `prisma`, `sql`, `json-schema`, or `mixed`. | Unit or manifest tests for single-source, no-source, and mixed-source cases |
| FR-320-003 | ERD artifact metadata MUST include `availability`, with enum values `useful`, `degraded`, or `unavailable`. | Manifest tests for JSON Schema useful and no-source unavailable cases |
| FR-320-004 | ERD artifact metadata MUST include `availabilityReason`, a stable machine-readable reason string derived from terminal class, confidence, and source evidence. | Assertion over manifest JSON |
| FR-320-005 | ERD artifact metadata MUST include `sourceFilesByKind`, a deterministic object whose keys are source-kind tokens and whose values are sorted relative source path arrays. | Unit and manifest assertions |
| FR-320-006 | `generate-all` manifest entries for `type: "erd"` MUST preserve the additive ERD metadata under the existing nested `metadata` field. | Disk/stdout manifest parity test |
| FR-320-007 | Contract-heavy JSON Schema fixture output MUST be classified as `availability: "useful"`, `sourceKinds: ["json-schema"]`, `sourceKindSummary: "json-schema"`, `sourceFilesByKind: {"json-schema": ["manifest.schema.json"]}`, and `isPlaceholder: false`. | Focused fixture generate-all command and test |
| FR-320-008 | No-source ERD output MUST be classified as `availability: "unavailable"`, `sourceKinds: []`, `sourceKindSummary: "none"`, `sourceFilesByKind: {}`, and MUST remain recognizable as a placeholder/degraded diagram through existing `isPlaceholder` behavior. | Focused no-source generate-all test |
| FR-320-009 | Low-confidence extracted ERDs MUST be classified as `availability: "degraded"` when extraction completed but confidence outcome is `publishable_with_marker`. | Unit test for confidence-to-availability mapping |
| FR-320-010 | SQL and Prisma source precedence, parser dispatch, and existing ERD output MUST remain compatible. | Existing ERD/generate-all tests |
| FR-320-011 | Implementation MUST NOT change public CLI command names, public flags, or `manifest.schemaVersion` for this slice. | Test assertions and diff review |
| FR-320-012 | Implementation MUST NOT add ERD-specific logic to the generic manifest writer except through already-supported metadata preservation. | Diff review and simplify review |

### Non-Functional Requirements

| ID | Requirement | Validation |
| --- | --- | --- |
| NFR-320-001 | Metadata fields MUST be deterministic under `--deterministic`. | Fixture command comparison or deterministic test |
| NFR-320-002 | Metadata MUST NOT include absolute local filesystem paths beyond existing manifest `rootPath` behavior. | Test fixture assertions and code review |
| NFR-320-003 | Metadata computation MUST be centralized in ERD artifact generation or a small ERD metadata helper, not duplicated across manifest writer and context-pack code. | Simplify/code review |
| NFR-320-004 | The change MUST be additive to existing machine-readable output. | Test and diff review |
| NFR-320-005 | Manifest truth MUST be readable by humans and agents without parsing Mermaid comments. | Manifest JSON assertion |

## Interfaces

### CLI Interface

No public CLI change is admitted by this spec.

The following commands are expected validation surfaces:

```bash
npm test -- test/evidence-manifest-parity.test.js test/erd-extractor.test.js
npm test -- test/generate-output-json.test.js test/evidence-manifest-parity.test.js test/erd-extractor.test.js
node src/diagram.js generate-all test/fixtures/erd/contract-schema-json --output-dir .diagram-jsc-320-contract --format json --deterministic --quiet
node src/diagram.js generate-all test/fixtures/erd/no-schema --output-dir .diagram-jsc-320-no-schema --format json --deterministic --quiet
```

### Manifest Interface

JSC-320 may add fields only inside `manifest.diagrams[].metadata` for the ERD entry, plus any already-derived top-level values that continue to exist today.

The ERD manifest entry MUST remain compatible with this existing shape:

```json
{
  "type": "erd",
  "file": "erd.mmd",
  "purpose": "schema_entity_relationships",
  "source": "schema_extraction",
  "isPlaceholder": false,
  "metadata": {}
}
```

The generic manifest writer contract remains:

- `toManifestEntry` MAY keep copying any metadata object supplied by the diagram artifact.
- `toManifestEntry` MUST NOT classify ERD availability itself.
- `toManifestEntry` MUST NOT inspect ERD terminal classes, confidence outcomes, or schema source paths.
- ERD-specific source-kind and availability truth MUST be complete before the manifest writer receives the ERD artifact metadata.

## Data / Domain Contract

### Source Kind Tokens

| Token | Meaning | Source evidence |
| --- | --- | --- |
| `prisma` | At least one parsed `schema.prisma` source contributed to the ERD model | `src/schema/erd-extractor.js` source precedence and source files |
| `sql` | At least one parsed `.sql` source contributed to the ERD model | `src/schema/erd-extractor.js` source precedence and source files |
| `json-schema` | At least one parsed `*.schema.json` source contributed to the ERD model | JSC-319 parser and fixture |

Unknown source kinds are not admitted in JSC-320. Future source kinds MUST update this contract, tests, and acceptance criteria.

### Source Kind Summary

| Value | Rule |
| --- | --- |
| `none` | `sourceKinds` is empty |
| `prisma` | only `prisma` contributed |
| `sql` | only `sql` contributed |
| `json-schema` | only `json-schema` contributed |
| `mixed` | more than one supported source kind contributed |

### Source Files by Kind

`sourceFilesByKind` MUST be a JSON object with no prototype-sensitive semantics. It MUST be safe to serialize with `JSON.stringify`.

Conformance rules:

- Keys MUST be supported source kind tokens.
- Values MUST be sorted arrays of relative source paths.
- Empty or unknown source kinds MUST be omitted.
- No-source output MUST use `{}`.
- The top-level `schemaSources` array MUST remain for compatibility and SHOULD remain a sorted relative path list matching the union of `sourceFilesByKind` values.

### Availability Mapping

| Availability | Rule | Example |
| --- | --- | --- |
| `useful` | extraction completed, at least one explicit entity exists, confidence outcome is `publishable`, and source kind is not empty | JSC-319 JSON Schema fixture |
| `degraded` | extraction completed and confidence outcome is `publishable_with_marker`, or extraction completed with explicit source evidence but implementation can prove a non-fatal trust downgrade reason | Inferred-heavy ERD |
| `unavailable` | no supported source, parse failure with no entities, or confidence outcome is `fail_confidence` because no explicit entity exists | no-schema fixture |

The mapping MUST use existing `terminalClass` and confidence outcomes where possible. It MUST NOT infer availability by scraping Mermaid comments when structured extraction/confidence data is available. Parser diagnostics alone MUST NOT downgrade `useful` to `degraded` unless the implementation adds and tests a stable non-fatal downgrade reason.

### Availability Reason Values

Implementation SHOULD use stable, lower-case snake-case reason tokens. Minimum required reasons:

- `completed_with_explicit_entities`
- `completed_low_confidence`
- `failed_no_schema`
- `failed_parse`
- `failed_confidence`

Additional reasons are allowed only when tests assert them and they remain source-backed.

### Unknown-Field and Compatibility Rules

- Existing consumers MUST be able to ignore the new nested metadata fields.
- JSC-320 MUST NOT remove or rename existing metadata fields.
- JSC-320 MUST NOT change `manifest.schemaVersion` unless the work stops for owner approval and this spec is revised.
- If implementation proves top-level manifest fields must change, the plan MUST stop and request a spec-owner decision.
- Metadata field order MUST NOT be a semantic contract; tests SHOULD assert values rather than serialized object ordering.

## Security, Privacy, and Safety

- Metadata MUST NOT include secrets, file contents, or fetched remote reference data.
- Metadata MUST NOT introduce network access.
- Metadata MUST use relative schema source paths already exposed by ERD metadata, not absolute source file paths.
- Error and availability reason values MUST be stable and non-sensitive enough to publish in CI artifacts.
- This is not an authentication or authorization surface.

## Accessibility and Operator Ergonomics

This is an operator-artifact spec rather than a UI spec. Accessibility applies to generated text/JSON readability:

- Status values MUST NOT rely on color.
- Metadata names SHOULD be plain English enough for humans and agents to interpret without reading source code.
- Availability states MUST be represented as text enum values, not only Mermaid comments.
- Validation evidence SHOULD include compact manifest snippets so reviewers can inspect output without opening large generated artifacts.

## Failure and Recovery

| Failure Mode | Required Behavior | Recovery / Rollback |
| --- | --- | --- |
| Required truth requires manifest schema migration | Stop before implementation closeout; revise spec and obtain owner approval | Keep current manifest behavior; do not ship partial migration |
| JSON Schema fixture classified as placeholder/unavailable | Treat as implementation failure | Fix availability mapping or JSC-319 source evidence before proceeding |
| No-source fixture classified as useful | Treat as implementation failure | Fix terminal/confidence mapping and placeholder detection |
| SQL/Prisma fixture metadata changes incompatibly | Treat as regression | Revert metadata change or add compatibility wrapper |
| Context-pack copy changes during JSC-320 | Treat as scope violation | Revert context-pack changes and defer to JSC-321 |
| Source kind is guessed incorrectly from a relative path | Treat as implementation failure | Move source-kind evidence into extractor output or add a tested deterministic derivation helper |

Rollback for JSC-320 is removal of additive metadata fields and focused tests for those fields. The rollback MUST preserve JSC-319 JSON Schema extraction unless the active failure is proven to originate there.

## Validation Plan

| Gate | Command / Check | Expected Result | Notes |
| --- | --- | --- | --- |
| Spec BLUF | `python3 /Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/scripts/check_bluf_structure.py .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md --json` | pass | Required before handoff |
| Spec artifact shape | `python3 /Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/scripts/check_generated_artifact_shape.py .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md --kind spec --json` | pass | Required before handoff |
| Artifact identity | `python3 /Users/jamiecraik/dev/agent-skills/Infrastructure/scripts/validation-and-linting/he_artifact_identity_lint.py .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md` | pass | Required before handoff |
| Linear traceability | `python3 /Users/jamiecraik/dev/agent-skills/Infrastructure/scripts/validation-and-linting/he_linear_traceability_lint.py .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md` | pass | Required before handoff |
| Focused implementation tests | `npm test -- test/evidence-manifest-parity.test.js test/erd-extractor.test.js` | pass | Linear issue minimum |
| ERD manifest regression tests | `npm test -- test/generate-output-json.test.js test/evidence-manifest-parity.test.js test/erd-extractor.test.js` | pass | Recommended focused suite |
| Source-kind helper tests | Add focused assertions in `test/erd-extractor.test.js`, `test/generate-output-json.test.js`, or a dedicated ERD metadata test | pass | Must prove `sourceFilesByKind`, no-source `{}`, and mixed source-kind behavior |
| Full test suite | `npm test` | pass | Required before implementation closeout |
| Deep regression | `npm run test:deep` | pass | Required before implementation closeout |
| Fast repo verification | `bash scripts/verify-work.sh --fast` | pass or blocked with exact reason | Required before implementation closeout |
| Contract fixture smoke | `node src/diagram.js generate-all test/fixtures/erd/contract-schema-json --output-dir .diagram-jsc-320-contract --format json --deterministic --quiet` | pass | Must show useful JSON Schema ERD metadata |
| No-source fixture smoke | `node src/diagram.js generate-all test/fixtures/erd/no-schema --output-dir .diagram-jsc-320-no-schema --format json --deterministic --quiet` | pass | Must show unavailable ERD metadata |

Passing spec validators does not prove implementation correctness. Implementation closeout requires the implementation gates above.

## Acceptance Criteria

| ID | Acceptance Criteria | Evidence Required |
| --- | --- | --- |
| SA-320-001 | Live `JSC-320` remains the owning issue and the spec stays bounded to P1 metadata/manifest truth. | Spec frontmatter and Linear traceability lint |
| SA-320-002 | Contract-heavy JSON Schema generate-all output has an ERD manifest entry with `metadata.sourceKinds: ["json-schema"]`, `metadata.sourceKindSummary: "json-schema"`, `metadata.sourceFilesByKind: {"json-schema": ["manifest.schema.json"]}`, and `metadata.availability: "useful"`. | Focused test and smoke command output |
| SA-320-003 | Contract-heavy JSON Schema ERD manifest entry has `isPlaceholder: false`. | Manifest assertion |
| SA-320-004 | No-source generate-all output has an ERD manifest entry with `metadata.sourceKinds: []`, `metadata.sourceKindSummary: "none"`, `metadata.sourceFilesByKind: {}`, and `metadata.availability: "unavailable"`. | Focused test and smoke command output |
| SA-320-005 | Existing SQL/Prisma ERD metadata behavior remains compatible and tests continue to pass. | Existing ERD/generate-all tests |
| SA-320-006 | No public CLI flags, command names, or `manifest.schemaVersion` changes are made. | Diff review and tests |
| SA-320-007 | JSC-321 context-pack guidance is not modified in this slice. | Diff review |
| SA-320-008 | Closeout records manifest snippets or artifact paths showing useful JSON Schema and unavailable no-source ERD truth. | Evaluation or implementation report |
| SA-320-009 | Mixed-source behavior is tested at helper or fixture level and produces `sourceKindSummary: "mixed"` with all contributing source kinds sorted by source precedence. | Unit or fixture test |
| SA-320-010 | The generic manifest writer remains ERD-agnostic and only preserves metadata supplied by the diagram artifact. | Diff review and simplify review |

## Visual References / Diagrams

The diagram below is normative only for state flow. Text requirements above are authoritative if they conflict.

```mermaid
flowchart LR
  Source["ERD source discovery"]
  Extract["extractErdModel terminalClass + source evidence"]
  Confidence["evaluateErdConfidence"]
  Metadata["ERD metadata sourceKinds + availability"]
  Manifest["generate-all manifest diagrams[].metadata"]
  Context["JSC-321 context fallback"]

  Source --> Extract
  Extract --> Confidence
  Extract --> Metadata
  Confidence --> Metadata
  Metadata --> Manifest
  Manifest -. downstream only .-> Context
```

Do / Do Not boundary:

| Do | Do Not |
| --- | --- |
| Add structured metadata under existing ERD metadata | Parse Mermaid comments or output filenames for truth |
| Keep manifest schema version stable | Migrate manifest schema without approval |
| Use JSC-319 fixture for JSON Schema proof | Expand into YAML or TypeScript |
| Keep no-source state visibly unavailable | Mark any generated `erd.mmd` as useful just because a file exists |

## Implementation Notes

- Prefer a small helper near `buildErdMetadata` to compute source kinds, source-kind summary, source files by kind, availability, and availability reason.
- Source kind detection should derive from parsed source files and known source patterns or from extractor-provided structured data. Prefer updating `extractErdModel` to expose `sourceFilesByKind` so artifact metadata does not guess from comments or generated filenames.
- Keep `toManifestEntry` generic. It should continue copying metadata; ERD-specific truth belongs in ERD artifact generation or extractor output.
- Tests should assert JSON payloads rather than relying on visual Mermaid rendering.
- Use fixture-local `.diagram-jsc-320-*` smoke output directories and remove them after evidence capture; this CLI rejects absolute output directories as traversal.
- Stop and update this spec before adding top-level manifest fields, context guidance, or config.

## Open Questions

| Question | Status | Resolution Path |
| --- | --- | --- |
| Should `failed_parse` with some parser diagnostics but no entities be `unavailable` or `degraded`? | resolved for JSC-320 | Classify as `unavailable`; a future partial-parse spec can add a separate state if needed |
| Should parser diagnostics alone downgrade `useful` to `degraded`? | resolved for JSC-320 | No; only downgrade when confidence or terminal class requires it unless implementation adds a tested stable non-fatal downgrade reason |
| Should future YAML/TypeScript source kinds share the same enum field? | inferred yes | Future specs must update the enum and tests |

## Decision

Proceed to `he-plan` for JSC-320 with this spec as the behavior contract. The implementation must be additive, metadata-focused, and validated through focused manifest tests before full regression gates.

## Evidence and References

| Evidence | Classification | Detail |
| --- | --- | --- |
| Live Linear `JSC-320` fetched on 2026-05-13 | verified | Backlog, High, parent `JSC-318`, project `Diagram product surface and analysis workflow` |
| `.harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md` | verified | Approved next slice queue selects `JSC-320` |
| `.harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md` | verified | JSC-319 scope excludes manifest truth and context fallback |
| `src/core/analysis-generation-diagrams-erd.js` | verified | Current ERD metadata builder |
| `src/commands/generate-all.js` | verified | Passes diagram metadata into manifest entry |
| `src/core/analysis-generation-diagrams.js` | verified | Manifest entry shape and placeholder detection |
| `src/schema/erd-extractor.js` | verified | Current source precedence includes `json-schema`; terminal classes and `sourceFiles` exist; source-kind-to-file mapping is not yet explicit |
| `src/schema/erd-confidence.js` | verified | Confidence outcomes available for availability mapping |
| `test/evidence-manifest-parity.test.js` | verified | Manifest disk/stdout parity test surface |
| `test/generate-output-json.test.js` | verified | Existing ERD generate-all metadata assertions |

## Linear Work Item Contract

| Field | Value |
| --- | --- |
| Parent issue | `JSC-318` |
| Owning issue | `JSC-320` |
| Owning issue title | `JSC-318 P1: Make ERD source-kind and unavailable state truthful` |
| Owning issue status | Backlog |
| Owning issue priority | High |
| Owning issue project | Diagram product surface and analysis workflow |
| Owning issue URL | `https://linear.app/jscraik/issue/JSC-320/jsc-318-p1-make-erd-source-kind-and-unavailable-state-truthful` |
| Prerequisite issue | `JSC-319` |
| Downstream issue | `JSC-321` |
| Closure rule | `JSC-320` is not complete until manifest snippets or artifact paths prove useful JSON Schema ERD metadata, source-kind source evidence, no-source unavailable metadata, and SQL/Prisma compatibility |
| External mutation status | No Linear mutation was performed by this spec pass |

## Linear Acceptance Traceability

| Linear issue | Source acceptance | Acceptance IDs | Validation evidence |
| --- | --- | --- | --- |
| `JSC-318` | Parent requires useful contract-schema ERD, truthful manifest/degraded state, and context fallback guidance | `SA-320-001` through `SA-320-010` cover the P1 truth slice only | Parent closure remains blocked until JSC-319/JSC-320/JSC-321 evidence exists |
| `JSC-319` | JSON Schema logical ERD extraction proof | prerequisite for `SA-320-002` and `SA-320-003` | Existing local JSC-319 fixture/test evidence; not reimplemented here |
| `JSC-320` | Source-kind metadata; source evidence; useful/degraded/unavailable manifest truth; additive compatibility | `SA-320-001` through `SA-320-010` | Required implementation validation in this spec |
| `JSC-321` | Context-pack unavailable ERD fallback guidance | explicitly out of scope via `SA-320-007` | Must wait for JSC-320 metadata contract |

## Appendix A. Harness Metadata / Traceability

| Field | Value |
| --- | --- |
| Parent issue | `JSC-318` |
| Owning issue | `JSC-320` |
| Prerequisite | JSC-319 local JSON Schema ERD proof |
| Downstream issue | `JSC-321` context fallback guidance |
| Source plan | `.harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md` |
| Related refactor | `.harness/refactors/2026-05-12-JSC-318-contract-schema-erd-refactor.md` |
| Expected plan path | `.harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md` |

## Appendix B. Review Outcomes

| Check | Result | Evidence |
| --- | --- | --- |
| Canonical source clear | pass | Live Linear `JSC-320` plus approved local Linear plan |
| Scope bounded | pass | Non-goals exclude JSC-321, YAML, TypeScript, CLI/config changes, and schema migration |
| Spec/Linear alignment | pass | Linear goal/scope/validation mapped into FR/SA gates |
| Technical review depth | pass | Spec now requires source-kind source evidence, ERD-agnostic manifest writer boundary, and deterministic availability rules |
| Accessibility considered | pass | Operator-artifact readability requirements included |
| Security/privacy considered | pass | No network, secret, or absolute-path expansion admitted |
| Implementation correctness | blocked | Requires JSC-320 implementation and tests |
| Runtime validation | blocked | Requires implementation before smoke outputs can prove new fields |

## Appendix C. he-plan Handoff

```yaml
schema_version: 1
selected_stage: he-plan
source_spec: .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md
owning_issue: JSC-320
parent_issue: JSC-318
target_plan_path: .harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md
must_include_acceptance_ids:
  - SA-320-001
  - SA-320-002
  - SA-320-003
  - SA-320-004
  - SA-320-005
  - SA-320-006
  - SA-320-007
  - SA-320-008
  - SA-320-009
  - SA-320-010
must_validate:
  - npm test -- test/evidence-manifest-parity.test.js test/erd-extractor.test.js
  - npm test -- test/generate-output-json.test.js test/evidence-manifest-parity.test.js test/erd-extractor.test.js
  - npm test
  - npm run test:deep
  - bash scripts/verify-work.sh --fast
  - node src/diagram.js generate-all test/fixtures/erd/contract-schema-json --output-dir .diagram-jsc-320-contract --format json --deterministic --quiet
  - node src/diagram.js generate-all test/fixtures/erd/no-schema --output-dir .diagram-jsc-320-no-schema --format json --deterministic --quiet
must_prove:
  - sourceFilesByKind is structured and deterministic
  - sourceKindSummary mixed is tested
  - no-source state uses sourceFilesByKind {}
  - toManifestEntry remains ERD-agnostic
must_not_include:
  - JSC-321 context fallback copy
  - YAML schema parsing
  - TypeScript contract extraction
  - public CLI flag changes
  - manifest schema migration without owner approval
  - renderer rewrite
stop_if:
  - additive metadata cannot represent required truth
  - implementation needs top-level manifest schema changes
  - JSC-319 local proof is challenged
  - tests require weakening placeholder detection
```
