---
schema_version: 1
title: "feat: Archscope identity convergence and rename readiness plan"
type: feat
status: draft
date: 2026-05-01
origin: docs/specs/2026-05-01-feat-archscope-identity-convergence-and-rename-readiness-spec.md
spec: docs/specs/2026-05-01-feat-archscope-identity-convergence-and-rename-readiness-spec.md
source_spec: docs/specs/2026-05-01-feat-archscope-identity-convergence-and-rename-readiness-spec.md
plan_route: fresh
plan_depth: deep
traceability_required: true
tracking_status: tracked
linear_project: diagram-cli
linear_issue: JSC-247
linear_status: Backlog
branch: pending
pr: pending
---

# feat: Archscope identity convergence and rename readiness plan

## Table of Contents

- [Plan Mode Decision](#plan-mode-decision)
- [Overview](#overview)
- [Problem Frame](#problem-frame)
- [Linear Work Item Contract](#linear-work-item-contract)
- [Requirements Trace](#requirements-trace)
- [Linear / Spec / Plan / PR Traceability](#linear--spec--plan--pr-traceability)
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

This is a new implementation plan for the Archscope identity convergence and
rename readiness spec. It does not replace the 2026-04-11 compatibility plan or
the 2026-05-01 architecture evidence experience plan. Those plans govern command
compatibility, machine contracts, migration evidence, and the evidence-pack
experience. This plan governs product-language convergence and readiness
evidence for any future deeper rename.

The plan intentionally starts with an audit. The first implementation step is
not a package, repository, `.diagram`, `.diagramrc`, or schema URL rename.

## Overview

Make Archscope feel like the canonical product while preserving every current
compatibility surface:

- package: `@brainwav/diagram`
- compatibility command: `diagram`
- repository slug: `diagram-cli`
- artifact namespace: `.diagram`
- config file: `.diagramrc`
- schema/domain references that are compatibility-sensitive

The implementation should converge active first-read docs, CLI/help text,
generated human-facing output, issue templates, and CI comments onto Archscope
and architecture-evidence language. It should also produce a rename-readiness
record that explicitly keeps package, repository, artifact namespace, and schema
URL hard renames deferred until separate specs exist.

## Problem Frame

Archscope is now the CLI identity and product direction, but the repo still has
mixed naming surfaces. Some are correct compatibility facts. Others are stale
first-read product descriptions that make the project feel like `diagram-cli` or
only a diagram generator.

The work needs to distinguish those categories:

```text
fix stale active product language
label compatibility names accurately
preserve historical records
defer hard external renames
```

Without this distinction, implementation can either break existing users or
leave Archscope feeling like a thin alias over an old diagram tool.

## Linear Work Item Contract

- Linear issue: [JSC-247](https://linear.app/jscraik/issue/JSC-247/converge-archscope-identity-and-rename-readiness)
- Tracker of record: Linear `JSC-247`
- Traceability required: true
- Linear project: `diagram-cli`
- Linear status: `Backlog`
- Branch: pending
- PR: pending
- Linear comment required: true before implementation closeout

This plan is tracked by Linear issue `JSC-247`. Any implementation PR should
link this plan, the governing spec, and `JSC-247`.

## Requirements Trace

- R1. Audit identity surfaces and classify references as canonical,
  compatibility, deferred rename, or historical context.
- R2. Active first-read docs introduce the product as Archscope and describe the
  job as architecture evidence for humans and AI coding agents.
- R3. Installation and repository docs explain `@brainwav/diagram` and
  `diagram-cli` as current compatibility/package/repo facts, not product names.
- R4. CLI help and examples prefer `archscope`, while `diagram` appears only in
  compatibility contexts.
- R5. Generated human-facing output identifies the product as Archscope.
- R6. Machine JSON remains parser-safe and schema-compatible.
- R7. `@brainwav/diagram`, `diagram`, `diagram-cli`, `.diagram`, and
  `.diagramrc` remain supported compatibility surfaces.
- R8. `.diagram` remains the default artifact namespace; `.archscope` is not a
  required output path.
- R9. Agent-facing docs and generated handoff language preserve
  manifest-first read order.
- R10. First-run docs keep migration finalization details behind maintainer or
  migration links.
- R11. Compatibility command parity remains tested.
- R12. Historical specs and plans are not rewritten as if current product docs.
- R13. Rename-readiness evidence exists for package, repository, artifact
  namespace, and schema/domain URL rename.
- R14. Rename readiness defaults to `rename_deferred` unless the required
  readiness evidence exists.
- R15. Future package rename is blocked without a dedicated package migration
  spec.
- R16. Future repository rename is blocked without a dedicated repository
  migration spec.

## Linear / Spec / Plan / PR Traceability

| Tracker | Requirement | Source acceptance IDs | Plan units | Acceptance IDs | PR evidence |
| ------- | ----------- | --------------------- | ---------- | -------------- | ----------- |
| JSC-247 | R1          | SA1, SA12             | P0         | AC1            | pending     |
| JSC-247 | R2          | SA2, SA10             | P1         | AC2, AC7       | pending     |
| JSC-247 | R3          | SA3, SA7              | P1, P4     | AC3, AC11      | pending     |
| JSC-247 | R4          | SA4, SA11             | P2         | AC4, AC9       | pending     |
| JSC-247 | R5          | SA5                   | P3         | AC5            | pending     |
| JSC-247 | R6          | SA6                   | P2, P3     | AC6            | pending     |
| JSC-247 | R7          | SA7, SA8              | P0-P5      | AC8, AC11      | pending     |
| JSC-247 | R8          | SA8                   | P0-P5      | AC8            | pending     |
| JSC-247 | R9          | SA9                   | P1, P3     | AC7            | pending     |
| JSC-247 | R10         | SA10                  | P1         | AC2            | pending     |
| JSC-247 | R11         | SA11                  | P2, P5     | AC9            | pending     |
| JSC-247 | R12         | SA12                  | P0         | AC1            | pending     |
| JSC-247 | R13         | SA13                  | P4         | AC10           | pending     |
| JSC-247 | R14         | SA14                  | P4         | AC10           | pending     |
| JSC-247 | R15         | SA15                  | P4         | AC11           | pending     |
| JSC-247 | R16         | SA16                  | P4         | AC11           | pending     |

## Scope Boundaries

In scope:

- Identity audit and classification artifact.
- Archscope-first updates to active docs and command guidance.
- Product-language updates for generated human-facing output and CI comments.
- Compatibility-preserving updates to CLI help, init sample text, issue
  templates, and package description where safe.
- Rename-readiness documentation or artifact that keeps deeper rename work
  deferred.
- Tests or validation scripts needed to prove compatibility and parser safety.

Out of scope:

- Rename `@brainwav/diagram`.
- Rename `diagram-cli`.
- Remove `diagram`.
- Rename `.diagram` or `.diagramrc`.
- Rename schema URLs.
- Rewrite historical specs/plans as product docs.
- Change analysis behavior, risk scoring, ERD extraction, or evidence-pack
  semantics beyond product-language surfaces.

## Context & Research

### Live Repo Evidence

- `README.md` is already Archscope-first and preserves compatibility facts.
- `docs/getting-started.md`, `docs/cli-reference.md`,
  `docs/architecture-testing.md`, and `docs/README.md` already use many
  Archscope-first examples.
- `package.json` now describes Archscope as architecture evidence for humans
  and AI agents, while package name and repository URLs intentionally remain
  compatibility surfaces.
- `src/diagram.js` help now describes the CLI as architecture evidence for
  humans and AI agents.
- `src/commands/init.js` now generates Archscope-first CI samples and next
  steps while preserving the `@brainwav/diagram` package install path.
- `.github/workflows/pr-impact-comment.yml` now emits `Generated by
  Archscope` while keeping the existing repository URL.
- `.github/ISSUE_TEMPLATE/feature.yml` now asks about Archscope command,
  format, or rule behavior.
- `.github/ISSUE_TEMPLATE/issue.yml` now names `archscope` as canonical and
  `diagram` as a compatibility alias.
- Tests already assert Archscope evidence brief/report language and
  `agentContext.generatedBy = archscope scan`.

### Governing Specs

- `docs/specs/2026-04-11-feat-archscope-repositioning-and-compatibility-spec.md`
  preserves dual-bin compatibility, machine-envelope behavior, and migration
  readiness evidence.
- `docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md`
  defines the evidence-pack experience, manifest-first agent read order, and
  Archscope evidence brief/report behavior.
- `docs/specs/2026-05-01-feat-archscope-identity-convergence-and-rename-readiness-spec.md`
  is the governing spec for this plan.

### Institutional Learning

- Prior diagram-cli work showed local hooks can fail on broken local contracts;
  validate with repo commands and record exact outcomes.
- The project should avoid package/repo churn until product experience and
  compatibility evidence justify it.
- Generated artifacts and agent-readable contracts matter more than cosmetic
  rename breadth.

## Technical Review Summary

HE technical review of the governing spec found no blocking contradictions. The
spec consistently separates Archscope-first identity convergence from hard
package, repository, artifact namespace, and schema URL rename work.

Review notes for planning:

- Keep the first slice as an audit and classification pass.
- Treat `src/commands/init.js`, `.github/workflows/pr-impact-comment.yml`,
  `.github/ISSUE_TEMPLATE/*.yml`, `src/diagram.js`, and `package.json`
  description as likely active surfaces.
- Preserve `@brainwav/diagram`, `diagram`, `diagram-cli`, `.diagram`, and
  `.diagramrc` where they are compatibility facts.

## Key Technical Decisions

- Do not add a hardcoded list of every allowed old-name occurrence unless the
  audit proves it is maintainable.
- Prefer a checked-in Markdown audit first; add a script only if review finds
  repeatable drift worth automating.
- Update generated human output before broad historical docs cleanup.
- Keep package metadata names and URLs unchanged unless a field is product
  description rather than compatibility identity.
- Use focused tests for touched output surfaces, then run the baseline test
  suite and compatibility readiness gate.

## High-Level Technical Design

- Add an identity audit artifact under `docs/identity/` or
  `docs/migration/`, such as:

```text
docs/identity/archscope-identity-surface-audit.md
```

- The audit should classify each active surface:
  - `canonical-now`
  - `compatibility-labelled`
  - `deferred-rename`
  - `historical-context`

- Patch active product-language surfaces:
  - docs first-read language
  - CLI help
  - init-generated CI sample
  - PR comment footer
  - issue templates
  - package description if compatible

- Preserve runtime compatibility:
  - do not alter `package.json.name`
  - do not remove `bin.diagram`
  - do not move `.diagram` outputs
  - do not change `.diagramrc`
  - do not rename schema fields or URLs

- Add or update tests around changed generated output:
  - command identity/help tests
  - init command output and generated CI sample tests if coverage exists or is
    added
  - PR comment template output validation if practical
  - package metadata assertion if description changes

## Implementation Units

### P0: Identity Surface Audit and Classification

Goal: produce the source-of-truth inventory before edits.

Actions:

- Run targeted `rg` across active docs, CLI source, generated artifact writers,
  CI workflows, issue templates, tests, and package metadata.
- Classify each reference as canonical-now, compatibility-labelled,
  deferred-rename, or historical-context.
- Save the reviewed audit artifact in a stable docs path.
- Identify the minimal active surface list for P1-P4.

Acceptance:

- AC1: Audit exists and maps all active identity references needed for SA1 and
  SA12.
- AC2: Historical specs/plans are not treated as mandatory rewrite targets.

Validation:

```bash
rg -n "diagram-cli|@brainwav/diagram|diagram|\\.diagram|\\.diagramrc|archscope|Archscope" README.md docs src .github package.json test
vale --config .vale.ini docs/identity/archscope-identity-surface-audit.md
```

Rollback:

- Delete the audit artifact if classification is wrong; no runtime behavior
  should change in P0.

### P1: First-Read Docs Identity Convergence

Goal: make active first-read docs consistently Archscope-first while preserving
compatibility facts.

Actions:

- Patch active docs identified by P0, likely including README and docs index
  only if drift remains.
- Keep `@brainwav/diagram`, `diagram-cli`, `.diagram`, and `.diagramrc` as
  compatibility-labelled facts near install, repository, and artifact path
  guidance.
- Keep migration finalization details behind migration/maintainer links.

Acceptance:

- AC3: First-read docs satisfy SA2, SA3, SA9, and SA10.
- AC4: No package, repository, or artifact namespace rename is implied.

Validation:

```bash
vale --config .vale.ini README.md docs/getting-started.md docs/cli-reference.md docs/architecture-testing.md docs/README.md
npm run docs:style:changed
```

Rollback:

- Revert documentation wording only; compatibility behavior is untouched.

### P2: CLI Help, Init Sample, and Compatibility Guidance

Goal: align active CLI-facing product text without changing command behavior.

Actions:

- Update `src/diagram.js` top-level description if it undersells the product.
- Update `src/commands/init.js` generated CI sample and console guidance to use
  `archscope` for new examples.
- Preserve package install path `@brainwav/diagram`.
- Preserve `diagram` only as a compatibility command, not as the generated
  default for new CI samples.
- Add/update tests for command help and init-generated text.

Acceptance:

- AC5: CLI help and init output satisfy SA4.
- AC6: Machine JSON remains parser-safe and command compatibility still passes.
- AC7: `diagram` compatibility guidance remains available where relevant.

Validation:

```bash
npm test -- test/command-identity.test.js
npm test -- test/init-command.test.js
npm run migration:readiness
```

If `test/init-command.test.js` does not exist before implementation, create the
focused test or replace that command with the new focused test file name in the
execution ledger.

Rollback:

- Revert help/sample text and tests; no data migration required.

### P3: Generated Human Output and CI Comment Branding

Goal: make generated human-facing output identify the product as Archscope.

Actions:

- Update PR impact comment footer from `diagram-cli` to Archscope while keeping
  repository link accuracy.
- Review generated brief/report text and agent handoff prose for any stale
  product noun.
- Add/update tests or fixture checks for generated output where practical.
- Ensure JSON output remains clean and schema-compatible.

Acceptance:

- AC8: Generated human output satisfies SA5.
- AC9: Parser-safe machine output satisfies SA6.

Validation:

```bash
npm test -- test/scan-evidence-pack.test.js test/scan-report-html.test.js test/scan-pr-evidence.test.js
npm test -- test/generated-output-identity.test.js
npm test -- test/workflow-pr-machine-envelope.test.js test/generate-output-json.test.js
```

Rollback:

- Revert generated prose/comment text; no artifact path migration required.

### P4: Rename Readiness Record

Goal: document why deeper rename work is deferred and what evidence is required
before it can be planned.

Actions:

- Add a rename-readiness artifact, likely:

```text
docs/migration/archscope-rename-readiness.md
```

- Cover package rename, repository rename, artifact namespace rename, and
  schema/domain URL rename.
- Mark current status as `rename_deferred` unless all readiness evidence exists.
- Explicitly require dedicated follow-up specs before package or repository
  rename implementation.

Acceptance:

- AC10: Readiness artifact satisfies SA13 and SA14.
- AC11: Package and repository rename blockers satisfy SA15 and SA16.
- AC12: Compatibility surfaces from SA7 and SA8 remain protected.

Validation:

```bash
vale --config .vale.ini docs/migration/archscope-rename-readiness.md
rg -n "rename_deferred|@brainwav/diagram|diagram-cli|\\.diagram|\\.diagramrc" docs/migration/archscope-rename-readiness.md
```

Rollback:

- Revert readiness artifact; deeper rename remains blocked by the governing
  spec.

### P5: Compatibility and Baseline Validation Closeout

Goal: prove the identity convergence did not break compatibility or repo gates.

Actions:

- Run focused tests from touched units.
- Run baseline implementation validation.
- Run migration readiness.
- Run docs validation.
- Update plan execution ledger with exact commands and outcomes.

Acceptance:

- AC13: `archscope` and `diagram` parity is still proven.
- AC14: Baseline repo validation passes or blockers are recorded exactly.
- AC15: Plan execution ledger records evidence for P0-P5.

Validation:

```bash
npm test
npm run test:deep
npm run migration:readiness
npm run ci:artifacts
bash scripts/verify-work.sh --fast
```

Rollback:

- If baseline validation fails due product-text changes, revert the relevant
  unit and rerun focused validation before moving forward.

## Execution Checkpoints

- After P0: review audit classifications before editing many files.
- After P1: run docs validation and inspect first-read docs manually.
- After P2: run command identity and init focused tests.
- After P3: run generated artifact and machine-output focused tests.
- After P4: review readiness artifact for accidental authorization of hard
  rename.
- After P5: run baseline validation and update ledger.

## Acceptance Checklist

- [x] AC1: Identity audit exists and is classified.
- [x] AC2: Historical docs are not rewritten as active product docs.
- [x] AC3: First-read docs are Archscope-first.
- [x] AC4: Compatibility names remain accurate and labelled.
- [x] AC5: CLI help/init generated text prefer Archscope.
- [x] AC6: Machine JSON remains parser-safe.
- [x] AC7: `diagram` remains compatibility-supported.
- [x] AC8: Generated human output says Archscope where branding appears.
- [x] AC9: Machine-output tests still pass.
- [x] AC10: Rename-readiness artifact exists.
- [x] AC11: Package/repo rename remain blocked pending dedicated specs.
- [x] AC12: `.diagram` and `.diagramrc` remain default compatibility paths.
- [ ] AC13: Command parity is proven.
- [ ] AC14: Baseline validation passes or blockers are recorded.
- [ ] AC15: Execution ledger is current.

## System-Wide Impact

- User-facing docs become more coherent around Archscope.
- Generated CI samples should steer new adopters to `archscope`.
- Existing users of `diagram`, `@brainwav/diagram`, `.diagram`, and
  `.diagramrc` should see no breaking behavior.
- Future package/repo rename decisions become explicit readiness work instead
  of incidental wording drift.

## Risks & Dependencies

- Risk: overzealous search-and-replace breaks compatibility wording.
  - Mitigation: P0 classification before edits; no broad mechanical rename.
- Risk: generated CI sample switches command name but forgets unchanged package
  name.
  - Mitigation: focused init sample test and compatibility wording.
- Risk: PR comment link text changes but link destination still uses
  `diagram-cli`.
  - Mitigation: allow repository URL as compatibility-labelled fact.
- Risk: validators become too brittle around historical docs.
  - Mitigation: audit artifact first; optional script only after drift pattern is
    clear.
- Dependency: current command identity and evidence-pack tests from earlier
  plans.

## Documentation / Operational Notes

- Keep docs direct: Archscope first, compatibility second.
- Do not front-load release finalization policy in first-run docs.
- Keep migration/readiness docs as maintainer surfaces.
- If a future issue asks to rename the package or repository, start from the
  readiness artifact and write a dedicated migration spec.

## Validation Ladder

1. Spec/plan/document checks:

```bash
vale --config .vale.ini docs/specs/2026-05-01-feat-archscope-identity-convergence-and-rename-readiness-spec.md
vale --config .vale.ini docs/plans/2026-05-01-feat-archscope-identity-convergence-and-rename-readiness-plan.md
npm run docs:style:changed
```

2. Focused unit validation:

```bash
npm test -- test/command-identity.test.js
npm test -- test/init-command.test.js
npm test -- test/scan-evidence-pack.test.js test/scan-report-html.test.js test/scan-pr-evidence.test.js
npm test -- test/workflow-pr-machine-envelope.test.js test/generate-output-json.test.js
```

3. Compatibility and artifact validation:

```bash
npm run migration:readiness
npm run ci:artifacts
```

4. Baseline validation:

```bash
npm test
npm run test:deep
bash scripts/verify-work.sh --fast
```

If a planned focused test file does not exist before its unit, create it during
that unit or update the ledger with the replacement command actually run.

## Execution Ledger (Planning Mode)

| Unit | Status   | Owner              | Evidence |
| ---- | -------- | ------------------ | -------- |
| P0   | complete | Codex              | 2026-05-02: created `docs/identity/archscope-identity-surface-audit.md` from the required identity search and a focused active-surface pass. Validation: broad identity `rg` pass (1,551 matches; expected inventory); focused active-surface `rg` pass; `vale --config .vale.ini docs/identity/archscope-identity-surface-audit.md` pass (0 errors, 0 warnings, 0 suggestions). Review gates: `$simplify` and `$he-code-review` manual pass with no P0/P1/P2 findings; artifact `artifacts/reviews/archscope-identity-p0-manual-review.md`. |
| P1   | complete | Codex              | 2026-05-02: inspected `README.md`, `docs/getting-started.md`, `docs/cli-reference.md`, `docs/architecture-testing.md`, and `docs/README.md` against the P0 audit. No product-doc wording changes required: first-read docs already lead with Archscope and architecture evidence, while `diagram`, `@brainwav/diagram`, `diagram-cli`, `.diagram`, and `.diagramrc` remain compatibility/package/repo/path facts. Validation: `vale --config .vale.ini README.md docs/getting-started.md docs/cli-reference.md docs/architecture-testing.md docs/README.md` pass (0 errors, 0 warnings, 0 suggestions); stale-phrase `rg` pass (no matches); `npm run docs:style:changed` pass (`No staged documentation changes detected for Vale`). Review gates: `$simplify` and `$he-code-review` manual pass with no P0/P1/P2 findings; artifact `artifacts/reviews/archscope-identity-p1-manual-review.md`. |
| P2   | complete | Codex              | 2026-05-02: updated CLI/package/init/recovery guidance to prefer `archscope` for active user-facing examples while preserving `@brainwav/diagram`, `diagram-cli` repository URLs, `.diagram`, `.diagramrc`, and the `diagram` compatibility bin. Added `test/init-command.test.js` and extended `test/command-identity.test.js`. Validation: `npm test -- test/command-identity.test.js test/init-command.test.js` pass (5 passing); `npm run migration:readiness` pass (`status: pass`, compatibility drill includes `archscope --help`, `diagram --help`, and output parity); residual active-surface `rg` pass (only package/repo/compatibility/test references remain); `npm test` pass (173 passing). Review gates: `$simplify` and `$he-code-review` manual pass with no P0/P1/P2 findings; artifact `artifacts/reviews/archscope-identity-p2-manual-review.md`. |
| P3   | complete | Codex              | 2026-05-02: updated PR comment branding, issue templates, and generated command next-step prose to prefer Archscope while keeping repository URLs and `.diagram` artifact paths unchanged. Added `test/generated-output-identity.test.js` for PR comment/template prose and generated next-step guidance. Validation: `npm test -- test/generated-output-identity.test.js test/scan-evidence-pack.test.js test/scan-report-html.test.js test/scan-pr-evidence.test.js test/workflow-pr-machine-envelope.test.js test/generate-output-json.test.js` pass (15 passing); active generated-output `rg` pass (no source/template matches); `npm test` pass (175 passing). Review gates: `$simplify` and `$he-code-review` manual pass with no P0/P1/P2 findings; artifact `artifacts/reviews/archscope-identity-p3-manual-review.md`. |
| P4   | complete | Codex              | 2026-05-02: added `docs/migration/archscope-rename-readiness.md` with status `rename_deferred`, protected compatibility surfaces, readiness checklist, follow-up spec requirements, and planning handoff for package, repository, artifact namespace, config, and schema/domain URL renames. Validation: `vale --config .vale.ini docs/migration/archscope-rename-readiness.md` pass (0 errors, 0 warnings, 0 suggestions); readiness `rg` pass (required terms found). Review gates: `$simplify` and `$he-code-review` manual pass with no P0/P1/P2 findings; artifact `artifacts/reviews/archscope-identity-p4-manual-review.md`. |
| P5   | pending  | implementing-agent | Baseline validation not started.                                                                                                                                             |

## First he-work Handoff

Start with P0 only.

1. Run the identity `rg` command from P0.
2. Create `docs/identity/archscope-identity-surface-audit.md`.
3. Classify active identity references as canonical-now,
   compatibility-labelled, deferred-rename, or historical-context.
4. Do not patch product text until the audit exists.
5. Validate the audit with Vale.
6. Update the execution ledger with exact command outcomes.

## Sources & References

- Governing spec:
  `docs/specs/2026-05-01-feat-archscope-identity-convergence-and-rename-readiness-spec.md`
- Compatibility spec:
  `docs/specs/2026-04-11-feat-archscope-repositioning-and-compatibility-spec.md`
- Evidence experience spec:
  `docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md`
- Current README:
  `README.md`
- CLI reference:
  `docs/cli-reference.md`
- Getting started:
  `docs/getting-started.md`
- Architecture testing:
  `docs/architecture-testing.md`
- Compatibility migration:
  `docs/migration/archscope-compatibility.md`
- CLI bootstrap:
  `src/diagram.js`
- Init command:
  `src/commands/init.js`
- PR comment workflow:
  `.github/workflows/pr-impact-comment.yml`
- Package metadata:
  `package.json`
