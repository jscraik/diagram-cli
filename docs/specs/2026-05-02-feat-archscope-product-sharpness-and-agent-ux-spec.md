---
schema_version: 1
title: Archscope Product Sharpness and Agent UX Contract
type: feat
status: draft
date: 2026-05-02
origin: Codex product critique on Archscope usefulness, ruthless cuts, and AI-agent ergonomics
risk: medium
spec_depth: full
ui_required: false
traceability_required: false
---

# Archscope Product Sharpness and Agent UX Contract

## Spec Mode Decision

**Mode:** standard-spec
**Depth:** full
**UI companion required:** no

This spec defines the next product-sharpness contract after the merged
Archscope evidence-pack and identity-convergence work. It does not reopen the
existing `scan` implementation, the Archscope compatibility migration, or the
package/repository rename decision. It specifies what should change next to make
Archscope more compelling, easier to understand, and safer for AI coding agents
to consume.

## Table of Contents

- [Spec Mode Decision](#spec-mode-decision)
- [Problem Statement](#problem-statement)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Linear Work Item Contract](#linear-work-item-contract)
- [System Boundary](#system-boundary)
- [Baseline Context](#baseline-context)
- [Core Domain Model](#core-domain-model)
- [Product Positioning Contract](#product-positioning-contract)
- [Agent UX Contract](#agent-ux-contract)
- [Human Review UX Contract](#human-review-ux-contract)
- [Ruthless Cut Contract](#ruthless-cut-contract)
- [Interfaces and Dependencies](#interfaces-and-dependencies)
- [Invariants / Safety Requirements](#invariants--safety-requirements)
- [Failure Model and Recovery](#failure-model-and-recovery)
- [Observability](#observability)
- [Acceptance and Test Matrix](#acceptance-and-test-matrix)
- [Linear Acceptance Traceability](#linear-acceptance-traceability)
- [Open Questions](#open-questions)
- [Planning and Implementation Handoff](#planning-and-implementation-handoff)
- [Definition of Done](#definition-of-done)

## Problem Statement

Archscope now has the right strategic identity: architecture evidence for humans
and AI coding agents. The merged evidence-pack and identity work made
`archscope scan .` real, made Archscope first in the active docs, and preserved
the compatibility contract for `diagram`, `@brainwav/diagram`, `diagram-cli`,
`.diagram`, and `.diagramrc`.

The next risk is not missing capability. The next risk is product blur.
Archscope still exposes older diagram-era surfaces, advanced governance details,
and multiple adjacent commands before the user or agent has a sharp answer to:

```text
What changed architecturally, what risk does it create, and what should I read next?
```

For humans, the product should feel like the fastest way to review architecture
impact, not a bundle of diagram commands. For AI coding agents, the product
should provide stable entrypoints, stable exit semantics, compact context, and
clear error categories without requiring command folklore.

## Goals

- Make PR architecture review the obvious high-value workflow for Archscope.
- Make `archscope scan .` and PR scan output communicate a decision-oriented
  summary, not only a list of written files.
- Define explicit agent-facing command behavior or aliases so agents know how to
  request repository context and PR-review context without reading the full CLI
  reference.
- Standardize agent-consumable exit codes and error categories across `scan`,
  PR evidence, and agent context surfaces.
- Keep `.diagram/manifest.json`, `.diagram/brief.md`, and
  `.diagram/agent-context.json` as the core agent/human contract.
- Move non-core media generation surfaces out of the first-read product path
  while preserving compatibility for existing users.
- Keep migration, release, and governance machinery discoverable for maintainers
  but out of the first-run value path.
- Give future planning a bounded path for improving product clarity without
  renaming the package, deleting compatibility commands, or doing a broad
  internal rewrite.

## Non-Goals

- Renaming the npm package from `@brainwav/diagram`.
- Renaming the GitHub repository from `diagram-cli`.
- Removing the `diagram` compatibility command.
- Removing `generate-video` or `generate-animated` in this spec.
- Replacing `workflow pr`, `context`, `generate`, `generate-all`, or `validate`.
- Changing `.diagram` or `.diagramrc`.
- Redesigning `report.html`.
- Rewriting the `src/core/analysis-generation-*` implementation family.
- Introducing a hosted service, database, daemon, or network dependency.
- Changing the Archscope compatibility finalization policy.

## Linear Work Item Contract

No Linear issue was supplied with this spec request. This spec is therefore
untracked until a work item is attached.

- `traceability_required`: `false`
- Tracker of record: not supplied
- Planning status: allowed for local planning only
- PR delivery expectation: any future implementation PR should link this spec
  and the eventual tracked work item if one is created

## System Boundary

In scope:

- CLI-facing product clarity for first-run and PR-review workflows.
- Agent-facing command names, command aliases, or documented command recipes.
- Machine-readable error categories and exit-code semantics.
- Terminal summaries for repository scan and PR scan.
- Documentation hierarchy and command prominence.
- Classification of video/animated diagram commands as secondary, legacy, or
  experimental product surfaces.
- Product-facing internal boundary guidance for future plans.

Out of scope:

- Visual design of generated HTML reports.
- Analysis accuracy improvements beyond surfacing existing facts more clearly.
- Package publishing and repository rename sequencing.
- Release readiness ledger changes.
- Historical spec/plan rewrites.
- Large-scale code movement.

## Baseline Context

Live repository evidence at spec time:

- `README.md` defines Archscope as architecture evidence for humans and AI
  coding agents.
- `package.json` exposes both `archscope` and `diagram` bins while retaining the
  `@brainwav/diagram` package name.
- `archscope scan .` is the selected first-run evidence workflow.
- `scan` writes or indexes `.diagram/manifest.json`, `.diagram/brief.md`,
  `.diagram/report.html`, `.diagram/agent-context.json`,
  `.diagram/architecture.mmd`, and PR evidence when refs are supplied.
- The active CLI reference still lists media commands alongside core evidence
  commands.
- The implementation already has recognizable domains under `src/analyzers`,
  `src/artifacts`, `src/commands`, `src/context`, `src/ir`, `src/migration`,
  `src/renderers`, `src/schema`, and `src/workflow`.
- The broad `src/core/analysis-generation-*` family remains an internal
  readability risk, but this spec does not require a refactor.

## Core Domain Model

- `DecisionBrief`
  - A short repository or PR summary that answers what changed, what matters,
    what risk exists, and what should be read next.
  - Output surfaces: terminal summary, `.diagram/brief.md`, and selected fields
    in `.diagram/agent-context.json`.

- `AgentEntrypoint`
  - A command or documented alias intended for AI coding agents.
  - Selected first implementation surface: documented recipes that point agents
    to the existing `scan` evidence workflow and manifest-first artifact read
    order.
  - Deferred command aliases: `archscope agent .` and
    `archscope agent-pr . --base origin/main --head HEAD`
  - Required behavior if deferred aliases are later implemented: wrap or
    delegate to existing scan/context and PR evidence logic without creating a
    parallel analysis pipeline.

- `AgentOutcome`
  - Machine-readable command outcome for automation and coding agents.
  - Required values: `success`, `partial`, `failed`.
  - Required fields in machine output: outcome, error category when applicable,
    warnings, primary human artifact, primary agent artifact, artifact statuses,
    and next suggested reads.

- `ErrorCategory`
  - A stable, documented reason class that lets agents decide whether to retry,
    fix input, fail CI, or continue with partial evidence.
  - Required category vocabulary:
    - `config_invalid`
    - `repo_unreadable`
    - `git_refs_missing`
    - `analysis_partial`
    - `policy_violation`
    - `risk_threshold_exceeded`
    - `artifact_write_failed`
    - `dependency_unavailable`
    - `internal_error`

- `ExitCodeContract`
  - Stable process-level behavior for automation.
  - Target baseline, subject to the compatibility inventory in the paired plan:
    - `0`: evidence generated and no blocking threshold or policy issue
    - `1`: policy, risk, or validation failure that should fail a gate
    - `2`: usage, configuration, repository, dependency, or git-ref input error
    - `3`: partial evidence generated with degraded artifacts, when existing
      scan compatibility permits this distinction
  - Existing command-specific behavior may be preserved if already documented,
    but any divergence must be explicitly mapped in the CLI reference.
  - If inventory proves existing scan users or tests depend on partial evidence
    exiting `1`, the implementation may preserve exit `1` for partial scan
    states, provided machine output still uses `data.outcome: "partial"` and
    the CLI reference documents the compatibility divergence.

- `CoreEvidenceArtifacts`
  - The artifacts agents and humans should treat as the primary contract:
    - `.diagram/manifest.json`
    - `.diagram/brief.md`
    - `.diagram/agent-context.json`
  - Supporting artifacts include Mermaid diagrams, PR impact JSON, HTML reports,
    validation output, contracts, migration evidence, and context packs.

- `SecondaryMediaSurface`
  - Commands or docs related to video and animated diagram output.
  - Required product posture: available for compatibility or advanced use, but
    not part of the main first-run or PR-review story.

## Product Positioning Contract

First-read product language must lead with this promise:

```text
Before you review a PR, run Archscope.
```

Supporting language may expand this promise:

```text
Before an AI agent edits a repo, give it Archscope evidence.
```

The product must not lead with:

- generic Mermaid generation
- video or animated diagram generation
- migration lifecycle mechanics
- release ledger mechanics
- machine-command coverage
- governance framework language

Docs and CLI help may still expose these details after the default evidence and
PR-review paths are clear.

## Agent UX Contract

Agents must have a short, stable path through the product:

1. Read `.diagram/manifest.json`.
2. Read `.diagram/brief.md`.
3. Read `.diagram/agent-context.json`.
4. Read `.diagram/pr-impact/pr-impact.json` only when present and marked
   `written`.
5. Read `.architecture.yml` only when policy context is needed.

The selected first implementation surface is documentation and machine-contract
clarity, not a new command. Agent-facing docs should present these recipes:

```bash
archscope scan . --format json --deterministic
archscope scan . --base origin/main --head HEAD --format json --deterministic
```

If later planning adds agent-specific commands, they must be thin wrappers or
aliases over existing behavior:

```bash
archscope agent .
archscope agent-pr . --base origin/main --head HEAD
```

Acceptance for these deferred commands must not require new analysis. It should
only provide a more obvious command surface for the existing evidence contract.

Agent-facing JSON must be deterministic when `--deterministic` is supplied. It
must avoid prose-only failures. Every failure or partial state must include a
stable `ErrorCategory` and the next safe action, such as:

- fix configuration
- supply valid refs
- inspect partial artifacts
- rerun without PR refs
- fail the gate
- report internal error

## Human Review UX Contract

The default terminal and brief output must optimize for review decisions.

Repository scan summary should include:

- evidence pack status
- detected component count
- primary human artifact
- primary agent artifact
- warnings
- next command or next file to inspect

PR scan summary should include:

- risk level
- changed component count
- affected architecture areas
- risk reasons
- suggested reviewer checks
- primary human artifact
- primary agent artifact
- raw PR impact artifact path

The user should not need to inspect migration docs, machine-contract coverage,
or maintainer plans to understand the first useful result.

## Ruthless Cut Contract

The following surfaces should be de-emphasized from first-read product paths:

- `generate-video`
- `generate-animated`
- generic diagram generation as the primary headline
- migration release evidence
- finalization policy details
- append-only migration ledger details
- historical specs, plans, and brainstorms

Required behavior:

- Keep these surfaces available where compatibility requires it.
- Move media commands below core evidence commands in docs and help where safe.
- Label media commands as advanced, optional, or compatibility surfaces unless a
  later product spec makes them core again.
- Keep maintainer machinery linked from maintainer docs, not the Quick Start.
- Preserve historical artifacts without rewriting them only for product polish.

## Interfaces and Dependencies

- CLI:
  - `archscope scan .`
  - `archscope scan . --base origin/main --head HEAD`
  - selected agent recipe:
    `archscope scan . --format json --deterministic`
  - selected PR agent recipe:
    `archscope scan . --base origin/main --head HEAD --format json --deterministic`
  - deferred optional alias: `archscope agent .`
  - deferred optional alias:
    `archscope agent-pr . --base origin/main --head HEAD`
- Existing commands:
  - `workflow pr` remains the PR-analysis owner.
  - `context` remains the existing context-pack command.
  - `generate` and `generate-all` remain diagram/evidence generation surfaces.
  - `generate-video` and `generate-animated` remain available but secondary.
- Artifacts:
  - `.diagram/manifest.json`
  - `.diagram/brief.md`
  - `.diagram/agent-context.json`
  - `.diagram/pr-impact/pr-impact.json`
- Docs:
  - `README.md`
  - `docs/getting-started.md`
  - `docs/cli-reference.md`
  - future `docs/agent-workflows.md` if planning chooses to split agent docs

## Invariants / Safety Requirements

- Do not break the `diagram` compatibility command.
- Do not rename `@brainwav/diagram`, `diagram-cli`, `.diagram`, or
  `.diagramrc`.
- Do not introduce a second analysis pipeline for agent commands.
- Do not make media command de-emphasis remove existing user capability.
- Do not make `scan` perform network calls.
- Do not make agent JSON depend on scraping HTML.
- Do not hide partial failures behind success-only terminal text.
- Do not make deterministic output depend on wall-clock timestamps or unsorted
  artifact ordering.
- Do not move governance and migration evidence out of the repository; only
  reduce its first-read prominence.

## Failure Model and Recovery

| Failure | Required behavior | Recovery |
| --- | --- | --- |
| Invalid config | Return `config_invalid`, exit `2`, and point to the config file. | Fix config and rerun. |
| Unreadable repo/path | Return `repo_unreadable`, exit `2`, and avoid partial misleading artifacts. | Run from a valid repo path. |
| Missing PR refs | Return `git_refs_missing`, preserve repository scan where possible, and mark PR artifacts unavailable. | Supply valid `--base` and `--head`, or run repository scan only. |
| Analyzer degradation | Return `analysis_partial`, write available artifacts, and mark partial state. | Inspect warnings, then rerun after fixing dependency or parse issue. |
| Risk threshold exceeded | Return `risk_threshold_exceeded`, exit `1`, and preserve evidence artifacts. | Review risk reasons or adjust threshold. |
| Policy violation | Return `policy_violation`, exit `1`, and include validation evidence. | Fix policy violation or explicitly waive outside Archscope. |
| Artifact write failure | Return `artifact_write_failed`; prefer exit `3` when useful partial evidence exists and compatibility permits it, otherwise preserve documented scan compatibility with `data.outcome: "partial"` as the discriminator; exit `2` when no useful evidence can be produced. | Fix output path permissions or disk state. |
| Optional dependency unavailable | Return `dependency_unavailable`, continue when the artifact is optional, and explain the degraded surface. | Install dependency or avoid optional surface. |
| Internal error | Return `internal_error`, exit non-zero, and include enough context for issue filing without leaking secrets. | File issue or rerun after update. |

## Observability

Required user-visible evidence:

- Terminal summary states primary human and agent artifacts.
- Machine output includes `AgentOutcome` and `ErrorCategory` when applicable.
- Manifest records artifact statuses and warnings.
- Brief includes risk reasons and reviewer checks in PR mode.
- Agent context includes next-read ordering and partial-state warnings.

Required validation evidence:

- Focused tests for exit-code and error-category mapping.
- Focused tests for optional agent command or alias behavior if implemented.
- Docs checks proving media commands are not first-read product headlines.
- Fixture scan proving `manifest.json`, `brief.md`, and `agent-context.json`
  remain the primary contract.

## Acceptance and Test Matrix

| ID | Acceptance | Verification |
| --- | --- | --- |
| SA1 | README and getting-started docs lead with architecture evidence, PR review, and agent handoff before generic diagram generation. | Documentation review and stale-order grep. |
| SA2 | CLI reference presents `scan` and PR evidence workflows before media commands. | CLI reference review. |
| SA3 | Media commands are labeled as advanced, optional, compatibility, or non-core where they appear in first-read docs. | Documentation review. |
| SA4 | Terminal scan summary names the primary human artifact and primary agent artifact. | CLI fixture test. |
| SA5 | PR scan summary includes risk level, changed components or affected areas, risk reasons, reviewer checks, and raw artifact paths. | PR scan fixture test. |
| SA6 | Agent-facing output uses stable `success`, `partial`, and `failed` outcomes. | Machine-output tests. |
| SA7 | Agent-facing failures include one of the required `ErrorCategory` values. | Error-category contract tests. |
| SA8 | Exit code behavior is documented and tested for success, gate failure, input/config failure, and partial evidence. | CLI subprocess tests. |
| SA9 | Agent-facing docs provide repository and PR deterministic scan recipes before introducing any new alias commands. | Documentation review and CLI recipe smoke test. |
| SA10 | Deferred `archscope agent` and `archscope agent-pr` aliases are not implemented unless the paired plan proves they delegate to scan/PR evidence behavior without changing `workflow pr` semantics. | Plan review; command tests only if aliases are implemented. |
| SA11 | `.diagram/manifest.json`, `.diagram/brief.md`, and `.diagram/agent-context.json` remain the documented core artifacts. | Docs and fixture validation. |
| SA12 | Governance and migration details remain discoverable from maintainer docs but are not required for first-run value. | Documentation review. |
| SA13 | Compatibility surfaces remain stable: `diagram`, `@brainwav/diagram`, `diagram-cli`, `.diagram`, and `.diagramrc`. | Compatibility regression tests and docs review. |
| SA14 | Deterministic agent outputs avoid volatile timestamps and sort artifact/warning lists. | Deterministic snapshot test. |
| SA15 | The plan produced from this spec avoids broad `src/core` refactors unless a later architecture-specific spec authorizes them. | Plan review. |

## Linear Acceptance Traceability

No Linear issue is attached.

| Tracker | Acceptance IDs | Status |
| --- | --- | --- |
| Untracked local spec | SA1-SA15 | Traceability pending future Linear issue |

## Open Questions

- Should a later plan promote the documented agent recipes into real
  `archscope agent` and `archscope agent-pr` aliases after the exit-code and
  error-category contract is stable?
- Should partial evidence use exit code `3` after inventory, or should the
  project preserve partial scan exit `1` for compatibility while using
  `data.outcome: "partial"` as the agent-safe discriminator?
- Should `docs/agent-workflows.md` become a dedicated first-class doc, or should
  agent guidance stay in README and CLI reference?
- Should media commands be moved under an `experimental` heading, a
  compatibility heading, or only lower in the current reference?
- Should `scan` ever run `validate` automatically, or should validation remain
  explicit and only be indexed when supplied or produced by reused helpers?

## Planning and Implementation Handoff

Planning should sequence this spec after the completed Archscope evidence-pack
and identity-convergence work. The first slice should not add new analysis. It
should make the existing value easier to understand:

1. Reorder and sharpen docs/CLI help around PR review, `scan`, and agent
   handoff.
2. Document deterministic agent recipes that use existing `scan` behavior.
3. Freeze and test exit-code/error-category behavior before considering new
   command aliases.
4. Add agent command aliases only in a later slice if they can delegate to
   existing scan/context and PR evidence behavior.
5. De-emphasize media commands without removing them.
6. Record compatibility evidence that old surfaces still work.

The paired plan should use small slices and run focused CLI fixture tests before
any broad validation.

## Definition of Done

- This spec has a paired HE plan.
- The plan includes a no-new-analysis first slice.
- Product docs and CLI help make PR review, `scan`, and agent handoff the clear
  front door.
- Stable outcome, error-category, and exit-code behavior is documented and
  validated.
- Agent-facing docs expose deterministic repository and PR scan recipes.
- Optional agent commands or aliases, if implemented in a later slice, delegate
  to existing behavior.
- Media commands remain available but no longer compete with the core product
  story.
- Compatibility surfaces remain intact and tested.
