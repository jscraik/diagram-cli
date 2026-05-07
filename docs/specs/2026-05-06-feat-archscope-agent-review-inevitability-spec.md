---
schema_version: 1
title: Archscope Agent Review Inevitability Contract
type: feat
status: draft
date: 2026-05-06
origin: Codex blunt product critique on Archscope usefulness and agent-review fit
risk: medium
spec_depth: full
ui_required: false
traceability_required: true
linear_status: created
linear_issue: JSC-280
linear_url: https://linear.app/jscraik/issue/JSC-280/make-archscope-inevitable-for-coding-agents-and-pr-reviewers
linear_team: Jscraik
linear_priority: Medium
---

# Archscope Agent Review Inevitability Contract

## Spec Mode Decision

**Mode:** standard-spec
**Depth:** full
**UI companion required:** no

This spec turns the product critique from May 6, 2026 into a tracked
requirements contract for making Archscope feel inevitable before PR review and
before AI coding agents edit a repository. It builds on the completed
product-sharpness work and the existing evidence-pack contract. It does not
replace the current `scan` implementation, reopen the package or repository
rename decision, or authorize a second analysis pipeline.

## Table of Contents

- [Spec Mode Decision](#spec-mode-decision)
- [Problem Statement](#problem-statement)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Linear Work Item Contract](#linear-work-item-contract)
- [System Boundary](#system-boundary)
- [Baseline Context](#baseline-context)
- [Source Evidence](#source-evidence)
- [Session Collector Evidence](#session-collector-evidence)
- [Technical Review Findings](#technical-review-findings)
- [Core Domain Model](#core-domain-model)
- [Implementation Constraints](#implementation-constraints)
- [Agent Review Lifecycle](#agent-review-lifecycle)
- [Interfaces and Dependencies](#interfaces-and-dependencies)
- [Invariants / Safety Requirements](#invariants--safety-requirements)
- [Failure Model and Recovery](#failure-model-and-recovery)
- [Observability](#observability)
- [Acceptance and Test Matrix](#acceptance-and-test-matrix)
- [Linear Acceptance Traceability](#linear-acceptance-traceability)
- [First Slice Recommendation](#first-slice-recommendation)
- [Open Questions](#open-questions)
- [Planning and Implementation Handoff](#planning-and-implementation-handoff)
- [Definition of Done](#definition-of-done)

## Problem Statement

Archscope has a strong north star:

```text
Architecture evidence for humans and AI coding agents.
```

The current repository already moved beyond the weaker "diagram generator"
positioning. `archscope scan .` creates an evidence pack, machine-readable
outputs use a stable envelope, the manifest gives agents a read order, and PR
mode can surface risk, changed components, reviewer checks, and raw evidence
artifacts.

The remaining problem is not whether Archscope is a good idea. The remaining
problem is that the best workflow is not yet obvious enough:

```text
Run Archscope before review or agent edits, then let humans and agents consume
the same evidence set.
```

The product still carries diagram-era identity debt, a broad command surface,
and some first-run friction. Agents can follow documented recipes, but the
command names and generated artifacts should be more prescriptive. Human
reviewers can inspect a brief and report, but the brief should behave more like
a decision note than a generic summary. Validation should also avoid ceremonial
green checks that are easy for agents to over-trust.

## Goals

- Make the highest-value workflow explicit and hard to miss:
  `archscope agent-pr . --base origin/main --head HEAD`.
- Add first-class agent-facing commands only as thin wrappers over the existing
  `scan` evidence workflow.
- Make `.diagram/agent-context.json` tell agents how to behave, not only what
  artifacts exist.
- Make `.diagram/brief.md` answer review-readiness questions: what changed,
  what risk exists, what should be inspected, and whether partial evidence
  affects the decision.
- Preserve shared evidence between humans and agents through
  `.diagram/manifest.json`, `.diagram/brief.md`, `.diagram/report.html`,
  `.diagram/agent-context.json`, and PR impact artifacts.
- Make blocked, partial, and failed states actionable for agents with clear
  retry, fetch, continue, stop, or fail-gate guidance.
- Cover operational blocker categories that recur in recent agent sessions:
  approval required, network unavailable, permission denied, timeout, git state,
  missing files, lint failures, and test failures.
- De-emphasize diagram-era and media-generation surfaces from first-run paths
  without removing compatibility.
- Make validation evidence meaningful enough that agents do not mistake no-op
  scripts for substantive quality gates.

## Non-Goals

- Renaming `@brainwav/diagram`, `diagram-cli`, `.diagram`, or `.diagramrc`.
- Removing the `diagram` compatibility command.
- Removing `generate`, `generate-all`, `generate-video`, or
  `generate-animated`.
- Adding a hosted service, daemon, database, network dependency, or dashboard.
- Replacing `workflow pr`, `context`, `validate`, or the current `scan`
  evidence pipeline.
- Creating a second agent-specific analysis pipeline.
- Ingesting raw session history into Archscope artifacts as part of this slice.
- Broadly refactoring `src/core/analysis-generation-*`.
- Redesigning `.diagram/report.html`.
- Changing the Archscope compatibility finalization policy.
- Treating migration ledgers, historical specs, or governance machinery as
  first-run product surfaces.

## Linear Work Item Contract

- `linear_status`: created
- Tracker of record: JSC-280
- Linear URL:
  https://linear.app/jscraik/issue/JSC-280/make-archscope-inevitable-for-coding-agents-and-pr-reviewers
- Team: Jscraik
- Priority: Medium
- State at spec creation: Triage
- Branch suggestion:
  `jscraik/jsc-280-make-archscope-inevitable-for-coding-agents-and-pr-reviewers`
- Planning status: ready for `$he-plan`
- PR delivery expectation: implementation PRs must link JSC-280 and this spec.

## System Boundary

In scope:

- CLI command aliases or wrappers for agent repository and PR review workflows.
- Agent-facing command help, docs, and machine-output guidance.
- `agent-context.json` guidance fields for read order, safe skips, before-edit
  checks, and blocked-state recovery.
- `brief.md` decision-note structure for repository and PR scans.
- Terminal summaries that lead with review decision value.
- Machine-readable failure semantics and next safe actions.
- Documentation hierarchy that makes agent and PR review workflows the front
  door.
- Validation-script truthfulness where no-op checks can mislead agents.

Out of scope:

- Analysis accuracy improvements beyond surfacing existing evidence more
  clearly.
- HTML report visual redesign.
- New diagram types.
- Package and repository rename sequencing.
- Broad internal architecture refactors.
- Release ledger or migration policy changes.

## Baseline Context

Live repository evidence at spec time:

- `README.md` defines Archscope as architecture evidence for humans and AI
  coding agents.
- `README.md` says: "Before you review a PR, run Archscope. Before an AI agent
  edits a repo, give it Archscope evidence."
- `README.md` identifies `archscope scan .` as the default evidence-pack
  workflow and documents manifest-first agent read order.
- `package.json` still publishes as `@brainwav/diagram`, exposes both
  `archscope` and `diagram` bins, and keeps diagram-era keywords.
- `src/diagram.js` registers the broad command surface, with media commands
  already separated as optional advanced media in unknown-command help.
- `src/commands/scan.js` coordinates analysis, diagram output, PR evidence,
  brief, agent context, report, manifest, machine envelope, and exit behavior.
- `src/artifacts/evidence-manifest.js` gives artifacts explicit status,
  role, optionality, reason, and error category fields.
- `src/artifacts/agent-context.js` currently provides summary, artifacts,
  components, read order, warnings, errors, and PR data, but not prescriptive
  agent behavior.
- `src/artifacts/brief.js` currently provides a structured evidence brief, but
  it can be sharper as a review decision artifact.
- `package.json` contains meaningful test and deep-regression scripts, but
  `lint`, `typecheck`, and `docs:lint` are no-op placeholders.
- `docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md`
  already identified product blur, exit-code semantics, error categories, and
  deferred `agent` / `agent-pr` aliases.

## Source Evidence

This spec is grounded in the May 6, 2026 product critique:

- Archscope is strategically strongest as architecture evidence for PR
  reviewers and AI coding agents, not as a Mermaid diagram generator.
- The strongest product flow is shared evidence: reviewers and agents read the
  same artifact set before code changes or approval.
- `archscope scan . --base origin/main --head HEAD` is useful, but the intended
  workflow should become more obvious through agent-specific wrappers.
- `agent-context.json` should tell agents how to behave safely: what to read,
  what to skip, what to check before editing, and how to respond to blocked
  states.
- `brief.md` should answer review-decision questions instead of acting only as
  a generated summary.
- Failure semantics are more valuable to agents than another diagram type.
- Media commands should remain available, but they should not compete with the
  core product story.
- No-op validation scripts are uncomfortable in a tool whose product promise is
  evidence.

## Session Collector Evidence

This spec was refreshed with local evidence from `~/.agents/session-collector`
so the blocked-state contract reflects observed agent friction rather than
generic guesses.

Collector command used:

```bash
UV_CACHE_DIR=/tmp/session-collector-uv-cache uv run --python 3.12 python main.py --days 14 --max-sessions 200 --bundle-dir /tmp/diagram-cli-session-evidence --output /tmp/diagram-cli-session-collector.json --verbose
```

Collector output:

- Sessions written: 200.
- Evidence window: 2026-05-03 through 2026-05-06.
- Source mix: 190 Codex rollout sessions and 10 Codex conversations.
- `diagram-cli` appeared in 16 project-hinted sessions.
- Harness-engineering stages were prominent, including `he-spec`, `he-plan`,
  `he-work`, `he-code-review`, and `he-heartbeat`.
- Collector health reported no parse warnings.
- Redaction was active; sensitive-looking paths or values were summarized.
- Some sessions lacked enough evidence for outcome classification.

High-friction categories observed across the collected sessions:

- `approval_required`
- `network`
- `lint_failure`
- `missing_file`
- `permission`
- `timeout`
- `git_state`
- `test_failure`

Spec implications:

- Agent-facing failure semantics must cover recurring environment and workflow
  blockers, not only PR refs, partial analysis, and internal errors.
- `agent-context.json`, `brief.md`, terminal output, and machine envelopes
  should provide recovery hints for the blocker categories above.
- Session-derived evidence must remain summarized and redacted; generated
  product artifacts must not embed raw private session paths, sensitive values,
  or unredacted transcript content.
- Plans and PRs that use collector evidence must preserve collector limitations
  instead of overclaiming complete coverage.

## Technical Review Findings

The deepening pass reviewed the current command and artifact implementation:

- `src/diagram.js` registers top-level commands directly through Commander.
  Adding `agent` and `agent-pr` therefore needs either thin registration
  wrappers or a small shared scan runner extracted from `registerScanCommand`.
- `src/commands/scan.js` currently keeps the scan action inline and emits a
  machine envelope with `command: "scan"`. Agent wrappers need an explicit
  decision on whether the envelope command remains `scan` or reflects the
  invoked wrapper.
- `createScanSummary` currently emits one prose `nextAction`. The spec needs a
  structured `nextSafeAction` contract so agents can branch on category,
  severity, and retryability without parsing text.
- `inferWorkflowPrErrorCategory` currently distinguishes missing refs from a
  few generic internal-error cases. The operational friction taxonomy requires
  broader normalization for permission, timeout, network, missing file, lint,
  test, and approval blockers.
- `src/artifacts/agent-context.js` already has the right place for prescriptive
  guidance, but current output has only `readOrder`, warnings, errors, and PR
  data. `agentInstructions` should be added there rather than bolted onto the
  HTML report.
- `src/artifacts/brief.js` already has stable sections, but review readiness is
  still mostly a decision line. The decision brief should gain explicit
  sections for review readiness, changed areas, inspection targets, blocked
  evidence, and next safe action.
- `src/artifacts/evidence-manifest.js` already records artifact status,
  optionality, reason, and error category. New requirements should reuse those
  fields and avoid creating a parallel artifact-state model.
- Existing tests already cover scan manifests, PR evidence composition, error
  categories, report fallback, agent-context schema validation, and machine
  envelopes. New tests should extend those fixtures instead of adding a second
  test style.

## Core Domain Model

- `SharedEvidenceSet`
  - The local artifact set consumed by humans and agents before review or
    edits.
  - Required core artifacts: manifest, brief, agent context, report when
    written, and PR impact when refs are supplied.

- `AgentReviewEntrypoint`
  - A first-class CLI command intended for AI coding agents.
  - Required commands:
    - `archscope agent [path]`
    - `archscope agent-pr [path] --base <ref> --head <ref>`
  - Required implementation posture: delegate to existing scan and PR evidence
    logic without a second analysis path.

- `AgentInstructions`
  - A prescriptive object in `agent-context.json` that tells agents how to use
    the evidence safely.
  - Required domains: read order, safe skips, before-edit checks, blocked-state
    recovery, and partial-evidence rules.

- `ReviewDecisionBrief`
  - A human-readable decision note generated in `.diagram/brief.md`.
  - Required answer shape: review readiness, changed areas, risk, reviewer
    checks, primary artifacts, partial-state caveats, and next reads.

- `NextSafeAction`
  - A machine- and human-readable recommendation for what to do after command
    completion.
  - Required values must distinguish retry, fetch refs, continue with partial
    evidence, stop before editing, fail the gate, and report an internal error.
  - Required shape:

    ```json
    {
      "action": "continue_with_written_artifacts",
      "category": "success",
      "retryable": false,
      "requiresHuman": false,
      "reason": "All required evidence artifacts were written.",
      "commands": [],
      "readNext": [".diagram/manifest.json", ".diagram/brief.md"]
    }
    ```
  - `action` must be one of `continue_with_written_artifacts`, `fetch_refs`,
    `rerun_repository_scan`, `request_approval`, `request_permission`,
    `retry_with_network`, `retry_narrower_scope`, `fix_git_state`,
    `fix_validation_failure`, `regenerate_missing_file`, `stop_before_editing`,
    `fail_gate`, or `report_internal_error`.

- `OperationalFrictionSignal`
  - A normalized blocker hint used to turn observed or detected agent friction
    into recovery guidance.
  - Required categories: `approval_required`, `network`, `permission`,
    `timeout`, `git_state`, `missing_file`, `lint_failure`, `test_failure`,
    `git_refs_missing`, `analysis_partial`, `artifact_write_failed`, and
    `internal_error`.
  - Required posture: summarize the category and next action without exposing
    raw local telemetry content.

- `ValidationTruthfulness`
  - A validation contract that prevents agents from treating no-op quality
    scripts as real assurance.
  - Required behavior: no-op checks must either be removed from authoritative
    validation paths or emit explicit "not configured" status that agents can
    parse.

## Implementation Constraints

- Prefer extracting a shared scan execution helper over duplicating the scan
  action body if wrappers cannot safely forward through Commander.
- If wrappers forward through argument rewriting, tests must prove there is no
  drift between `scan`, `agent`, and `agent-pr` artifacts.
- Machine envelopes for wrapper commands must be explicit: `command` should
  reflect the invoked command (`agent` or `agent-pr`), `data.delegatedCommand`
  should record `scan`, and `data.scanEquivalent` should record the equivalent
  `archscope scan ...` invocation.
- Human terminal output for `agent-pr` should lead with architecture review
  readiness and risk before generic pack initialization language.
- `agentInstructions` must be generated from manifest status, errors, warnings,
  PR impact, and next-safe-action data; it must not scrape markdown or HTML.
- `OperationalFrictionSignal` normalization should be centralized so terminal
  text, machine output, brief, and agent context cannot disagree.
- Validation truthfulness changes must be kept separate from command-wrapper
  mechanics if the combined diff becomes hard to review.

## Agent Review Lifecycle

1. A human, automation, or agent invokes the repository entrypoint:
   `archscope agent .`.
2. For PR work, the caller invokes:
   `archscope agent-pr . --base origin/main --head HEAD`.
3. The command delegates to the existing scan evidence workflow with
   deterministic machine output when machine mode is requested.
4. Archscope writes the shared evidence set and records artifact status in the
   manifest.
5. `brief.md` presents review readiness, risk, and next reads.
6. `agent-context.json` presents parser-safe evidence plus explicit agent
   behavior.
7. The caller follows the next safe action:
   - continue with written artifacts,
   - fetch or fix missing refs,
   - report partial evidence,
   - stop before editing,
   - fail a gate,
   - or report an internal error.

## Interfaces and Dependencies

CLI interfaces:

- `archscope agent [path]`
- `archscope agent-pr [path] --base <ref> --head <ref>`
- Existing delegated workflow:
  `archscope scan [path] --base <ref> --head <ref>`
- Existing compatibility command:
  `diagram`

Artifact interfaces:

- `.diagram/manifest.json`
- `.diagram/brief.md`
- `.diagram/report.html`
- `.diagram/agent-context.json`
- `.diagram/pr-impact/pr-impact.json`

Required `agent-context.json` additions:

- `agentInstructions.readFirst`: ordered artifact paths copied from manifest
  read order, filtered to artifacts that are safe to inspect first.
- `agentInstructions.safeToSkip`: optional or secondary artifacts that are not
  required for coding-agent orientation.
- `agentInstructions.beforeEditing`: concrete checks derived from PR risk,
  changed components, failed artifacts, warnings, and validation status.
- `agentInstructions.whenBlocked`: map from blocker category to next safe
  action, including retryability and whether human approval or permission is
  required.
- `agentInstructions.partialEvidence`: instructions for continuing, stopping,
  or reporting caveats when artifacts are `partial`, `failed`, or `deferred`.

Required `brief.md` decision sections:

- Review readiness.
- Changed areas.
- Risk and reasons.
- Reviewer checks.
- Evidence status and missing artifacts.
- Read next.
- Next safe action.

Machine-output interfaces:

- Existing canonical envelope fields: `schemaVersion`, `command`, `status`,
  `meta`, `data`, `errors`, and optional `agentSummary`.
- Required additions where absent: next safe action, prescriptive agent
  instructions, and explicit validation truthfulness for no-op checks.
- Required wrapper additions: `data.delegatedCommand`, `data.scanEquivalent`,
  `data.nextSafeAction`, and `agentSummary.suggestedReviewerChecks` entries
  that do not require markdown or HTML parsing.

Documentation interfaces:

- `README.md`
- `docs/getting-started.md`
- `docs/cli-reference.md`
- Future dedicated agent workflow doc if the plan chooses that split.

## Invariants / Safety Requirements

- Agent commands must be thin wrappers or aliases over current scan behavior.
- Agent commands must not introduce a second analysis pipeline.
- `diagram` compatibility must continue to work.
- `@brainwav/diagram`, `diagram-cli`, `.diagram`, and `.diagramrc` must remain
  stable.
- Artifact consumers must be told not to read artifacts whose manifest status
  is not `written`.
- Partial evidence must never be hidden behind success-only language.
- Agent guidance must not require scraping `.diagram/report.html`.
- Deterministic output must not include volatile timestamps or unsorted lists.
- Media commands must remain available but secondary.
- No-op validation scripts must not be represented as substantive assurance in
  docs, machine output, or generated evidence.
- Session-derived evidence must stay redacted and summarized; generated
  Archscope artifacts must not embed raw session transcripts, sensitive-looking
  values, or private local telemetry payloads.

## Failure Model and Recovery

| Failure | Required behavior | Recovery |
| --- | --- | --- |
| Missing PR refs | Return a stable git-ref category and tell agents to fetch refs or rerun repository scan without PR refs. | Fetch `base` / `head`, or run `archscope agent .`. |
| Partial artifact write | Preserve written artifacts, mark missing artifacts as failed or partial, and tell agents to report partial evidence before editing. | Fix output path or consume only written artifacts. |
| Analysis degradation | Mark evidence partial and state whether review can continue. | Inspect warnings, fix parser/dependency issue, or proceed with caveat. |
| Approval required | Tell agents that execution is blocked on a human or configured reviewer approval. | Request approval, narrow the command, or continue with a read-only path. |
| Network unavailable | Report network as an environment blocker, not an architecture finding. | Retry when online, use cached/local evidence, or mark external checks blocked. |
| Permission denied | Distinguish sandbox or filesystem permission failures from tool logic failure. | Request the minimal permission needed or choose a path inside the allowed workspace. |
| Timeout | Preserve partial evidence and state which operation timed out. | Retry with narrower scope, increase timeout where supported, or proceed with caveat. |
| Git state blocker | Surface dirty worktree, missing refs, conflicts, or detached state as actionable git context. | Inspect status, fetch refs, resolve conflicts, or rerun repository-only mode. |
| Missing file | Tell agents whether the file is optional, generated, or required. | Regenerate, fix docs/scripts that reference it, or mark the step blocked. |
| Lint failure | Treat lint output as validation evidence, not architecture evidence. | Fix lint or record the exact failed command and reason. |
| Test failure | Treat test output as behavioral evidence, not architecture evidence. | Fix failing tests or record the exact failed command and reason. |
| Policy or risk gate failure | Preserve evidence and tell automation to fail the gate. | Review risk reasons or fix policy violations. |
| No-op validation surface | Emit explicit not-configured status rather than success-like assurance. | Use meaningful checks or document absence of that class of validation. |
| Internal error | Return a stable internal-error category with safe filing/debug context. | Stop, report the error, and avoid relying on partial hidden state. |

## Observability

Required generated evidence:

- Terminal summary states review readiness, primary human artifact, primary
  agent artifact, and next safe action.
- `manifest.json` records artifact role, status, optionality, reason, and error
  category.
- `brief.md` records changed areas, risk, reviewer checks, next reads, and
  partial-evidence caveats.
- `agent-context.json` records `agentInstructions`, `readOrder`, errors,
  warnings, and blocked-state recovery guidance.
- Machine output records the same outcome and next-safe-action semantics as the
  text path.
- Planning and PR handoff evidence records whether session-collector evidence
  informed the blocker taxonomy, including command, bundle path, evidence
  window, and limitations.

Required validation evidence:

- CLI tests prove `agent` and `agent-pr` delegate to scan behavior.
- Machine-output tests prove deterministic agent output and next-safe-action
  fields.
- Artifact tests prove `agent-context.json` contains prescriptive guidance.
- Brief tests prove PR mode produces review-decision sections.
- Docs tests or checks prove media commands remain secondary in first-run
  surfaces.
- Validation-contract checks prove no-op scripts are not presented as real
  quality evidence.
- Session-collector evidence, when used, is summarized with its redaction and
  coverage limitations.

## Acceptance and Test Matrix

| ID | Acceptance | Verification |
| --- | --- | --- |
| SA1 | `archscope agent [path]` exists as a first-class command and delegates to repository scan behavior. | CLI subprocess test and artifact parity test. |
| SA2 | `archscope agent-pr [path] --base <ref> --head <ref>` exists as a first-class command and delegates to scan PR evidence behavior. | CLI subprocess test with fixture refs. |
| SA3 | Agent commands do not create a second analysis pipeline. | Code review and focused module tests proving delegation. |
| SA4 | Agent commands preserve `diagram` compatibility and existing `scan` behavior. | Compatibility regression tests. |
| SA5 | `agent-context.json` includes `agentInstructions.readFirst`, `safeToSkip`, `beforeEditing`, `whenBlocked`, and partial-evidence guidance. | Agent context fixture test. |
| SA6 | `agent-context.json` tells agents to consume only artifacts whose manifest status is `written`. | Agent context fixture test. |
| SA7 | `brief.md` answers review readiness, changed areas, risk, reviewer checks, primary artifacts, and next reads in PR mode. | Brief fixture test. |
| SA8 | Terminal text summary leads with architecture review usefulness in PR mode rather than generic generation language. | CLI output snapshot or assertion test. |
| SA9 | Machine output includes a next safe action for success, partial, failed, and blocked PR-ref states. | Machine-output tests. |
| SA10 | Missing refs produce fetch/rerun guidance rather than generic failure prose. | Error-category fixture test. |
| SA11 | Partial evidence tells agents whether to continue with written artifacts or stop before editing. | Partial-artifact fixture test. |
| SA12 | README and getting-started docs make agent and PR review entrypoints more prominent than generic diagram generation. | Docs order review or stale-order grep. |
| SA13 | Media commands remain available but are labeled secondary, optional, advanced, or compatibility where first-run docs mention them. | Docs and help review. |
| SA14 | No-op validation scripts are removed from authoritative validation paths or emit explicit not-configured status. | Package-script and docs validation test. |
| SA15 | The implementation avoids broad `src/core/analysis-generation-*` refactors unless a later architecture-specific spec authorizes them. | PR diff review. |
| SA16 | The implementation links JSC-280, this spec, and any paired plan or PR evidence. | Linear traceability and PR template review. |
| SA17 | Agent-facing recovery guidance covers observed blocker categories: approval required, network, permission, timeout, git state, missing file, lint failure, and test failure. | Agent context and machine-output fixture tests. |
| SA18 | Session-collector evidence used during planning is summarized with command, bundle, evidence window, and limitations. | Plan and PR evidence review. |
| SA19 | Session-derived guidance stays redacted and does not embed raw transcripts, sensitive values, or private telemetry payloads. | Artifact snapshot review and redaction grep. |
| SA20 | Blocked validation outcomes record exact command, outcome, and reason instead of collapsing into generic failure prose. | Validation-output fixture test. |
| SA21 | Wrapper machine envelopes identify the invoked wrapper command while recording `scan` as the delegated command. | `test/scan-manifest.test.js` or new wrapper machine-envelope test. |
| SA22 | `nextSafeAction` is structured data, not only prose, and appears in machine output plus `agent-context.json`. | Machine-output and agent-context fixture tests. |
| SA23 | Operational blocker normalization is centralized so terminal summary, brief, agent context, and machine output use the same categories. | Unit test for normalization helper and artifact snapshot tests. |
| SA24 | Existing scan, PR evidence, report fallback, and agent-context schema tests are extended rather than bypassed by a parallel wrapper test style. | Test diff review and `npm test`. |

## Linear Acceptance Traceability

| Linear issue | Acceptance IDs | Status |
| --- | --- | --- |
| JSC-280 | SA1-SA24 | Spec deepened with technical review; planning pending |

## First Slice Recommendation

The first `$he-plan` slice should make the command surface and artifact
contract clearer without changing analysis semantics:

1. Add `agent` and `agent-pr` as thin wrappers over `scan`.
2. Add focused tests proving wrapper delegation and compatibility.
3. Add `agentInstructions` to `agent-context.json`.
4. Sharpen `brief.md` PR sections into a decision note.
5. Add an operational blocker taxonomy and recovery hints grounded in recent
   session-collector evidence.
6. Update docs so agent and PR review entrypoints are the obvious front door.

Validation-truthfulness cleanup can be a separate slice if the wrapper and
artifact changes are already large enough.

## Open Questions

- Should `agent` and `agent-pr` default to `--format json --deterministic`
  when stdout is non-interactive, or should format remain explicit?
- Should `agent-pr` require both `--base` and `--head`, or should it default
  `--head HEAD` like the current PR evidence path?
- Should `.diagram/report.html` remain the primary human artifact when written,
  or should `.diagram/brief.md` become primary for agent-review workflows?
- Should no-op validation scripts be removed, renamed, or converted to
  machine-readable not-configured outputs?
- Should a dedicated `docs/agent-workflows.md` be created, or should the agent
  contract stay in README and CLI reference?
- Should Archscope eventually accept a redacted session-collector bundle as an
  optional input for improving local agent guidance, or should session evidence
  remain planning-only?

## Planning and Implementation Handoff

Use `$he-plan` next with JSC-280 as tracker of record. The plan should preserve
the compatibility constraints from this spec and from the existing
product-sharpness work. It should sequence small slices and use focused CLI
fixture tests before broad validation.

Required handoff inputs:

- This spec.
- JSC-280.
- `docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md`.
- `docs/plans/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-plan.md`.
- Session-collector refresh evidence from May 6, 2026:
  `/tmp/diagram-cli-session-collector.json` and
  `/tmp/diagram-cli-session-evidence/manifest.json`.
- Current implementations of `src/diagram.js`, `src/commands/scan.js`,
  `src/artifacts/agent-context.js`, `src/artifacts/brief.js`, and
  `src/artifacts/evidence-manifest.js`.

## Definition of Done

- JSC-280 is linked from the implementation PR.
- A paired HE plan exists and maps SA IDs to implementation slices.
- Agent commands exist and delegate to existing scan behavior.
- Agent context includes prescriptive agent behavior.
- The brief functions as a review decision artifact.
- Failure semantics include next safe actions.
- Recovery guidance covers the real blocker categories seen in recent local
  agent sessions.
- Docs make agent and PR review entrypoints obvious.
- Media and diagram-era surfaces remain available but secondary.
- Validation evidence is meaningful and truthfully described.
- Compatibility surfaces remain stable and tested.
