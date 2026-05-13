---
schema_version: 1
mode: strategic-compression
linear_issue: JSC-318
linear_url: https://linear.app/jscraik/issue/JSC-318/generate-useful-erds-from-contract-schemas-not-only-sqlprisma
status: strategy_ready
authority: advisory_only
---

# JSC-318 Contract Schema ERD Strategy

## Table of Contents
- [Command Summary](#command-summary)
- [BLUF](#bluf)
- [Source Artifacts Read](#source-artifacts-read)
- [Hard Evidence](#hard-evidence)
- [Interpretation](#interpretation)
- [Assumptions](#assumptions)
- [Affected Systems](#affected-systems)
- [Strategic Decision](#strategic-decision)
- [Smallest Feedback-Producing Next Slice](#smallest-feedback-producing-next-slice)
- [Stop or Pivot Conditions](#stop-or-pivot-conditions)
- [Drift and Moat Impact](#drift-and-moat-impact)
- [Future-Agent Guidance](#future-agent-guidance)
- [Validation Outcomes](#validation-outcomes)
- [Evidence and Traceability Matrix](#evidence-and-traceability-matrix)

## Command Summary

BLUF: JSC-318 should add a separate logical contract ERD source path, starting with JSON Schema, rather than stretching the existing SQL and Prisma database extractor into control-plane semantics.

Decision Needed: Admit a JSC-318 implementation slice through `he-plan` or `he-spec` before runtime edits, because this strategy artifact is advisory only.

Top Risks: Mixing database and contract semantics in one parser path; overstating completeness when ERD output is unavailable; bundling YAML, TypeScript, config fields, and context-pack messaging into the first slice.

Next Action: Create or approve a JSC-318 P0 slice limited to JSON Schema logical ERD extraction, focused fixtures, and preservation of existing SQL and Prisma tests.

## BLUF

JSC-318 should be treated as a contract-model extraction capability, not as a
database ERD patch. The useful first move is a JSON Schema-only logical ERD
slice that proves contract-heavy repositories can produce real entities and
relationships without adding fake SQL or Prisma files.

Authority limit: this artifact does not authorize implementation by itself. Use
it to feed `he-spec` or `he-plan`, then execute through an admitted JSC-318
slice on a matching branch.

Risk consequence: if this is implemented inside the existing SQL/Prisma parser
as one mixed source path, Archscope will blur database semantics with
control-plane contract semantics and make future confidence/manifest behavior
harder to trust.

Next route: `he-plan` for JSC-318, with P0 limited to JSON Schema logical ERD
fixtures and focused tests.

## Source Artifacts Read

| Source | Inspection Method | Use |
| --- | --- | --- |
| Linear `JSC-318` | Linear fetch by issue ID | Problem statement, acceptance criteria, implementation constraints, validation ideas |
| `src/schema/erd-extractor.js` | Direct source read | Current source discovery, parser dispatch, failure classes, relationship inference |
| `src/core/analysis-generation-diagrams-erd.js` | Direct source read | ERD artifact metadata and comment injection |
| `src/schema/erd-model.js` | Direct source read | Normalization and Mermaid rendering contract |
| `src/core/analysis-generation-diagrams.js` | Direct source read | Diagram metadata, placeholder detection, manifest entry construction |
| `src/context/build-context-pack.js` | Direct source read | Agent context pack embedding behavior for unavailable or placeholder diagrams |
| `src/artifacts/evidence-manifest.js` | Direct source read | Scan evidence manifest status vocabulary and artifact read order |
| `test/erd-extractor.test.js` | Direct test read | Existing ERD fixture/test style and SQL/Prisma regression coverage |
| `test/evidence-manifest-parity.test.js` | Direct test read | Generate-all manifest behavior and artifact status expectations |

## Hard Evidence

- `src/schema/erd-extractor.js` declares `SOURCE_PRECEDENCE` as only
  `prisma` and `sql`.
- `src/schema/erd-extractor.js` discovers only `**/schema.prisma` and
  `**/*.sql`.
- `src/schema/erd-extractor.js` returns `terminalClass: failed_no_schema` when
  no supported files are found, with a diagnostic that expects Prisma or SQL.
- `src/core/analysis-generation-diagrams-erd.js` always builds ERD metadata with
  `source: schema_extraction`, `schemaSources`, `sourcePrecedence`,
  `terminalClass`, and `confidence`.
- `src/core/analysis-generation-diagrams.js` already treats
  `no supported schema sources found` and `schema sources: none` as placeholder
  signals.
- `test/erd-extractor.test.js` has focused fixture coverage for explicit
  Prisma, missing schema, ignored schema, SQL constraints, quoted identifiers,
  and inference from foreign-key-like names.
- Existing fixture roots under `test/fixtures/erd/**` are small, source-specific,
  and suitable for adding a contract-heavy JSON Schema fixture.

## Interpretation

The product gap is not that Archscope lacks an ERD renderer. It has a renderer,
normalizer, confidence gate, manifest metadata, and tests. The gap is source
coverage and source semantics: the extractor equates "schema" with database
schema.

JSC-318 matters because Archscope's stronger product claim is an agent-readable
evidence protocol across real repositories. Contract-heavy repos often encode
the domain in JSON Schema, YAML schema contracts, TypeScript types, or governed
runtime artifacts. An empty ERD in those repos is worse than no ERD if it makes
the evidence pack look complete.

The clean strategic split is:

- Database ERD path: Prisma and SQL, preserving relational semantics.
- Logical contract ERD path: JSON/YAML/TypeScript contract surfaces, preserving
  control-plane and artifact-domain semantics.
- Manifest/context truth path: unavailable/degraded ERDs must be explicit to
  agents and humans.

## Assumptions

- P0 can prove usefulness from JSON Schema alone without needing YAML or
  TypeScript parsing in the first slice.
- JSON Schema references such as `$ref`, object properties, arrays of referenced
  objects, and required properties are enough to model a useful minimal logical
  ERD.
- YAML schema support can reuse the same logical model once a parser and fixture
  contract are selected.
- TypeScript contract extraction is higher risk because it likely needs AST
  parsing or project-aware type resolution; it should not be bundled into P0.

## Affected Systems

- `src/schema/erd-extractor.js`: source precedence, source discovery, parser
  dispatch, terminal classes, and diagnostics.
- `src/schema/erd-model.js`: likely no change for P0 unless relationship labels
  need source-kind detail beyond existing provenance.
- `src/schema/erd-confidence.js`: may need source-kind-aware confidence only if
  logical contract relationships are misclassified as inference-heavy.
- `src/core/analysis-generation-diagrams-erd.js`: metadata should expose source
  kind without changing SQL/Prisma behavior.
- `src/core/analysis-generation-diagrams.js`: manifest entries already carry
  metadata and placeholder status; P0 should verify the contract-heavy ERD is
  not placeholder.
- `src/context/build-context-pack.js`: later slice should make unavailable ERD
  guidance agent-useful in `AI/context/diagram-context.md`.
- `test/fixtures/erd/**`: add a contract-heavy fixture with no Prisma or SQL.
- `test/erd-extractor.test.js`: focused extractor tests for JSON Schema source
  discovery, entity extraction, `$ref` relationship extraction, and preserved
  SQL/Prisma behavior.
- `test/evidence-manifest-parity.test.js` or a generate-all focused test:
  verify manifest semantics for contract-heavy ERD output.

## Strategic Decision

Implement JSC-318 as a staged source-kind expansion, not a broad ERD rewrite.

Recommended stage order:

1. P0: JSON Schema logical ERD extractor.
2. P1: Generate-all and manifest truth for degraded/unavailable ERDs.
3. P2: Agent context fallback copy for unavailable ERDs.
4. P3: YAML schema support if coding-harness evidence still requires it.
5. P4: TypeScript contract surfaces only after a separate AST/type strategy.

Do not add fake database schema files to consumer repos. Do not make SQL/Prisma
and contract schemas share one parser path beyond normalization into the common
ERD model.

## Smallest Feedback-Producing Next Slice

P0 should be:

- Add `json-schema` as a source kind after `prisma` and `sql`.
- Discover `**/*.schema.json` with existing ignore behavior.
- Parse JSON Schema object definitions into ERD entities.
- Extract attributes from object `properties`.
- Mark required properties as non-nullable.
- Create explicit relationships from local `$ref` targets and arrays whose
  `items.$ref` points at another definition.
- Add `test/fixtures/erd/contract-schema-json/**` with no `.sql` or
  `schema.prisma`.
- Add focused `test/erd-extractor.test.js` coverage for:
  - source precedence includes `json-schema` after database sources;
  - contract fixture terminal class is `completed`;
  - entities and attributes are deterministic;
  - `$ref` and array `$ref` relationships render as explicit;
  - existing SQL/Prisma tests still pass.

Suggested non-goals for P0:

- YAML schema parsing.
- TypeScript AST parsing.
- `.diagramrc` configured source fields.
- New Mermaid syntax or renderer rewrite.
- Full coding-harness reproduction.

## Stop or Pivot Conditions

Stop and replan if:

- JSON Schema relationship extraction needs remote reference resolution.
- Multiple JSON Schema dialects force ambiguous entity naming.
- P0 requires TypeScript type resolution to produce a meaningful diagram.
- Adding source-kind metadata requires a manifest schema migration rather than
  additive metadata.
- SQL/Prisma fixture snapshots change outside source precedence metadata.

Pivot to `he-spec` before implementation if:

- The first slice needs new public config fields.
- Manifest degraded/unavailable semantics require a new artifact status or
  machine-output contract.
- Agent context fallback messaging changes stable generated artifact contracts.

## Drift and Moat Impact

This issue is strategically worth doing because it protects the evidence
protocol from becoming diagram-shaped theater. A contract-heavy repo with a
placeholder ERD teaches agents to distrust the pack or to waste time reading an
empty artifact.

Actual moat signal:

- Archscope can model the repository's governing contracts as first-class
  architecture evidence.

False moat signal:

- Archscope can always write an `erd.mmd` file, even when it contains no domain
  model.

Drift risk:

- If unavailable ERDs stay marked like normal generated diagrams, `generate-all`
  and `AI/context/diagram-context.md` will keep overstating completeness.

## Future-Agent Guidance

- Treat `terminalClass: failed_no_schema` as a product signal, not just an
  extractor failure.
- Preserve database ERD behavior before adding contract sources.
- Prefer additive source-kind metadata over changing existing machine envelope
  shapes.
- Keep the first implementation fixture tiny and domain-clear: two or three
  JSON schemas with `$ref` relationships are better than a copied real repo.
- Route YAML, TypeScript contracts, configured source globs, and context-pack
  unavailable messaging as follow-on slices unless P0 evidence proves they are
  required.
- Do not use this strategy artifact as implementation authority; it must be
  admitted by `he-spec`, `he-plan`, or a `.harness/linear/**` current slice.

## Validation Outcomes

| Gate | Outcome | Evidence |
| --- | --- | --- |
| HE strategy route resolved | pass | Direct `$he-strategy` invocation; routing map confirms strategy-cognition route |
| Subagent policy resolved | pass | `he-strategy` policy is conditional; no subagents used because user did not request delegation |
| Source artifacts inspected | pass | Sources listed above were read from the live checkout |
| Artifact naming | pass | Dated Linear-style strategy path under `.harness/strategy/` |
| Implementation mutation | pass | No runtime or test code changed by this artifact |
| BLUF structure | pass | `python3 /Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/scripts/check_bluf_structure.py .harness/strategy/2026-05-12-JSC-318-contract-schema-erd-strategy.md --json` |
| Spelling/prose checker | blocked | No repo spelling/prose checker identified for `.harness/strategy/**` |

## Evidence and Traceability Matrix

| Claim | Evidence | Confidence | Route |
| --- | --- | --- | --- |
| Current ERD extraction is database-source-only | `SOURCE_PRECEDENCE`, `SOURCE_FILE_PATTERNS`, and `SCHEMA_PARSERS` in `src/schema/erd-extractor.js` | High | P0 source-kind expansion |
| Missing contract schemas become `failed_no_schema` | `extractErdModel` no-source branch in `src/schema/erd-extractor.js` | High | P1 degraded/unavailable semantics |
| Manifest can carry ERD metadata additively | `toManifestEntry` preserves metadata in `src/core/analysis-generation-diagrams.js` | High | P0/P1 metadata tests |
| Placeholder ERDs are already detectable | `PLACEHOLDER_NOTE_TEXTS` includes no-schema diagnostics in `src/core/analysis-generation-diagrams.js` | High | P1 manifest/context truth |
| Existing tests support focused fixture expansion | `test/erd-extractor.test.js` and `test/fixtures/erd/**` | High | P0 fixture/test work |
| Agent context fallback needs a later slice | `src/context/build-context-pack.js` embeds sorted diagram entries and Mermaid sections from manifest files | Medium | P2 context-pack guidance |
| TypeScript contract support is higher risk than JSON Schema | Requires parser/type strategy not present in inspected ERD code | Medium | Separate spec or later plan slice |

## HE Strategy Metadata

- `he-strategy`: strategic-compression
- `subagent_policy`: conditional
- `roles_used`: none
- `roles_recommended`: repo-research-analyst, learnings-researcher, architecture-strategist, product-lens-reviewer, scope-guardian-reviewer
- `roles_missing`: none observed for mapped `he-strategy` roles in `~/.codex/agents/manifest.json`
