---
schema_version: 1
title: "feat: Archscope product sharpness and agent UX plan"
type: feat
status: draft
date: 2026-05-02
origin: docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md
spec: docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md
source_spec: docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md
plan_route: fresh
plan_depth: standard
traceability_required: false
tracking_status: untracked
branch: pending
pr: pending
---

# feat: Archscope product sharpness and agent UX plan

## Table of Contents

- [Plan Mode Decision](#plan-mode-decision)
- [Overview](#overview)
- [Problem Frame](#problem-frame)
- [Linear Work Item Contract](#linear-work-item-contract)
- [Requirements Trace](#requirements-trace)
- [Spec / Plan / PR Traceability](#spec--plan--pr-traceability)
- [Scope Boundaries](#scope-boundaries)
- [Context & Research](#context--research)
- [Technical Review Summary](#technical-review-summary)
- [Key Technical Decisions](#key-technical-decisions)
- [High-Level Technical Design](#high-level-technical-design)
- [Implementation Units](#implementation-units)
- [Execution Checkpoints](#execution-checkpoints)
- [Acceptance Checklist](#acceptance-checklist)
- [System-Wide Impact](#system-wide-impact)
- [Risks & Dependencies](#risks--dependencies)
- [Documentation / Operational Notes](#documentation--operational-notes)
- [Validation Ladder](#validation-ladder)
- [Execution Ledger (Planning Mode)](#execution-ledger-planning-mode)
- [First he-work Handoff](#first-he-work-handoff)
- [Sources & References](#sources--references)

## Plan Mode Decision

**Mode:** fresh

This is a new implementation plan for the Archscope product-sharpness and
agent-UX spec. It follows the completed Archscope evidence-pack and
identity-convergence work. It does not reopen package, repository, artifact
namespace, or compatibility-command rename decisions.

The plan intentionally starts with a no-new-analysis slice. The first work item
sharpens how the existing product is presented before any command behavior or
exit-code changes are attempted.

## Overview

Make Archscope easier to understand and safer for coding agents by sharpening
the product front door:

- PR review is the clearest high-value workflow.
- `archscope scan .` remains the default evidence workflow.
- deterministic scan recipes are the selected first agent-facing interface.
- `manifest.json`, `brief.md`, and `agent-context.json` remain the core
  contract.
- media commands stay available but move out of the first-read product story.
- exit-code and error-category semantics become explicit enough for agents and
  CI to consume safely.

## Problem Frame

Archscope already has the right capabilities, but the first-read path can still
feel broader than the product's strongest promise. The plan must reduce that
blur without deleting existing features or breaking compatibility.

The implementation should follow this order:

```text
clarify front door
document deterministic agent recipes
freeze failure semantics
improve scan summaries
de-emphasize non-core media surfaces
prove compatibility still works
```

## Linear Work Item Contract

No Linear issue is attached to the source spec.

- Tracker of record: not supplied
- Traceability required: false
- Linear status: not tracked
- Branch: pending
- PR: pending
- Future tracking: if a Linear issue is created, update this section and add a
  Linear / Spec / Plan / PR traceability matrix before implementation closeout.

## Requirements Trace

- R1. README and getting-started docs lead with architecture evidence, PR
  review, and agent handoff before generic diagram generation.
- R2. CLI reference presents `scan` and PR evidence workflows before media
  commands.
- R3. Media commands are labeled as advanced, optional, compatibility, or
  non-core where they appear in first-read docs.
- R4. Terminal scan summary names the primary human artifact and primary agent
  artifact.
- R5. PR scan summary includes risk level, changed components or affected
  areas, risk reasons, reviewer checks, and raw artifact paths.
- R6. Agent-facing output uses stable `success`, `partial`, and `failed`
  outcomes.
- R7. Agent-facing failures include one documented error category.
- R8. Exit-code behavior is documented and tested for success, gate failure,
  input/config failure, and partial evidence.
- R9. Agent-facing docs provide repository and PR deterministic scan recipes
  before any alias commands.
- R10. Deferred `agent` aliases are not implemented unless a later plan proves
  delegation to existing behavior.
- R11. `.diagram/manifest.json`, `.diagram/brief.md`, and
  `.diagram/agent-context.json` remain documented as the core artifacts.
- R12. Governance and migration details remain discoverable from maintainer docs
  but are not required for first-run value.
- R13. Compatibility surfaces remain stable: `diagram`, `@brainwav/diagram`,
  `diagram-cli`, `.diagram`, and `.diagramrc`.
- R14. Deterministic agent outputs avoid volatile timestamps and sort
  artifact/warning lists.
- R15. This plan avoids broad `src/core` refactors.

## Spec / Plan / PR Traceability

| Requirement | Source acceptance IDs | Plan units | Acceptance IDs | PR evidence |
| --- | --- | --- | --- | --- |
| R1 | SA1 | P0 | AC1 | pending |
| R2 | SA2 | P0 | AC2 | pending |
| R3 | SA3 | P4 | AC3 | pending |
| R4 | SA4 | P3 | AC4 | pending |
| R5 | SA5 | P3 | AC5 | pending |
| R6 | SA6 | P2 | AC6 | pending |
| R7 | SA7 | P2 | AC7 | pending |
| R8 | SA8 | P2 | AC8 | pending |
| R9 | SA9 | P1 | AC9 | pending |
| R10 | SA10 | P1, P5 | AC10 | pending |
| R11 | SA11 | P0, P1, P5 | AC11 | pending |
| R12 | SA12 | P0, P4 | AC12 | pending |
| R13 | SA13 | P5 | AC13 | pending |
| R14 | SA14 | P2, P5 | AC14 | pending |
| R15 | SA15 | P0-P5 | AC15 | pending |

## Scope Boundaries

In scope:

- README, getting-started, CLI reference, and CLI help ordering/wording.
- Agent-facing deterministic scan recipes.
- `scan` outcome, error-category, and exit-code documentation and tests.
- `scan` terminal summary improvements.
- Brief wording improvements that support review decisions.
- Media command de-emphasis in docs/help while preserving command availability.
- Compatibility validation for `archscope` and `diagram`.

Out of scope:

- Adding `archscope agent` or `archscope agent-pr` commands in this plan.
- Removing `generate-video` or `generate-animated`.
- Renaming `@brainwav/diagram`, `diagram-cli`, `.diagram`, or `.diagramrc`.
- Changing `workflow pr` analytical semantics.
- Broad refactors under `src/core/analysis-generation-*`.
- Report HTML visual redesign.

## Context & Research

### Live Repo Evidence

- `README.md` already presents Archscope as architecture evidence for humans and
  AI coding agents.
- `docs/getting-started.md` already includes `archscope scan .`,
  `archscope scan . --base origin/main --head HEAD`, and deterministic JSON
  examples.
- `docs/cli-reference.md` lists `scan` early but still places
  `generate-video` and `generate-animated` in the top command summary.
- `src/diagram.js` unknown-command help lists media commands in the same block
  as core evidence commands.
- `src/commands/scan.js` already emits `data.outcome`, but non-success outcomes
  currently route through a generic non-zero exit path.
- `test/scan-error-categories.test.js`, `test/scan-manifest.test.js`,
  `test/scan-command.test.js`, and `test/scan-pr-evidence.test.js` already
  provide nearby focused validation surfaces.

### Governing Specs

- `docs/specs/2026-04-11-feat-archscope-repositioning-and-compatibility-spec.md`
  governs command compatibility and migration evidence.
- `docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md`
  governs the evidence pack, manifest-first agent read order, and report
  behavior.
- `docs/specs/2026-05-01-feat-archscope-identity-convergence-and-rename-readiness-spec.md`
  governs Archscope-first naming while preserving compatibility surfaces.
- `docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md`
  governs this plan.

## Technical Review Summary

The source spec was technically reviewed before this plan. One ambiguity was
fixed: `archscope agent` and `archscope agent-pr` are deferred optional aliases,
not the first implementation surface. The selected first surface is documented
deterministic scan recipes.

No blocking technical-review findings remain for planning.

## Key Technical Decisions

1. **Agent interface decision:** use documented deterministic `scan` recipes in
   this plan; do not add `agent` aliases yet.
2. **Partial exit-code decision:** adopt exit code `3` for `scan` partial
   evidence only after P2 inventories current scan exit behavior and proves no
   compatibility regression. Preserve existing documented command-specific
   behavior elsewhere. If the inventory shows existing users or tests depend on
   partial evidence exiting `1`, keep exit `1` and document the divergence
   instead of forcing `3`.
3. **Docs location decision:** update README, getting-started, and CLI reference
   first. Do not create `docs/agent-workflows.md` unless P1 proves the agent
   guidance makes the first-read docs too crowded.
4. **Media posture decision:** preserve media commands but label and position
   them as advanced/non-core.
5. **Refactor decision:** avoid broad internal restructuring. Only touch shared
   helpers when needed to make scan summaries or error contracts testable.

## High-Level Technical Design

The implementation should be additive and presentation-oriented:

```text
README / docs / help
  -> clearer product promise and agent recipes

scan command
  -> stable outcome and exit mapping
  -> clearer terminal summary
  -> existing manifest/brief/agent-context artifacts

tests
  -> focused subprocess checks
  -> existing scan and compatibility suites
```

No new analysis pipeline should be introduced.

## Implementation Units

### P0: Product Front Door And Command Prominence

**Goal:** Make PR review, `scan`, and agent handoff the obvious first-read path
without changing runtime behavior.

**Scope:**

- Modify: `README.md`
- Modify: `docs/getting-started.md`
- Modify: `docs/cli-reference.md`
- Modify only if needed: `src/diagram.js` help text

**Implementation notes:**

- Lead with "Before you review a PR, run Archscope" in an appropriate
  first-read surface without making the README feel like a marketing page.
- Keep `archscope scan .` and PR scan examples above generic diagram
  generation examples.
- Keep `.diagram/manifest.json`, `.diagram/brief.md`, and
  `.diagram/agent-context.json` as the core artifacts.
- Keep migration and finalization links available but not first-run blockers.
- Treat line ordering as a real acceptance gate: in first-read docs, the first
  `archscope scan .` or PR scan mention must appear before the first
  `generate-video` or `generate-animated` mention.
- If `src/diagram.js` help is touched, keep the command list grouped as core
  evidence first and advanced/media output second.

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| First-read docs | README and getting-started | Review command order | `scan`, PR scan, and agent handoff appear before media commands. |
| CLI reference | `docs/cli-reference.md` | Review command summary | `scan` and PR evidence are prominent; media commands are not headline features. |
| Help text, if touched | `node src/diagram.js nope` | Inspect stderr | Core evidence commands appear before advanced media commands. |

**Validation:**

- Focused docs grep:
  `rg -n "Before you review a PR|archscope scan \\.|generate-video|generate-animated" README.md docs/getting-started.md docs/cli-reference.md`
- Manual line-order check from the grep output: `scan` and PR scan must appear
  before media commands in README, getting-started, and CLI reference.
- If `src/diagram.js` changes:
  `npm test -- test/command-identity.test.js test/generated-output-identity.test.js`

**Rollback:**

- Revert docs/help wording only. Runtime behavior should remain unchanged.

### P1: Deterministic Agent Recipes

**Goal:** Document the selected agent-facing recipes without adding new
commands.

**Scope:**

- Modify: `README.md`
- Modify: `docs/getting-started.md`
- Modify: `docs/cli-reference.md`
- Optional create only if docs become crowded: `docs/agent-workflows.md`

**Implementation notes:**

- Document repository recipe:
  `archscope scan . --format json --deterministic`
- Document PR recipe:
  `archscope scan . --base origin/main --head HEAD --format json --deterministic`
- State that agents should read `manifest.json` first and only consume artifacts
  marked `written`.
- Explicitly defer `archscope agent` and `archscope agent-pr` aliases.
- Search active first-read docs and source separately from planning/spec
  artifacts so deferred alias mentions in this plan do not create false
  positives.

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| Agent repository recipe | docs | Search recipe | Deterministic repository scan command is present. |
| Agent PR recipe | docs | Search recipe | Deterministic PR scan command is present. |
| No premature aliases | docs and source | Search `archscope agent` | Alias is only discussed as deferred, not documented as implemented. |

**Validation:**

- Recipe presence:
  `rg -n "archscope scan \\. --format json --deterministic|archscope scan \\. --base origin/main --head HEAD --format json --deterministic" README.md docs/getting-started.md docs/cli-reference.md`
- Premature alias guard:
  `rg -n "archscope agent" README.md docs/getting-started.md docs/cli-reference.md src test .github || true`
  Expected: no implemented or user-facing alias command documentation in active
  product surfaces.
- If a new doc is created, validate it with
  `vale --config .vale.ini <changed-docs>`. `npm run docs:style:changed` may
  also be used after staging documentation changes, but a "No staged
  documentation changes detected" result is not content validation.

**Rollback:**

- Revert docs-only recipe changes. No runtime rollback expected.

### P2: Outcome, Error Category, And Exit-Code Contract

**Goal:** Make `scan` failure semantics stable enough for agents and CI.

**Scope:**

- Modify: `src/commands/scan.js`
- Modify: `docs/cli-reference.md`
- Modify: `test/scan-error-categories.test.js`
- Modify if needed: `test/scan-manifest.test.js`

**Implementation notes:**

- First inventory the live command behavior before editing:
  - success scan exit code
  - partial artifact-write exit code
  - invalid path/config/ref exit code
  - current machine JSON error shape
- Preserve `success`, `partial`, and `failed` outcome values.
- Ensure scan errors use the documented category vocabulary where practical:
  `config_invalid`, `repo_unreadable`, `git_refs_missing`,
  `analysis_partial`, `policy_violation`, `risk_threshold_exceeded`,
  `artifact_write_failed`, `dependency_unavailable`, `internal_error`.
- Adopt exit code `3` for `scan` partial evidence only if focused tests prove
  this does not conflict with existing compatibility expectations. If adopting
  `3` would break existing contracts, document `partial -> exit 1` as the
  compatibility behavior and keep the machine `data.outcome` as the agent-safe
  discriminator.
- Keep invalid invocation/config/ref failures mapped to exit code `2` where
  existing command conventions expect input errors.
- Do not change `workflow pr`, `generate`, `validate`, or `context` exit codes
  in this plan.

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| Successful scan | fixture repo | Run scan machine mode | Exit `0`, outcome `success`. |
| Current exit inventory | fixture and failure cases | Run scan before patch | Baseline exit codes and machine fields are recorded in the P2 ledger. |
| Partial artifact write | output path with artifact collision | Run scan machine mode | Exit matches the selected P2 contract, outcome `partial`, category `artifact_write_failed`. |
| Invalid PR refs | bad refs | Run PR scan | Repository artifacts remain where possible; PR error category is stable. |
| Deterministic scan | fixture repo | Run deterministic JSON twice | Sorted artifact/warning lists and no volatile machine timestamp. |

**Validation:**

- `npm test -- test/scan-error-categories.test.js test/scan-manifest.test.js test/scan-pr-evidence.test.js`
- `npm test -- test/generate-output-json.test.js test/machine-command-coverage.test.js test/json-capability-discovery.test.js`
- If exit code `3` is adopted, add or update subprocess assertions that prove
  partial scan exits `3` and existing machine-envelope tests still pass.
- If compatibility keeps partial scan at exit `1`, update docs and tests to
  assert that `data.outcome: "partial"` is the agent discriminator.

**Rollback:**

- Restore prior `scan` exit mapping and keep any documentation changes clearly
  marked as future/deferred.

### P3: Scan And PR Review Summary UX

**Goal:** Make terminal and brief output answer review decisions directly.

**Scope:**

- Modify: `src/commands/scan.js`
- Modify: `src/artifacts/brief.js`
- Modify: `test/scan-command.test.js`
- Modify: `test/scan-pr-evidence.test.js`
- Modify if needed: `test/scan-evidence-pack.test.js`

**Implementation notes:**

- Repository scan terminal summary should include pack status, detected
  component count, primary human artifact, primary agent artifact, warnings, and
  next file to inspect.
- PR scan terminal summary should include risk level, affected areas or changed
  component count, risk reasons, reviewer checks, and raw PR impact artifact
  path when available.
- Brief changes must remain concise and deterministic enough for agent context
  windows.

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| Repository scan summary | fixture repo | Run `scan` | Stdout names human and agent artifacts plus next read. |
| PR scan summary | git fixture with refs | Run `scan --base --head` | Stdout includes risk/reviewer-check signal and PR artifact path. |
| Brief remains compact | generated `brief.md` | Inspect content | Summary is decision-oriented and does not expand into governance detail. |

**Validation:**

- `npm test -- test/scan-command.test.js test/scan-pr-evidence.test.js test/scan-evidence-pack.test.js`

**Rollback:**

- Revert terminal/brief copy changes while preserving P2 contract tests.

### P4: Media Surface De-Emphasis

**Goal:** Keep video and animated output available while making them visibly
secondary.

**Scope:**

- Modify: `README.md`
- Modify: `docs/getting-started.md`
- Modify: `docs/cli-reference.md`
- Modify if needed: `src/diagram.js`
- Modify if needed: `test/generated-output-identity.test.js`

**Implementation notes:**

- Move media commands lower in docs/help where safe.
- Label `generate-video` and `generate-animated` as advanced or optional.
- Do not remove commands, compatibility aliases, or troubleshooting content.
- Keep user-facing language respectful: this is de-emphasis, not deletion.

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| CLI docs | `docs/cli-reference.md` | Review command sections | Media commands remain documented but secondary. |
| Getting started | `docs/getting-started.md` | Review first-run path | Media troubleshooting does not define the product. |
| Command help, if touched | unknown command | Inspect help | Media commands appear after core evidence commands or under advanced wording. |

**Validation:**

- `rg -n "generate-video|generate-animated|advanced|optional|media" README.md docs/getting-started.md docs/cli-reference.md src/diagram.js`
- If `src/diagram.js` changes:
  `npm test -- test/generated-output-identity.test.js test/command-identity.test.js`

**Rollback:**

- Restore prior ordering/labels. No runtime rollback expected.

### P5: Compatibility And Closeout

**Goal:** Prove the sharper product surface did not break existing compatibility
or evidence-pack behavior.

**Scope:**

- Modify: plan execution ledger only, unless validation finds a defect.

**Implementation notes:**

- Confirm compatibility command parity.
- Confirm scan evidence pack still writes core artifacts.
- Confirm deterministic JSON remains parser-safe.
- Confirm docs keep package/repo/artifact compatibility facts.

**Test scenarios:**

| Scenario | Input | Action | Expected |
| --- | --- | --- | --- |
| Compatibility command | package bin contract | Run existing command-identity tests | Compatibility invocation still works without relying on global `npm link`. |
| Canonical command | package bin contract or `node src/diagram.js --help` | Run existing command-identity tests | Canonical command still works without relying on shell-local global installs. |
| Evidence pack | fixture repo | Run focused scan tests | Core artifacts pass. |
| Deep baseline | repository | Run baseline tests | No product correctness regression. |

**Validation:**

- `npm test -- test/command-identity.test.js test/scan-command.test.js test/scan-manifest.test.js test/scan-error-categories.test.js test/scan-pr-evidence.test.js`
- `npm test`
- `npm run test:deep`
- `npm run ci:artifacts`
- `npm run migration:readiness`

**Rollback:**

- Revert the phase or patch causing failure, then rerun the focused validation
  for that phase.

## Execution Checkpoints

- P0 complete only after docs/help ordering is reviewed and focused docs grep is
  recorded.
- P1 complete only after deterministic agent recipes are documented and alias
  deferral is explicit.
- P2 complete only after the pre-change exit-code inventory is recorded, the
  selected partial-exit behavior is explicit, and outcome/error-category/exit
  behavior has focused tests.
- P3 complete only after terminal/brief scan summaries are verified.
- P4 complete only after media commands are secondary but still discoverable.
- P5 complete only after compatibility, scan, and baseline validation passes or
  blockers are recorded.

## Acceptance Checklist

- [ ] AC1: First-read docs lead with architecture evidence, PR review, and
  agent handoff.
- [ ] AC2: CLI reference presents `scan` and PR evidence before media commands.
- [ ] AC3: Media commands are labeled as advanced, optional, or non-core in
  first-read docs.
- [ ] AC4: Repository scan terminal summary names primary human and agent
  artifacts.
- [ ] AC5: PR scan terminal summary includes risk, impact, reviewer checks, and
  raw artifact paths.
- [ ] AC6: Agent-facing output uses stable `success`, `partial`, and `failed`
  outcomes.
- [ ] AC7: Agent-facing failures include documented error categories.
- [ ] AC8: Exit-code behavior is documented and tested.
- [ ] AC9: Agent docs include deterministic repository and PR scan recipes.
- [ ] AC10: `archscope agent` and `archscope agent-pr` remain deferred unless a
  later plan proves safe delegation.
- [ ] AC11: `manifest.json`, `brief.md`, and `agent-context.json` remain core
  artifacts.
- [ ] AC12: Governance and migration details remain discoverable but are not
  first-run prerequisites.
- [ ] AC13: Compatibility surfaces remain stable.
- [ ] AC14: Deterministic outputs remain stable.
- [ ] AC15: No broad `src/core` refactor is included.

## System-Wide Impact

- User-facing docs become sharper around the PR review and agent handoff value.
- CLI help may change wording/order but not command availability.
- `scan` may change partial exit behavior; this is the riskiest behavioral
  change and must be contained to P2.
- Existing media commands stay available.
- No package, repository, artifact directory, or compatibility command rename is
  expected.

## Risks & Dependencies

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Partial exit code `3` breaks existing scripts | CI or user scripts may expect any scan partial to exit `1` | Isolate to P2, document explicitly, and run compatibility-focused tests. |
| Docs become too agent-heavy | Human first-read path becomes noisy | Keep recipes compact; create `docs/agent-workflows.md` only if needed. |
| Media de-emphasis looks like removal | Existing users may think features are deprecated | Use advanced/optional language, not removal language. |
| New summaries become verbose | Terminal and brief output lose scanability | Keep tests/assertions focused on concise required fields. |
| Scope drifts into architecture refactor | Work expands beyond product sharpness | AC15 and P0-P5 boundaries block broad `src/core` work. |

## Documentation / Operational Notes

- Keep compatibility language factual:
  - `archscope` is canonical.
  - `diagram` is compatibility.
  - `@brainwav/diagram` remains the package.
  - `diagram-cli` remains the repository.
  - `.diagram` and `.diagramrc` remain stable paths.
- Avoid making historical specs/plans match current marketing language.
- If implementation touches `README.md`, `AGENTS.md`, `Makefile`,
  `package.json`, validation scripts, or validation/preflight docs, run the
  repo-local `$validation-contract-check` workflow before closeout.

## Validation Ladder

1. P0/P1 docs-only validation:
   - `rg -n "Before you review a PR|archscope scan \\.|agent-context|generate-video|generate-animated" README.md docs/getting-started.md docs/cli-reference.md`
   - Manually verify from line numbers that scan/PR scan precede media commands
     in first-read docs.
   - `rg -n "archscope agent" README.md docs/getting-started.md docs/cli-reference.md src test .github || true`
   - `vale --config .vale.ini <changed-docs>` for changed docs.
   - `npm run docs:style:changed` only after staging documentation changes; if
     it reports "No staged documentation changes detected", record that as a
     no-op rather than validation.
2. P2 outcome validation:
   - Pre-change inventory command(s) captured in the P2 ledger for success,
     partial, and input/ref failure cases.
   - `npm test -- test/scan-error-categories.test.js test/scan-manifest.test.js test/scan-pr-evidence.test.js`
   - `npm test -- test/generate-output-json.test.js test/machine-command-coverage.test.js test/json-capability-discovery.test.js`
3. P3 summary validation:
   - `npm test -- test/scan-command.test.js test/scan-pr-evidence.test.js test/scan-evidence-pack.test.js`
4. P4 media/help validation:
   - `npm test -- test/generated-output-identity.test.js test/command-identity.test.js`
5. P5 baseline:
   - `npm test`
   - `npm run test:deep`
   - `npm run ci:artifacts`
   - `npm run migration:readiness`

## Execution Ledger (Planning Mode)

| Unit | Status | Owner | Notes |
| --- | --- | --- | --- |
| P0 | complete | Codex | 2026-05-02: sharpened README, getting-started, and CLI reference so the first-read path leads with PR review, `archscope scan .`, and agent handoff before media commands; split CLI reference command inventory into core evidence/review commands and advanced media commands; kept runtime behavior, aliases, exit codes, package/repo names, and compatibility surfaces unchanged. Validation: focused docs grep passed with scan/PR scan before media commands; `vale --config .vale.ini README.md docs/getting-started.md docs/cli-reference.md docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md docs/plans/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-plan.md` pass (0 errors, 0 warnings, 0 suggestions); `bash scripts/verify-work.sh --fast` pass with known optional Local Memory health warning only; `git diff --check` pass. Review gates: `$simplify` removed duplicated README promise wording; `$he-code-review` manual phase review found no P0/P1/P2 findings; `$he-fix-bugs` had no reproduced bug to repair after validation. Artifact: `artifacts/reviews/archscope-product-sharpness-p0-manual-review.md`. |
| P1 | complete | Codex | 2026-05-02: documented the deterministic PR scan recipe `archscope scan . --base origin/main --head HEAD --format json --deterministic` in README, getting-started, and CLI reference alongside the existing repository deterministic scan recipe; kept agent-specific aliases deferred and absent from active docs/source. Validation: recipe presence grep passed across active docs; premature alias guard `rg -n "archscope agent" README.md docs/getting-started.md docs/cli-reference.md src test .github || true` passed with no matches; `vale --config .vale.ini README.md docs/getting-started.md docs/cli-reference.md docs/plans/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-plan.md` pass (0 errors, 0 warnings, 0 suggestions); `bash scripts/verify-work.sh --fast` pass with known optional Local Memory health warning only; `git diff --check` pass. Review gates: `$simplify` found no smaller safe patch because all three active docs need the recipe; `$he-code-review` manual phase review found no P0/P1/P2 findings; `$he-fix-bugs` had no reproduced bug to repair after validation. Artifact: `artifacts/reviews/archscope-product-sharpness-p1-manual-review.md`. |
| P2 | pending | Codex | Outcome, error category, and exit-code contract; start with pre-change exit inventory. |
| P3 | pending | Codex | Scan and PR review summary UX. |
| P4 | pending | Codex | Media surface de-emphasis. |
| P5 | pending | Codex | Compatibility and closeout validation. |

## First he-work Handoff

Start with P0 only.

Inputs:

- Spec: `docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md`
- Plan: `docs/plans/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-plan.md`
- Candidate files: `README.md`, `docs/getting-started.md`,
  `docs/cli-reference.md`, and only if needed `src/diagram.js`

Rules:

- Do not add agent aliases in P0.
- Do not change exit-code behavior in P0.
- Do not remove media commands.
- Do not touch `src/core/analysis-generation-*`.
- Record exact validation output before marking P0 complete.

Suggested focused validation:

```bash
rg -n "Before you review a PR|archscope scan \\.|generate-video|generate-animated" README.md docs/getting-started.md docs/cli-reference.md
vale --config .vale.ini README.md docs/getting-started.md docs/cli-reference.md
```

If `src/diagram.js` changes, add:

```bash
npm test -- test/command-identity.test.js test/generated-output-identity.test.js
```

## Sources & References

- `docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md`
- `docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md`
- `docs/specs/2026-05-01-feat-archscope-identity-convergence-and-rename-readiness-spec.md`
- `docs/specs/2026-04-11-feat-archscope-repositioning-and-compatibility-spec.md`
- `README.md`
- `docs/getting-started.md`
- `docs/cli-reference.md`
- `src/commands/scan.js`
- `src/diagram.js`
- `test/scan-command.test.js`
- `test/scan-manifest.test.js`
- `test/scan-error-categories.test.js`
- `test/scan-pr-evidence.test.js`
