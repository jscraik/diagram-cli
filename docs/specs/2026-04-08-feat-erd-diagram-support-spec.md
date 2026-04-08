---
title: ERD Diagram Support for Schema-Aware Onboarding
type: feat
status: draft
date: 2026-04-08
origin: docs/brainstorms/2026-04-08-erd-diagram-support-requirements.md
risk: medium
spec_depth: lite
ui_required: false
deepened: 2026-04-08
---

# ERD Diagram Support Spec

## Enhancement Summary

**Deepened on:** 2026-04-08  
**Mode:** targeted-confidence  
**Key areas improved:** lifecycle contract, boundary trust rules, failure precedence, observability gates, acceptance precision

- Added explicit ERD lifecycle states and transition guards.
- Tightened provenance and trust-boundary rules between explicit and inferred schema evidence.
- Defined fail-safe precedence and operator-facing diagnostics expectations.
- Strengthened observability with contract-level run signals and readiness checks.
- Extended acceptance matrix with additional operational/failure coverage while preserving existing `SA` IDs.

## Problem Statement

`diagram-cli` currently supports a `database` diagram type that describes data-related operational flow, but it does not provide a structural entity-relationship contract for onboarding and schema comprehension. Teams onboarding into relational systems need a first-class ERD artifact showing entities, keys, and cardinality without replacing existing flow-oriented views.

## Goals

- Add a new `erd` diagram type that models relational structure in Mermaid `erDiagram` syntax.
- Preserve existing `database` diagram behavior and semantics.
- Ensure ERD output communicates trust level (explicit schema-derived vs inferred).
- Produce deterministic, actionable behavior when schema evidence is missing or insufficient.

## Non-Goals

- Replacing or redefining current `database` diagram output.
- Shipping a broad non-relational data-model visualization framework in this iteration.
- Defining implementation task sequencing, parser internals, or migration steps (planning scope).

## System Boundary

In scope:
- `diagram generate --type erd` contract and adjacent generate-family behavior where type lists or docs are surfaced.
- ERD model extraction from repository schema evidence.
- Mermaid ERD rendering contract, including key and relationship semantics.
- Failure and fallback behavior for low-confidence schema extraction.

Out of scope:
- Any runtime behavior change to existing non-ERD diagram types.
- UI-specific artifacts, routes, or design-system work.
- External services or network-dependent schema enrichment.

## Core Domain Model

- **Entity**: Logical relational object represented in ERD output.
  - Fields: `name`, `attributes[]`, `source`, `confidence`.
- **Attribute**: Entity field metadata.
  - Fields: `name`, `type`, `key_flags` (`PK`, `FK`, `UK`), `nullable`.
- **Relationship**: Directed or bidirectional link between two entities.
  - Fields: `from_entity`, `to_entity`, `cardinality`, `provenance`, `confidence`.
- **Provenance**:
  - `explicit`: extracted from authoritative schema definition.
  - `inferred`: deduced heuristically from code/symbol patterns where explicit relation is absent.
- **ERD Output Contract**: Mermaid `erDiagram` text generated from entities + relationships and suitable for existing validate/render flows.

## Main Flow / Lifecycle

1. User invokes generation with `--type erd`.
2. CLI resolves root path and runs normal analysis pipeline entrypoint.
3. ERD extractor gathers schema evidence within configured analysis bounds.
4. Extracted entities and relationships are normalized into the ERD domain model.
5. Renderer emits Mermaid `erDiagram` source with entity blocks and relation lines.
6. Existing output pipeline handles:
   - text/json output modes
   - optional validation
   - optional file rendering/export
   - manifest metadata generation
7. If confidence policy resolves to `fail_confidence`, command exits with actionable diagnostics (rather than fabricated ERD structure).

Confidence decision contract:
- **Emit (pass)** when entity extraction is valid and at least one explicit relationship exists, or when schema evidence is explicit and confidence policy marks the model as publishable.
- **Emit with explicit low-confidence marker** when output is still contract-valid but includes inferred relationships that do not cross hard-fail limits.
- **Fail safely** when schema evidence is missing, structural extraction fails, or inference share crosses hard-fail policy.
- Confidence outcomes must be deterministic for the same repository snapshot and options.

Confidence policy definition (normative):
- Policy outcomes are exactly one of: `publishable`, `publishable_with_marker`, `fail_confidence`.
- Derived terms:
  - `entity_count`: number of normalized entities.
  - `explicit_entity_count`: entities sourced from explicit schema evidence.
  - `relationship_count`: number of normalized relationships.
  - `inferred_relationship_count`: relationships whose provenance is `inferred`.
  - `inference_share`: `inferred_relationship_count / relationship_count` when `relationship_count > 0`, else `0`.
- Decision rules:
  - `publishable` when `entity_count > 0`, `explicit_entity_count > 0`, and (`relationship_count == 0` or `inference_share <= 0.5`).
  - `publishable_with_marker` when `entity_count > 0`, `explicit_entity_count > 0`, `relationship_count > 0`, and `0.5 < inference_share <= 0.8`.
  - `fail_confidence` when `entity_count == 0`, or `explicit_entity_count == 0`, or (`relationship_count > 0` and `inference_share > 0.8`).
- Outcome mapping:
  - `publishable` -> Emit (pass)
  - `publishable_with_marker` -> Emit with explicit low-confidence marker
  - `fail_confidence` -> Fail safely

Lifecycle state model:
- `requested` -> `analyzing` -> `extracting_schema` -> `normalizing_model` -> `rendering_erd` -> `finalizing_output`
- terminal states: `completed`, `failed_no_schema`, `failed_low_confidence`, `failed_parse`, `failed_render`

Transition guards:
- `extracting_schema` may proceed only with at least one candidate schema source in analysis scope.
- `normalizing_model` may proceed only when entities can be formed with non-empty names and attribute sets.
- `rendering_erd` may proceed only when relationship provenance is assigned for each emitted relation.
- `finalizing_output` may proceed only when selected output mode requirements are satisfied (text/json/file render path).

## Interfaces and Dependencies

- **CLI interface**
  - Extend accepted values for `generate --type` to include `erd`.
  - Update help and docs where diagram types are enumerated.
- **Generator dispatch interface**
  - Extend generation switch to route `type=erd` to ERD generator.
- **Analyzer dependency**
  - Reuse existing repo scan boundaries (`root`, `max-files`, excludes).
  - Add ERD extraction pass for schema-aware evidence collection.
  - Treat schema-source evidence as the authority boundary for explicit ERD facts.
- **Output dependencies**
  - Reuse current Mermaid validation and rendering path.
  - Reuse current JSON/text output contract patterns and artifact write behavior.

Trust-boundary rules:
- Explicit schema declarations are authoritative for relationship facts and key semantics.
- Heuristic inference may supplement missing links, but inferred relationships must remain explicitly marked.
- If inferred relationships dominate and explicit evidence is below confidence policy, fail safely instead of emitting a deceptively complete ERD.

## Invariants / Safety Requirements

- Existing `database` output remains behavior-flow focused and unchanged.
- ERD output never presents inferred relationships as explicit facts.
- ERD rendering must be deterministic for the same input repo snapshot and options.
- Missing or ambiguous schema evidence must produce transparent diagnostics, not silent best-guess topology.
- Existing command safety and file-write safeguards (`--force`, output-path checks) remain intact.

## Failure Model and Recovery

Failure classes:
- **No schema evidence found**: return clear message with next steps (where ERD expects schema evidence and how to proceed).
- **Partial schema evidence**: emit ERD only when confidence policy resolves to `publishable` or `publishable_with_marker`; otherwise fail with provenance summary.
- **Parser/extraction error**: return bounded error explaining source file and parse failure context.
- **Mermaid validation/render failure**: preserve current validation and render failure behavior.

Failure precedence:
1. Extraction-stage failures: no schema evidence or parser/extraction structural error (hard failure)
2. Confidence-policy failure after normalization (hard failure)
3. Render/validation failure after successful model normalization (hard failure for render outputs; surfaced warning/error in text paths per existing validation policy)

Terminal-class rule:
- Every failed run resolves to exactly one dominant terminal class aligned to the earliest failing lifecycle stage.

Recovery expectations:
- Users can retry with narrower focus, adjusted scope, or explicit schema sources.
- Failures must include enough context to diagnose whether issue is source absence, ambiguity, or parse/render breakage.
- Failure output includes provenance counts and dominant failure reason so operators can distinguish data-absence from parser limitations.

## Observability

Minimum observable signals for ERD runs:
- whether ERD extraction path was invoked
- entity and relationship counts
- provenance counts (`explicit`, `inferred`)
- confidence/fallback status used in decision to emit or fail
- placeholder/failure classification in artifact metadata where applicable

Signals must be available via existing CLI output and/or generated artifacts consistent with current `diagram-cli` observability conventions.

Readiness gates for planning and operations:
- A run is "contract-healthy" when entity count > 0 and provenance accounting is complete.
- `relationship_count == 0` is valid when schema evidence indicates a legitimately isolated or single-entity model.
- A run is "diagnostic-complete" only when failures include source-context and recommended next action.
- Repeated runs against unchanged input should preserve counts and terminal classification (determinism signal).

## Acceptance and Test Matrix

- **SA1**: `generate --type erd` is accepted by CLI, dispatched to ERD generator, and documented in command help and diagram-type docs.
- **SA2**: ERD output uses Mermaid `erDiagram` syntax and includes entities, attributes, and cardinality relationships for supported schema evidence.
- **SA3**: Key semantics (`PK`, `FK`, `UK`) appear in ERD output when source evidence exists, without inventing unavailable key metadata.
- **SA4**: Existing `database` type output remains unchanged for equivalent repo snapshots and options.
- **SA5**: Provenance contract is enforced: inferred relationships are labeled and never merged indistinguishably with explicit relationships.
- **SA6**: When confidence policy resolves to `fail_confidence` (or no schema evidence exists), command fails safely with actionable diagnostics instead of misleading diagram output.
- **SA7**: ERD mode participates in existing validate/render/output paths without regressions to non-ERD modes.
- **SA8**: ERD generation is deterministic across repeated runs against identical inputs.
- **SA9**: Lifecycle transitions respect guard rules (no rendering without normalized model and relation provenance assignment).
- **SA10**: Failure precedence is stable and yields a single dominant terminal failure class with actionable diagnostics.
- **SA11**: Observability includes provenance counts and terminal-state classification for both successful and failed ERD runs.
- **SA12**: Inference-heavy scenarios do not silently degrade trust; either provenance is explicit in output or the run fails per confidence policy.
- **SA13**: Confidence policy classification is deterministic and resolves to exactly one of `publishable`, `publishable_with_marker`, or `fail_confidence`.

## Open Questions

- Which schema-source families are in v1 support scope versus explicitly deferred?
- Should provenance/confidence appear inline in Mermaid comments, companion metadata, or both?

## Definition of Done

- Spec-approved ERD contract exists and is accepted as planning source.
- Acceptance matrix (`SA1`-`SA13`) is traceable into `ce-plan` tasks.
- Mode and metadata are complete (`standard-spec`, `spec_depth: lite`, `ui_required: false`).
- Handoff confirms this spec is the canonical source for implementation planning.
