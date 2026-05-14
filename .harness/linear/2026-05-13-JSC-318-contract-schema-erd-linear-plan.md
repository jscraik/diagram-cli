---
schema_version: 1
artifact_id: jsc-318-contract-schema-erd-linear-plan
artifact_type: he-linear-plan
canonical_slug: jsc-318-contract-schema-erd
title: JSC-318 Linear Execution Plan
harness_stage: he-linear-plan
status: active
date: 2026-05-13
traceability_required: true
linear_status: in_progress
origin: .harness/strategy/2026-05-12-JSC-318-contract-schema-erd-strategy.md
selected_stage: he-linear-plan
linear_issue: JSC-318
linear_url: https://linear.app/jscraik/issue/JSC-318/generate-useful-erds-from-contract-schemas-not-only-sqlprisma
source_strategy: .harness/strategy/2026-05-12-JSC-318-contract-schema-erd-strategy.md
source_refactor: .harness/refactors/2026-05-12-JSC-318-contract-schema-erd-refactor.md
linear_mutation_status: applied
live_linear_blocker: "None; Jamie approved live Linear application and the parent/child topology was created."
required_confirmation: "None; applied to Linear on 2026-05-13."
repo_location_label: "Repo › diagram-cli (preferred); diagram-cli (current live label)"
project_assignment_reason: "JSC-318 already belongs to the bounded deliverable project Diagram product surface and analysis workflow; proposed child issues should inherit it only as slices of that existing deliverable."
cycle_assignment_reason: "No current active-cycle evidence was provided or discovered; leave cycle unset until Jamie admits the work into the current commitment lane."
github_tracking_rule: "Use a JSC-318 branch or child-issue branch and link the PR back to the owning Linear issue before moving any issue to Review or Done."
delivery_evidence_rule: "Each issue must include exact commands run, pass/fail/blocked outcomes, generated artifact paths, and remaining deferred scope before status closure."
last_delta_capture: 2026-05-13
linear_delta_status: "live Linear parent/children still match the planned topology and there are no project milestones; project backlog also contains unrelated Roadmap items. JSC-319 and JSC-320 are In Review with PR #93 linked; JSC-321 is stale in Linear as Backlog with no PR link even though local proof is committed and pushed in 35d56df. The approved next slice is parent closure readiness for JSC-318, blocked on JSC-321 Linear sync, CodeRabbit completion, and an explicit deferred-scope decision for YAML/TypeScript/configured-source work."
approved_next_slice: JSC-318-parent-closure-readiness
approved_next_slice_reason: "P0/P1/P2 local implementation proof now exists on PR #93, so the next HE spec target is not another child implementation slice. Create a parent closure readiness spec for JSC-318 that reconciles JSC-321 live Linear state, records PR/CI evidence, and decides whether YAML, TypeScript, and configured contract sources are explicitly deferred or admitted as new child scope."
subagent_policy: conditional
roles_used: []
roles_recommended:
  - repo-research-analyst
  - learnings-researcher
  - product-lens-reviewer
  - scope-guardian-reviewer
  - project-standards-reviewer
---

# JSC-318 Linear Execution Plan

## Table of Contents
- [Command Summary](#command-summary)
- [Executive Linear Routing Summary](#executive-linear-routing-summary)
- [Linear Delta Capture Gate](#linear-delta-capture-gate)
- [Linear Work Item Contract](#linear-work-item-contract)
- [Linear / Spec / Plan / PR Traceability](#linear--spec--plan--pr-traceability)
- [Target Linear Destination](#target-linear-destination)
- [Existing Project Match](#existing-project-match)
- [Proposed Milestones](#proposed-milestones)
- [Proposed Parent Issues](#proposed-parent-issues)
- [Proposed Sub-Issues](#proposed-sub-issues)
- [Now / Next / Later / Do Not Create](#now--next--later--do-not-create)
- [Dependency Map](#dependency-map)
- [Eval Gate Map](#eval-gate-map)
- [Human vs Agent Execution Map](#human-vs-agent-execution-map)
- [Story / Value Basis](#story--value-basis)
- [Recommended Labels](#recommended-labels)
- [Repo / Location Label](#repo--location-label)
- [Priority Mapping](#priority-mapping)
- [Project / Cycle Justification](#project--cycle-justification)
- [Project Reactivation Recommendation](#project-reactivation-recommendation)
- [Portfolio Ops Items](#portfolio-ops-items)
- [Dev Portfolio Impact](#dev-portfolio-impact)
- [GitHub PR Tracking](#github-pr-tracking)
- [Delivery Evidence](#delivery-evidence)
- [Evidence & Traceability Matrix](#evidence--traceability-matrix)

## Command Summary

BLUF: This plan explains which `diagram-cli` slice the next agent or operator should spec after comparing live Linear with the local harness queue. The document's job is to keep the approved next-slice queue aligned with live Linear, PR evidence, and local `.harness` proof. Route the next spec to `JSC-318` parent closure readiness, not to another child implementation slice, because `JSC-319`, `JSC-320`, and `JSC-321` now have local proof on PR #93 while live Linear still shows `JSC-321` stale as Backlog with no PR link. The decision matters because parent closure would be unsafe until tracker state, PR/review evidence, and deferred YAML/TypeScript/configured-source scope are reconciled.

Decision Needed: Before parent closeout, decide whether YAML schema support, TypeScript contract extraction, and configured contract source globs are explicitly deferred from `JSC-318` or admitted as new child issues.

Top Risks: Treating pushed local proof as live Linear closure, closing the parent while `JSC-321` still appears Backlog in Linear, or silently expanding into YAML/TypeScript work without a fresh spec decision.

Next Action: Create the `JSC-318` parent closure readiness spec, with a required gate to sync `JSC-321` Linear state/PR linkage before any parent completion move.

## Executive Linear Routing Summary

Keep `JSC-318` as the existing parent issue. P0, P1, and P2 are now represented locally by PR #93 and commit `35d56df`, but live Linear still only reflects P0/P1 review state; `JSC-321` remains Backlog with no PR attachment.

Decision Needed: Decide whether the original parent acceptance text's YAML, TypeScript, and configured-source possibilities are deferred from this parent or promoted into new child scope.

Top Risks: Closing `JSC-318` from PR existence alone, ignoring the stale `JSC-321` live tracker state, or creating new YAML/TypeScript issues without a decision spec.

Next Action: Create a parent closure readiness spec for `JSC-318` that proves P0/P1/P2 evidence, names outstanding tracker sync, and records the deferred-scope decision required before parent Done.

Live Linear read on 2026-05-13:

- `JSC-318` title: Generate useful ERDs from contract schemas, not only SQL/Prisma.
- Status: In Progress.
- Priority: High.
- Project: Diagram product surface and analysis workflow.
- Labels: `diagram-cli`, `Drift-Risk`, `Eval`, `Roadmap: Now`, `Agent`, `Improvement`.
- Existing child issues after application: `JSC-319`, `JSC-320`, `JSC-321`.
- Project milestones: none.
- Project backlog also includes unrelated Roadmap issues such as `JSC-160`, `JSC-164`, `JSC-166`, and `JSC-247`; these are not children of `JSC-318` and should not be pulled into this parent closure queue.
- PR #93 status at delta capture: open draft; GitHub checks successful; CodeRabbit status pending.
- Duplicate search result: no duplicate parent found for the exact contract-schema ERD lane.

## Linear Delta Capture Gate

Gate run: 2026-05-13.

Live Linear inputs:

- Project: `Diagram product surface and analysis workflow`.
- Project milestones: none.
- Parent issue: `JSC-318`.
- Live parent status: In Progress.
- Live parent priority: High.
- Live child issues under `JSC-318`: `JSC-319`, `JSC-320`, `JSC-321`.
- Local proof inputs: PR #93 (`https://github.com/jscraik/diagram-cli/pull/93`), commit `35d56dfda2e9317e78eea8ec93c780f084110fbb`, `.harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md`, `.harness/solutions/2026-05-13-jsc-321-context-pack-smoke-path-contract.md`, existing JSC-319/JSC-320 specs/plans/evals/solutions, `src/schema/erd-extractor.js`, `src/core/analysis-generation-diagrams-erd.js`, `src/context/build-context-pack.js`, `test/erd-extractor.test.js`, `test/generate-output-json.test.js`, `test/context-pack.test.js`, and `test/fixtures/erd/contract-schema-json*/`.

Delta classification:

| Item | Live Linear State | Local Harness State | Classification | Queue Impact |
| --- | --- | --- | --- | --- |
| Project | Exists as `Diagram product surface and analysis workflow`; no milestones returned; broader project backlog includes `JSC-160`, `JSC-164`, `JSC-166`, `JSC-247`, and other non-child items | Matches planned destination; broader backlog is outside this parent queue | unchanged-with-broader-backlog | Keep project; do not create milestones; do not pull unrelated project issues into `JSC-318`. |
| `JSC-318` parent | In Progress, High, labels include `diagram-cli`, `Drift-Risk`, `Eval`, `Roadmap: Now`, `Agent`, `Improvement`; PR #93 linked | Parent remains open until child closure proof, PR/review proof, and deferred-scope decision exist | changed-metadata-captured | Keep parent open; next spec should define closure readiness, not new implementation. |
| `JSC-319` P0 | In Review, High, parent `JSC-318`, project assigned, PR #93 linked | Implementation/eval/reinforcement proof exists and is in draft PR review | review-linked | Do not choose as next spec slice; wait for PR review/CodeRabbit or rework. |
| `JSC-320` P1 | In Review, High, parent `JSC-318`, project assigned, PR #93 linked | Implementation/eval/reinforcement proof exists and is in draft PR review | review-linked | Do not choose as next spec slice; wait for PR review/CodeRabbit or rework. |
| `JSC-321` P2 | Backlog, Medium, parent `JSC-318`, project assigned, no PR attachment | Spec/plan/eval/reinforcement exist; commit `35d56df` pushed to PR #93 with local validation evidence | live-tracker-stale | Sync Linear state/PR linkage before parent closure; do not create another JSC-321 spec. |
| Parent closure readiness | No separate child issue; parent remains In Progress | P0/P1/P2 local proof exists; parent eval/deferred-scope decision missing | approved-next-spec-slice | Create a parent closure readiness spec for `JSC-318`. |
| YAML schema support | No child under `JSC-318` | Deferred in strategy/refactor plan | unchanged-deferred-pending-decision | Decide in closure readiness spec whether explicit deferral is enough or a new child should be created. |
| TypeScript contract surfaces | No child under `JSC-318` | Deferred as separate strategy/spec decision | unchanged-deferred-pending-decision | Decide in closure readiness spec whether explicit deferral is enough or a research child should be created. |

Approved next slice queue:

| Rank | Slice | Linear Issue | Queue Status | Spec Status | Reason |
| --- | --- | --- | --- | --- | --- |
| 0 | P0 JSON Schema logical ERD extraction | `JSC-319` | in-review-on-pr-93 | spec/plan/eval/reinforcement exist | Draft PR #93 contains implementation, fixture, validation, and Linear linkage; next action is review/check closure, not another spec. |
| 1 | P1 source-kind metadata and unavailable-state truth | `JSC-320` | in-review-on-pr-93 | spec/plan/eval/reinforcement exist | Draft PR #93 contains additive metadata proof; next action is review/check closure, not another spec. |
| 2 | P2 ERD unavailable fallback guidance in agent context | `JSC-321` | local-proof-pushed-linear-stale | spec/plan/eval/reinforcement exist | Commit `35d56df` pushed to PR #93; live Linear still says Backlog with no PR link, so tracker sync is required before closure. |
| 3 | Parent closure readiness | `JSC-318` | approved-next-spec | missing | P0/P1/P2 local proof exists; create a closure readiness spec to decide deferred scope, CodeRabbit/PR gate, Linear sync, and parent eval requirements. |
| 4 | Parent closure eval | `JSC-318` | blocked | missing parent eval | Parent cannot close until closure readiness spec and live tracker sync are complete. |

Next spec target:

```yaml
selected_issue: JSC-318
selected_slice: "Parent closure readiness after P0/P1/P2 local proof"
spec_path: ".harness/specs/2026-05-13-JSC-318-contract-schema-erd-parent-closure-readiness-spec.md"
source_linear_plan: ".harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md"
depends_on:
  - "JSC-319 local implementation proof"
  - ".harness/evals/2026-05-13-jsc-319-json-schema-logical-erd-diagram-cli-eval.md"
  - "JSC-320 local implementation proof"
  - ".harness/evals/2026-05-13-jsc-320-erd-source-kind-manifest-truth-diagram-cli-eval.md"
  - "JSC-321 local implementation proof"
  - ".harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md"
  - "PR #93 check and review state"
must_not_include:
  - "new YAML schema parsing implementation"
  - "new TypeScript contract extraction implementation"
  - "new configured contract source implementation"
  - "parent Done transition before Linear sync and review evidence"
```

Stop conditions for JSC-318 closure readiness spec:

- If PR #93 or CodeRabbit requests rework that affects P0/P1/P2 behavior, pause parent closure and return to the owning child slice.
- If live Linear cannot be updated or linked for `JSC-321`, block parent closure and record the tracker sync gap.
- If YAML, TypeScript, or configured-source work is not explicitly deferred, create a separate decision/spec before parent closure.
- If parent closeout requires external mutation, stop until Jamie approves the Linear/GitHub update.

## Linear Work Item Contract

| Field | Value |
| --- | --- |
| Parent Linear issue | `JSC-318` |
| Parent status | In Progress |
| Parent project | Diagram product surface and analysis workflow |
| Parent priority | High |
| Child issue sequence | `JSC-319` P0 -> `JSC-320` P1 -> `JSC-321` P2 |
| Approved next spec slice | `JSC-318` parent closure readiness |
| Milestone status | No project milestones returned by live Linear read |
| Closure rule | `JSC-318` stays open until P0/P1/P2 proof, PR/review evidence, Linear tracker sync, deferred-scope decision, and parent closure eval exist |
| External mutation status | Partially stale: `JSC-318`, `JSC-319`, and `JSC-320` are linked to PR #93; `JSC-321` still needs PR linkage/status sync |

## Linear / Spec / Plan / PR Traceability

| Linear issue | Source acceptance IDs | Plan units | Acceptance IDs | PR evidence |
| --- | --- | --- | --- | --- |
| `JSC-318` | Parent acceptance: useful contract-schema ERD, truthful manifest/degraded state, context fallback guidance, SQL/Prisma preservation | P0 `JSC-319`; P1 `JSC-320`; P2 `JSC-321`; parent closure readiness; parent closure eval | P0/P1/P2 local proof exists; closure readiness spec and parent eval missing | PR #93 linked; parent remains open |
| `JSC-319` | JSON Schema logical ERD extraction; local refs; diagnostics; SQL/Prisma preservation | Completed local implementation and eval proof | JSC-319 eval says local implementation proof is satisfied | PR #93 linked; status In Review |
| `JSC-320` | Source-kind metadata; useful/degraded/unavailable manifest truth; additive machine-output compatibility | Completed local implementation and eval proof | JSC-320 eval says local implementation proof is satisfied | PR #93 linked; status In Review |
| `JSC-321` | Context-pack unavailable ERD fallback guidance | Completed local implementation and eval proof | JSC-321 eval says local implementation proof is satisfied | Commit `35d56df` on PR #93; live Linear still Backlog/no PR link |

## Target Linear Destination

- Team: Jscraik.
- Existing parent: `JSC-318`.
- Existing project: Diagram product surface and analysis workflow.
- Preferred repo label: `Repo › diagram-cli`.
- Live-compatible repo label: `diagram-cli`.
- Status target before closure: parent remains In Progress; do not move parent to Done until P0/P1/P2 tracker state, PR/review evidence, deferred-scope decision, and closure eval are complete.
- Cycle target: unset until Jamie explicitly admits the work into the current cycle.

Do not create a new project for this work. The existing project is the correct bounded deliverable because the work changes Archscope diagram generation and analysis workflow behavior.

## Existing Project Match

`JSC-318` already belongs to `Diagram product surface and analysis workflow`, which matches the scope:

- It changes the diagram product surface by making ERD output useful for contract-heavy repositories.
- It changes analysis workflow truth by separating successful ERDs from unavailable/degraded ERDs.
- It changes agent-facing generated context by preventing empty ERDs from looking complete.

No reactivation is needed if the project is active. If the project is stale or paused, reactivate only the JSC-318 slice with a status update that names the P0/P1/P2 sequence and says YAML/TypeScript are deferred.

## Proposed Milestones

| Milestone | Linear representation | Status | Exit evidence |
| --- | --- | --- | --- |
| M0 planning topology | This `.harness/linear` artifact | complete locally | Strategy/refactor/Linear evidence aligned; no live mutation without approval |
| M1 JSON Schema proof | Child issue: JSON Schema logical ERD extractor | ready to create | JSON Schema fixture produces non-placeholder ERD; SQL/Prisma tests still pass |
| M2 Artifact truth | Child issue: ERD source-kind metadata and manifest truth | ready to create | Generate-all manifest distinguishes useful/degraded/unavailable ERDs additively |
| M3 Agent context fallback | Child issue: ERD unavailable guidance in context pack | ready to create | `AI/context/diagram-context.md` gives actionable fallback guidance |
| M4 Deferred contract expansion | Later child or future issue: YAML schema support | defer | JSON Schema model contract is stable and YAML parser policy is chosen |
| M5 TypeScript contract strategy | Later research issue | defer | Separate AST/type-resolution strategy approved before implementation |
| M6 Closure eval | Parent closeout evidence | not a separate child by default | Eval artifact proves acceptance criteria and deferred scope is explicit |

## Proposed Parent Issues

### Existing Parent Update: JSC-318

Template: Feature.

Mutation status: applied.

Recommended update:

- Keep title unchanged.
- Keep project `Diagram product surface and analysis workflow`.
- Keep priority High.
- Add or preserve labels: `diagram-cli`, `Agent`, `Improvement`, `Roadmap: Now`, `Eval`, `Drift-Risk`.
- Do not add `Feature` to the parent while `Improvement` is present; Linear treats them as mutually exclusive type labels.
- Add plan links:
  - `.harness/strategy/2026-05-12-JSC-318-contract-schema-erd-strategy.md`
  - `.harness/refactors/2026-05-12-JSC-318-contract-schema-erd-refactor.md`
  - `.harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md`
- Add parent closeout rule: Parent is not Done until P0/P1/P2 are complete, closure eval exists, and YAML/TypeScript/configured-source scope is either implemented or explicitly deferred.

Ready-to-update payload:

```yaml
id: JSC-318
title: Generate useful ERDs from contract schemas, not only SQL/Prisma
team: Jscraik
project: Diagram product surface and analysis workflow
priority: 2
labels:
  - diagram-cli
  - Agent
  - Improvement
  - Roadmap: Now
  - Eval
  - Drift-Risk
state: Backlog
description_patch: |
  Add execution plan links:
  - .harness/strategy/2026-05-12-JSC-318-contract-schema-erd-strategy.md
  - .harness/refactors/2026-05-12-JSC-318-contract-schema-erd-refactor.md
  - .harness/linear/2026-05-13-JSC-318-contract-schema-erd-linear-plan.md

  Parent closeout rule:
  JSC-318 is not complete until JSON Schema logical ERDs, source-kind/manifest truth, and agent-context unavailable guidance are implemented and validated. YAML, TypeScript, and configured contract sources must be either implemented with evidence or explicitly deferred.
```

## Proposed Sub-Issues

### Child 1: JSON Schema Logical ERD Extractor

Template: Feature.

Timing: Now.

Mutation status: applied as `JSC-319`.

Ready-to-create payload:

```yaml
title: "JSC-318 P0: Add JSON Schema logical ERD extraction"
team: Jscraik
parentId: JSC-318
project: Diagram product surface and analysis workflow
priority: 2
labels:
  - diagram-cli
  - Agent
  - Feature
  - Roadmap: Now
  - Eval
  - Drift-Risk
description: |
  ## Goal
  Add the smallest reversible logical-contract ERD source path by supporting JSON Schema files without changing SQL or Prisma ERD behavior.

  ## Scope
  - Add `json-schema` as a source kind after `prisma` and `sql`.
  - Discover `**/*.schema.json` through the existing ignore pipeline.
  - Parse object definitions into ERD entities and attributes.
  - Mark required properties as non-nullable where the current model can carry it.
  - Extract explicit relationships from local `$ref` and array `items.$ref`.
  - Add a minimal contract-heavy fixture with no `.sql` or `schema.prisma`.
  - Preserve existing SQL/Prisma extractor tests.

  ## Non-goals
  - YAML parsing.
  - TypeScript AST/type extraction.
  - Remote JSON Schema reference resolution.
  - Renderer rewrite.
  - Fake database schema files in consumer repos.

  ## Validation
  - `npm test -- test/erd-extractor.test.js`
  - Existing SQL/Prisma ERD fixture assertions remain passing.

  ## Closeout Evidence
  Record generated fixture ERD output, exact command outcomes, and any deferred schema dialect limitations.
```

### Child 2: ERD Source-Kind Metadata and Manifest Truth

Template: Feature.

Timing: Next, after Child 1.

Mutation status: applied as `JSC-320`.

Ready-to-create payload:

```yaml
title: "JSC-318 P1: Make ERD source-kind and unavailable state truthful"
team: Jscraik
parentId: JSC-318
project: Diagram product surface and analysis workflow
priority: 2
labels:
  - diagram-cli
  - Agent
  - Feature
  - Roadmap: Now
  - Eval
  - Drift-Risk
description: |
  ## Goal
  Make generated ERD metadata and generate-all manifest entries distinguish useful, degraded, and unavailable ERDs without a breaking machine-output schema change.

  ## Scope
  - Preserve additive metadata only.
  - Expose source-kind truth such as database schema, JSON Schema contract schema, mixed source, or none.
  - Ensure contract-heavy JSON Schema output is not classified as a placeholder.
  - Ensure no-source ERDs remain visibly degraded/unavailable.
  - Keep SQL/Prisma metadata behavior compatible.

  ## Non-goals
  - New public config fields.
  - Manifest schema migration unless separately admitted.
  - YAML or TypeScript support.

  ## Validation
  - `npm test -- test/evidence-manifest-parity.test.js test/erd-extractor.test.js`
  - Focused `generate-all` fixture command for the contract-heavy fixture.

  ## Closeout Evidence
  Record manifest snippets or paths that show useful JSON Schema ERD metadata and no-source degraded/unavailable truth.
```

### Child 3: ERD Unavailable Guidance in Agent Context

Template: Feature.

Timing: Next, after Child 2.

Mutation status: applied as `JSC-321`.

Ready-to-create payload:

```yaml
title: "JSC-318 P2: Add ERD unavailable fallback guidance to agent context"
team: Jscraik
parentId: JSC-318
project: Diagram product surface and analysis workflow
priority: 3
labels:
  - diagram-cli
  - Agent
  - Improvement
  - Roadmap: Next
  - Eval
  - Drift-Risk
description: |
  ## Goal
  Make `AI/context/diagram-context.md` tell agents when the ERD is unavailable and point them to better fallback diagrams or contract artifacts.

  ## Scope
  - Detect degraded/unavailable ERD state from generated artifact metadata.
  - Add concise context-pack guidance for no-schema or no-contract-source repositories.
  - Preserve normal context output when ERD generation succeeds.
  - Add focused context-pack test coverage.

  ## Non-goals
  - Broad rewrite of context-pack layout.
  - More contract parsers.
  - Claiming ERD completeness when the artifact only contains comments.

  ## Validation
  - `npm test -- test/context-pack.test.js`
  - Relevant focused ERD/manifest tests from P0/P1 if shared behavior changes.

  ## Closeout Evidence
  Record context output path and exact fallback copy behavior for unavailable ERDs.
```

### Deferred Child Candidate: YAML Schema Contracts

Template: Feature.

Timing: Later.

Mutation status: do-not-create-now.

Create only if JSON Schema semantics are stable and YAML support remains needed after P0-P2.

### Deferred Child Candidate: TypeScript Contract Surfaces

Template: Research.

Timing: Later.

Mutation status: do-not-create-now.

Create only as a separate strategy/spec issue because TypeScript likely needs AST parsing, project-aware type resolution, or explicit configured source policy.

## Now / Next / Later / Do Not Create

Now:

- `JSC-318` has a Linear comment linking the strategy, refactor, and linear plan artifacts.
- Child 1 was created as `JSC-319` for JSON Schema logical ERD extraction.
- Child 2 was created as `JSC-320` for source-kind metadata and manifest truth.
- Child 3 was created as `JSC-321` for agent context unavailable guidance.
- P0/P1/P2 local proof is now on PR #93.

Next:

- Create the `JSC-318` parent closure readiness spec.
- Sync `JSC-321` Linear status/PR linkage after explicit mutation approval.
- Add closure eval evidence before parent completion.

Later:

- YAML schema contracts once JSON Schema establishes the logical model contract.
- TypeScript contract strategy as research/spec, not implementation-by-accident.
- Configured contract source globs only if fixture and repo evidence prove discovery defaults are insufficient.

Do Not Create:

- A duplicate parent for JSC-318.
- A new project for this issue.
- A fake `schema.prisma` workaround issue.
- Separate child issues for every JSON Schema dialect edge case before the P0 fixture proves the path.
- A TypeScript implementation ticket without a prior AST/type-resolution decision.
- A cycle assignment without explicit current-cycle commitment.

## Dependency Map

```mermaid
flowchart TD
  Parent["JSC-318 parent"] --> P0["P0 JSON Schema logical ERD"]
  P0 --> P1["P1 source-kind metadata and manifest truth"]
  P1 --> P2["P2 agent context fallback"]
  P0 --> Eval["Closure eval"]
  P1 --> Eval
  P2 --> Eval
  P0 -. stabilizes logical model .-> P3["Later YAML schema support"]
  P0 -. informs source strategy .-> P4["Later TypeScript contract research"]
```

Hard dependency: P1 should not start before P0 has a real JSON Schema fixture, because manifest truth needs a useful contract-heavy ERD to prove.

Soft dependency: P2 can start with no-source behavior, but it should wait for P1 if the context-pack needs source-kind metadata rather than comment inspection.

## Eval Gate Map

| Gate | Owning Linear issue | Required evidence | Closeout rule |
| --- | --- | --- | --- |
| JSON Schema fixture emits useful ERD | `JSC-319` | `npm test -- test/erd-extractor.test.js`; fixture output path/snippet | Must pass before P0 Done |
| SQL/Prisma behavior preserved | `JSC-319` | Existing ERD tests pass unchanged or changes are explicitly justified | Must pass before P0 Done |
| Manifest distinguishes useful/degraded/unavailable | `JSC-320` | `npm test -- test/evidence-manifest-parity.test.js test/erd-extractor.test.js`; focused generate-all output | Must pass before P1 Done |
| Agent context gives fallback guidance | `JSC-321` | `npm test -- test/context-pack.test.js`; context artifact path/snippet | Must pass before P2 Done |
| Parent closure readiness | `JSC-318` | `.harness/specs/2026-05-13-JSC-318-contract-schema-erd-parent-closure-readiness-spec.md` or successor | Must decide tracker sync, review gates, and deferred YAML/TypeScript/configured-source scope before parent eval |
| Parent acceptance closure | JSC-318 | `.harness/evals/2026-05-12-JSC-318-diagram-cli-contract-schema-erd-eval.md` or successor | Must exist before parent Done |

## Human vs Agent Execution Map

Agent-suitable:

- P0 fixture creation, parser implementation, focused tests.
- P1 additive metadata tests and manifest behavior checks.
- P2 context-pack guidance and tests.
- Closure eval drafting from command evidence.

Human review required:

- Whether JSON Schema dialect coverage is acceptable.
- Whether unavailable/degraded metadata changes are additive enough for machine-output consumers.
- Whether YAML should enter the same parent scope after P0-P2.
- Whether TypeScript contract extraction is worth the parser/runtime cost.
- Whether to move parent or children into the current cycle.

## Story / Value Basis

User story:

As a user of Archscope on contract-heavy repositories, I want ERD output to model logical contract entities when SQL/Prisma schemas do not exist, so generated architecture packs tell agents and humans the truth about the repository instead of producing an empty-but-present ERD.

Business value:

- Improves trust in generated architecture evidence.
- Makes Archscope more useful on agent/governance/control-plane repositories.
- Prevents artifact completeness drift in `generate-all`.
- Gives reviewers and agents a clearer fallback path when ERD is unavailable.

## Recommended Labels

Existing labels to preserve:

- `diagram-cli`
- `Agent`
- `Improvement`

Recommended labels to add where available:

- `Feature` for parent, P0, and P1.
- `Roadmap: Now` for parent, P0, and P1.
- `Roadmap: Next` for P2.
- `Eval` for parent and children.
- `Drift-Risk` for parent and children.

Do not use `Blocked` unless mutation approval, dependency selection, or implementation evidence becomes unavailable.

## Repo / Location Label

Preferred contract label: `Repo › diagram-cli`.

Live Linear label discovered: `diagram-cli` with parent `Repo`.

Decision:

- Use `diagram-cli` for immediately createable payloads because it exists.
- Record `Repo › diagram-cli` as the preferred display name in local planning artifacts.
- Do not create or rename labels without separate confirmation; label taxonomy changes are portfolio operations, not JSC-318 implementation.

## Priority Mapping

| Work item | Priority | Reason |
| --- | --- | --- |
| JSC-318 parent | High | Live issue already High; acceptance criteria affect product trust |
| P0 JSON Schema extractor | High | Smallest proof-producing slice and direct acceptance criterion |
| P1 Manifest truth | High | Prevents empty artifacts from looking successful |
| P2 Agent context fallback | Medium | Important agent UX, but depends on source-kind/degraded truth |
| YAML schema support | Medium later | Valuable but not needed to prove first source-kind path |
| TypeScript contract strategy | Medium later | Potentially high value, but higher design/runtime risk |

## Project / Cycle Justification

Project assignment:

- Keep parent in `Diagram product surface and analysis workflow`.
- Assign children to the same project only if created as children of `JSC-318`.
- Do not create a new project because the work is a bounded issue slice inside an existing diagram product workflow project.

Cycle assignment:

- Leave unset now.
- Assign P0 to a cycle only when Jamie explicitly says JSC-318 is current work.
- Do not cycle-assign P1/P2 until P0 is admitted or underway.

## Project Reactivation Recommendation

If the existing project is inactive or stale, post a project status update rather than creating new structure:

```markdown
JSC-318 is ready to reactivate as a staged contract-schema ERD lane.

Now: JSON Schema logical ERD extraction.
Next: source-kind/manifest truth and agent context fallback.
Deferred: YAML support, TypeScript contract extraction, and configured contract source discovery until P0-P2 evidence exists.
```

No project status mutation has been applied.

## Portfolio Ops Items

Recommended, not part of JSC-318 implementation:

- Decide whether repo labels should display as `Repo › diagram-cli` or current `diagram-cli` parented under `Repo`.
- Consider a reusable `Drift-Risk` plus `Eval` label pattern for generated-artifact truth issues.
- Keep parent issue descriptions short and link repo-local plans instead of duplicating full implementation contracts into Linear.

## Dev Portfolio Impact

This issue improves the product claim that Archscope can produce useful architecture evidence across real repositories, not only database-backed apps. The strongest portfolio signal is not broader ERD marketing; it is truthful evidence packs:

- Useful when contract entities exist.
- Explicitly degraded when no supported source exists.
- Clear to agents when ERD should not be trusted.

The work should stay small enough that `diagram-cli` remains reliable for current SQL/Prisma users while opening the logical-contract path for governance-heavy repos.

## GitHub PR Tracking

- Branch recommendation for parent-level implementation: `jscraik/jsc-318-generate-useful-erds-from-contract-schemas-not-only`.
- If children are created, prefer child-specific branches that include the child identifier once Linear assigns it.
- PR title should mention the owning Linear issue.
- PR description should link:
  - `JSC-318`
  - this linear plan
  - strategy artifact
  - refactor artifact
  - closure eval when created
- Do not close Linear issues from PR existence alone; require validation evidence and artifact paths.

## Delivery Evidence

Planning evidence already available:

- `bash scripts/codex-preflight.sh --mode optional` passed with a local-memory status warning but REST health/smoke passed.
- Linear fetch for `JSC-318` succeeded on 2026-05-13.
- Linear child issue search for `parentId=JSC-318` returned none before creation, then `JSC-319`, `JSC-320`, and `JSC-321` after application.
- Linear label listing found live `diagram-cli`, `Agent`, `Improvement`, `Feature`, `Roadmap: Now`, `Roadmap: Next`, `Eval`, and `Drift-Risk` labels.
- Parent label update initially rejected `Feature` plus `Improvement` because those labels are mutually exclusive; parent was applied with `Improvement` and without `Feature`.
- Linear comment `a8198add-3c48-4aeb-97b9-c39ade12e401` was created on `JSC-318`.
- Strategy and refactor artifacts both exist locally.

Implementation evidence required later:

- JSC-321 Linear status and PR link sync evidence.
- CodeRabbit completion or explicit blocker status for PR #93.
- Deferred-scope decision for YAML schemas, TypeScript contract extraction, and configured contract source globs.
- Closure readiness spec before parent eval.
- Closure eval artifact before parent completion.

## Evidence & Traceability Matrix

| Claim | Evidence | Confidence | Linear impact |
| --- | --- | --- | --- |
| JSC-318 already exists and should remain parent | Live Linear fetch for `issue:JSC-318` | High | Update existing parent, do not create duplicate |
| Parent had no child issues before application | Live Linear list with `parentId=JSC-318` returned empty | High | Children were safe to create |
| Child topology was applied | Linear created `JSC-319`, `JSC-320`, and `JSC-321` under `JSC-318` | High | Work is now live-trackable |
| Project assignment already matches | Live Linear project is `Diagram product surface and analysis workflow` | High | Keep project |
| Parent priority is High | Live Linear priority value 2 | High | Keep parent/P0/P1 High |
| Current labels are `diagram-cli`, `Agent`, `Improvement` | Live Linear fetch | High | Preserve labels |
| Preferred repo-label style is not live as named | Live label list contains `diagram-cli` under `Repo`, not `Repo › diagram-cli` | Medium | Use live label now; record preferred label as portfolio ops |
| P0 should be JSON Schema only | Strategy/refactor artifacts | High | Create first child as JSON Schema source-kind proof |
| P2 local proof exists | Commit `35d56df` and `.harness/evals/2026-05-13-jsc-321-erd-unavailable-context-fallback-diagram-cli-eval.md` | High | Do not create another JSC-321 spec; sync Linear and move to closure readiness |
| JSC-321 live tracker is stale | Live Linear fetch shows Backlog/no PR attachment while PR #93 contains JSC-321 proof | High | Block parent closure until tracker sync |
| YAML and TypeScript should be deferred unless explicitly re-admitted | Strategy/refactor artifacts plus parent acceptance text | Medium-high | Capture the deferral decision in closure readiness spec |
| Live mutation was authorized | Jamie said "apply to linear" | High | `linear_mutation_status: applied` |
