---
schema_version: 1
title: Archscope Repository Intent
status: draft
audience: coding agents, maintainers, reviewers
last_reviewed: 2026-05-07
certainty_model: separate facts, strong inferences, product judgment, and open questions
confirmed_intent:
  north_star: evidence first
  moat: agent-native workflow
  cut_or_demote: advanced media
---

# Archscope Repository Intent

## Table of Contents

- [Purpose](#purpose)
- [Confirmed Intent](#confirmed-intent)
- [Executive Read](#executive-read)
- [What Is Certain From The Repo](#what-is-certain-from-the-repo)
- [Strong Inferences](#strong-inferences)
- [What I Actually Think](#what-i-actually-think)
- [The Product Idea](#the-product-idea)
- [Agent-Native Contract](#agent-native-contract)
- [Human Contract](#human-contract)
- [Core Workflows](#core-workflows)
- [Artifact Model](#artifact-model)
- [Codebase Shape](#codebase-shape)
- [Design And Architecture Assessment](#design-and-architecture-assessment)
- [Pragmatism Assessment](#pragmatism-assessment)
- [How To Improve The Idea](#how-to-improve-the-idea)
- [What To Cut If This Is The Moat](#what-to-cut-if-this-is-the-moat)
- [What This Repo Is Not](#what-this-repo-is-not)
- [Open Questions](#open-questions)
- [Agent Read Order](#agent-read-order)
- [Evidence Map](#evidence-map)

## Purpose

This document captures the high-level intent behind this repository so future
agents understand the product before changing code.

It is intentionally not just a feature list. It records what can be proven from
the current repository, what is strongly implied by the code and docs, and a
candid product critique of what would make Archscope more useful, sharper, and
harder to replace.

## Confirmed Intent

The maintainer confirmed these choices on 2026-05-07:

- North star: evidence first.
- Moat: agent-native workflow.
- Primary cut or demotion: advanced media.

Interpretation for future agents:

- Lead with architecture evidence, not diagram generation.
- Optimize for coding agents and human reviewers sharing the same artifact set.
- Keep video and animated outputs only if they support evidence review; do not
  let them compete with the core product story.

## Executive Read

Archscope is a local-first architecture evidence CLI for humans and AI coding
agents.

Its strongest idea is not:

```text
Generate diagrams from a codebase.
```

Its stronger idea is:

```text
Before a human reviews a PR, or before an AI agent edits a repo, run Archscope
and give both parties the same architecture evidence pack.
```

That is the product. Mermaid diagrams, HTML reports, PR impact JSON, briefs,
and machine envelopes are all supporting surfaces around the same central job:
make architecture understanding concrete enough that a human or agent can act
without relying on folklore, stale repo memory, or vibes.

The repo still carries historical names: `diagram-cli`, `@brainwav/diagram`,
`.diagram`, `.diagramrc`, and the compatibility `diagram` command. Those are
compatibility surfaces. The current product identity is `archscope`.

## What Is Certain From The Repo

These are facts visible in the current tree.

- The package is published as `@brainwav/diagram`.
- The package exposes both `archscope` and `diagram` binaries.
- `README.md` says `archscope` is the canonical CLI identity and `diagram` is
  a compatibility command during the migration window.
- `package.json` describes the package as `Generate architecture evidence for
  humans and AI agents`.
- `src/diagram.js` uses `archscope` as the canonical command name and describes
  the tool as generating architecture evidence for humans and AI agents.
- The CLI has first-class commands for `scan`, `agent`, `agent-pr`, `analyze`,
  `generate`, `generate-all`, `validate`, `changed`, `context`, `explain`,
  `doctor`, `init`, and `workflow pr`.
- `agent` and `agent-pr` are thin wrappers over the `scan` workflow, not a
  second analysis pipeline.
- `agent-pr` requires `--base <ref>` and defaults `--head` to `HEAD`.
- `scan` is the central evidence-pack orchestration path.
- `scan` writes or coordinates the manifest, brief, agent context, report,
  architecture diagram, PR impact evidence, machine summary, warnings, and
  error handling.
- The `.diagram` directory is the generated evidence surface.
- `.diagram/manifest.json` is the stable artifact index and the first file
  agents should read.
- `.diagram/brief.md` is the concise human and agent summary.
- `.diagram/agent-context.json` is the parser-safe agent contract.
- `.diagram/report.html` is the richer human report when written.
- `.diagram/pr-impact/pr-impact.json` is the PR impact artifact when base/head
  refs are supplied and resolve.
- The evidence manifest models artifact status as `written`, `deferred`,
  `partial`, or `failed`.
- The manifest records artifact roles, optionality, reasons, error categories,
  primary human artifact, primary agent artifact, read order, warnings, and
  validation status.
- The primary human artifact is `.diagram/report.html` when written; otherwise
  the fallback is `.diagram/brief.md`.
- The primary agent artifact is `.diagram/agent-context.json`.
- The agent-context implementation includes read order, component metadata,
  warnings, errors, PR data, partial-evidence handling, before-editing guidance,
  and blocked-state recovery.
- The brief implementation is decision-oriented: summary, review decision,
  changed areas, risk and reasons, reviewer checks, evidence status, artifact
  read order, warnings, agent handoff, and next action.
- PR impact code computes changed components, dependency deltas, blast radius,
  risk reasons, suggested reviewer checks, and review action items.
- The analyzer walks files, detects components, languages, directories, entry
  points, role tags, and dependencies.
- `init` creates adoption scaffolding such as `.architecture.yml`,
  `.diagramrc`, and a CI sample step.
- `validate` exists alongside diagram generation, so architecture policy is a
  first-class concept.
- Machine output is a first-class contract with `--format json` and
  `--deterministic`.
- Placeholder scripts for `lint`, `typecheck`, and `docs:lint` intentionally
  emit `not_configured` status rather than pretending to be substantive gates.
- The repo has specs and plans that explicitly reposition the product from
  diagram generation toward architecture evidence, PR review, and AI-agent
  usability.

## Strong Inferences

These are not each proven by one line of code, but they are strongly supported
by the docs, source boundaries, tests, specs, and command design.

- Archscope wants to become the default "read this before you edit or review"
  architecture context source for coding agents.
- The project is deliberately migrating from visualization-first to
  evidence-first.
- The product's real moat is shared context: humans and agents consume the same
  manifest, brief, agent context, PR impact evidence, and supporting diagrams.
- Deterministic JSON matters because CI and agents should consume Archscope
  without scraping terminal prose.
- Local-first is part of the identity. Archscope scans the current working tree
  and writes local artifacts rather than requiring a hosted service.
- PR review is the highest-value workflow because it turns architecture
  evidence into a decision point: what changed, what risk exists, and what
  should be inspected next.
- The broad command surface is partly historical. The product wants `agent`,
  `agent-pr`, and `scan` to be the obvious front doors.
- `workflow pr` is the lower-level PR analysis capability; `agent-pr` is the
  safer product entrypoint for agents.
- Media commands such as `generate-video` and `generate-animated` are optional
  advanced outputs, not the main product.
- The repo is trying to prevent a common agent failure mode: editing from stale,
  partial, or imaginary architecture context.
- The migration posture is intentionally cautious. Compatibility survives until
  policy and release evidence say it can be changed.

## What I Actually Think

The project is a genuinely strong idea hiding inside a slightly noisy product
surface.

The good version of Archscope is not "a CLI that draws architecture diagrams."
That version is useful but easy to copy. The good version is "the preflight
black box for architecture understanding before a human or AI agent touches a
repo." That is much more compelling.

If this project becomes great, it will be because it makes one behavior feel
inevitable:

```text
No serious agent edit or PR review starts until Archscope evidence exists.
```

That is a sharp, pragmatic, agent-native wedge. It meets the world where it is:
coding agents are fast, confident, and often under-contextualized. Human
reviewers are overloaded. Repos carry architectural knowledge in scattered
files, patterns, and tribal memory. Archscope can turn that hidden structure
into a repeatable evidence pack both sides can trust.

The project is already agent-native in important ways:

- manifest-first artifact discovery;
- deterministic JSON;
- machine envelopes;
- stable read order;
- partial and failed artifact states;
- next-safe-action guidance;
- `agent` and `agent-pr` wrappers;
- explicit compatibility instead of surprise breakage;
- truthful no-op validation script output.

The weak spots are not conceptual. They are product sharpness and surface-area
discipline:

- The repository still looks, from some angles, like a diagram tool with extra
  governance attached.
- The command list is broad enough that new users and agents can miss the
  highest-value path.
- The package/repo/directory names still pull attention back to the old
  "diagram" frame.
- The analysis engine is useful, but future agents need to be reminded that the
  artifact contract is the product boundary.
- Media output is cool, but it is not the moat unless it directly helps review
  decisions.

My blunt view: keep the codebase boring and the product opinionated. The moat
is not more artifact types. The moat is becoming the most reliable shared
architecture context protocol for coding agents and reviewers.

## The Product Idea

Archscope turns static repository structure and PR deltas into architecture
evidence.

It appears to answer these questions:

- What does this repository contain?
- What components, entry points, languages, and role tags were detected?
- How do files and components depend on one another?
- What changed in this PR?
- Which changed files are modeled and which are unmodeled?
- What is the blast radius?
- What risk level should a reviewer consider?
- What should a reviewer inspect next?
- What should an AI coding agent read before editing?
- Which generated artifacts are reliable, partial, deferred, or failed?
- What is the next safe action when evidence generation is blocked?

The intended outcome is not only a prettier diagram. The intended outcome is a
reviewable, inspectable, machine-readable evidence trail.

## Agent-Native Contract

For coding agents, Archscope is a pre-edit and pre-review context producer.

The intended agent behavior is:

1. Run `archscope agent .` for repository orientation.
2. Run `archscope agent-pr . --base origin/main --head HEAD` for PR review.
3. Read `.diagram/manifest.json` first.
4. Consume only artifacts whose manifest status is `written`.
5. Read `.diagram/brief.md` for the decision summary.
6. Read `.diagram/agent-context.json` for parser-safe context and operational
   guidance.
7. Read `.diagram/pr-impact/pr-impact.json` only when present and marked
   `written`.
8. Report blocked, partial, deferred, or failed evidence before relying on it.

Future agents should treat this as a contract, not a suggestion. Do not guess
artifact paths. Do not scrape `report.html` for machine context. Do not treat a
partial evidence pack as a full green light.

## Human Contract

For humans, Archscope should make architecture review faster and less dependent
on memory.

The human should get:

- a concise architecture brief;
- a richer HTML report when available;
- PR risk and blast-radius evidence;
- suggested reviewer checks;
- supporting Mermaid diagrams;
- a stable artifact index explaining what was generated and what was not.

The human-facing story should still be evidence first. Reports and diagrams
should help reviewers inspect evidence, not replace the evidence contract.

## Core Workflows

### Repository Orientation

```bash
archscope agent .
```

Use this before an AI coding agent edits a repository. It delegates to the scan
workflow and writes the shared evidence pack.

### PR Architecture Review

```bash
archscope agent-pr . --base origin/main --head HEAD
```

Use this before PR review or before an agent modifies PR-sensitive code. This
is the strongest product workflow because it combines repository evidence with
PR impact evidence.

### Default Evidence Pack

```bash
archscope scan .
```

Use this when a human or automation wants the baseline evidence pack without
the agent-specific command name.

### Lower-Level PR Risk Workflow

```bash
archscope workflow pr . --base origin/main --head HEAD
```

Use this when the caller wants lower-level PR blast-radius and risk behavior.
This is useful, but less agent-obvious than `agent-pr`.

### Policy Validation

```bash
archscope validate .
```

Use this when `.architecture.yml` defines architecture rules. This confirms the
product is not only descriptive; it also supports enforceable architecture
policy.

### Supporting Diagrams

```bash
archscope generate .
archscope generate-all .
```

Use these when the caller specifically wants Mermaid artifacts. They matter,
but they are supporting evidence inside a broader product.

## Artifact Model

The `.diagram` directory is the generated evidence surface.

Important artifacts:

- `.diagram/manifest.json`: stable artifact index and first file agents should
  read.
- `.diagram/brief.md`: concise human and agent decision summary.
- `.diagram/agent-context.json`: primary parser-safe agent contract.
- `.diagram/report.html`: richer human report when written.
- `.diagram/architecture.mmd`: supporting architecture diagram.
- `.diagram/pr-impact/pr-impact.json`: PR impact evidence when refs resolve.
- `.diagram/context/**`: older or supporting context-pack artifacts.
- `.diagram/contracts/**`: machine contract evidence.
- `.diagram/migration/**`: compatibility and migration evidence.

The manifest is more important than any individual path. Artifact status
decides whether a consumer can rely on a file.

## Codebase Shape

The current source tree suggests these implementation domains:

- `src/diagram.js`: CLI identity, command registration, alias normalization,
  compatibility notice, and unknown-command guidance.
- `src/commands/**`: user-facing command surfaces and orchestration.
- `src/core/analysis-generation-*`: static analysis and diagram generation
  internals.
- `src/artifacts/**`: manifest, brief, agent context, budget, and evidence
  summaries.
- `src/workflow/**`: PR impact, git helpers, sorting, and workflow command
  plumbing.
- `src/schema/**`: machine schemas and ERD extraction/confidence modeling.
- `src/renderers/**`: human HTML report rendering.
- `src/config/**`: `.diagramrc` loading and defaults.
- `src/rules/**`: architecture rule validation.
- `src/context/**`: context pack normalization and construction.
- `src/migration/**`: Archscope migration readiness and finalization policy.
- `test/**`: behavior and contract coverage across commands, artifacts,
  machine output, PR impact, ERD extraction, rules, migration, and scan output.

This is not a narrow diagram renderer anymore. Its implementation shape already
matches an architecture evidence product.

## Design And Architecture Assessment

The design is directionally good and already more agent-native than most CLI
tools.

What is strong:

- The product has a real domain boundary: analysis produces evidence, artifacts
  carry contracts, workflows turn evidence into review decisions.
- `agent` and `agent-pr` delegate to `scan`, avoiding a second agent-only
  analysis pipeline.
- The manifest provides a stable contract boundary between generation and
  consumption.
- The artifact model explicitly distinguishes written, deferred, partial, and
  failed outputs.
- Agent-facing output is not an afterthought; it is a named artifact and a
  documented read path.
- The repo preserves compatibility through explicit migration evidence rather
  than pretending old users do not exist.

What is weaker:

- The command surface is still crowded.
- `src/core/analysis-generation-*` looks like an internal complexity zone that
  could become harder for agents to change safely.
- The package and repo names still reinforce the old diagram identity.
- The first-run product story has to keep fighting historical surfaces.
- There is a risk of adding more outputs instead of making the core evidence
  loop more trusted.

Agent-native architecture verdict:

- Concept: strong.
- Artifact contract: strong.
- Command ergonomics: good, improving.
- Internal modularity: acceptable, but the analysis-generation family is the
  area to watch.
- Product surface discipline: not sharp enough yet.

## Pragmatism Assessment

The project is pragmatic in the ways that matter:

- It is a local CLI, not a premature platform.
- It uses plain Node.js and Commander.
- It writes files that CI, humans, and agents can inspect.
- It keeps compatibility instead of forcing a disruptive rename.
- It has meaningful tests around command behavior and artifact contracts.
- It reports no-op validation as `not_configured` instead of fake success.

The less pragmatic risk is trying to be too many things:

- diagram generator;
- PR reviewer;
- architecture policy validator;
- agent context generator;
- HTML reporter;
- video/animation generator;
- migration governance surface.

That can still work, but only if the product hierarchy is ruthless:

1. Evidence pack.
2. Agent and PR review workflow.
3. Human report and diagrams.
4. Policy validation.
5. Advanced media and maintainer surfaces.

## How To Improve The Idea

The most useful improvements are about making the core behavior unavoidable,
not adding more artifact types.

1. Make `agent-pr` the hero workflow.

   The sharpest promise is: before review, run `archscope agent-pr`. README,
   CLI help, generated brief, and agent docs should keep repeating that path.

2. Treat `.diagram/manifest.json` as the protocol.

   Future integrations should start from the manifest, not from hardcoded file
   paths. If another tool wants Archscope evidence, the manifest is the API.

3. Make `.diagram/brief.md` feel like a decision note.

   It should answer: can review proceed, what changed, what is risky, what
   should be inspected, what evidence is missing, and what is the next safe
   action.

4. Make `.diagram/agent-context.json` more prescriptive.

   It should not merely describe outputs. It should tell agents what to read,
   what to skip, what to check before editing, and when to stop.

5. Keep failure semantics boring and structured.

   Agents need stable categories and next-safe-action fields more than they
   need another diagram. Permission, missing refs, partial analysis, artifact
   write failure, timeout, network, validation failure, and internal error
   should all be boring to classify.

6. Add confidence language where analysis is heuristic.

   Static analysis can infer a lot, but it should prefer "unknown" or
   "low-confidence" over overclaiming. This would make humans trust the tool
   more and make agents less reckless.

7. Make install-to-first-evidence painfully short.

   The first happy path should be one command, one evidence directory, one
   obvious next read. Everything else can be linked after that.

8. Keep advanced outputs behind the evidence story.

   HTML reports and Mermaid diagrams are valuable because they help inspect
   evidence. Video and animation should stay optional unless they directly help
   review decisions.

9. Create a dedicated agent workflow doc only if it stays short.

   A good agent doc would be a protocol card, not a manual: commands, read
   order, status rules, failure categories, and examples of good citations.

10. Make integration examples concrete.

   Show GitHub Actions, CodeRabbit, Codex, and human-review usage in the same
   pattern: run command, upload artifacts, read manifest, comment summary.

## What To Cut If This Is The Moat

If the moat is agent-native architecture evidence, cut or demote anything that
does not strengthen that loop.

Cut from first-read product paths:

- video generation;
- animated SVG generation;
- generic "diagram generator" positioning;
- migration ledger details;
- finalization policy details;
- internal governance machinery;
- historical brainstorm/spec references;
- broad command inventory before the user learns the core path.

Do not necessarily delete these surfaces. Demote them.

Keep, but make secondary:

- `generate-video`;
- `generate-animated`;
- lower-level `generate` and `generate-all` docs;
- maintainer migration evidence;
- deep governance docs.

Defend and improve:

- `archscope agent-pr . --base origin/main --head HEAD`;
- `archscope agent .`;
- `archscope scan .`;
- `.diagram/manifest.json`;
- `.diagram/brief.md`;
- `.diagram/agent-context.json`;
- `.diagram/pr-impact/pr-impact.json`;
- deterministic JSON envelopes;
- stable error categories;
- next-safe-action guidance.

The hard product discipline is this:

```text
If a feature does not help a human or coding agent decide what to read, what
changed, what risk exists, or what to do next, it is not core.
```

## What This Repo Is Not

Future agents should not treat this repo as:

- only a Mermaid diagram generator;
- a hosted architecture dashboard;
- a replacement for all code review;
- a full semantic code intelligence engine;
- a TypeScript rewrite project;
- a project where compatibility can be deleted because the new name is better;
- a project where no-op validation can be described as a passing quality gate;
- a project where advanced media output is the main moat.

## Open Questions

These points remain ambiguous or only partially answered by the current repo.

- Should `agent-pr` eventually become more prominent than `scan` in all public
  copy, with `scan` described as the underlying evidence command?
- How long should the `diagram` compatibility command remain visible in top
  level help and docs?
- Should `.diagram/brief.md` become the primary human artifact for PR review
  even when `.diagram/report.html` exists?
- What schema stability promise should apply to `.diagram/agent-context.json`
  after v1?
- Which generated artifacts should CI upload by default?
- Should Archscope eventually publish under an `archscope` package name, or is
  the package-name mismatch an accepted long-term compromise?
- Should `validate` remain explicit, or should scan index validation when
  `.architecture.yml` is present?
- How much of the `src/core/analysis-generation-*` family should be refactored
  into clearer domain modules before more features land?

## Agent Read Order

When working in this repo, read intent and implementation in this order:

1. `README.md`
2. `.harness/features/archscope-repo-intent.md`
3. `docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md`
4. `docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md`
5. `docs/specs/2026-05-06-feat-archscope-agent-review-inevitability-spec.md`
6. `src/diagram.js`
7. `src/commands/agent.js`
8. `src/commands/agent-pr.js`
9. `src/commands/scan.js`
10. `src/artifacts/evidence-manifest.js`
11. `src/artifacts/brief.js`
12. `src/artifacts/agent-context.js`
13. `src/workflow/pr-impact.js`
14. `src/core/analysis-generation-analyze.js`

For generated evidence packs, use the generated manifest order instead:

1. `.diagram/manifest.json`
2. `.diagram/brief.md`
3. `.diagram/agent-context.json`
4. `.diagram/pr-impact/pr-impact.json` when present and marked `written`

## Evidence Map

The conclusions above are grounded in these repo surfaces:

- `package.json`: package identity, CLI binaries, package description, scripts,
  npm distribution, and truthful placeholder gates.
- `README.md`: canonical product identity, first-run workflows, evidence pack,
  agent workflows, validation truthfulness, and migration state.
- `src/diagram.js`: canonical command name, compatibility command, registered
  command surface, alias handling, and agent-friendly unknown-command output.
- `src/commands/agent.js`: agent command as a scan wrapper and machine-readable
  agent error behavior.
- `src/commands/agent-pr.js`: PR agent command as a scan wrapper requiring
  `--base`.
- `src/commands/scan.js`: central evidence-pack orchestration and machine
  summary behavior.
- `src/artifacts/evidence-manifest.js`: artifact status model, primary artifact
  selection, deterministic timestamps, and read order.
- `src/artifacts/brief.js`: decision-oriented human and agent brief.
- `src/artifacts/agent-context.js`: parser-safe agent contract, before-editing
  checks, partial evidence handling, and blocked-state recovery.
- `src/workflow/pr-impact.js`: changed component analysis, blast-radius logic,
  risk narrative, and reviewer action items.
- `src/core/analysis-generation-analyze.js`: static analysis pipeline for
  files, components, languages, entry points, directories, and dependencies.
- `src/commands/init.js`: adoption flow for `.architecture.yml`, `.diagramrc`,
  and CI sample output.
- `docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md`:
  architecture evidence pack contract.
- `docs/specs/2026-05-02-feat-archscope-product-sharpness-and-agent-ux-spec.md`:
  product sharpness and agent UX contract.
- `docs/specs/2026-05-06-feat-archscope-agent-review-inevitability-spec.md`:
  agent review inevitability contract.
