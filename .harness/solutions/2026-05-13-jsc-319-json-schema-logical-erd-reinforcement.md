---
schema_version: 1
artifact_id: jsc-319-json-schema-logical-erd-reinforcement
artifact_type: he-reinforce-solution
canonical_slug: jsc-319-json-schema-logical-erd
title: JSC-319 JSON Schema Logical ERD Reinforcement
harness_stage: he-reinforce
status: active
date: 2026-05-13
traceability_required: true
origin: .harness/evals/2026-05-13-jsc-319-json-schema-logical-erd-diagram-cli-eval.md
linear_issue: JSC-319
module: src/schema/erd-extractor.js
problem_type: solved-implementation-learning
evidence:
  - src/schema/erd-extractor.js
  - test/erd-extractor.test.js
  - test/fixtures/erd/contract-schema-json/manifest.schema.json
  - test/fixtures/erd/contract-schema-json-diagnostics/problem.schema.json
  - .harness/evals/2026-05-13-jsc-319-json-schema-logical-erd-diagram-cli-eval.md
project_brain_sync: blocked-no-project-brain-surface-in-workspace
tags:
  - erd
  - json-schema
  - source-kind
  - diagnostics
  - inference
---

# JSC-319 JSON Schema Logical ERD Reinforcement

## Command Summary

BLUF: Future ERD source-kind work should reuse the JSC-319 parser-dispatch pattern and must keep the CLI smoke gate because the main implementation looked correct until validation exposed an unsafe inferred self-relationship.
Decision Needed: None for JSC-319 reinforcement; Project Brain sync remains blocked until a canonical `.harness/knowledge`, `.harness/decisions`, `.harness/rules`, or `.harness/memory/LEARNINGS.md` surface exists in this workspace.
Top Risks: Repeating source-kind expansion by renderer rewrite, weakening unsupported-reference diagnostics into silent omission, or trusting command success without checking `inferredRelationshipCount` can reintroduce misleading ERDs.
Next Action: Before another ERD schema-source expansion, read this solution, copy the validation ladder, and add a smoke assertion that relationship inference does not create self-links.

## Problem

`diagram-cli` could generate ERDs from database-oriented sources but did not treat contract schema files as a first-class ERD input source. Repositories that primarily express their logical model through JSON Schema could therefore fail with no useful schema source even when the needed entity, attribute, and local relationship information was present in `.schema.json` files.

The subtle follow-on problem was not parser discovery. It was trust in the existing inference layer: once JSON Schema parsing succeeded, the name-based foreign-key heuristic inferred a false self-relationship from an entity-owned identifier field (`Reviewer.reviewerId`). That made the CLI smoke test the critical safety gate, not just a ceremonial success check.

## Evidence

- [src/schema/erd-extractor.js](/Users/jamiecraik/dev/diagram-cli/src/schema/erd-extractor.js) now includes `json-schema` in source precedence after `prisma` and `sql`, registers the `**/*.schema.json` file pattern, and dispatches to `parseJsonSchema`.
- [test/erd-extractor.test.js](/Users/jamiecraik/dev/diagram-cli/test/erd-extractor.test.js) covers positive JSON Schema extraction and diagnostic behavior for unsupported or unresolved schema constructs.
- [test/fixtures/erd/contract-schema-json/manifest.schema.json](/Users/jamiecraik/dev/diagram-cli/test/fixtures/erd/contract-schema-json/manifest.schema.json) is the contract-schema positive fixture used by the smoke command.
- [test/fixtures/erd/contract-schema-json-diagnostics/problem.schema.json](/Users/jamiecraik/dev/diagram-cli/test/fixtures/erd/contract-schema-json-diagnostics/problem.schema.json) exercises diagnostic categories instead of pretending all JSON Schema constructs are supported.
- [.harness/evals/2026-05-13-jsc-319-json-schema-logical-erd-diagram-cli-eval.md](/Users/jamiecraik/dev/diagram-cli/.harness/evals/2026-05-13-jsc-319-json-schema-logical-erd-diagram-cli-eval.md) records the implementation validation evidence and remaining parent-issue dependency status.

## Root Cause

The ERD extractor had a closed-world source model: database schema source kinds were registered explicitly, and contract schemas were outside the discovery and parser dispatch boundary. That meant the normal ERD normalization path could not see JSON Schema entities even though the downstream model could already represent them.

The false self-relationship came from a separate but adjacent assumption: the `*Id` naming heuristic treated matching entity names as valid relationship targets even when the target entity was the same as the source entity. For contract schemas, identity fields such as `reviewerId` are common and should remain attributes unless there is an explicit local `$ref` or a non-self inferred target.

## Fix Or Durable Guidance

The durable pattern is source-kind expansion, not renderer expansion.

1. Add a source kind only at the extractor discovery boundary: precedence, file pattern, parser dispatch, and diagnostics.
2. Return the same normalized ERD shape that existing SQL and Prisma parsers feed into `normalizeErdModel`.
3. Keep parser support intentionally local and explicit: root object schemas, `$defs`, `definitions`, object properties, `required` nullability, local property `$ref`, and array `items.$ref`.
4. Report unsupported or unsafe schema constructs as diagnostics with stable category tokens: `remote_ref_unsupported`, `cross_file_ref_unsupported`, `local_ref_unresolved`, `non_object_definition_ignored`, and `composition_unsupported`.
5. Do not make relationship labels part of the public model unless that is a separate approved schema/model change.
6. Guard name-based inference against self-links. An entity-owned identifier matching its own name is an attribute, not an ERD edge.

## Validation

The JSC-319 closeout evidence used this validation ladder:

| Check | Result | Evidence |
| --- | --- | --- |
| Focused ERD tests | pass | `npm test -- test/erd-extractor.test.js` returned `22 passing`. |
| Full test suite | pass | `npm test` returned `201 passing`. |
| Deep regression gate | pass | `npm run test:deep` returned `deep-regression: OK`. |
| Repository fast verification | pass | `bash scripts/verify-work.sh --fast` completed successfully; lint/typecheck were explicitly not configured by the repo gate. |
| Contract-schema CLI smoke | pass | `node src/diagram.js generate test/fixtures/erd/contract-schema-json --type erd --format json --deterministic --quiet` returned `status: success`, `schemaSources: ["manifest.schema.json"]`, `entityCount: 3`, `explicitRelationshipCount: 3`, `inferredRelationshipCount: 0`, and `inferenceShare: 0`. |

For future changes, do not close the phase if the smoke command merely exits successfully. Inspect source selection, entity count, explicit relationship count, inferred relationship count, and diagnostic shape.

## Prevention

- Reuse the source-kind registration pattern before adding any new ERD parser.
- Keep unsupported schema constructs diagnostic-only until explicit implementation work adds support.
- Add at least one positive fixture and one diagnostic fixture for each new schema-source family.
- Add a CLI smoke command that uses a real fixture directory and asserts deterministic JSON output behavior.
- Treat any new inferred relationship as suspicious until checked against fixture intent.
- Run simplify review before commit: the parser should stay local, small, and shape-compatible with the existing ERD model.
- Run code review after validation: this area can appear green while producing semantically wrong diagrams.
- Run bug-fix only when failing evidence exists; the self-link fix is the example of a failure-driven bug patch.

## Project Brain / Routing

This learning is written as a repository-local solution under `.harness/solutions/` because no existing solution or Project Brain destination was present in the current workspace.

Project Brain sync is blocked, not silently invented. The expected surfaces named by repo guidance were not present during reinforcement discovery:

- `.harness/knowledge/**`
- `.harness/decisions/**`
- `.harness/rules/**`
- `.harness/memory/LEARNINGS.md`
- `docs/solutions/**`

If those surfaces are restored or intentionally created by a separate governance decision, this solution should be indexed or summarized there rather than duplicated.

## Related Artifacts

- [.harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md](/Users/jamiecraik/dev/diagram-cli/.harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md)
- [.harness/plan/2026-05-13-JSC-319-json-schema-logical-erd-plan.md](/Users/jamiecraik/dev/diagram-cli/.harness/plan/2026-05-13-JSC-319-json-schema-logical-erd-plan.md)
- [.harness/review/2026-05-13-JSC-319-json-schema-logical-erd-plan-technical-review.md](/Users/jamiecraik/dev/diagram-cli/.harness/review/2026-05-13-JSC-319-json-schema-logical-erd-plan-technical-review.md)
- [.harness/evals/2026-05-13-jsc-319-json-schema-logical-erd-diagram-cli-eval.md](/Users/jamiecraik/dev/diagram-cli/.harness/evals/2026-05-13-jsc-319-json-schema-logical-erd-diagram-cli-eval.md)
- [src/schema/erd-extractor.js](/Users/jamiecraik/dev/diagram-cli/src/schema/erd-extractor.js)
- [test/erd-extractor.test.js](/Users/jamiecraik/dev/diagram-cli/test/erd-extractor.test.js)
