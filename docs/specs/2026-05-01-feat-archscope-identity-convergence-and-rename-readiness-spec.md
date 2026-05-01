---
schema_version: 1
title: Archscope Identity Convergence and Rename Readiness Contract
type: feat
status: draft
date: 2026-05-01
origin: Codex product-direction discussion after PR 77 merge
risk: medium
spec_depth: full
ui_required: false
traceability_required: true
linear_project: diagram-cli
linear_issue: JSC-247
linear_status: Backlog
---

# Archscope Identity Convergence and Rename Readiness Contract

## Spec Mode Decision

**Mode:** standard-spec
**Depth:** full
**UI companion required:** no

This spec defines the next product-identity step after the Archscope command,
machine-contract, and evidence-pack work. It is not a package rename plan and it
does not authorize removal of compatibility surfaces. It defines the WHAT
contract for making Archscope feel like the canonical product while keeping
`@brainwav/diagram`, `diagram`, `diagram-cli`, and `.diagram` stable until a
separate readiness gate approves deeper rename work.

## Table of Contents

- [Spec Mode Decision](#spec-mode-decision)
- [Problem Statement](#problem-statement)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Linear Work Item Contract](#linear-work-item-contract)
- [System Boundary](#system-boundary)
- [Core Domain Model](#core-domain-model)
- [Domain Consistency Pass](#domain-consistency-pass)
- [Interface Shape Decisions](#interface-shape-decisions)
- [Rename Readiness Lifecycle](#rename-readiness-lifecycle)
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

The project now has a stronger product direction than its original name:
Archscope should mean architecture evidence for humans and AI coding agents.
The merged compatibility work already exposes `archscope` as the canonical CLI
identity while preserving the `diagram` compatibility command and
`@brainwav/diagram` package identity.

However, the product still has mixed identity surfaces:

- repository and package metadata still point at `diagram-cli`
- package name remains `@brainwav/diagram`
- artifact namespace remains `.diagram`
- some generated CI samples and comments still describe `diagram-cli`
- older docs and templates can still frame the product as a diagram tool
- future package, repository, schema, and artifact namespace rename decisions are
  not separated from safe near-term product-language convergence

Without a clear contract, implementation can drift in either direction:
renaming too aggressively and breaking users, or preserving compatibility so
visibly that Archscope never becomes the obvious product identity.

## Goals

- Make `Archscope` / `archscope` the canonical human-facing product identity
  across first-read docs, CLI help, generated summaries, CI comments, and agent
  handoff language.
- Preserve the current compatibility contract: `diagram` remains a supported
  command, `@brainwav/diagram` remains the package name, `diagram-cli` remains
  the repository slug, and `.diagram` remains the stable artifact directory.
- Define which identity surfaces must become Archscope-first now and which must
  remain compatibility-labelled until a later migration spec.
- Prevent premature package, repository, schema-domain, and artifact-directory
  hard renames.
- Give future planning a concrete audit and acceptance contract for identity
  convergence.
- Make eventual rename readiness measurable before any breaking or externally
  disruptive rename is attempted.
- Keep the product story aligned to architecture evidence, PR impact, and agent
  context rather than generic diagram generation.

## Non-Goals

- Renaming the npm package from `@brainwav/diagram` to an Archscope package.
- Renaming the GitHub repository from `diagram-cli`.
- Removing or weakening the `diagram` compatibility command.
- Renaming `.diagram` to `.archscope`.
- Changing existing machine-output schema field names solely for branding.
- Changing package publish flow or release finalization policy.
- Rewriting historical docs and plans that intentionally preserve old context.
- Implementing a website, hosted service, marketplace listing, or marketing
  funnel.
- Designing new HTML report UI behavior; that remains governed by the
  architecture evidence experience spec and any future UI companion spec.

## Linear Work Item Contract

This spec is tracked by Linear issue
[JSC-247](https://linear.app/jscraik/issue/JSC-247/converge-archscope-identity-and-rename-readiness).

- `traceability_required`: `true`
- Tracker of record: Linear `JSC-247`
- Linear project: `diagram-cli`
- Linear status: `Backlog`
- Planning status: tracked and ready for implementation planning
- PR delivery expectation: any implementation PR should link this spec, the
  paired plan, and `JSC-247`

## System Boundary

In scope:

- Product identity language in first-read docs and command help.
- Compatibility language for package, command, repository, and artifact
  namespace surfaces.
- Generated human artifacts and CI comments that represent the product to users.
- Agent-facing summaries and manifest language that identify the tool.
- Readiness contract for eventual package/repository/artifact rename work.
- Validation expectations for canonical-vs-compatibility command behavior.

Out of scope:

- Analysis algorithms, diagram layout quality, and ERD inference quality.
- PR risk scoring changes.
- Machine envelope shape changes already governed by the Archscope
  repositioning and compatibility spec.
- Evidence-pack content and HTML report content already governed by the
  architecture evidence experience spec.
- Release candidate finalization gates already governed by
  `.diagram/migration/finalization-policy.json`.

## Core Domain Model

- `ProductIdentity`
  - Canonical display name: `Archscope`.
  - Canonical command name: `archscope`.
  - Canonical product job: architecture evidence for humans and AI coding
    agents.
  - Compatibility names: `diagram`, `diagram-cli`, `@brainwav/diagram`, and
    `.diagram`.
  - Rule: canonical surfaces lead with Archscope; compatibility names are
    explained only where needed for installation, repository location,
    compatibility, or generated artifact paths.

- `IdentitySurface`
  - A file, command output, generated artifact, workflow comment, package
    metadata field, schema URL, issue template, or documentation page where a
    user or agent learns what the product is.
  - Required classification:
    - `canonical-now`: must use Archscope-first product language.
    - `compatibility-labelled`: may retain old names but must explain why.
    - `deferred-rename`: must not be renamed until readiness criteria pass.
    - `historical-context`: may preserve old wording because it records prior
      planning or migration history.

- `CompatibilitySurface`
  - A surface that must stay stable during the compatibility window.
  - Current required compatibility surfaces:
    - npm package: `@brainwav/diagram`
    - compatibility binary: `diagram`
    - repository URL/slug: `jscraik/diagram-cli`
    - artifact directory: `.diagram`
    - config file: `.diagramrc`
    - migration evidence paths under `.diagram/migration`
    - existing schema/domain URLs unless a later schema migration contract
      explicitly replaces them

- `ArchscopeFirstSurface`
  - A surface that should no longer describe the product primarily as
    `diagram-cli` or a diagram generator.
  - Required examples:
    - README title and overview
    - CLI help and unknown-command guidance
    - generated evidence pack summaries
    - PR architecture comments
    - getting-started and architecture-testing docs
    - CI artifact names and user-facing labels where safe
    - agent-context `generatedBy` and read-order prose

- `RenameReadinessRecord`
  - A future-facing checklist or evidence artifact that proves a deeper rename
    is safe enough to plan.
  - Required dimensions:
    - consumer compatibility impact
    - package publish ownership
    - repository redirect impact
    - CI and marketplace integrations
    - schema URL and artifact namespace compatibility
    - documentation and search/discovery impact
    - rollback path
    - release evidence required before finalization

- `IdentityConvergenceReport`
  - A machine- or human-readable audit output produced by the implementation
    plan, if planning chooses to add a validator.
  - Required content if implemented:
    - scanned identity surfaces
    - classification
    - stale wording findings
    - compatibility exceptions
    - pass/fail status

## Domain Consistency Pass

Canonical terms:

- Product: `Archscope`
- CLI command: `archscope`
- Product job: architecture evidence for humans and AI coding agents
- Default first-run workflow: `archscope scan .`
- PR workflow: `archscope scan . --base <ref> --head <ref>` and
  `archscope workflow pr . --base <ref> --head <ref>`
- Package during compatibility: `@brainwav/diagram`
- Compatibility command: `diagram`
- Repository during compatibility: `diagram-cli`
- Artifact directory during compatibility: `.diagram`
- Config file during compatibility: `.diagramrc`

Preferred product sentence:

```text
Archscope produces architecture evidence for humans and AI coding agents.
```

Acceptable variants:

- `Archscope scans repositories and PRs to explain architecture impact, risk,
diagrams, and agent context.`
- `Archscope turns repository structure and PR changes into reviewable
architecture evidence.`

Avoided first-read phrasing:

- `diagram-cli is a static codebase architecture diagram generator`
- `diagram generator`
- `architecture governance framework`
- `Mermaid generator`
- `agent memory artifact system`

Compatibility wording rule:

- Old names may appear when the text is specifically about package install,
  repository URL, compatibility command behavior, migration evidence, historical
  specs/plans, or existing artifact paths.
- Old names should not appear as the main product noun in new first-read docs,
  generated comments, or agent handoff text.

## Interface Shape Decisions

### Product Identity Interface

Selected shape: Archscope-first product language with explicit compatibility
labels.

The product should introduce itself as Archscope everywhere a new user or agent
starts. Compatibility names remain visible only as compatibility facts:

```text
Archscope is the canonical CLI identity for the @brainwav/diagram package.
The diagram command remains available during the compatibility window.
```

This shape avoids a breaking rename while making the product feel coherent.

### Package Rename Interface

Selected shape: defer package rename.

`@brainwav/diagram` remains the package identity for this spec. Any future
`@brainwav/archscope` or equivalent package must be covered by a dedicated
package migration spec that defines publish ownership, dependency migration,
dual-package behavior, npm deprecation messaging, consumer impact, and rollback.

### Repository Rename Interface

Selected shape: defer repository rename.

The GitHub repository slug `jscraik/diagram-cli` remains valid. New docs may
describe it as the current repository for Archscope, but they must not imply the
repository has already been renamed. A future repository rename requires a
readiness record that covers redirects, GitHub Actions references, badges,
issue templates, package metadata URLs, and downstream cloned remotes.

### Artifact Namespace Interface

Selected shape: keep `.diagram` stable.

`.diagram` remains the artifact namespace during compatibility. The product name
inside generated metadata may be Archscope, but agents, CI, and users must not
be forced to switch to `.archscope` by this spec. A future `.archscope` namespace
must be opt-in or dual-written until compatibility evidence proves it is safe.

### Schema and URL Interface

Selected shape: no schema URL rename in this spec.

Machine schema fields and schema URLs are compatibility-sensitive. They may
carry historical `diagram-cli` naming until a dedicated schema migration
contract defines versioning, redirects, and consumer impact.

## Rename Readiness Lifecycle

This lifecycle is separate from the existing command compatibility lifecycle. It
describes readiness for deeper external renames, not the current command
compatibility state.

- `identity_converging`
  - Entry condition: this spec is accepted for planning.
  - Expected state: Archscope-first wording is being audited and improved.
  - Blocked actions: package rename, repository rename, artifact directory
    rename, schema URL rename.

- `identity_converged`
  - Entry condition: SA1-SA12 pass and stale first-read identity surfaces are
    either fixed or explicitly classified as compatibility/historical.
  - Expected state: users and agents encounter Archscope first, with compatibility
    names explained where required.
  - Blocked actions: package/repo/artifact/schema hard rename without a dedicated
    readiness record.

- `rename_ready_for_planning`
  - Entry condition: SA13-SA16 pass and a `RenameReadinessRecord` exists.
  - Expected state: maintainers can decide whether to plan package, repository,
    artifact namespace, or schema URL migration.
  - Blocked actions: implementation of deeper rename without an approved
    follow-up spec and plan.

- `rename_deferred`
  - Entry condition: any readiness dimension is missing, risky, or blocked.
  - Expected state: continue Archscope-first product language while preserving
    old external names.
  - Recovery path: update readiness evidence and reconsider planning later.

## Main Flow / Lifecycle

1. Audit identity surfaces.
   - Collect current references to `diagram-cli`, `@brainwav/diagram`,
     `diagram`, `.diagram`, `.diagramrc`, `archscope`, and product-description
     phrases.
   - Classify each surface as `canonical-now`, `compatibility-labelled`,
     `deferred-rename`, or `historical-context`.

2. Converge first-read product language.
   - Update active user-facing surfaces so Archscope is the product noun and
     architecture evidence is the job.
   - Keep old names only where they explain compatibility, installation, repo
     location, or artifact paths.

3. Converge generated product language.
   - Generated comments, reports, briefs, and agent handoffs identify the tool as
     Archscope.
   - Machine outputs preserve parser-safe fields and schema versions.

4. Preserve compatibility behavior.
   - `archscope` and `diagram` continue to share implementation and pass parity
     checks.
   - `.diagram` and `.diagramrc` remain the default paths.

5. Produce rename readiness evidence.
   - Document what would be required before package, repository, artifact
     namespace, or schema URL rename work can safely begin.
   - Leave deeper rename in `rename_deferred` unless readiness criteria pass.

## Interfaces and Dependencies

- README and docs
  - Must lead with Archscope and architecture evidence.
  - Must keep compatibility facts accurate for package name, command alias,
    repository slug, artifact paths, and migration state.

- CLI help and command output
  - Must prefer `archscope` in canonical examples.
  - Must keep `diagram` compatibility notices on `stderr` in machine mode.
  - Must not print branding text to JSON `stdout`.

- Generated artifacts
  - `brief.md`, `report.html`, PR comments, and agent-facing prose should say
    Archscope when naming the product.
  - `manifest.json`, `agent-context.json`, and machine envelopes must preserve
    schema compatibility and deterministic output behavior.

- CI and GitHub workflows
  - User-facing workflow comments and artifact labels should use Archscope where
    safe.
  - Workflow paths may continue to use `.diagram` and repository slug references.

- Package metadata
  - `package.json.name` remains `@brainwav/diagram`.
  - `package.json.bin.archscope` and `package.json.bin.diagram` remain present.
  - Repository and issue URLs may remain `diagram-cli` until repository rename is
    explicitly planned.

- Migration evidence
  - Existing compatibility and finalization evidence remains authoritative for
    command compatibility.
  - Rename readiness evidence must not weaken those gates.

## Invariants / Safety Requirements

- `archscope` remains the canonical command in new docs and examples.
- `diagram` remains a supported compatibility command until finalization evidence
  explicitly says otherwise.
- `@brainwav/diagram` must not be described as already renamed.
- `diagram-cli` must not be hidden where repository URL, issue tracker, or clone
  command accuracy requires it.
- `.diagram` and `.diagramrc` remain stable default paths.
- Machine JSON must remain parser-safe and deterministic behavior must not be
  changed for branding.
- Historical specs, plans, and migration notes may preserve older names when
  changing them would corrupt historical context.
- First-run docs must not require users to understand release-finalization
  machinery before they understand the product value.
- Agent-facing read order must continue to start from `.diagram/manifest.json`
  unless the architecture evidence spec is amended.

## Failure Model and Recovery

- Failure class: stale first-read identity.
  - Symptom: active docs or generated comments introduce the product as
    `diagram-cli` or primarily as a diagram generator.
  - Detection: identity audit finds unclassified stale wording in active
    first-read surfaces.
  - Recovery: update wording to Archscope-first language or classify the surface
    as compatibility/historical with an explicit reason.

- Failure class: premature package rename.
  - Symptom: docs, package metadata, or tests imply `@brainwav/diagram` has been
    replaced.
  - Detection: package metadata or docs no longer match the live package name.
  - Recovery: restore package compatibility wording and open a follow-up package
    migration spec if the rename is desired.

- Failure class: compatibility command regression.
  - Symptom: `diagram` command behavior diverges from `archscope`.
  - Detection: compatibility parity tests fail.
  - Recovery: restore shared command path or compatibility alias behavior before
    continuing identity convergence.

- Failure class: artifact namespace break.
  - Symptom: generated artifacts move from `.diagram` to `.archscope` without
    dual-write or migration evidence.
  - Detection: artifact tests, docs, or agent read-order checks fail.
  - Recovery: restore `.diagram` as the default namespace and defer `.archscope`
    to a dedicated artifact namespace migration spec.

- Failure class: machine contract branding leak.
  - Symptom: branding messages or compatibility notices pollute JSON `stdout`,
    or schema fields are renamed without versioning.
  - Detection: machine output parser tests or deterministic snapshots fail.
  - Recovery: move messages to `stderr`, restore schema fields, and add tests for
    parser-safe output.

- Failure class: user confusion after partial convergence.
  - Symptom: README says Archscope but install/package docs do not explain
    `@brainwav/diagram`.
  - Detection: docs audit finds package identity without compatibility label.
  - Recovery: add concise compatibility explanation near installation paths.

## Observability

Required evidence:

- Identity surface audit result or equivalent reviewed `rg` output.
- List of active surfaces changed or explicitly classified.
- Compatibility command validation evidence for `archscope` and `diagram`.
- Machine-output validation evidence for any touched machine surfaces.
- Documentation validation evidence for changed docs.
- Rename readiness checklist status, even if the result is `rename_deferred`.

Suggested metrics:

- Count of active first-read surfaces still using `diagram-cli` as product noun.
- Count of unclassified `diagram-cli`, `@brainwav/diagram`, `diagram`, and
  `.diagram` references.
- Count of generated artifacts/comments that identify the product as Archscope.
- Compatibility parity pass/fail status.

## Acceptance and Test Matrix

| ID   | Acceptance criteria                                                                                                                                                                                                                                                                      | Verification                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| SA1  | An identity surface audit exists for active docs, package metadata, CLI help/output, generated artifacts, CI comments, issue templates, and schema/domain surfaces. Each finding is classified as `canonical-now`, `compatibility-labelled`, `deferred-rename`, or `historical-context`. | Review audit artifact or exact `rg` evidence; confirm no unclassified active first-read surfaces remain.                            |
| SA2  | Active first-read docs introduce the product as Archscope and describe the job as architecture evidence for humans and AI coding agents.                                                                                                                                                 | Inspect README, getting-started, CLI reference, architecture-testing docs, and docs index.                                          |
| SA3  | Installation and repository docs accurately explain that the current package is `@brainwav/diagram` and the current repository is `diagram-cli` without making either the primary product identity.                                                                                      | Inspect install sections and package/repository references.                                                                         |
| SA4  | CLI help and canonical examples prefer `archscope`; compatibility examples use `diagram` only when explaining migration or backwards compatibility.                                                                                                                                      | Run or inspect `archscope --help`, `diagram --help`, README examples, and CLI reference examples.                                   |
| SA5  | Generated human-facing output, including PR comments, evidence briefs, reports, and CI comment footers, identifies the product as Archscope where branding appears.                                                                                                                      | Run focused artifact/comment tests or inspect generated fixture output.                                                             |
| SA6  | Machine JSON remains parser-safe: compatibility notices and branding text do not appear on JSON `stdout`, and schema fields are not renamed for branding.                                                                                                                                | Run machine-contract tests and deterministic JSON checks for touched commands.                                                      |
| SA7  | `@brainwav/diagram`, `diagram`, `diagram-cli`, `.diagram`, and `.diagramrc` remain supported compatibility surfaces unless a later migration spec supersedes this contract.                                                                                                              | Inspect package metadata, command identity tests, artifact tests, and docs.                                                         |
| SA8  | `.diagram` remains the default artifact namespace and `.archscope` is not introduced as a required output path by this spec.                                                                                                                                                             | Run scan/generate artifact tests and inspect docs for artifact paths.                                                               |
| SA9  | Agent-facing docs and generated handoff language preserve the manifest-first read order and Archscope product identity.                                                                                                                                                                  | Inspect README AI Agent Workflows, architecture-testing agent guidance, and generated `agent-context.json`/`brief.md` expectations. |
| SA10 | First-run docs do not require users to read migration finalization policy or release evidence before learning `archscope scan .`.                                                                                                                                                        | Inspect README, getting-started, and architecture-testing first-run path.                                                           |
| SA11 | Compatibility command parity remains tested for `archscope` and `diagram`.                                                                                                                                                                                                               | Run command identity/compatibility tests and `npm run migration:readiness` when touched.                                            |
| SA12 | Historical specs, plans, and migration records may preserve older wording only when classified as historical context or compatibility evidence.                                                                                                                                          | Review audit classification and ensure historical rewrites were not required.                                                       |
| SA13 | A rename readiness checklist exists for package rename, repository rename, artifact namespace rename, and schema/domain URL rename.                                                                                                                                                      | Inspect readiness artifact or docs section.                                                                                         |
| SA14 | Rename readiness defaults to `rename_deferred` unless consumer impact, release choreography, rollback, and validation evidence are documented.                                                                                                                                           | Inspect readiness lifecycle status.                                                                                                 |
| SA15 | Any future package rename is blocked unless a dedicated package migration spec defines dual-package behavior, npm deprecation messaging, publish ownership, consumer impact, and rollback.                                                                                               | Inspect readiness checklist and planning handoff.                                                                                   |
| SA16 | Any future repository rename is blocked unless a dedicated repository migration spec covers redirects, badges, workflow URLs, package metadata URLs, cloned remotes, and issue tracker references.                                                                                       | Inspect readiness checklist and planning handoff.                                                                                   |

## Linear Acceptance Traceability

Linear issue
[JSC-247](https://linear.app/jscraik/issue/JSC-247/converge-archscope-identity-and-rename-readiness)
tracks this spec.

| Source  | Acceptance IDs | Traceability status                                                                                                                                 |
| ------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSC-247 | SA1-SA16       | Tracks Archscope identity convergence and rename readiness without authorizing hard package, repository, artifact namespace, or schema rename work. |

## Open Questions

- Should the future package name be `@brainwav/archscope`, `archscope`, or a
  different scoped package?
- Should `.archscope` ever replace `.diagram`, or should `.diagram` remain a
  permanent compatibility namespace because agents and CI already depend on it?
- Should the repository eventually be renamed, or is GitHub redirect behavior
  more risk than the product clarity gain is worth?
- Should schema URLs retain historical `diagram-cli` names indefinitely, or move
  to an Archscope domain only on a major schema version?
- Should an identity-audit validator be added as a script, or is reviewed `rg`
  evidence sufficient for the first convergence plan?

## Planning and Implementation Handoff

Recommended first planning slice:

```text
P0: Identity surface audit and classification
```

The first plan should not start by renaming files or packages. It should produce
an exact inventory of identity surfaces, classify each one, and only then patch
the active first-read and generated-output surfaces that are safe to converge.

Suggested initial file targets:

- `README.md`
- `docs/getting-started.md`
- `docs/cli-reference.md`
- `docs/architecture-testing.md`
- `docs/README.md`
- `docs/migration/archscope-compatibility.md`
- `src/diagram.js`
- `src/commands/init.js`
- `src/commands/scan.js`
- `.github/workflows/pr-impact-comment.yml`
- `.github/ISSUE_TEMPLATE/*.yml`
- `package.json`
- relevant tests under `test/`

Guardrails for planning:

- Do not rename the package, repository, `.diagram`, `.diagramrc`, or schema URLs
  in the first implementation plan.
- Prefer product-language convergence, generated-output updates, and tests that
  prove compatibility.
- If package or repository rename work looks necessary, stop and write a
  dedicated follow-up spec before implementation.

## Definition of Done

- This spec has required HE frontmatter, including `schema_version`, `risk`,
  `spec_depth`, and `ui_required`.
- Acceptance criteria SA1-SA16 are stable enough for `he-plan`.
- The contract clearly separates Archscope-first product convergence from
  package, repository, artifact namespace, and schema URL hard renames.
- Compatibility surfaces are explicitly preserved.
- Failure and recovery behavior covers premature rename, stale identity,
  compatibility regression, artifact namespace break, and machine-contract
  branding leaks.
- Planning handoff identifies the first safe slice and the rename actions that
  remain blocked.
