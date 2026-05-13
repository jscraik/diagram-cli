---
schema_version: 1
artifact_id: jsc-320-erd-source-kind-manifest-truth-eval
artifact_type: he-eval-report
canonical_slug: jsc-320-erd-source-kind-manifest-truth
title: JSC-320 ERD Source-Kind and Manifest Truth Eval
harness_stage: he-eval-report
status: draft
date: 2026-05-13
traceability_required: true
origin: .harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md
linear_issue: JSC-320
linear_milestone: none
---

<!-- markdownlint-disable MD025 -->

# JSC-320 ERD Source-Kind and Manifest Truth Eval

## Command Summary

BLUF: Jamie accepted this JSC-320 eval, so the P1 implementation is locally validation-complete for ERD source-kind/source-file evidence and useful/degraded/unavailable manifest truth. The recommendation is Complete with follow-up for JSC-320 only; JSC-318 parent closure remains blocked by JSC-321 context-fallback work and by external delivery steps that were not authorized in this run.

Decision Needed: none for local JSC-320 eval acceptance; external Linear/GitHub mutation still requires explicit approval.

Top Risks: JSC-320 is additive metadata only and does not prove context-pack fallback behavior; the worktree contains unrelated pre-existing dirty files that must not be bundled into a JSC-320 commit; live Linear/GitHub state was not mutated or closed by this eval.

Next Action: Jamie reviews this report, then either accepts the JSC-320 closure proof or requests rework before any external Linear mutation, commit, PR, or transition to JSC-321 closure work.

## Executive Eval Summary

Summary: JSC-320 now has accepted implementation, tests, smoke output, and validation evidence for truthful ERD source-kind, source-file, and availability metadata in generated manifests.

Status: accepted for local implementation evidence; external delivery remains approval-gated.

Linear Completion Recommendation: Complete with follow-up for JSC-320 only.

Primary Blockers: commit/PR/external tracker mutation was not complete when this eval was written; parent JSC-318 remains incomplete because JSC-321 is explicitly downstream; `.harness/evals/**` and `.harness/solutions/**` are now unignored in `.gitignore` and visible to normal staging.

Confidence: 94%; strong local implementation evidence, capped by missing human closure steering, absent commit/PR evidence, and unverified live Linear closure state.

## Evaluated Slice

Summary: Evaluate exactly the JSC-320 P1 child slice: make ERD generated metadata and `generate-all` manifest entries truthful about source kind, source evidence, and useful/degraded/unavailable state without widening public CLI/config behavior or manifest schema version.

Linear Project: Diagram product surface and analysis workflow.

Linear Milestone: none.

Linear Parent Issue: JSC-318.

Linear Sub-Issues: JSC-320 evaluated here; JSC-319 is prerequisite implementation evidence; JSC-321 remains downstream and out of scope.

Refactor Program: .harness/refactors/2026-05-12-JSC-318-contract-schema-erd-refactor.md.

Plugin Harness Engineering Spec: .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md.

Affected Files/Modules: src/schema/erd-extractor.js; src/core/analysis-generation-diagrams-erd.js; test/erd-extractor.test.js; test/generate-output-json.test.js.

Affected Workflows: ERD source discovery, extractor metadata, ERD artifact metadata construction, `generate-all` manifest metadata preservation, focused ERD manifest validation, CLI smoke validation.

Related ADRs: none found or loaded for this slice.

Related Core Invariants: keep `toManifestEntry` ERD-agnostic; keep additions nested under ERD `metadata`; do not change `manifest.schemaVersion`; do not modify public CLI/config behavior; do not implement JSC-321 context fallback.

## Linear Definition of Done Status

Summary: The local implementation DoD is satisfied and accepted; external Linear closure still requires explicit mutation approval.

Artifact Path: .harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md.

Definition of Done Status: local implementation proof satisfied and accepted; external tracker completion approval not yet granted.

Closure Safety: safe to mark JSC-320 complete with follow-up after linking this proof and excluding unrelated worktree changes; unsafe to close JSC-318 parent from this evidence alone.

## Linear Backlink Map

Summary: Local Linear traceability is complete enough for JSC-320 slice evaluation; live Linear mutation was not performed by this eval.

Linear Project: Diagram product surface and analysis workflow.

Linear Milestone: none.

Linear Parent Issue: JSC-318.

Linear Sub-Issues: JSC-319, JSC-320, JSC-321.

Linear Status Recommendation: Complete with follow-up for JSC-320 only, not parent JSC-318.

Proof Artifact Links: .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md; .harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md; .harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-technical-review.md; .harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan-technical-review.md; .harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md.

Missing Identifiers: no milestone identifier; no commit, PR, or live Linear status update identifier yet.

Traceability Repair: attach or link this eval, validation commands, and the future commit or PR to JSC-320 before moving the Linear issue to Done; `.harness/evals/**` and `.harness/solutions/**` are now normal trackable proof surfaces.

## Source Artifact Trace

Summary: The selected source artifacts support the implementation scope and the closure limits.

Linear Plan: .harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md identifies JSC-320 as the P1 manifest-truth slice under JSC-318.

Refactor Program: .harness/refactors/2026-05-12-JSC-318-contract-schema-erd-refactor.md separates JSON Schema ERD extraction, manifest truth, and context fallback into distinct slices.

Plugin HE Spec: .harness/specs/2026-05-13-JSC-320-erd-source-kind-manifest-truth-spec.md defines additive source-kind/source-evidence metadata, availability states, validation gates, non-goals, and acceptance criteria.

ADRs: none required or discovered for this slice.

Core Invariants: plan and spec require no public CLI option change, no manifest schema migration, no context fallback, no YAML/TypeScript support, no renderer rewrite, and no generic manifest-writer ERD classification.

Other Source Artifacts: .harness/plan/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan.md; .harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-technical-review.md; .harness/review/2026-05-13-JSC-320-erd-source-kind-manifest-truth-plan-technical-review.md.

## Planned Proof Check

Summary: The planned proof was produced for JSC-320; parent-level proof remains intentionally incomplete.

Promised Proof From Source Artifacts: contract-first metadata tests, source-kind helper/extractor evidence, manifest truth tests, full suite, deep regression, fast verify, two `generate-all` smoke commands, simplify review, bug-fix only from concrete failing evidence, and code review.

Proof Planned Before Implementation: yes.

Proof Produced: focused tests passed; full suite passed; deep regression passed; fast verify passed; contract JSON Schema smoke showed useful `json-schema` metadata; no-source smoke showed unavailable empty source evidence; code review found and fixed availability ordering for parse failures before final validation.

Proof Missing: commit, PR, live Linear closure update, and JSC-321 context fallback proof.

Interpretation: sufficient for local JSC-320 implementation closure after accepted steering; insufficient for parent JSC-318 closure.

Blocks Closure: no for local JSC-320 closure after accepted steering; yes for parent/external delivery until approved.

## Functional Validation Results

Summary: Functional validation supports the JSC-320 implementation slice.

Command or Method: npm test -- test/generate-output-json.test.js test/evidence-manifest-parity.test.js test/erd-extractor.test.js; npm test; npm run test:deep; bash scripts/verify-work.sh --fast; node src/diagram.js generate-all test/fixtures/erd/contract-schema-json --output-dir .diagram-jsc-320-contract --format json --deterministic --quiet; node src/diagram.js generate-all test/fixtures/erd/no-schema --output-dir .diagram-jsc-320-no-schema --format json --deterministic --quiet.

Result: pass for all final required commands; the original `/private/tmp/...` smoke gate failed by CLI path validation and was repaired in the plan/automation to fixture-local relative output directories.

Evidence: focused suite reported 32 passing; baseline suite reported 205 passing; deep-regression reported OK; verify-work completed preflight, lint/typecheck placeholders, migration readiness, and hook-governance rollout check; contract smoke returned `availability: useful`, `sourceKinds: ["json-schema"]`, `sourceFilesByKind: {"json-schema":["manifest.schema.json"]}`; no-source smoke returned `availability: unavailable`, `sourceKinds: []`, `sourceFilesByKind: {}`.

Confidence: high for local behavior covered by fixtures and commands.

Blocks Closure: no for implementation proof after accepted steering; yes for external delivery until approved.

## Eval Gate Matrix

Summary: Required JSC-320 gates passed; external closure gate remains blocked by required steering.

Gate: Contract-first focused tests

Expected: initial metadata assertions fail before production edits, then pass after implementation.

Actual: first run failed with missing JSC-320 metadata fields; final run reported 32 passing.

Status: pass

Evidence: active session command output from `npm test -- test/generate-output-json.test.js test/evidence-manifest-parity.test.js test/erd-extractor.test.js`.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: Full repository test suite

Expected: full mocha baseline passes after implementation.

Actual: npm test reported 205 passing.

Status: pass

Evidence: active session command output from 2026-05-13.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: Deep regression

Expected: deep regression completes successfully.

Actual: npm run test:deep reported deep-regression: OK.

Status: pass

Evidence: active session command output from 2026-05-13.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: Fast repo verify

Expected: repository fast verification passes or blocks with exact reason.

Actual: bash scripts/verify-work.sh --fast passed; lint and typecheck are explicit not_configured placeholder checks in this plain JS project; local-memory status warned as stopped while REST health succeeded.

Status: pass

Evidence: active session command output from 2026-05-13.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: Contract JSON Schema smoke

Expected: generated ERD manifest metadata is useful and source-kind truthful for the JSON Schema fixture.

Actual: `generate-all` returned success with non-placeholder ERD metadata: `availability: useful`, `availabilityReason: completed_with_explicit_entities`, `sourceKinds: ["json-schema"]`, `sourceKindSummary: json-schema`, and `sourceFilesByKind` mapping `manifest.schema.json`.

Status: pass

Evidence: active session output from `node src/diagram.js generate-all test/fixtures/erd/contract-schema-json --output-dir .diagram-jsc-320-contract --format json --deterministic --quiet`.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: No-source smoke

Expected: generated ERD manifest metadata is unavailable with empty source-kind evidence for a no-schema fixture.

Actual: `generate-all` returned success with placeholder ERD metadata: `availability: unavailable`, `availabilityReason: no_supported_schema_sources`, `sourceKinds: []`, `sourceKindSummary: none`, and `sourceFilesByKind: {}`.

Status: pass

Evidence: active session output from `node src/diagram.js generate-all test/fixtures/erd/no-schema --output-dir .diagram-jsc-320-no-schema --format json --deterministic --quiet`.

Confidence: high

Blocks Closure: no

Required Action: none.

Gate: Original absolute-output smoke commands

Expected: plan smoke commands are valid for this CLI.

Actual: the `/private/tmp/...` versions failed with `Configuration error: Invalid path: directory traversal detected`; the plan and automation were corrected to fixture-local relative `--output-dir` paths.

Status: pass

Evidence: active session failure and subsequent plan/automation correction.

Confidence: high

Blocks Closure: no after correction.

Required Action: none.

Gate: Simplify review and code review

Expected: review the JSC-320 diff before commit/PR closeout.

Actual: simplify review found the implementation remained localized; code review found one fixable availability-ordering defect, which was patched and revalidated.

Status: pass

Evidence: active session review notes and patch in src/core/analysis-generation-diagrams-erd.js.

Confidence: medium-high

Blocks Closure: no

Required Action: none before local implementation closure; still requires external review process if PR policy demands it.

Gate: Human eval steering

Expected: Jamie accepts, challenges, or requests rework before any Complete recommendation.

Actual: Jamie approved this eval before requesting he-reinforce.

Status: pass

Evidence: user message: "approve then [$he-reinforce]".

Confidence: high

Blocks Closure: no

Required Action: none for eval steering; external Linear/GitHub mutation still requires explicit approval.

## Agentic Eval Validity

Summary: The eval proves the intended local capability and explicitly avoids over-claiming parent completion.

Evaluated Capability / Task: Emit truthful ERD source-kind, source-file, and availability metadata in `diagram-cli generate-all` manifests.

Task Validity: valid; source artifacts consistently define P1 as additive manifest-truth metadata after JSC-319 and before JSC-321.

Outcome Validity: valid for fixture-backed behavior; focused tests and CLI smokes confirm JSON Schema useful, no-source unavailable, low-confidence degraded, mixed-source evidence, SQL/Prisma compatibility, and manifest metadata preservation.

Trajectory / Transcript Evidence: heartbeat execution performed contract-first failure capture, implementation, review, concrete bug fix, validation, smoke proof, cleanup of temporary smoke artifacts, and automation stop when commit approval became the remaining gate.

Grader Coverage: focused tests, full mocha suite, deep regression, verify-work wrapper, smoke commands, simplify review, and code review cover the selected local slice.

Trial Policy: deterministic local commands were run once after the final implementation patch; no stochastic eval or pass@k claim is made.

Pass@k / Pass^k Reporting: not applicable; deterministic repository validation commands were used.

Authorization Validator: protected external actions were not performed; the recurring heartbeat was deleted after it reached the approval-required stop rule.

Saturation / Maintenance Signal: validation reached a plateau with no remaining fixable JSC-320 issues found in the bounded diff review.

Blocks Completion: no

Required Action: accepted for local JSC-320 completion evidence; obtain explicit approval before external Linear closure, commit, PR publication, or parent JSC-318 closure.

## Side-Effect Authorization

Summary: No protected external closure action was taken.

Protected Action: Linear/GitHub mutation, commit, PR, merge, deploy, secret access, destructive cleanup.

User Authorization Evidence: none for external mutation in this eval step.

Agent Justification: no protected mutation was necessary to write local proof.

External Party Influence: none.

Validator Decision: exempt

Validator Confidence: high

Suggested Next Step: request explicit user approval before any Linear status update, commit, PR publication, or issue closure.

Blocks Completion: no

## Domain Model Integrity Check

Summary: The ERD domain model remains intact and the metadata contract now exposes source truth without changing normalized ERD entities or relationships.

Conclusion: pass for JSC-320 scope.

Bounded Context: ERD extraction metadata and generated artifact manifest metadata.

Aggregate Invariants: source precedence remains ordered; `toManifestEntry` remains generic; availability is derived before manifest writing; source-kind-to-file evidence is structured and deterministic; no-source ERDs stay unavailable even when an `erd.mmd` placeholder exists.

Translation Evidence: extractor returns `sourceFilesByKind`; ERD metadata normalizes that into `sourceKinds`, `sourceKindSummary`, `sourceFilesByKind`, `availability`, and `availabilityReason`; manifest writer preserves supplied metadata.

Scenario or Test Evidence: JSON Schema fixture, no-schema fixture, mixed-source helper workspace, degraded SQL workspace, Prisma compatibility manifest assertion, and full suite.

Confidence: high.

Blocks Completion: no.

## Drift Validation

Summary: The selected slice improves manifest truth and agent-native evidence without widening unrelated architecture.

Architecture Drift: Improved

Routing Drift: Neutral

Context Drift: Neutral

Governance Drift: Improved

Agent-Native Drift: Improved

Moat Drift: Improved

## Architecture Integrity Check

Summary: Architecture integrity is acceptable for an additive metadata slice.

Conclusion: pass.

Evidence: implementation stays in `src/schema/erd-extractor.js` and `src/core/analysis-generation-diagrams-erd.js`; no public CLI/config changes, manifest schema migration, renderer rewrite, or context-pack fallback changes were introduced.

Blocks Completion: no.

## Routing Determinism Check

Summary: Source-kind routing remains deterministic and source evidence is not guessed from generated filenames or Mermaid comments.

Conclusion: pass.

Evidence: `SOURCE_PRECEDENCE` includes `prisma`, `sql`, and `json-schema`; extractor populates sorted `sourceFilesByKind`; tests assert JSON Schema and mixed-source behavior.

Blocks Completion: no.

## Context Load Check

Summary: Context load did not grow beyond the selected slice.

Conclusion: pass for JSC-320; context-pack fallback remains JSC-321.

Evidence: no context-pack files or JSC-321 fallback guidance were changed; metadata gives downstream agents compact machine-readable state.

Blocks Completion: no for JSC-320; yes for JSC-318 parent closure.

## Agent-Native Check

Summary: Agent-native behavior improved because generated manifests now expose explicit ERD truth rather than forcing agents to infer state from placeholder files.

Conclusion: pass.

Evidence: manifest metadata includes source kinds, per-kind files, source-kind summary, availability, and availability reason for useful and unavailable smoke cases.

Blocks Completion: no.

## Governance Simplicity Check

Summary: Governance stayed bounded to local implementation proof and corrected one invalid validation gate instead of normalizing a broken command.

Conclusion: pass.

Evidence: plan and automation were updated from invalid `/private/tmp/...` smoke output paths to valid fixture-local relative directories; no external tracker mutation, dependency addition, schema migration, or unrelated cleanup was performed.

Blocks Completion: no.

## Moat Protection Check

Summary: The work strengthens the project moat by improving machine-readable truth for generated architecture evidence in contract-heavy repositories.

Conclusion: improved.

Evidence: downstream agents can now distinguish useful JSON Schema ERDs, unavailable no-source ERDs, degraded low-confidence ERDs, and source-kind provenance without reading Mermaid comments or guessing from artifact filenames.

Blocks Completion: no.

## Proof Artifacts

Summary: Required local proof artifacts exist; media proof is not applicable.

Produced: source diff, focused tests, validation output in session, smoke output in session, plan correction, automation correction, this eval report.

Required: JSC-320 spec, plan, implementation diff, focused tests, full tests, deep tests, verify-work, two smoke commands, review gates, eval report.

Missing: commit, PR, live Linear status mutation, and JSC-321 proof.

Planned Before Implementation: yes.

Generated Media Cache Source: not applicable.

Repository Media Path: not applicable.

Prompt Metadata Path: not applicable.

Media Sidecar Path: not applicable.

Repository Media Exists: not applicable.

Blocks Completion: no for accepted local implementation proof; no for proof artifact persistence after `.gitignore` repair; yes for external delivery until commit/PR/Linear linkage is complete.

Attach or Link Back to Linear: attach this eval and validation summary to JSC-320 before closure.

## Failures / Regressions

Summary: Two implementation-time defects were found and corrected; no remaining JSC-320 regression is known from available evidence.

Failure or Regression: original smoke commands used `/private/tmp/...` absolute output directories rejected by the CLI path validator.

Evidence: smoke command failed with `Configuration error: Invalid path: directory traversal detected`; corrected fixture-local relative smoke commands passed.

Required Corrective Action: completed by updating plan/automation smoke commands and rerunning corrected smokes.

Follow-Up Justified: no.

Blocks Closure: no after correction.

Failure or Regression: availability classifier could report `no_supported_schema_sources` before honoring `failed_parse` if no successful source-kind evidence existed.

Evidence: code review found ordering risk in `classifyAvailability`; final patch moved `failed_parse` before empty-source fallback; focused and full validation passed afterward.

Required Corrective Action: completed.

Follow-Up Justified: no.

Blocks Closure: no after correction.

## Linear Completion Recommendation

Summary: Jamie accepted this eval; do not externally close Linear or publish delivery artifacts without explicit mutation approval.

Classification: Complete with follow-up

Recommended Linear Status: JSC-320 may move toward Done only when this proof is attached or linked and delivery approval is explicit; keep JSC-318 open.

Required Linear Comment/Update: include this eval report path, exact validation commands, smoke metadata summary, and deferred scope statement for JSC-321 and JSC-318 parent closure.

Issues to Close: JSC-320 only after explicit Linear mutation approval.

Issues to Reopen: none.

Issues to Leave Open: JSC-318 and JSC-321.

New Follow-Up Issues: none for JSC-320; JSC-321 already covers downstream context fallback.

Labels to Add/Remove: none recommended from this eval alone.

Milestone Completion: not applicable.

Project Status Change: not recommended from this child slice alone.

Status Update Needed: yes after explicit Linear mutation approval.

Proof Artifacts to Attach or Link: .harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md and validation command summary; `.harness/evals/**` and `.harness/solutions/**` are now unignored and visible to normal staging.

## Follow-Up Work

Summary: Follow-up is already represented by downstream issue scope, not new JSC-320 scope.

Classification: Do Not Create

Target Linear Project: Diagram product surface and analysis workflow.

Parent Issue or Milestone: JSC-318.

Reason: JSC-321 already covers context-pack unavailable ERD fallback behavior; commit/PR/Linear delivery requires explicit user approval rather than a new product issue.

Agent-Safe or Human Review Required: agent-safe after separate JSC-321 spec/plan; human review required before external closure or parent issue transition.

## Core / ADR Update Recommendation

Summary: No core or ADR update is required for this P1 implementation.

Core Update: not required.

ADR Update: not required.

Reason: implementation preserved public CLI, manifest schema version, generic manifest writer behavior, and existing ERD model/renderer contracts.

## Evidence & Traceability Matrix

Summary: Material closure claims are supported by local source, tests, plan/spec artifacts, and validation output.

Conclusion: evidence is sufficient for accepted JSC-320 implementation closure; insufficient for JSC-318 parent closure.

Fact: ERD metadata now includes source-kind and availability fields.

Interpretation: JSC-320 metadata requirements are implemented without changing the manifest schema version.

Assumption: downstream consumers tolerate additive nested metadata fields as intended by the spec.

Evidence: src/core/analysis-generation-diagrams-erd.js diff; focused manifest tests; contract and no-source smoke output.

Affected Files/Modules: src/core/analysis-generation-diagrams-erd.js; test/generate-output-json.test.js.

Command or Inspection Method: git diff; npm test -- test/generate-output-json.test.js test/evidence-manifest-parity.test.js test/erd-extractor.test.js; generate-all smoke commands.

Confidence: high for local manifest output; medium-high for downstream consumers until JSC-321 consumes the metadata.

Operational Impact: agents and CI artifacts can distinguish useful, degraded, and unavailable ERD states directly from manifest metadata.

Blocks Completion: no for accepted JSC-320 local closure; yes for parent closure.

Fact: Extractor now exposes structured source-file evidence by source kind.

Interpretation: source-kind metadata is derived from parser-owned evidence, not from output filenames or Mermaid comments.

Assumption: future source kinds will update the source precedence and tests before use.

Evidence: src/schema/erd-extractor.js diff; mixed-source test; JSON Schema and no-schema extractor assertions.

Affected Files/Modules: src/schema/erd-extractor.js; test/erd-extractor.test.js.

Command or Inspection Method: git diff; focused tests.

Confidence: high.

Operational Impact: reduces false source-kind claims and improves traceability for generated ERD artifacts.

Blocks Completion: no.

Fact: JSC-320 did not perform JSC-321 context fallback work.

Interpretation: parent JSC-318 remains open until downstream context behavior is specified and implemented or explicitly deferred.

Assumption: Linear topology remains as recorded in local artifacts; this eval did not mutate or refetch live Linear.

Evidence: JSC-320 spec/plan non-goals; source diff excludes context-pack files.

Affected Files/Modules: .harness/specs/**; .harness/plan/**; source diff.

Command or Inspection Method: source artifact inspection; git diff --name-only.

Confidence: medium-high.

Operational Impact: prevents premature parent closure and keeps downstream work explicit.

Blocks Completion: yes for JSC-318, no for accepted JSC-320 local closure.

Fact: The current worktree includes unrelated dirty/untracked files outside the evaluated JSC-320 implementation slice.

Interpretation: delivery packaging must stage only the JSC-320 implementation/eval files or intentionally split unrelated work.

Assumption: those unrelated files are user or prior-session changes and should not be reverted.

Evidence: git status showed `.codex/hooks.json`, `.gitignore`, `.harness/**`, `artifacts/policy/environment-attestation.json`, `scripts/check-environment.sh`, and JSC-320 source/test files.

Affected Files/Modules: repository worktree.

Command or Inspection Method: git status --short --branch; git diff --name-only.

Confidence: high.

Operational Impact: commit hygiene and PR scope require care.

Blocks Completion: no for local proof; yes for unattended commit/PR closeout.

Fact: The JSC-320 eval report exists locally and is now visible to normal git staging.

Interpretation: proof persistence is no longer blocked by ignore policy; delivery still requires staging, commit, PR, and Linear linkage.

Assumption: future `.harness/**` artifact families still need explicit unignore rules before they can be treated as normal proof surfaces.

Evidence: `ls -l .harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md` confirmed the file exists; `git check-ignore -v` now resolves this path through the negative unignore rule for `.harness/evals/**`.

Affected Files/Modules: .harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md; .gitignore.

Command or Inspection Method: file existence check; git check-ignore.

Confidence: high.

Operational Impact: the closure proof can be read locally but will be omitted from a normal commit unless deliberately staged.

Blocks Completion: no for proof artifact persistence and local implementation validation; yes for external closure until commit/PR/Linear linkage is complete.
