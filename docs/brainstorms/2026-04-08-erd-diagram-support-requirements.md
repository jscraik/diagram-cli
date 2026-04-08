---
schema_version: 1
title: ERD Diagram Support for Schema-Aware Onboarding
date: 2026-04-08
status: proposed
spec_required: lite
risk_level: medium
complexity: medium
---

# ERD Diagram Support Requirements

## Table of Contents

- [Brainstorm Summary](#brainstorm-summary)
- [Problem Frame](#problem-frame)
- [Approaches Considered](#approaches-considered)
- [Recommendation](#recommendation)
- [Key Decisions and Rationale](#key-decisions-and-rationale)
- [Requirements](#requirements)
- [Success Criteria](#success-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Questions](#questions)
- [Next Stage](#next-stage)

## Brainstorm Summary

Add a dedicated `erd` diagram capability to `diagram-cli` so users can inspect relational structure (entities, fields, keys, and relationships) during onboarding without replacing the existing behavior-oriented `database` diagram.

The intended value is faster comprehension of data shape and ownership boundaries for schema-heavy repositories while preserving the current flow/operations perspective already provided by `database` mode.

## Problem Frame

`diagram-cli` currently provides a useful database-oriented flowchart view, but it does not produce a structural entity-relationship map from schema definitions.

That creates an onboarding gap:
- users can see where data operations happen
- users cannot quickly see canonical table/entity structure, key constraints, or relationship cardinality in one artifact

## Approaches Considered

### Approach A: Keep Current Behavior (Do Nothing)

Keep `database` mode as-is and avoid ERD support in this cycle.

Pros:
- no new maintenance surface
- no parser/source-compatibility risk

Cons:
- onboarding remains slower for schema-centric systems
- users still need manual schema walkthroughs or external tooling

Best fit:
- repositories where relational structure is not central

### Approach B: Add Explicit Schema-Driven `erd` Mode (Recommended)

Add a new diagram type focused on structural data modeling and generate Mermaid `erDiagram` output from explicit schema sources.

Pros:
- direct answer to onboarding pain point
- clean separation from existing `database` behavior flow diagram
- output aligns with common ERD mental model

Cons:
- introduces source coverage decisions and parser scope boundaries
- requires careful confidence/provenance communication

Best fit:
- repos where relational model understanding is frequent and high leverage

### Approach C: Add Inference-Heavy ERD Without Strong Schema Source Requirement

Generate ERD-like output primarily from code heuristics (names/imports/queries) when explicit schemas are unavailable.

Pros:
- potentially broader repo coverage in the short term

Cons:
- higher risk of incorrect relationships
- lower trust for onboarding decisions
- higher support burden for false positives

Best fit:
- exploratory analysis where accuracy is less critical than broad hints

## Recommendation

Choose **Approach B** with a conservative trust posture:
- introduce `erd` as a separate type
- prioritize explicit schema-derived relationships
- label provenance and confidence clearly when anything is inferred

This keeps the current product value intact while adding high-signal structural context for onboarding.

## Key Decisions and Rationale

- Keep `database` mode unchanged so existing behavior-focused workflows are stable.
- Add a separate `erd` mode so users can intentionally choose structure modeling versus data-operation flow.
- Treat explicit schema facts as highest trust and label inferred relationships to avoid misleading onboarding output.

## Requirements

- **R1**: Provide a new `erd` diagram type that is distinct from the existing `database` type.
- **R2**: ERD output must represent entities, attributes, and relationship cardinality in Mermaid `erDiagram` syntax.
- **R3**: ERD output must include key semantics where available (for example primary key, foreign key, unique).
- **R4**: Output must preserve trust by distinguishing explicit schema-derived relationships from inferred relationships.
- **R5**: Existing `database` diagram behavior and semantics must remain unchanged.
- **R6**: CLI and docs must make the difference between behavior-flow (`database`) and structure-model (`erd`) explicit.
- **R7**: When ERD cannot be confidently produced, output must fail safely with actionable guidance rather than silently fabricating structure.

## Success Criteria

- New users can identify core entities and major relationships from one ERD artifact without reading raw schema files first.
- Teams can use `erd` output alongside current `database` flow output without ambiguity about purpose.
- ERD generation does not regress existing diagram modes or validation workflows.
- Confidence/provenance cues are understandable enough that reviewers can tell what is authoritative versus inferred.

## Scope Boundaries

In scope:
- a new ERD-focused diagram mode
- structural data-model visualization for onboarding and architecture understanding
- documentation clarifying when to use `erd` versus `database`

Out of scope:
- replacing or redefining `database` mode
- introducing implementation-specific migration strategy details in this stage
- broad non-relational modeling beyond the initial ERD objective

## Questions

### Resolve Before Planning

- None. This requirements set is sufficient to enter the spec stage.

### Deferred to Planning

- Which schema sources are included in first release versus later expansion.
- Exact confidence signaling UX in CLI/text outputs.
- Performance limits and fallback behavior for very large schemas.

## Next Stage

- `spec_required`: `lite`
- `risk_level`: `medium`
- `complexity`: `medium`
- Recommended handoff: **Proceed to `ce-spec`** to lock product/contract details before implementation planning.
