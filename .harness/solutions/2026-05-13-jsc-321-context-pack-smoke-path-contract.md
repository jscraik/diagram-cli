---
schema_version: 1
artifact_id: jsc-321-context-pack-smoke-path-contract-solution
artifact_type: he-compound-reinforce-solution
canonical_slug: jsc-321-context-pack-smoke-path-contract
title: JSC-321 Context-Pack Smoke Path Contract Solution
harness_stage: he-compound
status: active
date: 2026-05-13
refreshed_date: 2026-05-14
traceability_required: true
origin: .harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md
linear_issue: JSC-321
linear_status: backlog
module: src/context/build-context-pack.js
problem_type: solved-validation-learning
evidence:
  - .harness/plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md
  - .harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md
  - .harness/evals/2026-05-13-jsc-318-contract-schema-erd-parent-closure-readiness-diagram-cli-eval.md
  - src/context/build-context-pack.js
  - test/context-pack.test.js
project_brain_sync: blocked-no-project-brain-surface-in-workspace
tags:
  - erd
  - context-pack
  - validation
  - path-contract
  - smoke-test
---

# JSC-321 Context-Pack Smoke Path Contract Solution

## Table of Contents

- [Command Summary](#command-summary)
- [Refresh Status](#refresh-status)
- [Problem](#problem)
- [Evidence](#evidence)
- [Root Cause](#root-cause)
- [Fix Or Durable Guidance](#fix-or-durable-guidance)
- [Validation](#validation)
- [Prevention](#prevention)
- [Project Brain / Routing](#project-brain--routing)
- [Related Artifacts](#related-artifacts)
- [Linear Work Item Contract](#linear-work-item-contract)
- [Linear / Spec / Plan / PR Traceability](#linear--spec--plan--pr-traceability)

## Command Summary

BLUF: This artifact is for the future agent or operator validating JSC-321-style context-pack behavior after generated ERD metadata changes. The durable rule is to copy fixtures into repo-local `.harness/tmp/.../workspace` directories, run `generate-all` with an output path relative to the analyzed workspace, and feed that generated manifest directly into `build-context-pack`. It matters because the CLI path validator was correct to reject absolute `/private/tmp` output paths, and weakening path safety would turn a stale smoke command into a product regression.
Decision Needed: None for this reinforcement artifact; explicit approval is still required before committing, pushing, opening a PR, mutating Linear, or creating new Project Brain surfaces.
Top Risks: Weakening output-path validation to satisfy a stale smoke command, assuming `--output-dir` resolves against the caller repository instead of the analyzed project root, or inserting `normalize-diagram-manifest` into a schema-only context smoke where normalization is not the behavior under test.
Next Action: Reuse the corrected JSC-321 smoke command shape from the plan and this solution whenever validating context-pack consumption of generated ERD availability metadata; treat JSC-318 parent closure as blocked until PR #93 is rechecked after local artifact fixes are exposed, JSC-321 tracker state is reconciled, and scope-owner decisions are recorded.

## Refresh Status

Summary: The 2026-05-14 refresh keeps this artifact as the canonical JSC-321 learning and adds the parent-closure eval as related evidence instead of creating a duplicate solution.

Refresh Decision: update

Reason: The durable learning is still the same: JSC-321 context-pack smokes must use fixture-local workspaces, project-relative `--output-dir diagrams`, direct `build-context-pack` consumption of the generated manifest, and explicit positive/negative text assertions. The newer JSC-318 parent-closure eval does not replace that rule; it proves that the local artifact fixes are validator-clean while parent closure remains blocked by PR review, Linear tracker, and scope-decision evidence.

Overlap Decision: keep this artifact as canonical for the smoke-path contract; do not create a second JSC-318 closure-learning artifact unless the external PR recheck or Linear reconciliation uncovers a new root cause.

Project Brain Status: blocked; no `.harness/knowledge/**`, `.harness/decisions/**`, `.harness/rules/**`, `.harness/memory/LEARNINGS.md`, or `docs/solutions/**` surface was present during refresh discovery.

Refresh Evidence: `.harness/evals/2026-05-13-jsc-318-contract-schema-erd-parent-closure-readiness-diagram-cli-eval.md` now validates the JSC-318 closure report shape, identity, frontmatter safety, BLUF structure, Linear traceability, diff hygiene, and placeholder-marker scan, while keeping the closure recommendation blocked.

## Problem

The JSC-321 implementation made the generated context pack expose ERD availability truth from manifest metadata, including unavailable, degraded, missing, and unknown metadata cases. The implementation and focused tests passed, but the phase initially hit validation failures caused by stale smoke-command assumptions rather than product defects.

The first stale assumption was that `generate-all --output-dir /private/tmp/...` should be a valid smoke path. The CLI intentionally rejects output directories outside the analyzed project root, so the absolute output path failed with a directory-traversal error.

The second stale assumption was that `--output-dir "$SMOKE_DIR/diagrams"` would write relative to the caller repository root. In this CLI, `--output-dir` is interpreted relative to the analyzed project root, so that command wrote under the fixture workspace and left the expected repo-local manifest path missing.

The third stale assumption was that the smoke should always run `normalize-diagram-manifest.js` before `build-context-pack`. For the schema-only fixture smoke, normalization can fail with an empty parsed architecture structure. JSC-321 needed to prove context-pack consumption of generated manifest metadata, not architecture normalization.

## Evidence

- [.harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md](../evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md) records that focused tests, full tests, deep regression, fast verify, and corrected no-schema/useful JSON Schema context smokes passed.
- [.harness/evals/2026-05-13-jsc-318-contract-schema-erd-parent-closure-readiness-diagram-cli-eval.md](../evals/2026-05-13-jsc-318-contract-schema-erd-parent-closure-readiness-diagram-cli-eval.md) records that the local JSC-321 artifact fixes are validator-clean but JSC-318 parent closure remains blocked by PR review recheck, JSC-321 tracker reconciliation, and scope-owner decisions.
- [.harness/plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md](../plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md) now contains the corrected repo-relative `.harness/tmp/jsc-321-*` smoke command sequences.
- [src/context/build-context-pack.js](../../src/context/build-context-pack.js) contains the JSC-321 behavior: `buildErdAvailabilityGuidance` reads manifest metadata and emits guidance only when the included ERD is unavailable, degraded, missing metadata, or unknown.
- [test/context-pack.test.js](../../test/context-pack.test.js) covers unavailable, degraded, useful, missing, and unknown metadata behavior at the context-pack boundary.
- The stale absolute-output smoke failed with `Configuration error: Invalid path: directory traversal detected in "/private/tmp/diagram-cli-jsc-321-no-schema/diagrams"`.
- The caller-root output assumption failed by looking for a manifest that was not written where expected: `Failed to read diagram manifest at .../diagrams/manifest.json: ENOENT`.
- The normalization step was out of scope for the schema-only context smoke and failed with `Failed to normalize architecture.mmd: parsed structure was empty.`

## Root Cause

The root cause was validation-command drift, not a need to loosen the validator or broaden JSC-321 implementation scope.

`diagram-cli generate-all` treats the analyzed input path as the project boundary. Its `--output-dir` contract is project-relative for safe artifact writes. Absolute temp directories and caller-root-relative temp paths violate or misunderstand that contract.

JSC-321 also sits downstream of diagram generation. The smoke needed to verify this data flow:

1. A fixture project is analyzed.
2. `generate-all` writes `.diagram/diagrams/manifest.json`-style output under that fixture workspace.
3. `build-context-pack` reads that generated manifest and writes a temporary context markdown file.
4. `rg` checks whether the context pack includes or omits ERD availability guidance as expected.

Adding a manifest-normalization step changed the smoke into a different test. For schema-only fixtures, normalization can fail for reasons unrelated to whether the context pack correctly consumes generated ERD metadata.

## Fix Or Durable Guidance

Use this pattern for JSC-321 context-pack smokes:

```sh
set -euo pipefail
mkdir -p .harness/tmp
SMOKE_DIR="$(mktemp -d .harness/tmp/jsc-321-no-schema-XXXXXX)"
cp -R test/fixtures/erd/no-schema "$SMOKE_DIR/workspace"
node src/diagram.js generate-all "$SMOKE_DIR/workspace" --output-dir diagrams --format json --deterministic --quiet > "$SMOKE_DIR/generate-output.json"
ROOT_DIR="$PWD" TMP_DIR="$PWD/$SMOKE_DIR/workspace" CONTEXT_DETERMINISTIC=1 CONTEXT_OUTPUT_PATH="$PWD/$SMOKE_DIR/diagram-context.md" CONTEXT_META_OUTPUT_PATH="$PWD/$SMOKE_DIR/diagram-context.meta.json" node src/context/build-context-pack.js
rg -n "Status: unavailable|Reason: no_supported_schema_sources|Fallback evidence" "$SMOKE_DIR/diagram-context.md"
```

Use this negative-smoke pattern for useful JSON Schema ERD output:

```sh
set -euo pipefail
mkdir -p .harness/tmp
SMOKE_DIR="$(mktemp -d .harness/tmp/jsc-321-contract-schema-json-XXXXXX)"
cp -R test/fixtures/erd/contract-schema-json "$SMOKE_DIR/workspace"
node src/diagram.js generate-all "$SMOKE_DIR/workspace" --output-dir diagrams --format json --deterministic --quiet > "$SMOKE_DIR/generate-output.json"
ROOT_DIR="$PWD" TMP_DIR="$PWD/$SMOKE_DIR/workspace" CONTEXT_DETERMINISTIC=1 CONTEXT_OUTPUT_PATH="$PWD/$SMOKE_DIR/diagram-context.md" CONTEXT_META_OUTPUT_PATH="$PWD/$SMOKE_DIR/diagram-context.meta.json" node src/context/build-context-pack.js
if rg -n "Status: unavailable|Status: degraded|Reason: no_supported_schema_sources|Reason: low_confidence_extraction" "$SMOKE_DIR/diagram-context.md"; then
  echo "unexpected unavailable/degraded ERD guidance for useful JSON Schema output" >&2
  exit 1
fi
echo "expected negative assertion passed: useful ERD emitted no unavailable/degraded guidance"
```

Operational rules:

1. Do use a copied fixture workspace under `.harness/tmp/<slice>-*/workspace` when the smoke needs writable generated artifacts.
2. Do pass `--output-dir diagrams` or another path relative to the analyzed workspace.
3. Do set `TMP_DIR` to the workspace that contains the generated `diagrams/manifest.json`.
4. Do assert output text in the generated `diagram-context.md`, not just command exit status.
5. Do treat `rg` exit code `1` as the expected pass condition for useful-output negative assertions when no warning labels should exist.
6. Do not use absolute `/private/tmp/...` paths as `generate-all --output-dir` values.
7. Do not assume `--output-dir` resolves against the caller repository root.
8. Do not weaken `validateOutputPath` or CLI path-safety checks to make a stale smoke pass.
9. Do not insert `normalize-diagram-manifest.js` unless manifest normalization is the behavior under test.
10. Do not silently ignore smoke failures in shell pipelines; use `set -euo pipefail`.

## Validation

The accepted JSC-321 local proof used this validation ladder:

| Check | Result | Evidence |
| --- | --- | --- |
| Metadata prerequisite probe | pass | `rg -n "availability|availabilityReason|sourceKinds|sourceFilesByKind" src/core/analysis-generation-diagrams-erd.js test/generate-output-json.test.js` found the JSC-320 metadata surfaces. |
| Focused context-pack tests | pass | `npm test -- test/context-pack.test.js` reported 14 passing. |
| Full repository test suite | pass | `npm test` reported 210 passing. |
| Deep regression gate | pass | `npm run test:deep` reported `deep-regression: OK`. |
| Repository fast verification | pass | `bash scripts/verify-work.sh --fast` completed successfully. |
| No-schema context smoke | pass | Corrected `.harness/tmp/jsc-321-no-schema-*` smoke found `Status: unavailable`, `Reason: no_supported_schema_sources`, and `Fallback evidence`. |
| Useful JSON Schema context smoke | pass | Corrected `.harness/tmp/jsc-321-contract-schema-json-*` smoke printed `expected negative assertion passed: useful ERD emitted no unavailable/degraded guidance`. |
| Plan artifact validators | pass | BLUF, artifact shape, identity, and Linear traceability checks passed after smoke-command correction. |
| Diff whitespace check | pass | `git diff --check -- .harness/plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md src/context/build-context-pack.js test/context-pack.test.js` passed. |
| Parent closure eval refresh | pass | The JSC-318 closure eval report passes the HE eval-report validator, identity lint, frontmatter safety lint, BLUF check, Linear traceability lint, diff hygiene check, and placeholder-marker scan while preserving the blocked closure recommendation. |

## Prevention

- Treat smoke-command failures as possible plan/spec drift before changing production code.
- Preserve the CLI path contract: generated artifacts stay inside the analyzed project boundary unless the CLI contract is explicitly changed with regression tests.
- Keep JSC-321 scoped to context-pack consumption. Do not pull in extractor/parser work, public CLI changes, manifest schema migration, renderer changes, `.diagram/agent-context.json` changes, remote refs, cross-file refs, or unrelated cleanup.
- Preserve both positive and negative context-pack smoke checks. The feature can fail either by hiding unavailable ERD guidance or by over-warning useful JSON Schema ERDs.
- Record exact failure strings in evals and plans when a stale command is corrected, so later agents do not mistake the correction for an arbitrary command rewrite.
- Run bug-fix only from concrete failing evidence. The stale smoke command required plan repair, not product path-safety repair.

## Project Brain / Routing

This learning is written as a repository-local solution under `.harness/solutions/` because it is a solved validation-contract and workflow-boundary problem for JSC-321.

Project Brain sync is blocked rather than guessed. The expected Project Brain surfaces named by repository guidance were not present during reinforcement discovery:

- `.harness/knowledge/**`
- `.harness/decisions/**`
- `.harness/rules/**`
- `.harness/memory/LEARNINGS.md`
- `docs/solutions/**`

If those surfaces are restored or intentionally created, index this solution there instead of duplicating the full command evidence into another artifact.

## Related Artifacts

- [.harness/specs/2026-05-13-JSC-321-erd-unavailable-context-fallback-spec.md](../specs/2026-05-13-JSC-321-erd-unavailable-context-fallback-spec.md)
- [.harness/plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md](../plan/2026-05-13-JSC-321-erd-unavailable-context-fallback-plan.md)
- [.harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md](../evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md)
- [.harness/evals/2026-05-13-jsc-318-contract-schema-erd-parent-closure-readiness-diagram-cli-eval.md](../evals/2026-05-13-jsc-318-contract-schema-erd-parent-closure-readiness-diagram-cli-eval.md)
- [src/context/build-context-pack.js](../../src/context/build-context-pack.js)
- [test/context-pack.test.js](../../test/context-pack.test.js)

## Linear Work Item Contract

| Field | Value |
| --- | --- |
| Linear issue | `JSC-321` |
| Linear status | Backlog in live Linear evidence at JSC-318 parent closure review time |
| Parent issue | `JSC-318` |
| Purpose | Preserve the corrected JSC-321 context-pack smoke path contract for future validation runs. |
| External mutation | Not authorized by this solution artifact. |

## Linear / Spec / Plan / PR Traceability

| Linear issue | Source acceptance IDs | Plan units | Acceptance IDs | PR evidence | Traceability status |
| --- | --- | --- | --- | --- | --- |
| `JSC-321` | `SA-321-001` through `SA-321-009` | `PU-321-000` through `PU-321-006` | `SA-321-001` through `SA-321-009` | PR #93 commit `35d56df`; CodeRabbit artifact comments on JSC-321 plan and solution | active: solution supports JSC-321 validation-path evidence; live Linear state still requires separate tracker reconciliation |
