---
schema_version: 1
title: "feat: Archscope architecture evidence experience plan"
type: feat
status: active
date: 2026-05-01
origin: docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md
spec: docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md
source_spec: docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md
ui_spec: pending
plan_route: fresh
plan_depth: deep
traceability_required: false
tracking_status: untracked
branch: pending
pr: pending
---

# feat: Archscope architecture evidence experience plan

## Table of Contents

- [Plan Mode Decision](#plan-mode-decision)
- [Overview](#overview)
- [Problem Frame](#problem-frame)
- [Linear Work Item Contract](#linear-work-item-contract)
- [Requirements Trace](#requirements-trace)
- [Linear / Spec / Plan / PR Traceability](#linear--spec--plan--pr-traceability)
- [Scope Boundaries](#scope-boundaries)
- [Context & Research](#context--research)
- [Key Technical Decisions](#key-technical-decisions)
- [Open Questions](#open-questions)
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

This is a new product-experience plan for the 2026-05-01 Archscope architecture evidence spec. It does not replace the active 2026-04-11 Archscope repositioning and compatibility plan. The compatibility plan governs command identity, migration evidence, and machine-envelope parity. This plan builds on that work by making `archscope scan .` the default architecture evidence experience for humans and AI coding agents.

The governing spec is planning-ready for the non-visual evidence pack and CLI orchestration work. It is not implementation-ready for final `report.html` acceptance until a companion UI spec exists, so report work is explicitly gated.

## Overview

Deliver a default Archscope evidence workflow that lets a user or agent run one command and receive a coherent `.diagram` evidence pack:

- `.diagram/manifest.json`
- `.diagram/brief.md`
- `.diagram/agent-context.json`
- `.diagram/architecture.mmd`
- `.diagram/report.html` once the companion UI spec is complete

The first implementation slices should reuse existing `generate-all`, `context`, `workflow pr`, machine-envelope, and manifest capabilities instead of creating a second analysis pipeline. The product outcome is a stronger first-run and PR-review experience: architecture evidence first, diagrams as supporting evidence.

## Problem Frame

Archscope already has useful architecture analysis, diagram, policy, PR-impact, deterministic JSON, and agent-context surfaces, but users must currently assemble the value from multiple commands and documents. That keeps the tool feeling like a diagram generator with extra machinery instead of an architecture evidence tool.

The next product step is to make the value obvious:

```bash
archscope scan .
```

That command should create a small, stable evidence pack that humans can read quickly and AI coding agents can parse deterministically. PR mode should extend the same model with blast radius, risk reasons, reviewer checks, and raw PR-impact artifacts.

## Linear Work Item Contract

- Linear issue: not supplied
- Tracker of record: not supplied
- Traceability required: false
- Branch: pending
- PR: pending
- Linear comment required: false while untracked

This plan is local and untracked until a Linear issue or equivalent work item is attached. Do not invent tracker IDs. Any implementation PR should link this plan and the governing spec, and should add tracker metadata if a work item is created later.

## Requirements Trace

- R1. Product docs and default workflow present Archscope as architecture evidence for humans and AI coding agents.
- R2. `archscope scan .` exists as the selected first-run command and writes a useful evidence pack.
- R3. The first shippable slice writes the non-visual evidence pack without blocking on report UI work.
- R4. `.diagram/manifest.json` is the canonical artifact index and the first file agents read.
- R5. `.diagram/agent-context.json` is deterministic, schema-versioned, compact, and parser-safe.
- R6. `scan --format json --deterministic` uses the canonical machine envelope and stable timestamp/list behavior.
- R7. `scan . --base <ref> --head <ref>` reuses the existing PR workflow contract and writes PR evidence under `.diagram/pr-impact`.
- R8. Risk and blast-radius claims include evidence references, confidence labels, or `unknown` states.
- R9. Partial evidence is explicit in console output, machine output, and manifest artifact statuses.
- R10. Existing `generate`, `generate-all`, `validate`, `workflow pr`, `context`, and compatibility `diagram` behavior remain non-breaking.
- R11. First-run docs hide governance, migration, and finalization machinery behind maintainer links.
- R12. CI artifact generation can expose the brief, agent context, manifest, and PR-impact JSON from stable paths.
- R13. `report.html` is not accepted as complete until a companion UI spec exists.
- R14. Implementation keeps analysis, artifacts, contracts, policy, PR-impact, renderers, agent-context, and migration boundaries understandable.

## Linear / Spec / Plan / PR Traceability

| Tracker   | Requirement | Source acceptance IDs | Plan units | Acceptance IDs | PR evidence |
| --------- | ----------- | --------------------- | ---------- | -------------- | ----------- |
| untracked | R1          | SA1, SA10, SA12       | P3         | AC9            | pending     |
| untracked | R2          | SA2, SA17             | P0         | AC1, AC5       | pending     |
| untracked | R3          | SA3, SA21             | P0, P1     | AC2, AC3, AC7  | pending     |
| untracked | R4          | SA8                   | P0         | AC2            | pending     |
| untracked | R5          | SA7                   | P1         | AC4            | pending     |
| untracked | R6          | SA9, SA19             | P0         | AC2, AC6       | pending     |
| untracked | R7          | SA5, SA20             | P2         | AC8            | pending     |
| untracked | R8          | SA16                  | P2         | AC8            | pending     |
| untracked | R9          | SA21                  | P0, P1, P2 | AC2, AC7, AC8  | pending     |
| untracked | R10         | SA11, SA18            | P0, P3     | AC1, AC10      | pending     |
| untracked | R11         | SA10                  | P3         | AC9            | pending     |
| untracked | R12         | SA14                  | P3         | AC14           | pending     |
| untracked | R13         | SA6, SA15             | P4, P5     | AC11, AC12     | pending     |
| untracked | R14         | SA13, SA23            | P0-P5      | AC13           | pending     |

## Scope Boundaries

In scope:

- Add `archscope scan .` as the default first-run evidence workflow.
- Write and index the non-visual evidence pack: `manifest.json`, `brief.md`, `agent-context.json`, and `architecture.mmd`.
- Support deterministic machine output for `scan`.
- Compose PR evidence into `scan` when `--base` and `--head` are supplied.
- Update documentation and CI artifact guidance around the evidence workflow.
- Create or require the companion UI spec before treating `report.html` as complete.

Out of scope:

- Rename the npm package from `@brainwav/diagram`.
- Rename the repository from `diagram-cli`.
- Remove the compatibility `diagram` command.
- Replace existing `generate`, `generate-all`, `validate`, `workflow pr`, or `context` commands.
- Make video, animated diagrams, or ERD the primary product story.
- Implement final report visuals before the companion UI spec exists.
- Add a hosted service, database, network call, or SaaS dependency.

## Context & Research

### Relevant Code and Patterns

- CLI bootstrap and command registration: `src/diagram.js`
- Shared machine output helper: `src/commands/output.js`
- Existing generated artifact path and manifest behavior: `src/commands/generate-all.js`, inline manifest writing in `src/commands/generate-all.js`, `test/context-pack.test.js`
- Existing context generation: `src/commands/context.js`, `src/context/build-context-pack.js`, `src/context/normalize-diagram-manifest.js`, `test/context-pack.test.js`
- Existing PR workflow contract: `src/workflow/pr-command.js`, `src/workflow/pr-impact.js`, `test/pr-impact.test.js`, `test/pr-impact-delta.test.js`
- Existing deterministic JSON patterns: `test/generate-output-json.test.js`, machine output tests under `test/`
- Existing CI artifact script: `package.json` script `ci:artifacts`
- User-facing docs: `README.md`, `docs/cli-reference.md`, `docs/getting-started.md`

### Institutional Learnings

- The 2026-04-11 compatibility plan keeps `archscope` canonical while preserving `diagram` and `@brainwav/diagram`; this plan must not reopen that migration decision.
- Existing repo plans use phased delivery with execution ledgers, stable acceptance IDs, and command-level validation evidence.
- Prior review findings already corrected the governing spec so `report.html` is deferred from the first slice, `manifest.json` is first in agent read order, and deterministic timestamp behavior is explicit.

### External References

- None. This is an internal CLI product and artifact-contract plan.

## Key Technical Decisions

- Use `scan` as the selected first-run command.
  - Rationale: it communicates inspection and evidence better than `generate-all`.
- Implement `scan` as an orchestration layer over existing capabilities.
  - Rationale: avoids duplicated analysis and satisfies SA23.
- Make `manifest.json` the first agent-read artifact.
  - Rationale: agents and CI need statuses before opening dependent files.
- Extract one shared evidence-manifest writer before adding scan-specific manifest fields.
  - Rationale: `scan` and `generate-all` must not grow separate manifest contracts.
- Ship the non-visual evidence pack before `report.html`.
  - Rationale: the spec requires a companion UI spec before final report acceptance.
- Prefer relative artifact paths and safe project labels.
  - Rationale: artifacts should be stable, shareable, and free of local absolute path leakage.
- Treat partial evidence as a first-class state.
  - Rationale: failed or deferred writers must not be mistaken for complete readiness.

## Open Questions

### Resolved During Planning

- Should this deepen the older compatibility plan? No. This is a fresh plan for a new spec and product-experience surface.
- Should `report.html` block the first implementation slice? No. The non-visual pack is the first shippable slice; report completion waits for UI spec work.
- Should Linear IDs be invented for traceability? No. The spec explicitly sets `traceability_required: false`.
- Should `scan` replace `generate-all`, `context`, or `workflow pr`? No. It orchestrates them or their shared internals.

### Deferred to Implementation

- Whether top-level `agent-context.json` is generated directly by the context domain or projected from `.diagram/context/diagram-context.meta.json`.
- Whether `scan` runs `validate` automatically when `.architecture.yml` exists or only indexes validation evidence from explicit validation steps.
- Whether ERD appears in the default pack only when data-model signals exist.

### Deferred to Companion UI Spec

- `report.html` visual hierarchy, layout, responsive behavior, accessibility acceptance, and rendered verification method.
- Whether `report.html` is generated by default in every scan or only when a `--report`/profile option is supplied; P4 must freeze this before P5 implementation starts.

## High-Level Technical Design

`scan` should behave as a thin evidence-pack coordinator:

```text
CLI scan command
  -> resolve input path and options
  -> run or reuse repository analysis / generate-all path for architecture.mmd
  -> write brief.md from normalized evidence summary
  -> write agent-context.json from context-domain data
  -> optionally compose workflow pr evidence when base/head are supplied
  -> write manifest.json last with artifact statuses
  -> emit console summary or machine envelope
```

Manifest artifact statuses should use stable terms:

- `written`
- `deferred`
- `partial`
- `failed`

In deterministic mode, the machine envelope should omit volatile timestamps, and generated artifacts that require timestamps should use `1970-01-01T00:00:00.000Z`. Artifact lists, warnings, and status arrays should be sorted deterministically.

## Implementation Units

Execution posture for every unit:

- Use vertical slices: behavior test, implementation, focused validation, then ledger update.
- Run the explicitly requested `$simplify` and `$he-code-review` review steps after each completed implementation phase when this plan enters work mode; record each review outcome or blocker in the ledger.
- Resolve phase review steps through repo-local `.codex/skills/` first. If no repo-local equivalent exists, use the explicitly requested external skills at `/Users/jamiecraik/dev/agent-skills/.agents/skills/simplify/SKILL.md` and `/Users/jamiecraik/dev/agent-skills/.agents/skills/he-code-review/SKILL.md`. If those external skills cannot be loaded or executed in the active environment, record them as unavailable coverage gaps and run a findings-first manual simplify/code-review checklist against the phase diff; do not mark the external skills as passed.
- Do not mark a unit complete until validation evidence exists.
- Keep `report.html` incomplete or deferred until the companion UI spec is available.

- [ ] **P0 / Unit 1: Scan Command and Manifest Foundation**

**Goal:** Add `archscope scan .` as a command surface and establish the evidence manifest contract without duplicating existing analysis pipelines.

**Requirements:** R2, R4, R6, R9, R10, R14.

**Source acceptance:** SA2, SA8, SA9, SA17, SA18, SA19, SA21, SA22, SA23.

**Dependencies:** None.

**Files:**

- Modify: `src/diagram.js`
- Create: `src/commands/scan.js`
- Create: `src/artifacts/evidence-manifest.js`
- Modify: `src/commands/generate-all.js` to use the shared evidence-manifest writer for existing manifest behavior before scan-specific manifest fields land
- Test: `test/scan-command.test.js`
- Test: `test/scan-manifest.test.js`
- Test: `test/evidence-manifest-parity.test.js`

**Approach:**

- Register `scan` as a public command with path, output directory, `--format json`, `--deterministic`, `--base`, and `--head` options.
- Extract existing generate-all manifest behavior into one shared writer, then implement a minimal evidence-pack coordinator that can write `manifest.json` with expected top-level artifact entries and statuses.
- Treat shared-manifest extraction as a hard decision gate: if the extraction changes existing `generate-all` output semantics or requires edits to more than three non-test implementation files outside `src/artifacts/evidence-manifest.js`, `src/commands/generate-all.js`, and `src/commands/scan.js`, stop and re-plan a narrower adapter.
- Make `report.html` an expected artifact with `deferred` status until P4/P5.
- Set `primaryHumanArtifact` to `.diagram/brief.md` whenever `report.html` is not marked `written`.
- Use canonical machine-envelope behavior for JSON output.
- Ensure manifest paths are relative to `.diagram` or safe project labels, not absolute local paths.

**Test scenarios:**

- `archscope scan --help` lists the command and options.
- `archscope scan <fixture>` writes `.diagram/manifest.json`.
- Manifest identifies primary human summary artifact, primary agent artifact, artifact statuses, deterministic flag, and warnings.
- Existing `generate-all` manifest fields remain equivalent after extraction.
- `scan --format json --deterministic` emits parser-safe JSON with sorted lists and no volatile generated timestamp.
- Compatibility `diagram` invocation still exposes existing behavior and does not regress existing command tests.

**Verification:**

- Focused: `npm test -- test/scan-command.test.js test/scan-manifest.test.js`
- Parity: `npm test -- test/evidence-manifest-parity.test.js`
- Contract: `npm test -- test/generate-output-json.test.js`
- Baseline before phase close: `npm test`

**Rollback:**

- Remove `scan` command registration and new scan/manifest files. Existing commands should remain untouched because `scan` is additive.

**Exit criteria:**

- AC1, AC2, AC5, AC6, AC10, and AC13 have passing validation or explicit scoped blockers.

- [ ] **P1 / Unit 2: Non-Visual Evidence Pack Writers**

**Goal:** Make `scan` write the first shippable non-visual pack: `brief.md`, `agent-context.json`, `architecture.mmd`, and `manifest.json`.

**Requirements:** R3, R5, R9, R14.

**Source acceptance:** SA3, SA4, SA7, SA8, SA17, SA21, SA22, SA23.

**Dependencies:** P0.

**Files:**

- Modify: `src/commands/scan.js`
- Create or modify: `src/artifacts/brief.js`
- Create or modify: `src/artifacts/agent-context.js`
- Modify: existing generate-all or diagram generation integration as needed
- Test: `test/scan-evidence-pack.test.js`
- Test: `test/agent-context-contract.test.js`
- Test: `test/scan-error-categories.test.js`

**Approach:**

- Reuse existing generation internals to write `architecture.mmd`.
- Generate `brief.md` from normalized evidence fields: summary, detected architecture areas, artifact pointers, validation summary, warnings, and agent handoff.
- Keep `brief.md` bounded to a short fixed structure: summary, artifact read order, risk/validation summary, warnings, and next action; add fixture assertions for required headings and maximum line budget.
- Generate top-level `agent-context.json` from the context domain or a small adapter over existing context metadata.
- Add `src/schema/agent-context-v1.schema.json` and enforce the minimal v1 fields `schemaVersion`, `generatedBy`, `mode`, `summary`, `artifacts`, `readOrder`, `warnings`, `errors`, and `partial`; allow optional PR fields only when comparison refs are supplied.
- Update `manifest.json` after writers complete so statuses reflect reality.
- Preserve useful partial output if any writer fails.

**Test scenarios:**

- Minimal fixture without `.architecture.yml` or `.diagramrc` produces useful artifacts or actionable stable blockers.
- Full fixture writes all non-visual top-level artifacts.
- Agent context includes schema version, compact summary fields, artifact pointers, and deterministic ordering.
- Brief output stays within the defined heading set and line budget.
- Simulated writer failure records `partial: true`, artifact-level status, and a stable error category.
- Error categories are asserted through one shared scan error-category contract test.
- Generated artifacts do not contain absolute local paths.

**Verification:**

- Focused: `npm test -- test/scan-evidence-pack.test.js test/agent-context-contract.test.js test/scan-error-categories.test.js`
- Baseline: `npm test`

**Rollback:**

- Keep `scan` and manifest foundation from P0, but disable individual evidence writers and mark their statuses as `deferred` or `failed` with clear warnings.

**Exit criteria:**

- AC3, AC4, AC5, AC7, and AC13 have passing validation or explicit scoped blockers.

- [ ] **P2 / Unit 3: PR-Aware Scan Composition**

**Goal:** Make `scan . --base <ref> --head <ref>` include PR architecture evidence by reusing the existing `workflow pr` contract.

**Requirements:** R7, R8, R9, R14.

**Source acceptance:** SA5, SA16, SA20, SA21, SA23.

**Dependencies:** P0, P1.

**Files:**

- Modify: `src/commands/scan.js`
- Modify or extract: `src/workflow/pr-command.js`
- Modify or reuse: `src/workflow/pr-impact.js`
- Test: `test/scan-pr-evidence.test.js`
- Test: `test/pr-impact.test.js`
- Test: `test/pr-impact-delta.test.js`

**Approach:**

- When base/head refs are supplied, call shared PR-impact functionality rather than reimplementing changed-file analysis.
- Write raw PR artifacts under `.diagram/pr-impact`.
- Include PR summary, risk, blast radius, confidence, reviewer checks, and artifact pointers in `brief.md`, `agent-context.json`, and `manifest.json`.
- Invalid or unavailable refs should not break repository scan output; PR artifacts should be marked unavailable with `pr_refs_unavailable`.

**Test scenarios:**

- Valid base/head fixture writes PR artifacts and indexes them in manifest.
- Invalid refs preserve repository evidence and mark PR evidence partial or failed.
- Risk and blast-radius claims carry evidence references, confidence labels, or `unknown`.
- Existing `workflow pr` behavior remains non-breaking.

**Verification:**

- Focused: `npm test -- test/scan-pr-evidence.test.js test/pr-impact.test.js test/pr-impact-delta.test.js`
- Baseline: `npm test`

**Rollback:**

- Keep repository scan behavior and disable PR composition behind clear `pr_refs_unavailable` or `report_generation_unavailable` warnings.

**Exit criteria:**

- AC8 and AC13 have passing validation or explicit scoped blockers.

- [ ] **P3 / Unit 4: Documentation and CI Evidence Surfacing**

**Goal:** Make the evidence workflow understandable to humans, usable by agents, and discoverable in CI artifact paths.

**Requirements:** R1, R10, R11, R12.

**Source acceptance:** SA1, SA10, SA11, SA12, SA14, SA17, SA18.

**Dependencies:** P0, P1; P2 for PR-specific docs and CI evidence.

**Files:**

- Modify: `README.md`
- Modify: `docs/cli-reference.md`
- Modify: `docs/getting-started.md`
- Modify: `docs/architecture-testing.md` if CI artifact guidance is present there
- Modify: `package.json` script `ci:artifacts` to assert scan artifact paths once the non-visual pack and PR evidence are implemented
- Test or validation: docs style checks and CI artifact script

**Approach:**

- Present Archscope as architecture evidence first.
- Make `archscope scan .` the obvious first-run workflow.
- Present `archscope scan . --base origin/main --head HEAD` as the default PR evidence-pack path, with `archscope workflow pr . --base origin/main --head HEAD` documented as the existing specialized PR-analysis command.
- Keep migration, finalization, and machine-contract governance in maintainer links rather than the first-run path.
- Ensure CI guidance exposes `brief.md`, `agent-context.json`, `manifest.json`, and PR-impact JSON through stable paths.
- Preserve compatibility docs for `diagram` and package-name migration state.

**CI artifact contract:**

| Artifact path                       | Repository scan                 | PR scan                                          |
| ----------------------------------- | ------------------------------- | ------------------------------------------------ |
| `.diagram/manifest.json`            | required, `written`             | required, `written`                              |
| `.diagram/brief.md`                 | required, `written`             | required, `written`                              |
| `.diagram/agent-context.json`       | required, `written`             | required, `written`                              |
| `.diagram/architecture.mmd`         | required, `written`             | required, `written`                              |
| `.diagram/pr-impact/pr-impact.json` | absent or `deferred`            | required when `--base` and `--head` are supplied |
| `.diagram/report.html`              | optional or `deferred` until P5 | optional or `deferred` until P5                  |

**Test scenarios:**

- README first-run path names the evidence pack and read order.
- First-run console/docs path directs users to `.diagram/manifest.json`, the current `primaryHumanArtifact`, and the current `primaryAgentArtifact`.
- CLI reference documents scan options and machine mode.
- CI artifact generation runs scan or an equivalent fixture and proves the stable artifact paths from the CI artifact contract.
- `ci:artifacts` validation asserts the required repository-scan and PR-scan artifact paths and statuses from the table above.
- Video and animated generation remain documented as secondary, not removed.

**Verification:**

- Docs: `npm run docs:style:changed`
- Contract: `bash scripts/verify-work.sh --fast`
- CI artifact behavior: `npm run ci:artifacts`
- Baseline: `npm test`

**Rollback:**

- Revert documentation changes and keep implemented command behavior. If `ci:artifacts` changes regress CI, restore prior script and document scan artifact collection separately.

**Exit criteria:**

- AC9, AC10, AC13, and AC14 have passing validation or explicit scoped blockers.

- [ ] **P4 / Unit 5: Companion UI Spec for report.html**

**Goal:** Create the companion UI specification required before accepting `report.html` as a complete product surface.

**Requirements:** R13.

**Source acceptance:** SA6, SA15.

**Dependencies:** P0-P3 for artifact facts and content model.

**Files:**

- Create: `docs/ui-specs/2026-05-01-archscope-evidence-report-ui-spec.md`
- Modify: `docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md` only if a handoff link is required
- Modify: this plan only if UI acceptance IDs need traceability refinement

**Approach:**

- Define report IA, modes, responsive behavior, accessibility, rendered verification, and visual acceptance IDs.
- Freeze report invocation policy (`default-on` versus explicit `--report`/profile option) before P5 starts.
- Cover scan and PR modes.
- Keep report content aligned with the non-visual evidence pack so HTML is presentation, not a separate source of truth.

**Test scenarios:**

- UI spec includes stable visual acceptance IDs.
- UI spec resolves report invocation policy and maps it to CLI, docs, manifest status, and CI artifact behavior.
- UI spec maps back to SA6 and SA15.
- No implementation plan marks report complete before the UI spec exists.

**Verification:**

- Review: HE spec/plan self-check against SA6 and SA15.
- Docs: `npm run docs:style:changed`

**Rollback:**

- Remove the UI spec and keep `report.html` deferred in `manifest.json`.

**Exit criteria:**

- AC11 has a reviewed UI spec with traceable acceptance IDs.

- [ ] **P5 / Unit 6: HTML Report Implementation**

**Goal:** Implement `report.html` only after P4 defines the report UI contract.

**Requirements:** R13, R14.

**Source acceptance:** SA6, SA15.

**Dependencies:** P4, including a frozen report invocation policy.

**Files:**

- Create or modify: `src/renderers/report-html.js`
- Modify: `src/commands/scan.js`
- Test: `test/scan-report-html.test.js`
- Test or visual verification: to be defined by the companion UI spec

**Approach:**

- Render from the same normalized evidence model used by `brief.md`, `agent-context.json`, and `manifest.json`.
- Support scan and PR modes.
- Include risk badge, component tables, dependency neighborhood, diagrams, raw artifact links, validation/evidence summary, and agent handoff.
- Update manifest status from `deferred` to `written` only when report generation succeeds.

**Test scenarios:**

- Scan mode report includes required sections and raw artifact links.
- PR mode report includes risk, blast radius, changed components, and reviewer checks.
- Report generation failure does not erase non-visual evidence and marks report `failed`.
- Visual/responsive/accessibility checks pass according to P4.

**Verification:**

- Focused: `npm test -- test/scan-report-html.test.js`
- Visual/report checks: command(s) defined by P4
- Contract: `bash scripts/verify-work.sh --fast` when report docs, scripts, or CI artifact behavior change
- Baseline: `npm test`
- Deep gate before final closeout: `npm run test:deep`

**Rollback:**

- Disable report writer and restore manifest `report.html` status to `deferred` while preserving non-visual pack behavior.

**Exit criteria:**

- AC12 and AC13 have passing validation or explicit scoped blockers.

## Execution Checkpoints

### Checkpoint A: Command and Manifest Contract

**Exit criteria:**

- `scan` is registered.
- `manifest.json` is written.
- Deterministic machine output is parser-safe and timestamp-stable.
- `report.html` is explicitly `deferred`, not silently omitted.

**Stop condition:**

- Existing machine-envelope helpers cannot support `scan` without broad refactoring. Route back to plan before creating parallel output machinery.
- Shared manifest extraction changes existing `generate-all` output semantics or exceeds the P0 file-scope gate. Route back to plan before widening the extraction.

### Checkpoint B: Non-Visual Pack Completeness

**Exit criteria:**

- `brief.md`, `agent-context.json`, `architecture.mmd`, and `manifest.json` are written in a fixture repo.
- Agent read order starts with manifest.
- Partial-output states are observable.

**Stop condition:**

- Top-level `agent-context.json` cannot be produced without incompatible changes to the existing `context` command. Route back to plan or spec to choose a narrower contract.

### Checkpoint C: PR Evidence Composition

**Exit criteria:**

- `scan --base --head` reuses PR-impact behavior and writes indexed PR artifacts.
- Risk and blast-radius claims include confidence or evidence.

**Stop condition:**

- Reuse requires changing `workflow pr` semantics. Preserve `workflow pr` and route back to plan.

### Checkpoint D: Report Gate

**Exit criteria:**

- Companion UI spec exists before `report.html` is marked complete.

**Stop condition:**

- Report implementation starts before UI acceptance exists. Pause and complete P4 first.

## Acceptance Checklist

- [ ] **AC1:** `archscope scan .` exists as a documented command and does not regress existing commands.
- [ ] **AC2:** `.diagram/manifest.json` indexes top-level and subordinate artifacts, starts the agent read order, records artifact statuses, avoids absolute paths, and handles deterministic timestamp/list behavior.
- [ ] **AC3:** `scan` writes the non-visual pack: `.diagram/brief.md`, `.diagram/agent-context.json`, `.diagram/architecture.mmd`, and `.diagram/manifest.json`.
- [ ] **AC4:** `agent-context.json` has stable schema versioning, deterministic support, compact summary fields, artifact pointers, and documented read order.
- [ ] **AC5:** Console output prints a concise next-step summary naming `.diagram/manifest.json`, the current `primaryHumanArtifact`, the current `primaryAgentArtifact`, and exactly one stable next action.
- [ ] **AC6:** `scan --format json --deterministic` emits canonical machine-envelope fields with parser-safe stdout and stable error categories.
- [ ] **AC7:** Partial evidence records artifact-level statuses and never reports full success when artifacts required for the current phase and mode fail or are deferred.
- [ ] **AC8:** `scan . --base <ref> --head <ref>` reuses `workflow pr`, writes PR artifacts, and includes risk, blast radius, confidence, evidence, and reviewer checks.
- [ ] **AC9:** README, CLI reference, getting-started, and CI artifact guidance present architecture evidence first and keep governance/migration detail in maintainer paths.
- [ ] **AC10:** `generate`, `generate-all`, `validate`, `workflow pr`, `context`, `diagram`, and `@brainwav/diagram` compatibility behavior remain non-breaking.
- [ ] **AC11:** Companion UI spec exists and maps report visual acceptance to SA6 and SA15.
- [ ] **AC12:** `report.html` supports scan and PR modes only after AC11 is satisfied and report invocation policy is frozen.
- [ ] **AC13:** Implementation reuses existing analysis, generation, context, PR-impact, machine-envelope, and manifest capabilities rather than creating a parallel pipeline; parity tests must prove shared manifest behavior and reused PR/generation outputs.
- [ ] **AC14:** `npm run ci:artifacts` passes and proves CI can publish or expose the required repository-scan and PR-scan artifact paths and statuses from the CI artifact contract.

## System-Wide Impact

- **Interaction graph:** `scan` will touch CLI registration, artifact generation, context generation, PR impact, manifest indexing, and docs/CI artifact guidance.
- **Error propagation:** writer failures should become stable error categories and artifact statuses, not uncaught exceptions or ambiguous console warnings.
- **State lifecycle risks:** `.diagram` may contain partial prior outputs; manifest writing should reflect the current command run and avoid treating stale files as fresh evidence.
- **API surface parity:** machine output and compatibility aliases must remain consistent with the active Archscope compatibility plan.
- **Integration coverage:** unit tests are not enough; fixture scan execution, PR scan execution, and CI artifact generation must be validated before completion.

## Risks & Dependencies

| Risk                                             | Impact                                                 | Mitigation                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `scan` duplicates existing command logic         | Long-term drift and inconsistent artifacts             | Reuse shared internals; require manifest and PR/generation parity checks against SA23/AC13 after each phase. |
| `report.html` pulls UI work into the first slice | Blocks non-visual value and creates unclear acceptance | Keep report `deferred` until P4; stop if implementation starts early.                                        |
| Manifest statuses do not match actual files      | Agents and CI trust stale evidence                     | Write manifest after artifact writers complete; test partial/failure states.                                 |
| Agent context becomes too verbose                | Agents lose compact handoff value                      | Snapshot compact fields and require stable read order.                                                       |
| PR scan changes `workflow pr` behavior           | Existing users and CI break                            | Reuse contract without changing semantics; run PR-impact regression tests.                                   |
| Docs over-foreground governance                  | First-run UX remains confusing                         | Make migration/governance links secondary in P3 review.                                                      |
| Absolute local paths leak into artifacts         | Artifacts become machine-specific and unsafe to share  | Add fixture assertions for path normalization.                                                               |

## Documentation / Operational Notes

- This plan should remain linked from implementation PR descriptions until a tracker is attached.
- Do not remove migration/finalization docs; move them out of the first-run path when updating docs.
- Do not claim the package or repository has been renamed.
- Any future tracker-created version of this plan should preserve the existing `SA`, `AC`, and `P` IDs to avoid review drift.
- During work mode, update this plan's execution ledger after each phase with exact commands and outcomes.

## Validation Ladder

1. **Plan artifact validation**
   - Confirm required HE sections exist.
   - Confirm all SA IDs map to plan units and AC IDs.
2. **Focused phase tests**
   - Run only the tests proving the current unit first.
3. **Baseline implementation validation**
   - `npm test`
4. **Contract-sensitive validation**
   - `bash scripts/verify-work.sh --fast` when docs, scripts, or validation contracts change.
   - `npm run docs:style:changed` when docs change.
5. **Artifact and deep validation**
   - `npm run ci:artifacts` when CI artifact behavior changes.
   - `npm run test:deep` before final closeout or when scan/report behavior affects generated artifacts broadly.

## Execution Ledger (Planning Mode)

| Unit     | Status   | Evidence                                                                                          | Notes                                           |
| -------- | -------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Planning | complete | Plan created from `docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md` | Fresh plan; untracked; report gated by UI spec. |
| P0       | pending  | none                                                                                              | Start here.                                     |
| P1       | pending  | none                                                                                              | Requires P0 manifest foundation.                |
| P2       | pending  | none                                                                                              | Requires P1 evidence model.                     |
| P3       | pending  | none                                                                                              | Requires command and artifact behavior.         |
| P4       | pending  | none                                                                                              | Required before report completion.              |
| P5       | pending  | none                                                                                              | Blocked until P4.                               |

## First he-work Handoff

Start with **P0 / Unit 1: Scan Command and Manifest Foundation**.

Bounded first slice:

- register `scan` in `src/diagram.js`;
- create a small `src/commands/scan.js` coordinator;
- write `.diagram/manifest.json` with expected artifact statuses;
- mark `report.html` as `deferred`;
- support `--format json --deterministic` through the canonical machine envelope;
- add focused tests for command registration, manifest shape, deterministic output, and absolute-path avoidance.

Do not implement `brief.md`, `agent-context.json`, PR composition, or `report.html` in the first slice unless P0 is already passing and the slice remains small.

## Sources & References

- Governing spec: `docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md`
- Compatibility plan: `docs/plans/2026-04-11-feat-archscope-repositioning-and-compatibility-plan.md`
- HE plan skill: `/Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/skills/team_automation/he-plan/SKILL.md`
- HE plan artifact contract: `/Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/fixtures/preserved-context/skills/team_automation/he-plan/references/plan-artifacts.md`
- HE verification-first guidance: `/Users/jamiecraik/dev/agent-skills/Plugins/harness-engineering/fixtures/preserved-context/skills/team_automation/he-plan/references/verification-first.md`
