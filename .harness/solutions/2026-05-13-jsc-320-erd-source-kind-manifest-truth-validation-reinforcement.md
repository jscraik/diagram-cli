---
schema_version: 1
artifact_id: jsc-320-erd-source-kind-manifest-truth-reinforcement
artifact_type: he-compound-reinforce-solution
canonical_slug: jsc-320-erd-source-kind-manifest-truth
title: JSC-320 ERD Source-Kind Manifest Truth Reinforcement
harness_stage: he-compound
status: active
date: 2026-05-13
traceability_required: true
origin: .harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md
linear_issue: JSC-320
module: src/core/analysis-generation-diagrams-erd.js
problem_type: solved-validation-learning
evidence:
  - src/core/analysis-generation-diagrams-erd.js
  - src/schema/erd-extractor.js
  - test/generate-output-json.test.js
  - test/erd-extractor.test.js
  - .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md
  - .harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md
  - .harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md
project_brain_sync: blocked-no-project-brain-surface-in-workspace
tags:
  - erd
  - manifest
  - source-kind
  - validation
  - proof-artifacts
---

# JSC-320 ERD Source-Kind Manifest Truth Reinforcement

## Table of Contents

- [Command Summary](#command-summary)
- [Problem](#problem)
- [Evidence](#evidence)
- [Root Cause](#root-cause)
- [Fix Or Durable Guidance](#fix-or-durable-guidance)
- [Validation](#validation)
- [Prevention](#prevention)
- [Project Brain / Routing](#project-brain--routing)
- [Related Artifacts](#related-artifacts)

## Command Summary

BLUF: Future JSC-320-style ERD manifest work must validate smoke commands against the CLI path contract and prove `.harness/**` review artifacts are deliverable, because this slice initially had a stale `/private/tmp` smoke command in spec/plan surfaces and a locally valid eval report hidden until `.harness/evals/**` and `.harness/solutions/**` were unignored.
Decision Needed: None for this local reinforcement; explicit approval is still required before committing, opening a PR, mutating Linear/GitHub, or adding new `.harness/**` artifact families to the tracked proof surface.
Top Risks: Reintroducing invalid absolute smoke output paths, treating local `.harness/evals/**` existence as delivery proof, or trusting manifest entry presence without checking source-kind, source-file, and availability metadata.
Next Action: Before closing or shipping JSC-320, use fixture-local `.diagram-jsc-320-*` smoke output directories, remove those directories after evidence capture, run `git check-ignore -v` for `.harness/evals/**` and `.harness/solutions/**`, and confirm the paths resolve through the negative unignore rules before staging.

## Problem

JSC-320 correctly implemented additive ERD manifest metadata for source kind, source files, and availability state, but the validation harness around the slice had two delivery-quality faults.

First, the original smoke commands used absolute `/private/tmp/...` output directories. The `diagram-cli` path validator rejects those as traversal, so the command shape in the plan, automation, and spec could fail even after the implementation itself was correct. The plan and eval were corrected during execution, but the canonical spec still contained the stale command until reinforcement review.

Second, the JSC-320 eval proof existed locally under `.harness/evals/**`, but `.gitignore:26` originally ignored `.harness/*` without exceptions for eval and solution proof artifacts. That meant a normal commit would have omitted the proof artifact even though local validators passed and the file existed. The policy is now repaired for `.harness/evals/**` and `.harness/solutions/**`.

## Evidence

- [src/core/analysis-generation-diagrams-erd.js](/Users/jamiecraik/dev/diagram-cli/src/core/analysis-generation-diagrams-erd.js) now emits ERD artifact metadata for source kinds, source files by kind, availability, and availability reason.
- [src/schema/erd-extractor.js](/Users/jamiecraik/dev/diagram-cli/src/schema/erd-extractor.js) exposes parser-owned `sourceFilesByKind` evidence instead of forcing manifest code to infer ERD provenance from output names.
- [test/generate-output-json.test.js](/Users/jamiecraik/dev/diagram-cli/test/generate-output-json.test.js) asserts manifest metadata preservation for JSON Schema, unavailable no-source ERDs, degraded parser failures, and SQL/Prisma compatibility.
- [test/erd-extractor.test.js](/Users/jamiecraik/dev/diagram-cli/test/erd-extractor.test.js) covers source-file evidence by source kind at the extractor boundary.
- [.harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md](/Users/jamiecraik/dev/diagram-cli/.harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md) records accepted local implementation evidence and the remaining external mutation/staging limits.
- The original `/private/tmp/...` smoke gate failed with `Configuration error: Invalid path: directory traversal detected`; corrected fixture-local output directories passed.
- `git check-ignore -v .harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md .harness/solutions/2026-05-13-jsc-320-erd-source-kind-manifest-truth-validation-reinforcement.md` now resolves through negative unignore rules for `.harness/evals/**` and `.harness/solutions/**`.
- [.harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md](/Users/jamiecraik/dev/diagram-cli/.harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md) was patched during reinforcement to use fixture-local smoke output directories rather than `/private/tmp`.

## Root Cause

The implementation boundary and the validation boundary drifted apart.

The implementation correctly stayed inside extractor-owned evidence and generated ERD metadata, but the smoke command copied into planning artifacts assumed that writing outside the fixture tree was safe. The CLI path validator treats absolute output directories as unsafe, so the validation command was invalid even when the product behavior was right.

The proof-artifact issue is a separate delivery-boundary problem. `.harness/**` is the local HE artifact surface, and only explicitly unignored artifact families are normal staging candidates. A passing artifact validator proves local file shape; `git check-ignore -v` and `git ls-files --others --exclude-standard` prove whether the evidence can travel with a commit, PR, or external tracker update.

## Fix Or Durable Guidance

Use the CLI's real path contract as the source of truth for smoke commands.

1. Use fixture-local relative smoke output directories such as `.diagram-jsc-320-contract` and `.diagram-jsc-320-no-schema`.
2. Remove those temporary smoke output directories after capturing evidence.
3. Do not write `/private/tmp/...` or other absolute paths into JSC-320 spec, plan, automation, or eval gates unless the CLI path validator is intentionally changed and regression-tested.
4. For manifest truth, inspect the generated metadata, not just process exit status. Required checks are `availability`, `availabilityReason`, `sourceKinds`, `sourceKindSummary`, and `sourceFilesByKind`.
5. After writing `.harness/evals/**` or `.harness/solutions/**`, run `git check-ignore -v` on the artifact path.
6. If the artifact is ignored, report proof delivery as blocked until the user approves `git add -f` for the specific artifact or an ignore-policy repair.
7. Do not assume a new `.harness/**` artifact family is tracked just because eval and solution artifacts are now unignored.

## Validation

The accepted JSC-320 implementation and reinforcement evidence used this validation ladder:

| Check | Result | Evidence |
| --- | --- | --- |
| Focused JSC-320 tests | pass | `npm test -- test/generate-output-json.test.js test/evidence-manifest-parity.test.js test/erd-extractor.test.js` returned `32 passing`. |
| Full test suite | pass | `npm test` returned `205 passing`. |
| Deep regression gate | pass | `npm run test:deep` returned `deep-regression: OK`. |
| Repository fast verification | pass | `bash scripts/verify-work.sh --fast` completed successfully; repo lint/typecheck remained explicit not-configured placeholders. |
| Contract JSON Schema smoke | pass | `node src/diagram.js generate-all test/fixtures/erd/contract-schema-json --output-dir .diagram-jsc-320-contract --format json --deterministic --quiet` returned useful JSON Schema metadata. |
| No-schema smoke | pass | `node src/diagram.js generate-all test/fixtures/erd/no-schema --output-dir .diagram-jsc-320-no-schema --format json --deterministic --quiet` returned unavailable ERD metadata with empty source evidence. |
| Eval report validator | pass | `python3 /Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/skills/he-eval-report/scripts/validate_eval_report.py .harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md --json` returned `status: pass`. |
| Spec shape and safety validators | pass | BLUF, generated artifact shape, identity, traceability, and frontmatter safety checks passed after the smoke-command spec repair. |
| Proof persistence check | pass | `.harness/evals/**` and `.harness/solutions/**` now resolve through negative unignore rules and are listed by `git ls-files --others --exclude-standard`. |

## Prevention

- Treat a failing validation command in a spec or plan as source-of-truth drift, not just a one-off execution annoyance.
- When a heartbeat or eval corrects a validation command, reconcile the canonical spec in the same pass.
- Keep `toManifestEntry` generic; source-kind truth belongs in ERD extraction and ERD generated metadata, not in the manifest writer.
- Preserve JSC-320 scope: no manifest schema migration, public CLI/config change, renderer rewrite, YAML/TypeScript source support, remote reference support, cross-file reference support, or JSC-321 context fallback.
- Require simplify review before delivery to keep additive metadata local and avoid manifest-writer special cases.
- Run code review after validation because source-kind and availability classification can appear green while still over-claiming useful output.
- Run bug-fix only from concrete failing evidence. The JSC-320 availability-ordering fix is the model: review found a parse-failure classification risk, then focused/full validation proved the correction.
- Verify artifact persistence separately from artifact validity whenever `.harness/**` files are part of closure proof.

## Project Brain / Routing

This learning is written as a repository-local solution under `.harness/solutions/` because it is a solved local validation and delivery-boundary problem.

Project Brain sync is blocked, not silently invented. The expected Project Brain surfaces named by repo guidance were not present during reinforcement discovery:

- `.harness/knowledge/**`
- `.harness/decisions/**`
- `.harness/rules/**`
- `.harness/memory/LEARNINGS.md`
- `docs/solutions/**`

If those surfaces are restored or intentionally created by a separate governance decision, index or summarize this solution there rather than duplicating a second learning artifact.

## Related Artifacts

- [.harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md](/Users/jamiecraik/dev/diagram-cli/.harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md)
- [.harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md](/Users/jamiecraik/dev/diagram-cli/.harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md)
- [.harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-technical-review.md](/Users/jamiecraik/dev/diagram-cli/.harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-technical-review.md)
- [.harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan-technical-review.md](/Users/jamiecraik/dev/diagram-cli/.harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan-technical-review.md)
- [.harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md](/Users/jamiecraik/dev/diagram-cli/.harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md)
- [src/core/analysis-generation-diagrams-erd.js](/Users/jamiecraik/dev/diagram-cli/src/core/analysis-generation-diagrams-erd.js)
- [src/schema/erd-extractor.js](/Users/jamiecraik/dev/diagram-cli/src/schema/erd-extractor.js)
- [test/generate-output-json.test.js](/Users/jamiecraik/dev/diagram-cli/test/generate-output-json.test.js)
- [test/erd-extractor.test.js](/Users/jamiecraik/dev/diagram-cli/test/erd-extractor.test.js)
