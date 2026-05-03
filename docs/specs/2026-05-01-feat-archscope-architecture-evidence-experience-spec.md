---
schema_version: 1
title: Archscope Architecture Evidence Experience Contract
type: feat
status: draft
date: 2026-05-01
origin: Codex product critique on Archscope usefulness for humans and AI coding agents
risk: medium
spec_depth: full
ui_required: true
traceability_required: false
---

# Archscope Architecture Evidence Experience Contract

## Spec Mode Decision

**Mode:** standard-spec
**Depth:** full
**UI companion required:** yes

This spec defines the product and system behavior contract for repositioning Archscope around architecture evidence, first-run value, PR review, and agent-readable context. It is not a dedicated UI specification, but it requires one before implementation of the generated HTML report because `report.html` becomes a first-class human-facing artifact.

## Table of Contents

- [Spec Mode Decision](#spec-mode-decision)
- [Problem Statement](#problem-statement)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Linear Work Item Contract](#linear-work-item-contract)
- [System Boundary](#system-boundary)
- [Core Domain Model](#core-domain-model)
- [Domain Consistency Pass](#domain-consistency-pass)
- [Interface Design Pass](#interface-design-pass)
- [Main Flow / Lifecycle](#main-flow--lifecycle)
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

Archscope has outgrown the mental model of a diagram generator. The product now analyzes architecture, validates policy, computes PR blast radius and risk, emits deterministic machine contracts, and creates AI-context artifacts. Those capabilities are useful, but the value is still too hidden behind command chains, migration language, artifact directories, and maintainer-oriented governance.

For humans, the current first impression still requires assembling the product story from README sections, CLI reference, generated files, and migration docs. For AI coding agents, the project has the right foundations, but the canonical read order, artifact entrypoints, error categories, and PR-review contract are not yet obvious enough to make Archscope the default architecture context source.

The product needs a single crisp contract:

```text
Archscope reads a repository or PR and produces architecture evidence for humans and AI agents.
```

That evidence must be useful immediately, without forcing a new user through multiple commands before they see the payoff.

## Goals

- Define Archscope as an architecture evidence tool for humans and AI coding agents, not primarily as a Mermaid diagram generator.
- Establish a default first-run workflow that produces one coherent evidence pack with a human report, concise brief, agent context, machine manifest, and supporting diagram.
- Make PR architecture review the primary product workflow, with risk, blast radius, changed components, reviewer checks, generated artifacts, and agent handoff in one brief.
- Standardize the top-level `.diagram` artifact contract so humans and agents know what to read first.
- Keep deterministic JSON and parser-safe machine output as first-class agent interfaces.
- Make generated human artifacts clear enough that a maintainer can understand architecture impact without reading migration or governance docs first.
- Preserve the existing compatibility posture from the Archscope repositioning spec: `archscope` is canonical, `diagram` remains a supported compatibility command, and `@brainwav/diagram` remains the package name until a later package migration contract says otherwise.
- Identify internal domain boundaries needed for the next plan before adding more product surfaces.

## Non-Goals

- Renaming the npm package from `@brainwav/diagram`.
- Renaming the repository from `diagram-cli`.
- Removing the compatibility `diagram` command.
- Replacing the existing `generate`, `generate-all`, `validate`, `context`, or `workflow pr` commands.
- Making video or animated diagram generation a primary product story.
- Rewriting the codebase in TypeScript as part of this contract.
- Adding a hosted service, SaaS dashboard, database, or external dependency that breaks the local-first posture.
- Designing the complete visual appearance of `report.html`; that belongs in the required companion UI spec.

## Linear Work Item Contract

No Linear issue was supplied with this spec request. This spec is therefore untracked until a work item is attached.

- `traceability_required`: `false`
- Tracker of record: not supplied
- Planning status: allowed for local planning only; do not treat as scheduled project work until linked to a Linear issue or equivalent tracker.
- PR delivery expectation: any future implementation PR should link back to this spec and the eventual tracked work item.

## System Boundary

In scope:

- Product behavior contract for the first-run evidence workflow.
- Product behavior contract for PR architecture review as the primary high-value workflow.
- Stable `.diagram` artifact entrypoints and read order.
- Agent-facing deterministic machine contract expectations.
- Human-facing brief and report content requirements.
- Documentation posture for hiding governance details from first-run user paths.
- Internal domain-boundary expectations needed to keep the product understandable as it grows.

Out of scope:

- The existing Archscope compatibility migration lifecycle, except where this spec must preserve its guarantees.
- Full report visual design, component inventory, responsive layout, and accessibility details.
- Release finalization policy changes.
- Package publishing choreography.
- External marketplace, pricing, or website strategy.

## Core Domain Model

- `ArchitectureEvidencePack`
  - The default output bundle written under `.diagram`.
  - Required non-visual first-slice artifacts: `brief.md`, `agent-context.json`, `architecture.mmd`, and `manifest.json`.
  - Deferred visual artifact: `report.html` is required for the complete product experience, but it may be marked `deferred` until the companion UI spec defines visual, responsive, and accessibility acceptance criteria.
  - Optional subordinate artifacts: `contracts/`, `context/`, `migration/`, `pr-impact/`, rendered images, validation output, and command-specific raw JSON.
  - Purpose: provide one stable entrypoint for humans and one stable entrypoint for agents.

- `ArchitectureReviewBrief`
  - A concise human- and agent-readable summary of repository or PR architecture impact.
  - Required fields: summary, changed components, affected architecture areas, blast radius, risk level, risk reasons, suggested reviewer checks, generated artifacts, validation evidence, and agent handoff.
  - Modes: repository scan mode and PR review mode.

- `HumanReport`
  - A first-class HTML artifact for maintainers.
  - Required content areas: what changed or what was detected, risk badge, changed components or detected components, dependency neighborhood, diagrams, recommended reviewer checks, agent handoff, raw artifact links, and validation/evidence summary.
  - Visual and interaction requirements are deferred to the companion UI spec.

- `AgentContextContract`
  - The canonical machine-readable contract for AI coding agents.
  - Required behavior: deterministic output option, stable schema versioning, parser-safe JSON, explicit command metadata, stable error categories, and compact summary fields.
  - Schema path: `src/schema/agent-context-v1.schema.json`.
  - Required v1 fields: `schemaVersion`, `generatedBy`, `mode`, `summary`, `artifacts`, `readOrder`, `warnings`, `errors`, and `partial`.
  - Optional PR-mode fields: `pr`, `base`, `head`, and `risk` when `scan` is invoked with comparison refs.
  - Canonical read order:
    1. `.diagram/manifest.json`
    2. `.diagram/brief.md`
    3. `.diagram/agent-context.json`
    4. `.diagram/pr-impact/pr-impact.json` when present and marked `written` in the manifest
    5. `.architecture.yml` when present

- `EvidenceManifest`
  - The index for the evidence pack.
  - Required fields: schema version, generated command, generated time, deterministic mode flag, project path or safe label, artifact list, primary human artifact, primary agent artifact, subordinate directories, validation summary, and warnings.
  - Primary human artifact rule: when `report.html` is marked `written`, `primaryHumanArtifact` is `.diagram/report.html`; otherwise `primaryHumanArtifact` must be `.diagram/brief.md`, with `report.html` still indexed at its current status.
  - Deterministic behavior: when `scan --deterministic` is used, artifact lists must be sorted with the same deterministic ordering discipline as existing machine outputs, and volatile generation timestamps must either be omitted from deterministic machine output or set to the existing fixed sentinel timestamp `1970-01-01T00:00:00.000Z` in generated artifacts that require a timestamp.

- `ScanCommand`
  - The selected default first-run command.
  - Invocation: `archscope scan .`
  - Purpose: detect repository shape, generate the default evidence pack, and tell the user exactly where to look next.

- `ProductSurface`
  - User-facing docs and CLI help that explain the product as architecture evidence first.
  - Governance, migration, and release machinery are available as maintainer detail, not first-run narrative.

- `InternalDomainBoundary`
  - Planning-time boundary names for keeping implementation understandable:
    - `analysis`
    - `artifacts`
    - `contracts`
    - `policies`
    - `pr-impact`
    - `renderers`
    - `agent-context`
    - `migration`

## Domain Consistency Pass

No repo-level `CONTEXT.md` or `CONTEXT-MAP.md` exists, so this pass is grounded in the live README, CLI reference, package metadata, migration guide, and the active Archscope repositioning and compatibility spec.

Canonical terms:

- Product identity: `archscope`.
- Package identity during this migration window: `@brainwav/diagram`.
- Repository identity: `diagram-cli`.
- Compatibility command: `diagram`.
- Product job: architecture evidence for humans and AI coding agents.
- Supporting artifact type: diagrams, including Mermaid and ERD output.
- Primary workflow: PR architecture review.
- Default evidence bundle: `ArchitectureEvidencePack`.
- Primary human artifact: `.diagram/report.html` when written; `.diagram/brief.md` while the report is unavailable or deferred.
- Primary agent artifact: `.diagram/agent-context.json`.
- Primary human summary artifact: `.diagram/brief.md`.
- Artifact index: `.diagram/manifest.json`.

Avoided or constrained aliases:

- Do not call the product primarily `diagram-cli` in user-facing first-run surfaces.
- Do not call `diagram` the canonical command; it is a compatibility command.
- Do not imply that `@brainwav/diagram` has already been renamed.
- Do not describe ERD, video, or animated output as the product's main value proposition.
- Do not use `architecture governance framework` as the first-read identity; governance is supporting evidence, not the front-stage product.

Relationship clarifications:

- `ArchitectureEvidencePack` is the umbrella bundle. Diagrams are evidence inside the bundle, not the bundle itself.
- `brief.md` is the quick human and agent orientation surface. It should remain concise enough for review comments and agent context windows.
- `report.html` is the richer human report. It may include the same facts as `brief.md`, but it owns layout, navigation, and visual scanning.
- `agent-context.json` is the deterministic agent contract. It must not depend on scraping the human report.
- `manifest.json` is the stable index and should be sufficient for CI, agents, and future tooling to discover generated artifacts.
- `manifest.json` decides primary human artifact selection from artifact status; agents and CI must not assume `report.html` is primary when it is not marked `written`.
- `workflow pr` remains the PR-specific analytical workflow. `scan` may call or summarize it when refs are supplied, but it must not change `workflow pr` semantics.
- Existing migration evidence remains maintainer machinery. It can be indexed from `manifest.json`, but it must not be required reading for first-run value.

Open domain ambiguity:

- The product phrase `architecture evidence` is selected for this spec, but docs should validate whether `architecture review evidence` is clearer in PR-only contexts.
- The generated file name `agent-context.json` is selected for the top-level default pack, while the existing `context` command currently writes under `.diagram/context`; planning must define whether the top-level file is copied, summarized, or generated by a new artifact writer.

## Interface Design Pass

This spec introduces a new caller-facing boundary for the default first-run evidence workflow. The boundary needs to be easy for humans to remember, easy for agents to invoke correctly, and strong enough to hide orchestration across analysis, diagrams, brief generation, context generation, and manifests.

### Shape A: Dedicated `scan` Command

Call shape:

```bash
archscope scan .
archscope scan . --format json --deterministic
archscope scan . --base origin/main --head HEAD
```

Caller usage example:

```bash
npx archscope scan .
cat .diagram/brief.md
cat .diagram/manifest.json
```

Hidden internal complexity:

- Repository detection and analysis.
- Default diagram generation.
- Evidence pack directory creation.
- `brief.md` generation.
- `agent-context.json` generation or projection from existing context machinery.
- `manifest.json` indexing.
- Optional PR-delta summary when base/head refs are supplied.
- Partial-artifact recovery when one evidence writer fails.

Tradeoffs:

- Strongest first-run mental model and easiest command to remember.
- Cleanly communicates that Archscope inspects the repo, not only renders diagrams.
- Adds a new command surface and tests.
- Must avoid duplicating too much logic from `generate-all`, `context`, and `workflow pr`.

### Shape B: Promote `generate-all --artifact-profile agent`

Call shape:

```bash
archscope generate-all . --output-dir .diagram --artifact-profile agent
archscope generate-all . --output-dir .diagram --artifact-profile agent --report
```

Caller usage example:

```bash
npx archscope generate-all . --output-dir .diagram --artifact-profile agent
cat .diagram/manifest.json
```

Hidden internal complexity:

- Existing diagram generation and manifest writing.
- Artifact budgeting.
- Optional report/brief generation if extended.

Tradeoffs:

- Lowest implementation disruption because the command already exists.
- Name still foregrounds diagram generation rather than architecture evidence.
- Does not naturally include PR risk, policy validation, or agent handoff.
- Harder to make into the product's memorable first-run path without documentation doing too much work.

### Shape C: Add Explicit `brief` and `agent-review` Commands

Call shape:

```bash
archscope brief .
archscope agent-review . --base origin/main --head HEAD
archscope agent-context .
```

Caller usage example:

```bash
npx archscope brief .
npx archscope agent-review . --base origin/main --head HEAD --format json --deterministic
```

Hidden internal complexity:

- Separate human brief generation from agent contract generation.
- Potential reuse of context and PR-impact internals.
- More explicit mode separation.

Tradeoffs:

- Clear to advanced users and agents once learned.
- More commands increase the first-run choice burden.
- Risks fragmenting the evidence pack before the product has one strong default path.
- Better as follow-on aliases or subcommands after the default pack contract proves itself.

### Interface Comparison

Shape A is simplest for correct first use: one verb, one path, one evidence pack. It is more flexible than Shape B because it can orchestrate diagrams, context, policy, and PR signals without pretending everything is diagram generation. It is less fragmented than Shape C and easier to teach in README, CI, and agent instructions.

Shape B is most implementation-efficient but weakest as a product interface. It preserves the current mental-model problem because users still see "generate all diagrams" before "understand architecture evidence."

Shape C is powerful for specialized workflows, but it asks users and agents to choose between too many entrypoints before they know what Archscope produces.

Selected contract: Shape A. Add `archscope scan .` as the default evidence workflow. Implement it as an orchestration boundary over existing analysis, artifact, context, validation, and PR-impact capabilities rather than as an unrelated parallel pipeline. Shape B remains the likely internal reuse path. Shape C remains a future alias/subcommand layer only after the default evidence pack is stable.

## Main Flow / Lifecycle

### Repository First-Run Flow

1. User runs `archscope scan .` against a repository.
2. Archscope detects repo shape and available source files.
3. Archscope resolves scan inputs from CLI flags, `.diagramrc`, `.architecture.yml`, and safe built-ins using the existing precedence rules where applicable.
4. Archscope generates the default evidence pack under `.diagram`.
5. Archscope writes or updates `manifest.json` as the artifact index.
6. Archscope prints a short success summary with the primary human and agent artifacts.
7. If generation cannot complete, Archscope writes the most useful partial evidence possible and reports actionable blockers.

Expected user-facing success shape:

```text
Architecture evidence written:
- .diagram/manifest.json
- .diagram/brief.md
- .diagram/agent-context.json
- .diagram/architecture.mmd
- .diagram/report.html (deferred until UI spec, when not generated)
```

### PR Architecture Review Flow

1. User or CI runs `archscope workflow pr . --base <ref> --head <ref>`.
2. Archscope computes changed files, changed components, affected architecture areas, blast radius, and risk.
3. Archscope generates an Architecture Review Brief.
4. Archscope writes PR artifacts under `.diagram/pr-impact` and indexes them from `.diagram/manifest.json` when part of a full evidence pack.
5. Human reviewers read the brief or report; agents read the JSON and agent handoff.
6. CI may fail only according to explicit risk-threshold and validation options.

PR command precedence: `workflow pr` remains the primary PR analytic command and brief-field contract owner. `scan --base --head` is the primary PR evidence-pack command and must reuse the `workflow pr` contract rather than redefining it.

### Combined Scan With PR Refs

1. User or CI runs `archscope scan . --base <ref> --head <ref>`.
2. Archscope generates the default repository evidence pack.
3. Archscope invokes or reuses the `workflow pr` analytical contract for PR-specific data.
4. Archscope includes PR summary fields in `brief.md`, `report.html`, `agent-context.json`, and `manifest.json`.
5. Archscope writes raw PR impact artifacts under `.diagram/pr-impact`.
6. `workflow pr` remains the authoritative PR-analysis command; `scan` is the evidence-pack orchestration surface.

### Agent Consumption Flow

1. Agent starts with `.diagram/manifest.json` to determine artifact availability, statuses, and canonical paths.
2. Agent reads `.diagram/brief.md` for concise human-readable orientation when the manifest marks it `written`.
3. Agent reads `.diagram/agent-context.json` for deterministic machine context when the manifest marks it `written`.
4. Agent reads `.diagram/pr-impact/pr-impact.json` when reviewing a PR and the manifest marks PR impact as `written`.
5. Agent reads `.architecture.yml` for architecture policy constraints when present.

### Advanced/Maintainer Flow

1. Maintainers can inspect migration evidence, machine contract coverage, release readiness, and policy artifacts.
2. These surfaces remain documented, tested, and auditable.
3. They do not dominate first-run docs or the generated human report unless directly relevant to the current evidence pack.

### Rollback / Degradation Flow

1. If `scan` proves too broad during implementation, the plan may ship it in stages as long as the command name, evidence manifest, and partial-output behavior remain stable.
2. If `report.html` is blocked by missing UI spec or rendering quality, `scan` may initially emit `brief.md`, `agent-context.json`, `architecture.mmd`, and `manifest.json`, with `report.html` marked deferred in the manifest.
3. If agent context generation fails, `scan` must still write `brief.md` and `manifest.json` with an `agent_context_unavailable` warning and a stable error category.
4. If PR refs are invalid, repository scan artifacts may still be written, but PR artifacts must be marked unavailable rather than silently omitted.

## Interfaces and Dependencies

### CLI Interfaces

- Selected first-run command: `archscope scan .`
- Selected first-run machine mode: `archscope scan . --format json --deterministic`
- Selected combined PR evidence mode: `archscope scan . --base origin/main --head HEAD`
- Existing PR workflow: `archscope workflow pr . --base origin/main --head HEAD`
- Existing context workflow: `archscope context .`
- Existing artifact workflow: `archscope generate-all . --output-dir .diagram --artifact-profile agent`
- Compatibility command: `diagram` remains supported according to the existing compatibility spec.

### File Interfaces

- `.diagram/report.html`
- `.diagram/brief.md`
- `.diagram/agent-context.json`
- `.diagram/architecture.mmd`
- `.diagram/manifest.json`
- `.diagram/pr-impact/pr-impact.json`
- `.diagram/pr-impact/pr-impact.html`
- `.architecture.yml`
- `.diagramrc`
- `.diagram/contracts/machine-command-coverage.json`

### Machine Interfaces

Machine output must preserve the existing canonical envelope direction:

- `schemaVersion`
- `command`
- `status`
- `meta`
- `data`
- `errors`
- optional `agentSummary`

Machine output must support deterministic mode where already promised by the command contract.

`scan --format json` must return an envelope whose `data` includes:

- `evidencePack`
- `artifacts`
- `manifestPath`
- `briefPath`
- `agentContextPath`
- `reportPath` when generated
- `diagramPath`
- `prImpactPath` when generated
- `pr` when `--base` and `--head` are supplied; required fields are `status`, `base`, `head`, and either `prImpactPath` or a stable error category such as `git_refs_missing`
- `outcome` with one of `success`, `partial`, or `failed`
- `warnings`
- `partial`

Machine-mode exit behavior must follow the same outcome:

- `success`: exit code `0`; all artifacts required for the current mode are written.
- `partial`: non-zero exit code; `manifest.json` and at least one primary artifact were written, but one or more required current-mode artifacts failed or degraded.
- `failed`: non-zero exit code; no useful evidence pack was produced or command invocation was invalid.

Artifacts explicitly marked `deferred` because they are outside the current phase or mode do not make `success` become `partial`.

### Documentation Interfaces

- `README.md` should present Archscope as architecture evidence for humans and agents.
- `docs/cli-reference.md` should make the default evidence workflow and PR review workflow easy to find.
- Migration/finalization details should remain in maintainer or migration docs, linked from first-run docs only when necessary.

### Dependencies

- Node.js and the existing Commander-based CLI.
- Existing Mermaid output generation.
- Existing policy validation.
- Existing Git-based changed-file and PR workflow analysis.
- Existing deterministic JSON machinery and machine command coverage manifest.

## Invariants / Safety Requirements

- A first-run command must either produce a useful evidence pack or return actionable blockers with stable error categories.
- `scan` must be additive and must not change the semantics of existing commands it orchestrates.
- The default evidence pack must have one obvious human entrypoint and one obvious agent entrypoint.
- Human-facing report and brief content must not require reading migration docs to understand the product value.
- Agent-facing JSON must remain parser-safe and must not mix human warnings into `stdout` in machine mode.
- Risk and blast-radius statements must identify their evidence source or confidence level; the tool must prefer `unknown` over unsupported certainty.
- The `diagram` compatibility command must not be removed or weakened by this work.
- The npm package name must not be treated as changed by this work.
- Generated artifacts must be indexed by `manifest.json` so future agents and CI jobs do not guess file paths.
- New documentation must distinguish user-facing workflows from maintainer governance.
- Partial evidence must be explicit. A command must not print a full-success message if artifacts required for the current mode were skipped or failed.
- Generated files must avoid embedding absolute local paths in human or agent artifacts unless explicitly requested; use safe project labels where possible.
- `scan` must not run network calls.

## Failure Model and Recovery

| Failure ID | Failure                                                                    | Required Recovery                                                                                                       |
| ---------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| F1         | First-run command cannot infer enough repository structure                 | Produce a partial `brief.md` or console summary with blocker category, missing inputs, and next command to run.         |
| F2         | Evidence pack generation succeeds but artifacts are scattered or ambiguous | `manifest.json` must name the primary human artifact, primary agent artifact, and subordinate directories.              |
| F3         | Agent context schema drifts from documented contract                       | Contract tests must fail and name the missing, renamed, or incompatible field.                                          |
| F4         | PR risk is overstated or unsupported                                       | Risk reasons must carry evidence references or confidence labels; unsupported claims must become `unknown` or warnings. |
| F5         | Governance or migration language overwhelms first-run output               | User-facing docs and generated report must link to maintainer details instead of embedding them as the main narrative.  |
| F6         | Internal command/script sprawl makes implementation hard to extend         | The implementation plan must identify domain-boundary ownership before adding more product surfaces.                    |
| F7         | Compatibility identity is accidentally broken                              | Existing compatibility and machine-contract tests must remain part of validation.                                       |
| F8         | HTML report is visually present but not accessible or responsive           | Implementation must wait for, or include, a companion UI spec with accessibility and responsive acceptance criteria.    |
| F9         | CI cannot find evidence artifacts consistently                             | CI-facing paths must be stable and indexed in `manifest.json`.                                                          |
| F10        | Agents cannot classify command failure                                     | Machine output must include stable error categories for expected failure classes.                                       |
| F11        | `scan` duplicates business logic from existing commands and drifts         | `scan` must call shared modules or command-level helpers with contract tests proving parity for reused outputs.         |
| F12        | Partial output is mistaken for complete readiness                          | Console, JSON envelope, and manifest must expose `partial: true` and artifact-level statuses.                           |
| F13        | Local absolute paths leak into checked-in artifacts                        | Artifacts must use relative paths or safe labels by default; tests must cover path normalization.                       |

Required stable error categories:

- `config_invalid`
- `architecture_policy_violation`
- `risk_threshold_exceeded`
- `dependency_unavailable`
- `parse_failure`
- `insufficient_repository_signal`
- `artifact_write_failed`
- `analysis_partial`
- `internal_error`
- `agent_context_unavailable`
- `git_refs_missing`
- `report_generation_unavailable`

## Observability

- Console success output must list the primary artifacts written.
- Machine output must include command, status, deterministic flag where relevant, artifact paths, warnings, and error categories.
- `manifest.json` must record artifact paths, generation command, generated time, deterministic mode, validation summary, and warnings.
- Deterministic `scan` output must be snapshot-stable: sort artifact lists and warnings deterministically, omit volatile timestamps from the machine envelope, and use `1970-01-01T00:00:00.000Z` for any generated artifact timestamp that cannot be omitted.
- `manifest.json` must record artifact-level status (`written`, `deferred`, `partial`, `failed`) for every expected top-level artifact.
- PR review output must expose changed component count, risk level, risk reasons, suggested reviewer checks, and generated artifact paths.
- CI artifact generation must make `brief.md`, `agent-context.json`, and PR impact JSON discoverable without reading logs.
- Report generation should be testable with deterministic fixtures before visual polish is accepted.
- Partial evidence generation must be observable in console text, machine JSON, and manifest fields.

## Acceptance and Test Matrix

| ID   | Acceptance Criteria                                                                                                                                                                                                                                                                             | Suggested Verification                                                      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| SA1  | Product docs define Archscope as architecture evidence for humans and AI coding agents, not primarily as a diagram generator.                                                                                                                                                                   | README and CLI reference review.                                            |
| SA2  | `archscope scan .` exists as the default first-run evidence workflow.                                                                                                                                                                                                                           | CLI help and command execution test.                                        |
| SA3  | The first implementation tranche of the default evidence workflow writes the non-visual pack across P0/P1: `.diagram/manifest.json`, `.diagram/brief.md`, `.diagram/agent-context.json`, and `.diagram/architecture.mmd`; `report.html` may be marked `deferred` until the UI spec is complete. | Fixture execution and file existence/status assertions.                     |
| SA4  | First-run behavior works without pre-existing `.architecture.yml` or `.diagramrc`, or returns actionable blockers with stable error categories.                                                                                                                                                 | Empty/minimal fixture repo tests.                                           |
| SA5  | PR review workflow emits an Architecture Review Brief with summary, changed components, blast radius, risk level, risk reasons, reviewer checks, artifacts, validation evidence, and agent handoff.                                                                                             | PR workflow fixture test.                                                   |
| SA6  | `report.html` supports scan and PR modes with risk badge, component tables, dependency neighborhood, diagrams, raw artifact links, validation/evidence summary, and agent handoff.                                                                                                              | UI spec acceptance plus rendered artifact check.                            |
| SA7  | `agent-context.json` has stable schema versioning, deterministic mode support, compact summary fields, artifact pointers, and documented read order.                                                                                                                                            | JSON schema or snapshot test.                                               |
| SA8  | `.diagram/manifest.json` indexes top-level artifacts and subordinate directories and identifies the primary human and agent artifacts.                                                                                                                                                          | Manifest contract test.                                                     |
| SA9  | Machine-mode command output uses parser-safe `stdout`, stable envelope fields, and stable error categories.                                                                                                                                                                                     | Machine output contract tests.                                              |
| SA10 | Governance, migration, and finalization details are linked as maintainer detail rather than foregrounded in first-run docs or generated reports.                                                                                                                                                | Documentation review.                                                       |
| SA11 | Existing `generate`, `generate-all`, `validate`, `workflow pr`, `context`, and compatibility `diagram` behaviors remain non-breaking.                                                                                                                                                           | Existing baseline test suite and compatibility tests.                       |
| SA12 | Video and animated generation are de-emphasized in first-run docs without removal or behavior regression.                                                                                                                                                                                       | Documentation review and existing command smoke tests.                      |
| SA13 | The implementation plan identifies internal domain boundaries for analysis, artifacts, contracts, policies, PR impact, renderers, agent context, and migration before broad feature work.                                                                                                       | Plan review.                                                                |
| SA14 | CI artifact generation can publish or expose the brief, agent context, manifest, and PR impact JSON from stable paths.                                                                                                                                                                          | `npm run ci:artifacts` or equivalent CI artifact test after implementation. |
| SA15 | Required companion UI spec exists before implementation accepts the HTML report experience as complete.                                                                                                                                                                                         | UI spec presence and VAC traceability check.                                |
| SA16 | Risk and blast-radius claims include evidence references, confidence labels, or `unknown` states.                                                                                                                                                                                               | PR impact fixture assertions.                                               |
| SA17 | The default evidence workflow prints a concise next-step summary that names the primary human and agent artifacts.                                                                                                                                                                              | CLI output snapshot test.                                                   |
| SA18 | The package name `@brainwav/diagram`, compatibility command `diagram`, and migration compatibility state are preserved unless a later migration spec supersedes them.                                                                                                                           | Package/bin inspection and compatibility validation.                        |
| SA19 | `scan --format json --deterministic` emits the canonical machine envelope with `data.evidencePack`, artifact paths, warnings, and partial status, while sorting lists deterministically and omitting volatile timestamps from the envelope.                                                     | Machine-output parser and deterministic snapshot test.                      |
| SA20 | `scan . --base <ref> --head <ref>` includes PR evidence by reusing the `workflow pr` contract and writing raw PR artifacts under `.diagram/pr-impact`.                                                                                                                                          | Combined scan fixture test.                                                 |
| SA21 | Partial evidence generation records artifact-level statuses in `manifest.json` and does not print a full-success message.                                                                                                                                                                       | Simulated writer-failure test.                                              |
| SA22 | Generated artifacts avoid absolute local path leakage by default.                                                                                                                                                                                                                               | Fixture assertion against generated files.                                  |
| SA23 | The plan for implementation reuses existing `generate-all`, `context`, `workflow pr`, machine-envelope, and manifest capabilities rather than creating a parallel pipeline.                                                                                                                     | Plan and code review.                                                       |

## Linear Acceptance Traceability

| Tracker      | Status       | Acceptance IDs | Notes                                                                                      |
| ------------ | ------------ | -------------- | ------------------------------------------------------------------------------------------ |
| Linear issue | Not supplied | SA1-SA23       | Attach this spec to a tracked work item before using it as scheduled implementation scope. |

## Open Questions

- Should `report.html` always be generated by default, or should it require an explicit `--report` option in constrained environments?
- Should agent-facing commands become explicit (`agent-context`, `agent-review`) or remain aliases around `context` and `workflow pr`?
- What minimum design quality bar should the companion UI spec enforce for `report.html`?
- Should the repo/package rename to Archscope become a later migration spec after compatibility evidence is complete?
- Should ERD output be included in the default evidence pack, or generated only when data-model signals are detected?
- Should `scan` run `validate` by default after P1, or only include validation when `.architecture.yml` exists? Temporary P0/P1 policy: `scan` does not auto-run `validate`; it indexes explicit validation evidence when supplied or generated by reused helpers.
- Should `scan` write top-level `agent-context.json` by summarizing `.diagram/context/diagram-context.meta.json` or by introducing a new JSON writer in the context domain?

## Planning and Implementation Handoff

The first implementation tranche should not attempt the whole product repositioning at once. Start with the artifact contract in P0, then complete the non-visual evidence pack in P1:

- implement `archscope scan .` as the selected default evidence workflow;
- define `ArchitectureEvidencePack` and `EvidenceManifest`;
- generate `manifest.json` in P0, then `brief.md`, `agent-context.json`, and `architecture.mmd` in P1 from existing analysis capabilities;
- add or defer `report.html` behind the companion UI spec;
- preserve all compatibility guarantees from the active Archscope repositioning and compatibility spec.
- reuse existing `generate-all`, `context`, `workflow pr`, machine-envelope, and manifest capabilities where possible.

Because `ui_required: true`, planning should either create the companion UI spec before implementing `report.html` or explicitly phase HTML report work behind a UI-spec dependency.

This spec is untracked until a Linear issue or equivalent work item is supplied.

Readiness recommendation: planning-ready for the non-visual artifact and CLI orchestration slice. Not planning-ready for final `report.html` visual acceptance until the companion UI spec exists or the plan explicitly defers report completion.

## Definition of Done

- This spec includes the required standard HE spec frontmatter and sections.
- The spec has stable `SA` acceptance IDs suitable for `he-plan`.
- The spec clearly separates product behavior, artifact contracts, agent contracts, and UI-dependent report work.
- The spec includes a domain-consistency pass and selected interface contract for the default evidence workflow.
- Non-goals preserve the current compatibility migration contract.
- Open questions are explicit enough to resolve before implementation planning.
- A companion UI spec requirement is recorded for `report.html`.
