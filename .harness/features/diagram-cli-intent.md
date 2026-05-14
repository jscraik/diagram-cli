---
schema_version: 1
repo: diagram-cli
artifact_type: repository-intent
status: reviewed
last_reviewed: 2026-05-07
---

# diagram-cli Repository Intent

## Table of Contents

- [Project Intent](#project-intent)
- [Review Resolution](#review-resolution)
- [Core Thesis](#core-thesis)
- [Strategic Direction](#strategic-direction)
- [Intended Users](#intended-users)
- [Non-Goals](#non-goals)
- [System Philosophy](#system-philosophy)
- [Architectural Patterns](#architectural-patterns)
- [Agent-Native Design Assumptions](#agent-native-design-assumptions)
- [Harness/Governance Model](#harnessgovernance-model)
- [Critical Constraints](#critical-constraints)
- [Stable Interfaces](#stable-interfaces)
- [Sources of Complexity](#sources-of-complexity)
- [Sources of Leverage](#sources-of-leverage)
- [Probable Moat](#probable-moat)
- [Current Standards Assessment (May 2026)](#current-standards-assessment-may-2026)
- [Drift Risks](#drift-risks)
- [Technical Debt Signals](#technical-debt-signals)
- [UX Philosophy](#ux-philosophy)
- [What Future Agents Should Preserve](#what-future-agents-should-preserve)
- [What Future Agents Should Challenge](#what-future-agents-should-challenge)
- [Open Questions](#open-questions)
- [Recommended Decisions](#recommended-decisions)
- [Strategic Contradictions](#strategic-contradictions)
- [Suggested Simplifications](#suggested-simplifications)
- [Missing Capabilities](#missing-capabilities)
- [Long-Term Scalability Concerns](#long-term-scalability-concerns)
- [Direct Strategic Assessment](#direct-strategic-assessment)
- [Drift Detection Signals](#drift-detection-signals)
- [Evidence & Traceability Matrix](#evidence--traceability-matrix)

## Project Intent

`diagram-cli` is trying to become a local-first architecture evidence tool for code review, with diagrams as one artifact inside a broader review protocol. The current product name is `archscope`; the npm package remains `@brainwav/diagram`; the `diagram` binary remains as a compatibility surface.

Verified facts:

- The package description is `Generate architecture evidence for humans and AI agents`, and the binaries are `archscope` and `diagram` in `package.json`.
- The CLI entrypoint defines `CANONICAL_COMMAND_NAME = 'archscope'`, `COMPATIBILITY_COMMAND_NAME = 'diagram'`, and describes itself as `Generate architecture evidence for humans and AI agents` in `src/diagram.js`.
- The README leads with `archscope agent-pr . --base origin/main --head HEAD`, `archscope agent .`, and `archscope scan .`, not with media generation or a generic diagram command.
- The central runtime writes `.diagram/manifest.json`, `.diagram/brief.md`, `.diagram/agent-context.json`, `.diagram/architecture.mmd`, optional `.diagram/pr-impact/pr-impact.json`, and `.diagram/report.html` from `src/commands/scan.js` and `src/artifacts/*`.

Interpretation:

- The repository is no longer mainly a Mermaid generator. The intended value is review readiness: turn repository or PR state into a small, deterministic evidence pack that a human reviewer, Codex, CodeRabbit, or another agent can consume before editing or approving code.
- The durable product promise should be: before reviewing or changing a PR, run `archscope agent-pr` and read the evidence pack in manifest order.

Speculation:

- The stronger long-term commercial surface is not static diagrams. It is an architecture-review evidence protocol that can be embedded into CI, pull request comments, agent workpads, and local developer workflows.

## Review Resolution

Review decisions captured on 2026-05-07:

- Frame the moat primarily as the agent evidence protocol: manifest, brief, agent context, PR impact, deterministic machine output, and review workflow adoption.
- Be aggressive about demoting advanced media and cleaning stale governance surfaces when they create strategic drag.
- Treat CI/check-name drift and false validation gates as merge/release blockers when they affect required governance or release confidence.

## Core Thesis

The core thesis is that architecture review fails less because teams lack diagrams and more because reviewers and coding agents enter a change without shared context, blast-radius evidence, stable artifact order, and explicit failure semantics.

Why this is the thesis:

- `src/artifacts/evidence-manifest.js` defines artifact status values (`written`, `deferred`, `partial`, `failed`), artifact roles, read order, primary human artifact, primary agent artifact, and validation status.
- `src/artifacts/agent-context.js` converts scan output into agent instructions: `readFirst`, `safeToSkip`, `beforeEditing`, `whenBlocked`, `partialEvidence`, and `nextSafeAction`.
- `src/artifacts/brief.js` turns scan output into a human review brief with sections for review decision, changed areas, risk, reviewer checks, evidence status, and next action.
- `src/workflow/pr-impact.js` builds PR delta, blast-radius, risk, suggested reviewer checks, JSON evidence, Markdown, and HTML.
- The product sharpness and agent review inevitability specs explicitly frame the work as making PR architecture review obvious, stable, and difficult to skip.

The project should be judged by whether it makes architecture context unavoidable at the right moment, not by whether it can draw a prettier diagram.

## Strategic Direction

The strategic direction should be:

1. Make `archscope agent-pr` the primary product path.
2. Keep `archscope scan` as the reusable evidence-pack primitive.
3. Keep `archscope agent` and `archscope agent-pr` as thin, test-covered wrappers over `scan`.
4. Treat `.diagram/manifest.json`, `.diagram/brief.md`, `.diagram/agent-context.json`, and `.diagram/pr-impact/pr-impact.json` as stable protocol artifacts.
5. Treat `.diagram/architecture.mmd` and `.diagram/report.html` as useful outputs, but not the strategic center.
6. Demote advanced media commands unless they measurably increase review adoption.
7. Keep the `diagram` command as compatibility, but avoid letting compatibility language dominate first-run UX.
8. Consolidate governance around validation that actually runs and blocks, not around manifests that describe checks that no longer exist.

Evidence:

- `src/commands/agent.js` delegates to `scan` and rejects PR refs with an `unsupported_pr_refs` machine error that tells agents to use `agent-pr`.
- `src/commands/agent-pr.js` requires a base ref, defaults head to `HEAD`, delegates to `scan`, and reports `data.delegatedCommand = 'scan'`.
- `test/scan-pr-evidence.test.js` asserts the wrapper delegation, scan equivalence string, PR artifact paths, reviewer checks, read order, brief sections, and partial evidence behavior.
- `src/diagram.js` places `generate-video` and `generate-animated` in the advanced section of the help text while placing `agent-pr`, `agent`, and `scan` first in the primary commands.

## Intended Users

Primary users:

- AI coding agents that need a deterministic architecture context pack before editing.
- Human maintainers reviewing PRs and needing a short, local artifact that states changed areas, risk, blast radius, and next action.
- CI/governance systems that need a machine-readable artifact to decide whether review context exists.

Secondary users:

- Developers who want a local architecture snapshot or Mermaid diagram for orientation.
- Repo maintainers who want `.architecture.yml` rules and validation.
- Harness operators who want repo readiness checks, memory state, and governance evidence.

The user model is not a diagram hobbyist. It is a reviewer or coding agent trying to make a safer change with less context loss.

## Non-Goals

Hard non-goals inferred from specs and implementation:

- Do not turn this into a hosted SaaS as the primary value path.
- Do not make video or animation the center of the product.
- Do not rename the npm package or remove the `diagram` compatibility binary without migration evidence.
- Do not create a second agent pipeline beside `scan`; wrapper commands should delegate to the same evidence-generation path.
- Do not replace code review, CodeRabbit, Codex, or CI. The tool should feed them better context.
- Do not claim semantic code intelligence beyond the static analysis and git delta evidence the repo actually computes.

Likely non-goals:

- Do not require consumer repositories to adopt the full harness, Local Memory, and Codex control plane just to get value from `archscope agent-pr`.
- Do not make every adopter install the full tool inventory listed in harness governance docs unless those tools are needed for a specific workflow.

## System Philosophy

The system philosophy is evidence-first, local-first, partial-truthful, and agent-readable.

Evidence-first:

- Every high-value command should produce artifacts that can be read after the command exits.
- The manifest should state what was written, what was skipped, why it was skipped, and what the next safe action is.

Local-first:

- The CLI operates over a local repository path.
- CI can call it without depending on a hosted service.
- `init` scaffolds local config and CI examples without creating an external control plane.

Partial-truthful:

- Partial PR evidence is not silently hidden. `scan` preserves repository evidence when PR refs fail, emits partial status, and exits nonzero.
- The agent context contains blocker categories and retry guidance.

Agent-readable:

- JSON-capable commands are inventoried in `.diagram/contracts/machine-command-coverage.json`.
- Tests verify that command coverage matches independent discovery.
- `agent-context-v1.schema.json` documents the machine contract for agent context.

## Architectural Patterns

The major architecture is:

- CLI shell: `src/diagram.js` owns Commander setup, command ordering, compatibility aliases, parser-friendly mistakes, and user-facing help.
- Command modules: `src/commands/*.js` implement focused commands and normalize machine output.
- Central evidence orchestrator: `src/commands/scan.js` is the main artifact-generation path.
- Artifact layer: `src/artifacts/evidence-manifest.js`, `src/artifacts/brief.js`, and `src/artifacts/agent-context.js` transform analysis and PR data into durable outputs.
- Static analysis core: `src/core/analysis-generation-analyze.js`, `src/analyzers/default-analyzer.js`, parsers, graph helpers, rule validation, and architecture schema utilities infer components and dependencies.
- PR workflow layer: `src/workflow/pr-command.js`, `src/workflow/pr-impact.js`, and `src/workflow/*` compute changed files, blast radius, risk, reviewer checks, and PR impact artifacts.
- Governance layer: `harness.contract.json`, `.harness/ci-required-checks.json`, `.github/workflows/*`, `scripts/codex-preflight.sh`, `scripts/verify-work.sh`, `scripts/harness-pr-gates.sh`, Makefile targets, and docs under `docs/agents/*`.
- Memory/context layer: `memory.json`, `AI/context/diagram-context.md`, `.diagram/contracts/*`, and `.harness/features/*`.

Intentional pattern:

- The agent wrappers are deliberately thin. They exist to make the right command obvious and to attach agent-facing metadata, not to fork behavior.

Accidental pattern:

- Governance documents and manifests have outgrown the live CI surface. Some check names and workflow expectations appear copied from a harness baseline rather than derived from this repo's current jobs.

## Agent-Native Design Assumptions

This repo has a real agent-native model. It is not only performative.

Hard evidence:

- `agent-context-v1.schema.json` defines an explicit agent context schema with `readOrder`, `agentInstructions`, blocker handling, partial evidence, and next safe action.
- `test/agent-context-contract.test.js` executes `scan`, loads the schema, loads `.diagram/agent-context.json`, and asserts required fields and agent instruction semantics.
- `test/scan-pr-evidence.test.js` asserts that PR scans add `.diagram/pr-impact/pr-impact.json` to read order and include reviewer checks before editing.
- `src/diagram.js` has error suggestions and command aliases aimed at robot mode, including `--json` to `--format json` normalization and old command remapping.
- `.diagram/contracts/machine-command-coverage.json` lists JSON-capable deterministic commands, and `test/machine-command-coverage.test.js` validates the manifest against discovery.

Agent-native assumptions to preserve:

- Agents should not scrape HTML when JSON artifacts exist.
- Agents should read `.diagram/manifest.json` first.
- Agents should use only artifacts whose status is `written`.
- Agents should treat `partial` as usable evidence plus explicit blockers, not as total failure.
- PR-mode evidence should include changed components, blast radius, risk reasons, and reviewer checks before an agent edits files.
- Machine outputs need deterministic mode and stable schema versions.

## Harness/Governance Model

The repo uses a layered governance model:

- Root instructions (`AGENTS.md`, `CLAUDE.md`) define validation and instruction discovery.
- Repo-local Codex skills in `.codex/skills/*` define specialized workflows for config drift, validation contract, MCP startup, and CI check parity.
- `harness.contract.json` defines branch protection, diff budgets, risk tiers, review requirements, tooling policy, memory policy, observability policy, and CI provider policy.
- `.github/workflows/pr-pipeline.yml` implements a practical PR gate with template checks, risk policy, dependency review, action pinning, consistency drift, lint, typecheck, test, audit, check, and memory jobs.
- `scripts/verify-work.sh` is the local verification wrapper.
- `scripts/codex-preflight.sh` checks repository shape, tools, git state, optional Local Memory, and startup health.
- `scripts/harness-pr-gates.sh` delegates to harness gates when the harness CLI is available.

Interpretation:

- Governance is strategically important because the repo is selling review confidence. The tool must be able to prove its own validation and workflow integrity.
- The governance layer is also the most likely place for overreach. Several required tools and checks appear to come from a general harness baseline rather than the minimal needs of this CLI.

Observed governance tension, now treated as blocker-class drift when it affects required checks or release confidence:

- `.harness/ci-required-checks.json` lists required checks such as `dependency-scan`, `orb-pinning`, `docs-gate`, `security-scan`, and `CodeRabbit`, while `.github/workflows/pr-pipeline.yml` uses jobs such as `dependency-review`, `actions-pinning`, `lint`, `typecheck`, `test`, `audit`, and `check`.
- `Makefile` references `scripts/check-diagram-freshness.sh`, but that file is not present.
- `package.json` has no-op `lint`, `typecheck`, and `docs:lint` scripts that report `not_configured`.

These are not fatal to the product thesis, but they are blocker-class integrity risks because this repository's credibility depends on validation truthfulness.

## Critical Constraints

Critical constraints that should remain stable:

- `archscope` is the canonical command name.
- `diagram` remains as compatibility until migration evidence supports removal.
- The artifact output directory defaults to `.diagram`.
- Manifest, brief, agent context, and PR impact artifacts must remain path-stable.
- JSON machine output should remain deterministic and schema-versioned.
- Wrapper commands must delegate to `scan` instead of forking evidence logic.
- `.architecture.yml` must remain the rule source for architecture validation.
- `.diagramrc` must remain the local scan defaults source.
- CI and local verification claims must match real commands.
- The repo must not let governance prose imply checks that the live workflows do not perform.

## Stable Interfaces

Stable interfaces:

- CLI binary names: `archscope`, `diagram`.
- Primary commands: `agent-pr`, `agent`, `scan`, `validate`.
- Compatibility aliases: `test -> validate`, `all -> generate-all`, `video -> generate-video`, `animate -> generate-animated`, `--json -> --format json`.
- Evidence artifacts: `.diagram/manifest.json`, `.diagram/brief.md`, `.diagram/agent-context.json`, `.diagram/pr-impact/pr-impact.json`, `.diagram/architecture.mmd`, `.diagram/report.html`.
- Agent context schema: `src/schema/agent-context-v1.schema.json`.
- Machine command coverage manifest: `.diagram/contracts/machine-command-coverage.json`.
- Architecture config: `.architecture.yml`.
- CLI config: `.diagramrc`.
- Validation entrypoints: `npm test`, `npm run test:deep`, `bash scripts/verify-work.sh --fast`, `bash scripts/check-environment.sh`.
- Release interface: `.github/workflows/release.yml` and release scripts under `scripts/release-*`.

Interfaces that are stable but strategically secondary:

- Advanced media commands: `generate-video`, `generate-animated`.
- HTML report styling.
- Legacy `diagram` wording in compatibility messages.

## Sources of Complexity

Intentional complexity:

- Artifact status modeling is justified because agents need to know what evidence is trustworthy.
- PR impact computation is justified because the main use case is review readiness.
- Compatibility handling is justified because the package and binary names are in transition.
- Machine-command coverage is justified because agent parsing failures are expensive.
- Architecture validation is justified because the tool dogfoods its own product.

Accidental or risky complexity:

- `src/commands/scan.js`, `src/workflow/pr-impact.js`, and `src/workflow/pr-command.js` are large enough to hide duplicated policy and output rules.
- Governance surfaces are numerous: AGENTS, CLAUDE, CONTRIBUTING, harness contract, tooling contract, PR template, Makefile, workflow files, scripts, memory, and repo-local skills.
- Required tool lists include many tools that are not central to a local Node CLI.
- CI provider and check-name policies include shadow or legacy concepts that do not map cleanly to the current workflows.
- Product naming still spans `diagram-cli`, `@brainwav/diagram`, `diagram`, `archscope`, and `.diagram`.

## Sources of Leverage

The strongest leverage comes from shared artifacts:

- A single scan can serve humans, Codex, CodeRabbit, CI, and repo governance.
- The manifest makes future tools composable because they can discover what is available instead of guessing.
- The brief gives humans a short review decision surface.
- The agent context gives agents operational instructions, read order, and blocker semantics.
- PR impact turns git diffs into reviewer checks and blast-radius context.

Other leverage:

- Thin wrappers keep command UX obvious without duplicating logic.
- Machine-command coverage tests protect parser-safe automation.
- Compatibility warnings preserve existing users while guiding them toward the new command language.
- Dogfooding `.architecture.yml` and generated `.diagram` contracts keeps the repo honest about its own architecture story.

## Probable Moat

The probable moat is not Mermaid output. That is easy to copy.

The moat, if it exists, is a disciplined local evidence protocol for agent-assisted review. The governance system matters only insofar as it protects and operationalizes this protocol:

- stable artifact contract,
- deterministic machine output,
- partial/failure semantics,
- PR blast-radius and reviewer-check synthesis,
- agent handoff instructions,
- compatibility/migration discipline,
- governance integration without requiring a hosted service.

This becomes hard to copy only if the protocol is reliable across many repositories and if agents learn to depend on it before editing or reviewing. Without adoption loops and stable schemas, it remains a good CLI feature rather than a moat.

## Current Standards Assessment (May 2026)

Ahead of current standards:

- Agent-native artifact design is ahead. Many repos still have agent instructions as prose; this repo has schema-backed context, manifest read order, deterministic machine coverage, and explicit blocker categories.
- Partial evidence handling is ahead. The repo distinguishes written, deferred, partial, and failed artifacts instead of collapsing every issue into a generic failure.
- Review-first UX is ahead. The specs and README push PR review evidence as the first-run path, which is sharper than generic architecture-doc generation.
- Compatibility discipline is ahead. The CLI supports legacy names while warning users toward canonical commands.
- Local-first governance is ahead. The tool can run without a hosted service and can integrate with CI and local wrappers.

Aligned with current standards:

- GitHub Actions, CodeQL, dependency review, npm audit, trusted publishing, security policy, and pull request templates are normal for a serious CLI project.
- Tests cover real subprocess CLI behavior, artifact generation, schema expectations, PR evidence, compatibility, and machine-command coverage.
- SHA pinning is enforced in the PR pipeline for workflow actions.
- `npm ci`, package-lock discipline, and npm provenance/trusted publishing are aligned for npm release hygiene.

Lagging behind current standards:

- Typed boundaries are weak. The project is plain JavaScript with no real typechecking gate; `npm run typecheck` is explicitly `not_configured`.
- Lint and docs lint are not real assurance gates. They are present as scripts but report `not_configured`.
- Observability is mostly governance-level intent. `harness.contract.json` references OpenTelemetry logs, but the CLI itself does not expose mature instrumentation around scan stages, artifact write latency, or risk computation confidence.
- CI required-check metadata appears inconsistent with live workflow names.
- The tooling envelope is too broad for a portable CLI and likely increases onboarding cost.
- Semantic analysis depth remains limited compared with 2026 code intelligence expectations. The repo should not overclaim beyond static component/dependency extraction and git delta heuristics.

Over-engineered:

- Harness and Local Memory governance for this small CLI are heavier than the product surface needs.
- The documentation and planning corpus is large relative to the implemented product.
- CI provider transition and check-name policy surfaces are more elaborate than the observed workflow implementation.
- Advanced media commands create product blur unless tied to a measurable adoption path.

Under-engineered:

- Real lint/typecheck/doc lint enforcement.
- Runtime observability inside the CLI.
- Confidence scoring for static analysis and PR impact beyond coarse risk rules.
- A minimal consumer onboarding path that does not require understanding the harness layer.
- Check-name parity enforcement between `.harness/ci-required-checks.json`, `harness.contract.json`, workflow job names, and PR template text.

Unusually differentiated:

- The combination of agent-context schema, manifest-first evidence, PR impact, and review brief is genuinely differentiated.
- The CLI's robot-mode tolerance and compatibility remapping are unusually thoughtful for agent use.
- The repo's own intent specs are unusually honest about product sharpness and not mistaking media output for product value.

## Drift Risks

High-risk drift:

- The repo starts optimizing for diagrams, animation, or generated reports instead of review evidence.
- `agent` and `agent-pr` grow separate logic and stop being wrappers around `scan`.
- New artifacts are added but not registered in the manifest.
- CI and harness manifests diverge from real workflow jobs.
- Validation scripts claim checks that are no-op or unavailable.
- Local Memory or harness preflight becomes a hard requirement for ordinary consumer usage.
- Product naming remains scattered across first-run surfaces.

Medium-risk drift:

- Specs and plans continue to grow faster than command behavior.
- PR impact heuristics accumulate policy inside large files without tests or schema boundaries.
- The compatibility layer becomes permanent product language instead of a migration bridge.
- TODOs and restore manifests remain active without closure decisions.

Low-risk drift:

- HTML report visual polish changes.
- Mermaid layout changes.
- Non-core advanced media implementation changes, as long as they stay secondary.

## Technical Debt Signals

Observed debt:

- `package.json` has `lint`, `typecheck`, and `docs:lint` scripts that return structured `not_configured` messages, while governance docs and PR templates still speak as if these are assurance gates.
- `.harness/ci-required-checks.json` does not cleanly match live GitHub Actions job names.
- `Makefile` references `scripts/check-diagram-freshness.sh`, which is absent.
- `.mise.toml` pins `npm:@brainwav/diagram@1.0.8` while `package.json` is `1.1.0`.
- `src/artifacts/evidence-manifest.js` still contains a default deferred reason string `p1_not_implemented`, which reads stale given the current artifact implementation.
- Several central files are large enough to warrant boundary review: `src/commands/scan.js`, `src/workflow/pr-impact.js`, `src/workflow/pr-command.js`, and `scripts/codex-preflight.sh`.

Interpretation:

- The debt is mostly integrity drift rather than missing features. The product core is coherent, but the surrounding governance needs to be reconciled so future agents know what is real.

## UX Philosophy

The UX philosophy should be operational and review-first:

- Put `agent-pr` first when the user is in a PR context.
- Put `agent` first when the user needs repository orientation.
- Keep `scan` visible as the underlying primitive.
- Keep compatibility warnings short and actionable.
- Avoid marketing copy in CLI help. Use direct commands and next actions.
- Do not force users to understand harness governance before they get their first evidence pack.
- Treat HTML and diagrams as optional reading after manifest, brief, and agent context.

Evidence:

- README quick start prioritizes `agent-pr`, `agent`, and `scan`.
- CLI unknown-command help points to primary commands and gives common migration examples.
- Brief sections are review-actionable rather than decorative.

## What Future Agents Should Preserve

Preserve:

- `scan` as the single evidence-pack orchestration path.
- Thin `agent` and `agent-pr` wrappers.
- Manifest-first artifact contract.
- Agent context schema and tests.
- PR impact artifact path and reviewer checks.
- Partial/failure status semantics.
- Deterministic JSON mode.
- Compatibility aliases and migration warnings until removal is explicitly approved by evidence.
- README first-run focus on architecture review evidence.
- Dogfooding of architecture validation.
- Local-first operation.

Do not break:

- `.diagram/manifest.json`
- `.diagram/brief.md`
- `.diagram/agent-context.json`
- `.diagram/pr-impact/pr-impact.json`
- `src/schema/agent-context-v1.schema.json`
- `.diagram/contracts/machine-command-coverage.json`
- `test/agent-context-contract.test.js`
- `test/scan-pr-evidence.test.js`
- `test/machine-command-coverage.test.js`

## What Future Agents Should Challenge

Challenge:

- Any new command that duplicates `scan` output logic.
- Any artifact that bypasses the manifest.
- Any governance rule that is not enforced by CI, scripts, or tests.
- Any required check name that cannot be found in a workflow.
- Any growth in required tooling that does not map to a current repo workflow.
- Any attempt to move video/animation into the first-run path.
- Any PR template requirement that references missing package scripts.
- Any docs that imply real lint/typecheck coverage while scripts remain no-op.
- Any compatibility layer that keeps old names visible without a migration decision.

## Open Questions

Open strategic questions:

- Is the intended moat the narrow agent evidence protocol, or the broader harness/governance system around it?
- Should the repo intentionally split consumer product docs from harness-maintainer docs?
- What is the concrete removal policy for `diagram` compatibility language?
- Should advanced media commands be deprecated, hidden, or kept as documented secondary features?
- What level of semantic code analysis is required before the tool can claim architecture risk confidence?
- Should CI required-check parity become a hard release blocker?

Best current answer:

- The moat should be framed as the agent evidence protocol. Harness governance should protect that protocol, not become the product.

## Recommended Decisions

1. Declare `archscope agent-pr` the product center.
   - Tradeoff: this narrows the product. That is good. The repo already has too many possible identities.

2. Make CI/check-name parity a merge blocker.
   - Tradeoff: this will force cleanup in governance files. The benefit is higher trust in every future agent handoff.

3. Replace fake assurance gates with explicit states.
   - Tradeoff: either implement real lint/typecheck/docs lint or keep them visibly non-blocking. Do not let docs call them gates while scripts say `not_configured`.

4. Keep harness governance as contributor infrastructure, not consumer onboarding.
   - Tradeoff: contributors still get strong local controls; adopters get a smaller first-run experience.

5. Put advanced media behind secondary docs.
   - Tradeoff: existing capabilities remain available, but they stop competing with review evidence for product identity.

6. Add a small schema or contract around PR impact JSON if it is expected to become a stable agent artifact.
   - Tradeoff: more schema maintenance, but better agent trust.

## Strategic Contradictions

Contradiction: The repo says it is a practical evidence CLI, but some governance surfaces require a broad harness toolchain.

- Evidence: `docs/agents/tooling.contract.json`, `.mise.toml`, and `harness.contract.json` list many tools unrelated to normal CLI use.
- Recommendation: separate contributor governance from consumer runtime.

Contradiction: The repo requires validation truthfulness, but some validation gates are no-op or missing.

- Evidence: `package.json` scripts report `not_configured`; Makefile references a missing freshness script; check manifests do not cleanly map to live workflow job names.
- Recommendation: either implement the gates or rename them as advisory placeholders.

Contradiction: The repo is transitioning from `diagram` to `archscope`, but the package and artifact names still carry `diagram`.

- Evidence: package name `@brainwav/diagram`, compatibility binary `diagram`, output directory `.diagram`, repository name `diagram-cli`, README product name `archscope`.
- Recommendation: keep this as an intentional migration bridge, but document one canonical naming rule: user-facing command is `archscope`; compatibility surfaces retain `diagram` until removed by migration policy.

Contradiction: The product wants review inevitability, but advanced media commands still occupy command surface area.

- Evidence: `generate-video` and `generate-animated` are still CLI commands.
- Recommendation: keep them under advanced help only and delete them from first-run docs unless there is adoption evidence.

## Suggested Simplifications

Suggested simplifications:

- Collapse first-run docs around three commands: `agent-pr`, `agent`, `scan`.
- Create one check-name parity source of truth and generate the manifest or docs from it.
- Move harness/operator setup into a separate contributor section that is clearly not required for consumer value.
- Split `src/commands/scan.js` into smaller units only where tests already define contracts: artifact writes, PR composition, machine output, and status handling.
- Split `src/workflow/pr-impact.js` into delta extraction, risk policy, and artifact rendering if policy grows further.
- Remove or repair Makefile targets that reference missing scripts.
- Replace stale `p1_not_implemented` fallback text with a current, neutral deferred reason.

## Missing Capabilities

Missing or immature capabilities:

- Real type boundaries or typechecking.
- Real linting.
- Real docs linting.
- PR impact schema contract.
- CLI stage-level telemetry.
- Confidence scoring for analysis results.
- A lightweight adopter path that only requires Node/npm and the CLI.
- A documented compatibility-removal policy.
- CI/check-name parity gate.
- Better separation between product docs, contributor docs, and harness operator docs.

## Long-Term Scalability Concerns

Scalability concerns:

- The artifact protocol will need schemas and compatibility policy if external tools depend on it.
- Static analysis heuristics may not scale to large polyglot repositories without confidence markers and analyzer plugins.
- Large monolithic command/workflow files will slow future changes and make subtle regression likely.
- Governance overhead may deter adoption if it leaks into consumer onboarding.
- Context cost will rise if the agent context becomes a dumping ground instead of a concise protocol artifact.
- Multi-agent coordination will fail if artifact contracts are not stricter than mailbox/status prose.
- Required tool lists will become brittle if they are not derived from actual workflows.

## Direct Strategic Assessment

Is this project coherent?

Yes. The coherent project is `archscope`: a PR architecture evidence protocol for humans and agents. The incoherent residue is the older diagram/media identity and an overgrown governance layer.

Is the architecture pragmatic?

The core architecture is pragmatic: one scan path, thin wrappers, stable artifacts, tests over subprocess behavior. The surrounding governance is less pragmatic because it includes more tools, check names, and process claims than the live project consistently enforces.

Is the complexity justified?

The artifact and PR evidence complexity is justified. The media surface and broad harness/tooling envelope are not currently justified by visible product leverage.

Is the agent-native model real or performative?

It is real in the artifact layer. The schema, read order, blocker taxonomy, machine coverage, and wrapper tests are concrete. It becomes performative only when governance docs claim checks or workflows that are not wired to live enforcement.

What is genuinely differentiated?

The differentiated part is a local artifact protocol that tells an agent exactly what to read, what to skip, what is partial, what failed, and what to do next before editing or reviewing a PR.

What feels trend-driven?

The broad harness layer, Local Memory references, multi-tool readiness list, and legacy review-artifact ceremony feel partly copied from a larger governance system rather than shaped by this CLI's minimum viable trust model.

What should be deleted immediately?

Do not delete product code immediately without a separate change request. The immediate cleanup targets are stale or false governance surfaces:

- `.harness/ci-required-checks.json` names that do not match live workflows,
- missing Makefile script references,
- stale `p1_not_implemented` deferred wording,
- any first-run docs that still center video or generic diagrams over `agent-pr`.

What should become core?

Core should be `agent-pr`, `scan`, manifest, brief, agent context, PR impact, deterministic JSON, and checkable schemas.

What creates leverage?

One evidence pack serving humans, agents, CI, and review tools creates leverage.

What creates drag?

Governance that is broader than the product, no-op gates that look mandatory, multiple names, and large docs create drag.

What would make this hard to copy?

Hard-to-copy value requires real adoption loops: PR comments, agent integrations, schemas, migration policy, and enough repository examples to prove that the evidence protocol improves review outcomes.

What would make this commercially valuable?

Commercial value would come from making architecture context a default step in AI-assisted PR review. The product needs integrations that make `agent-pr` automatic and useful: GitHub comments, CodeRabbit/Codex context packs, CI summary artifacts, and team policy dashboards that consume the same manifest.

What would make developers adopt it?

Developers will adopt it if the first run is fast, local, obviously useful, and does not require understanding the harness. The command must answer: what changed, what is risky, what should I inspect, and what can I safely ignore?

Biggest risks:

- The tool remains too broad to explain in one sentence.
- Governance drift damages trust.
- Static analysis is too shallow for the confidence implied by the output.
- Agent context grows verbose and expensive.
- The repo optimizes for internal harness machinery rather than external adoption.

Assumptions likely wrong:

- That users care about architecture diagrams as an output. They probably care about review decisions.
- That a broad local tooling envelope is acceptable for a CLI adopter.
- That compatibility can remain indefinitely without harming product clarity.

Smallest compelling version:

`npx @brainwav/diagram agent-pr . --base origin/main --head HEAD --format json --deterministic` writes a manifest, brief, agent context, and PR impact file that a reviewer can trust in under a minute.

If this became the company moat:

Aggressively protect the artifact protocol, schema stability, partial/failure semantics, PR impact accuracy, and integrations that make agents read the evidence before acting.

If this fails:

It will fail because it stayed a clever CLI with too much governance and not enough unavoidable workflow placement. It will also fail if the evidence is not accurate enough to change reviewer behavior.

# Drift Detection Signals

| Signal | Why it matters | Likely root cause | Operational impact | Severity | Threshold | Corrective action | Block merges/releases |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agent` or `agent-pr` duplicates scan logic | Forked evidence paths break protocol trust | Wrapper convenience grows into behavior | Agents get inconsistent artifacts | Critical | Any duplicated artifact composition outside `scan` | Refactor wrapper back to scan delegation and add regression test | Yes |
| New artifact not listed in manifest | Agents cannot know whether output is safe to read | Feature added without artifact contract | Hidden evidence or stale reads | Critical | Any `.diagram/*` core artifact absent from manifest | Register artifact status, role, reason, and read order | Yes |
| CI required-check names diverge from workflow jobs | Governance becomes fictional | Manual manifest updates | Branch protection blocks wrongly or misses real gates | Critical | Any required check absent from `.github/workflows/*` job names or documented provider mapping | Run check-name parity, update source of truth, regenerate docs | Yes |
| No-op scripts described as gates | Validation claims lose credibility | Scaffold defaults never replaced | False assurance in PRs and release notes | High | `lint`, `typecheck`, or docs lint returns `not_configured` while marked required | Implement real gate or label advisory explicitly | Block release, warn on docs-only PRs |
| PR template references missing scripts | Contributors cannot satisfy checklist | Template drift from package scripts | PRs carry invalid evidence | High | Any `npm run <script>` in template missing from `package.json` | Add script or update template | Yes |
| First-run docs show more than three primary commands | Product center blurs | Feature accumulation | Lower adoption and agent ambiguity | Medium | README quick start includes commands beyond `agent-pr`, `agent`, `scan` before the evidence workflow | Move extras to secondary docs | No, unless it obscures migration |
| Advanced media appears in primary UX | Product drifts back to diagram/media demo | Legacy feature pride | Review evidence moat weakens | Medium | Video/animation commands appear in first-run docs or primary help before evidence commands | Demote to advanced section or remove from first-run docs | No |
| Required tooling list grows without workflow mapping | Onboarding cost rises | Harness baseline copied in wholesale | Users fail setup before product value | High | More than 30 percent of required tools lack a repo-local workflow or script consumer | Split contributor tooling from consumer runtime | Block release if consumer docs require it |
| Artifact schemas change without tests | Agents break silently | Contract edited without compatibility policy | Parser failures in downstream automation | Critical | Any schema or manifest field removed/renamed without tests and migration notes | Add compatibility test and migration note | Yes |
| Agent context exceeds concise handoff size | Context cost rises without reliability gain | Prompt growth replaces protocol design | Agents skip or misread evidence | Medium | `agent-context.json` routinely exceeds 200 KB for normal repos without clear reason | Move detail to secondary artifacts, keep instructions concise | No, but block if parser breaks |
| PR validation runtime exceeds useful loop time | Developers stop running local gates | Overloaded preflight | Validation becomes ceremonial | Medium | `bash scripts/verify-work.sh --fast` exceeds 10 minutes on typical docs/source PR; critical above 15 minutes | Split fast and full gates; cache expensive checks | Block if critical |
| Duplicate PR impact implementations | Review conclusions diverge | Workflow-specific shortcuts | CI, CLI, and comments disagree | High | More than one code path computes risk/blast radius policy | Centralize policy in `src/workflow/pr-impact.js` or dedicated module | Yes |
| Compatibility wording dominates canonical naming | Users never learn `archscope` | Migration fear | Product identity remains unclear | Medium | README first screen or CLI primary help shows `diagram` before `archscope` | Move compatibility to migration section | No |
| Memory/preflight required for consumer flow | Local CLI becomes harness-dependent | Internal governance leaks outward | External adoption drops | High | Consumer quick start requires Local Memory, Codex, or harness before first evidence pack | Split consumer and contributor setup | Block release docs |
| TODO/restore backlog grows without decisions | Intent becomes stale | Planning without closure | Future agents keep re-litigating old work | Medium | More than five unresolved repo-governance TODOs or restore items older than 30 days | Triage into fix, delete, or tracked issue | No, unless P1/P2 |
| Static analysis confidence overclaimed | Reviewers trust weak evidence too much | Marketing outruns implementation | Bad architectural decisions | High | Output states risk without source/confidence caveat for heuristic paths | Add confidence and derivation markers | Block if user-facing claim is false |
| Tool proliferation without consolidation | Capability map becomes incoherent | Every integration adds a new path | More maintenance than leverage | Medium | More than two tools solve the same review/context task without a routing rule | Consolidate or document routing | No |
| Governance rules ignored by CI | Rules become decoration | Docs not wired to workflows | Merge safety depends on memory | Critical | Any critical policy exists only in docs | Add CI/script enforcement or downgrade policy | Yes |
| Architecture rules bypassed by new modules | Dogfooding breaks | Fast feature work avoids `.architecture.yml` | Tool cannot prove its own structure | High | New core module path not covered by `.architecture.yml` when it affects scan/rules/workflow | Update architecture rules and run validation | Yes for core changes |
| Prompt growth replaces harness improvements | Agents get more text but not more reliability | Instructions used as patch for missing contracts | Higher token cost, same failure rate | Medium | Instruction docs grow materially without new tests, scripts, or artifacts | Convert repeated prose into validation or schema | No |
| Dead workflows remain active | CI noise and false failures | Migration cleanup incomplete | Contributors chase obsolete failures | High | Workflow or Make target invokes missing script or unsupported command | Remove or repair workflow target | Yes if active in CI |

# Evidence & Traceability Matrix

| Conclusion | Evidence type | File paths | Symbols/interfaces/components | Runtime behaviour observed | Confidence | Why the evidence matters |
| --- | --- | --- | --- | --- | --- | --- |
| The repo is becoming `archscope`, an architecture evidence CLI, not only a diagram generator | source-code, docs, config | `package.json`, `README.md`, `src/diagram.js` | `bin.archscope`, `bin.diagram`, `CANONICAL_COMMAND_NAME`, `COMPATIBILITY_COMMAND_NAME` | CLI registers `archscope` as canonical and warns on `diagram` compatibility | Hard evidence | Product identity is encoded in package metadata, README first-run commands, and CLI runtime |
| `scan` is the central evidence orchestration path | source-code, tests | `src/commands/scan.js`, `src/commands/agent.js`, `src/commands/agent-pr.js`, `test/scan-pr-evidence.test.js` | `runScanCommand`, wrapper delegation metadata | `agent-pr` reports `delegatedCommand = scan` and scan-equivalent command | Hard evidence | Future agents must not fork artifact generation outside scan |
| The stable protocol is manifest, brief, agent context, and PR impact | source-code, tests | `src/artifacts/evidence-manifest.js`, `src/artifacts/brief.js`, `src/artifacts/agent-context.js`, `src/workflow/pr-impact.js`, `test/scan-pr-evidence.test.js` | artifact ids `manifest`, `brief`, `agent-context`, `pr-impact`; `artifactReadOrder` | Tests assert PR impact path, brief sections, read order, and reviewer checks | Hard evidence | These artifacts are the practical API consumed by humans and agents |
| Agent-native behavior is real in implementation | source-code, schema, tests | `src/schema/agent-context-v1.schema.json`, `src/artifacts/agent-context.js`, `test/agent-context-contract.test.js` | `agentInstructions`, `whenBlocked`, `partialEvidence`, `nextSafeAction` | Test executes CLI and validates generated agent context against schema expectations | Hard evidence | Agent instructions are executable contract surfaces, not only prose |
| Deterministic machine output is an explicit contract | config, tests | `.diagram/contracts/machine-command-coverage.json`, `scripts/discover-json-capable-commands.js`, `scripts/validate-machine-contracts.js`, `test/machine-command-coverage.test.js` | JSON-capable command inventory, `deterministic: true` | Test compares manifest to discovered JSON-capable commands | Hard evidence | Agents and CI need parser-safe command surfaces |
| PR review is the strategic product center | docs, source-code, tests | `README.md`, `docs/specs/2026-05-06-feat-archscope-agent-review-inevitability-spec.md`, `docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md`, `src/diagram.js`, `test/scan-pr-evidence.test.js` | `agent-pr`, `Review Decision`, `Reviewer Checks` | CLI help and tests put PR evidence before generic diagram consumption | Strong inference | The repo repeatedly optimizes toward review readiness |
| Compatibility is intentional and should not be removed casually | source-code, docs, tests | `src/diagram.js`, `README.md`, `docs/specs/*product-sharpness*`, tests for compatibility commands | `diagram` binary, old command alias remapping, `--json` normalization | CLI remaps old robot-mode inputs with warning | Hard evidence | Compatibility is part of migration safety, not accidental old code |
| Advanced media is strategically secondary | source-code, docs | `src/diagram.js`, `README.md`, `docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md` | `generate-video`, `generate-animated` under advanced help | Help text places media after primary evidence commands | Strong inference | Media capability exists, but it is not the moat |
| Governance is real but overgrown | config, CI/CD, scripts, docs | `harness.contract.json`, `.github/workflows/pr-pipeline.yml`, `scripts/codex-preflight.sh`, `scripts/verify-work.sh`, `docs/agents/tooling.contract.json`, `.mise.toml` | diff budget, memory policy, risk gates, Local Memory checks, required tool lists | Local wrappers and CI gates exist; many tools listed beyond core CLI needs | Strong inference | Governance protects trust but risks becoming drag |
| CI/check-name drift exists | CI/CD, config, docs | `.harness/ci-required-checks.json`, `.github/workflows/pr-pipeline.yml`, `.github/pull_request_template.md`, `package.json` | required checks vs actual workflow job names; placeholder assurance scripts | File inspection shows check names and assurance levels do not align cleanly | Hard evidence | Validation truthfulness is central to repo credibility |
| Some validation gates are placeholders | config | `package.json`, `CONTRIBUTING.md`, `.github/pull_request_template.md` | `lint`, `typecheck`, `docs:lint` output `not_configured` | Package scripts succeed by reporting not configured while docs call them required | Hard evidence | Future agents must not overstate assurance from no-op gates |
| Makefile contains stale workflow reference | config | `Makefile`, `scripts/` | `diagrams-check`, `scripts/check-diagram-freshness.sh` | `ls scripts/check-diagram-freshness.sh` returned no such file | Hard evidence | Active command surfaces must not point at missing files |
| Architecture validation is dogfooded | config, source-code | `.architecture.yml`, `src/commands/validate.js`, `test/architecture-rules.test.js` | protected areas, dependency constraints, validation command | Validation command reads `.architecture.yml` and applies rules engine | Hard evidence | The repo uses its own architecture policy concepts |
| Static analysis is useful but limited | source-code | `src/core/analysis-generation-analyze.js`, `src/analyzers/default-analyzer.js`, parsers under `src/parsers/*` | component extraction, dependency linking, role tags | Analysis is static and file/parser based | Strong inference | The product should not overclaim semantic code intelligence |
| Observability is mostly governance intent, not mature CLI telemetry | config, source-code | `harness.contract.json`, `src/commands/scan.js`, `scripts/codex-preflight.sh` | OpenTelemetry endpoint in contract; CLI artifact statuses and warnings | Repo exposes artifact status but not rich stage telemetry | Interpretation | May 2026 agent workflows benefit from measured runtime stages and failure rates |
| The probable moat is the evidence protocol | source-code, tests, docs, naming patterns | `src/artifacts/*`, `src/workflow/pr-impact.js`, `src/schema/agent-context-v1.schema.json`, `README.md`, specs | manifest-first pack, agent instructions, PR checks | Runtime produces shared evidence for humans and agents | Interpretation | Diagrams are commodity; durable, adopted agent review protocol is harder to copy |
| Product naming is still fragmented | config, source-code, docs | repository name, `package.json`, `src/diagram.js`, `.diagramrc`, `.diagram/*`, README | `diagram-cli`, `@brainwav/diagram`, `diagram`, `archscope`, `.diagram` | Compatibility command remains active while canonical name is `archscope` | Hard evidence | Naming fragmentation can degrade onboarding and adoption |
| The smallest compelling version is local PR evidence in under a minute | source-code, docs, tests | `README.md`, `src/commands/agent-pr.js`, `src/commands/scan.js`, `test/scan-pr-evidence.test.js` | `archscope agent-pr . --base origin/main --head HEAD --format json --deterministic` | Tests create a git repo and produce PR evidence artifacts | Strong inference | This is the least broad product shape that still proves the thesis |
| Future drift should be blocked when it breaks artifact contracts or validation truth | tests, CI/CD, config | `test/agent-context-contract.test.js`, `test/scan-pr-evidence.test.js`, `.github/workflows/pr-pipeline.yml`, `harness.contract.json` | schema tests, workflow gates, branch protection policy | Some contracts are enforced, some are only declared | Interpretation | The anti-drift system should distinguish enforced contracts from aspirational ones |
