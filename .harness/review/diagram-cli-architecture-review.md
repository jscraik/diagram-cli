---
schema_version: 2
repo: diagram-cli
artifact_type: architecture-cognition-review
status: reviewed-current
last_reviewed: 2026-05-13
review_mode: he-plan-architecture-review
review_scope: repository architecture, skills, governance, evidence protocol, ERD source-kind strategy
reference_lenses:
  - The Pragmatic Programmer
  - A Philosophy of Software Design
  - Extreme Programming Explained
  - Domain-Driven Design
  - Five Lines of Code
confidence: strong_candidate_with_validation_gaps
confidence_percent: 89
---

# diagram-cli Architecture Review

## Table of Contents

- [Review Method](#review-method)
- [Executive Summary](#executive-summary)
- [Architectural Risk Assessment](#architectural-risk-assessment)
- [Repository Cognition Review](#repository-cognition-review)
- [Complexity Audit](#complexity-audit)
- [Deep vs Shallow Module Analysis](#deep-vs-shallow-module-analysis)
- [Domain Integrity Review](#domain-integrity-review)
- [Skill/Plugin Architecture Review](#skillplugin-architecture-review)
- [Agent-Native Capability Review](#agent-native-capability-review)
- [Governance & Workflow Review](#governance--workflow-review)
- [Refactor Recommendations](#refactor-recommendations)
- [Anti-Patterns Identified](#anti-patterns-identified)
- [Drift Risks](#drift-risks)
- [Technical Debt Hotspots](#technical-debt-hotspots)
- [Strategic Review](#strategic-review)
- [Recommended Simplifications](#recommended-simplifications)
- [Recommended Deletions](#recommended-deletions)
- [Recommended Core Investments](#recommended-core-investments)
- [Long-Term Scalability Risks](#long-term-scalability-risks)
- [Moat Analysis](#moat-analysis)
- [Competitive Replication Risk](#competitive-replication-risk)
- [Evidence & Traceability Matrix](#evidence--traceability-matrix)
- [Validation Evidence](#validation-evidence)
- [Open Corrections / Review Loop](#open-corrections--review-loop)

## Review Method

This review inspected the live repository as of 2026-05-13. It does not treat
README positioning as proof. The review used the named engineering books as
evaluation lenses only: abstraction depth, change amplification, domain
language, feedback loops, refactoring pressure, pragmatic automation, and
agent-native operability.

Scope inspected:

- Source entrypoints, command registration, scan/evidence writers, PR workflow
  code, ERD extraction, confidence gates, and artifact contracts.
- Tests, fixtures, package scripts, deep-regression runner, machine output
  coverage, migration readiness, and validation wrappers.
- Governance surfaces: `AGENTS.md`, `docs/agents/**`, `harness.contract.json`,
  `.harness/ci-required-checks.json`, `.github/workflows/**`, repo-local
  `.codex/skills/**`, Makefile targets, and harness planning artifacts.
- Current harness context for JSC-318/JSC-319 contract-schema ERD work.

Evidence classes used below:

- Fact: directly observed in current files or command output.
- Strong inference: follows from multiple current facts but is not a runtime
  proof.
- Speculation: strategically plausible but not proven in this checkout.

Limits:

- This is not a line-by-line audit of every file. It is a repository-wide
  architecture inspection with focused reads of the highest-leverage control
  surfaces.
- Live GitHub branch protection, Linear state, npm registry state, and external
  security scanner state were not queried by this review.
- `request_user_input` is not available in the active Default-mode tool context;
  interactive correction capture remains blocked until a Plan-mode review loop
  or normal chat follow-up.

## Executive Summary

Direct verdict:

- The project is coherent when understood as an architecture evidence protocol
  for humans and AI coding agents. `archscope` is the correct product identity;
  `@brainwav/diagram` and the compatibility `diagram` command are migration
  baggage, not the strategic center.
- The strongest architecture is the evidence pack path: `scan`, `agent`,
  `agent-pr`, manifest, brief, report, agent context, PR impact, deterministic
  machine envelopes, and explicit partial-evidence semantics.
- The current JSC-318/JSC-319 ERD direction is strategically important. Adding
  contract-schema ERDs moves the product from "diagram generator" toward
  "repository cognition over governing contracts", which is a better moat.
- The implementation is ahead of the governance layer in discipline. Tests,
  schema contracts, and scan artifacts are concrete. CI/check policy still has
  name drift and no-op validation gates that can make assurance look stronger
  than it is.
- The biggest technical risk is giant orchestration files. `src/commands/scan.js`,
  `src/workflow/pr-impact.js`, `src/workflow/pr-command.js`, and
  `scripts/codex-preflight.sh` are all large enough that agents will struggle
  to reason locally without regression tests.
- The repo is genuinely agent-native in the runtime artifact protocol. It is
  not yet agent-native enough in governance hygiene, because an agent must
  reconcile several policy surfaces before knowing which check names and gates
  are real.
- The moat is not Mermaid diagrams, CLI commands, or having many harness docs.
  The real moat is disciplined, repeatable, machine-readable architecture
  evidence that agents and humans both trust before editing or approving code.
  That moat is real but still fragile.

Blunt conclusion:

This is a serious project with a real center. It also has too much ceremony
around that center. Protect the evidence protocol, source-kind extraction, and
agent contracts. Simplify or delete anything that makes the repo feel safer
without producing executable proof.

## Architectural Risk Assessment

| Risk | Severity | Evidence | Architectural Impact | Confidence | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CI/check policy drift | High | Drift report shows workflow-only `dependency-review`/`actions-pinning` and policy-only `dependency-scan`/`orb-pinning`/`docs-gate`/`security-scan`/`CodeRabbit`; see `.harness/ci-required-checks.json`, `harness.contract.json`, `.github/workflows/pr-pipeline.yml` | Breaks trust in required-check guidance and can mislead agents/reviewers | Fact | Resolve check-name parity or document intentional mappings in one source-of-truth change |
| No-op gates look like assurance | High | `package.json` lines for `lint`, `typecheck`, and `docs:lint` emit `not_configured`; CI still runs `lint` and `typecheck` jobs | Reviewers may count placeholder greens as quality gates | Fact | Keep machine-readable no-op honesty, but label them non-substantive everywhere they appear as gates |
| Large orchestrators concentrate change risk | High | `wc -l`: `scan.js` 844, `pr-impact.js` 848, `pr-command.js` 694, `codex-preflight.sh` 860 | Small edits can have hidden temporal effects; agents need too much context | Fact | Extract narrow step objects only around existing contract boundaries; add focused regression tests first |
| ERD source-kind semantics can blur domains | High | Current `SOURCE_PRECEDENCE` is `['prisma', 'sql']`; JSC-319 spec requires JSON Schema after SQL | Contract schemas and database schemas can be accidentally treated as one model | Fact/strong inference | Keep source-specific parsing before `normalizeErdModel`; make source-kind metadata explicit |
| Governance surface outgrows contributor value | Medium | `harness.contract.json` requires broad tool/check policy; repo has `.codex/skills`, `.harness/**`, `docs/agents/**`, Makefile, workflows, and generated `.diagram/**` | New contributors and agents pay high orientation cost | Strong inference | Separate consumer runtime, maintainer governance, and harness-control-plane docs |
| Product language still has migration friction | Medium | README says canonical `archscope`, package is `@brainwav/diagram`, compatibility bin is `diagram` | Searchability, support, and onboarding remain split | Fact | Keep migration policy, but make `archscope` first in docs, errors, examples, and agent artifacts |
| Static analysis output may be over-trusted | Medium | PR impact and diagram generation infer architecture from file paths/imports/heuristics | False confidence if used as semantic proof | Strong inference | Preserve confidence/provenance metadata and require tests for each new inference class |
| `.harness` cognition artifacts are powerful but local | Medium | Current `.harness/review`, `.harness/specs`, `.harness/strategy`, `.harness/refactors`, `.harness/linear` hold critical planning context | Artifact-driven process may not travel cleanly unless intentionally committed or mirrored | Fact | Treat `.harness` as canonical local planning state and decide which artifacts become committed evidence |

## Repository Cognition Review

What the repo gets right:

- The README now names `archscope` as the canonical identity and explains the
  evidence pack before optional media commands.
- `AGENTS.md` and `docs/agents/03-validation.md` describe command contracts,
  validation truthfulness, and skill routing.
- `src/schema/agent-context-v1.schema.json` gives the agent context a concrete
  contract instead of relying on prompt prose.
- `src/artifacts/evidence-manifest.js` and `src/artifacts/agent-context.js`
  encode read order, written/deferred/failed artifacts, partial evidence, and
  next safe actions.
- Tests exercise subprocess CLI behavior, generated artifacts, scan failures,
  PR evidence composition, machine envelopes, migration readiness, and ERD
  extraction.
- Harness artifacts now hold a useful JSC-318/JSC-319 cognition trail:
  strategy, refactor program, Linear plan, spec, and technical review.

Where cognition is expensive:

- There are many truth surfaces. An agent must reconcile `AGENTS.md`,
  `docs/agents/**`, `.codex/skills/**`, `package.json`, Makefile, workflows,
  harness contracts, `.harness/**`, `.diagram/**`, and README before acting.
- Some policy surfaces are not aligned with live workflow names. This forces
  agents into meta-validation before product work.
- The project name stack still leaks old and new language: `diagram-cli`,
  `@brainwav/diagram`, `diagram`, `archscope`, `.diagram`, and `architecture
  evidence`.

Architecture judgement:

- The repo supports high-quality reasoning once the right artifact is found.
- It does not yet minimize the cost of finding the right artifact.
- The best future cognition contract is: read `README.md` for product,
  `AGENTS.md` for work rules, `.diagram/manifest.json` for generated evidence,
  `.harness/**` for admitted planning state, and repo-local skills only when
  their trigger fires.

## Complexity Audit

Intentional complexity:

- Evidence-pack generation is justified. The product needs artifact status,
  read order, human/agent outputs, machine envelopes, and partial evidence.
- PR impact analysis is justified. Pull requests are where architecture evidence
  becomes operationally valuable.
- Migration policy is justified while `archscope` and `diagram` coexist.
- ERD confidence and source-kind expansion are justified because an empty ERD
  can actively mislead agents.
- Repo-local skills are justified when they encode repeated failure modes:
  validation drift, CI name parity, config drift, and MCP startup triage.

Accidental or weak complexity:

- CI check-name drift is accidental. It adds no product value.
- No-op gates are only acceptable when clearly labelled as `not_configured`.
  Treating them as required quality evidence is accidental complexity.
- Makefile target `diagrams-check` references
  `scripts/check-diagram-freshness.sh`, which is absent in the current checkout.
- The governance/tooling envelope lists far more tools than the CLI runtime
  requires, which can make first-run adoption feel heavier than the product.
- The older context command and newer scan/agent evidence pack can create two
  agent-orientation paths unless the docs keep their roles distinct.

Refactoring pressure:

- Large command/workflow files hide sequence invariants. The right response is
  not aesthetic splitting. Split only where tests can prove stable behavior:
  source discovery, artifact write state, PR risk classification, manifest
  construction, and machine envelope generation.

## Deep vs Shallow Module Analysis

Deep modules:

| Module | Why It Is Deep | Evidence | Risk |
| --- | --- | --- | --- |
| `src/artifacts/evidence-manifest.js` | Small API hides artifact status/read-order policy | `artifactReadOrder`, `primaryHumanArtifact`, `primaryAgentArtifact`, `actionableMissingArtifacts` | Must remain the single source for artifact status semantics |
| `src/artifacts/agent-context.js` | Converts implementation evidence into an agent operating contract | `readFirst`, `safeToSkip`, `beforeEditing`, `partialEvidence`, `nextSafeAction` | Can become prompt sprawl if free text grows unchecked |
| `src/schema/agent-context-v1.schema.json` | Stable machine boundary for agent handoff | Tests assert required v1 fields | Schema changes need migration discipline |
| `src/schema/erd-model.js` | Normalizes entities, attributes, relationships, and Mermaid output | Common model for SQL/Prisma and future JSON Schema | Collision policy is not yet explicit for mixed source kinds |
| `src/schema/erd-confidence.js` | Encodes a simple publishability gate for inferred ERDs | Tests cover thresholds at 0.5, 0.8, and above 0.8 | Needs source-kind awareness only if JSON Schema changes confidence semantics |
| `.diagram/contracts/machine-command-coverage.json` | Turns command discoverability into a checkable contract | Tested by machine command coverage tests | Must be updated with command surface changes |

Shallow or risky modules:

| Module / Surface | Why It Is Shallow or Risky | Recommendation |
| --- | --- | --- |
| `src/commands/agent.js`, `src/commands/agent-pr.js` | Thin wrappers over `scan`; acceptable only while they stay thin | Keep wrappers declarative; do not duplicate scan logic |
| `src/analyzers/default-analyzer.js` | Extension seam with little depth today | Keep it small until real analyzer plugins exist |
| `package.json` placeholder scripts | Honest no-op scripts, not real validation | Keep output explicit; avoid calling them assurance gates |
| `harness.contract.json` check lists | Policy abstraction currently leaks inaccurate workflow names | Repair or document mapping |
| Broad tooling policy | Pass-through governance over many tools | Split maintainer-only from consumer runtime needs |

Abstraction-quality verdict:

- The evidence protocol abstractions are deep and worth protecting.
- The governance abstractions are mixed. Some encode real learned workflow; some
  launder uncertainty into configuration.

## Domain Integrity Review

The actual domain is not "draw diagrams". The domain is:

> Produce trustworthy architecture evidence that humans and AI coding agents can
> read before making or approving changes.

Bounded contexts:

| Context | Core Concepts | Owning Surfaces |
| --- | --- | --- |
| Evidence Pack | manifest, brief, report, agent-context, artifact status, read order | `src/commands/scan.js`, `src/artifacts/**`, `test/scan-*` |
| Static Architecture Analysis | components, imports, roles, supported diagram types | `src/core/**`, `src/analyzers/**`, `src/graph.js` |
| ERD / Schema Evidence | entities, attributes, relationships, provenance, source precedence, confidence | `src/schema/**`, `src/core/analysis-generation-diagrams-erd.js`, `test/erd-*` |
| PR Impact | changed components, blast radius, risk, reviewer checks | `src/workflow/**`, `test/pr-*`, `test/workflow-*` |
| Migration / Identity | `archscope`, compatibility `diagram`, release evidence, finalization policy | `src/diagram.js`, `src/migration/**`, `docs/migration/**` |
| Governance / Harness | validation, CI parity, config drift, local memory, review requirements | `AGENTS.md`, `docs/agents/**`, `.codex/skills/**`, scripts |

Language that is stable:

- `manifest`, `brief`, `agent-context`, `artifactReadOrder`, `partialEvidence`,
  `nextSafeAction`, `pr-impact`, `terminalClass`, `provenance`, `confidence`.

Language that is still unstable:

- `diagram` vs `archscope` vs `@brainwav/diagram`.
- `context pack` vs `agent context` vs `.diagram/context`.
- `dependency-review` vs `dependency-scan`.
- `actions-pinning` vs `orb-pinning`.
- `security-scan` as policy name without a matching current PR pipeline job.

DDD judgement:

- The domain model is coherent but still being distilled.
- JSC-319 is a good domain move because it separates database schema evidence
  from logical contract schema evidence while feeding a common ERD model.
- The next language cleanup should make "source kind" a first-class term across
  ERD metadata, tests, and user/operator docs.

## Skill/Plugin Architecture Review

This repository has repo-local skills, not a large external plugin
architecture. Claims about a broad plugin ecosystem would be unsupported.

Observed repo-local skills:

- `.codex/skills/config-drift-guard`
- `.codex/skills/validation-contract-check`
- `.codex/skills/ci-check-name-parity`
- `.codex/skills/mcp-startup-triage`

Strengths:

- Skills have bounded purposes, triggers, validation commands, constraints, and
  anti-patterns.
- `validation-contract-check` correctly tells agents to derive truth from
  `package.json`, Makefile, and live scripts before rewriting docs.
- `ci-check-name-parity` provides an executable drift report and explicitly
  treats check-name drift as a contract bug.
- The skill set is small enough to be composable.

Weaknesses:

- Skill output is only preventive when the skill is invoked. CI does not appear
  to run the same parity report as a hard gate.
- The skills are stronger than the policy surfaces they guard. That means the
  repo can diagnose drift faster than it currently prevents drift.
- The skill names are operationally clear for agents but still require an
  instruction router. A contributor reading only README would not know about
  them.

Verdict:

- Repo-local skills are a real agent-native asset.
- They should remain narrow. Do not turn them into a second product layer.

## Agent-Native Capability Review

Genuine agent-native strengths:

- The CLI has explicit agent entrypoints: `archscope agent` and
  `archscope agent-pr`.
- The scan path writes manifest-first evidence and tells agents to read only
  artifacts whose status is `written`.
- Machine output uses `--format json`; `--json` is compatibility-normalized.
- Tests assert deterministic machine envelopes, agent-context required fields,
  artifact read order, PR evidence composition, and failure behavior.
- Operational friction categories normalize common blockers into actionable
  next steps.
- The JSC-319 spec explicitly blocks remote `$ref` resolution and requires
  deterministic diagnostics, which is exactly the kind of safety boundary agents
  need.

Anti-agent patterns:

- Large orchestrators make local reasoning expensive.
- CI/policy drift forces an agent to validate governance before trusting it.
- The no-op validation scripts are honest individually but misleading if an
  agent reads only required-check names.
- `.harness/**` contains important current work but is easy to miss if the
  agent only follows README or generated `.diagram/**`.

Verdict:

- The runtime product is genuinely agent-native.
- The repository operations layer is agent-assisted but not yet frictionless.
- The biggest agent-native upgrade is not another prompt. It is policy parity,
  smaller orchestrator boundaries, and stable source-kind metadata.

## Governance & Workflow Review

What works:

- `npm test` is substantive and passed with 196 tests.
- `npm run test:deep` is substantive and passed with `deep-regression: OK`.
- `docs/agents/03-validation.md` correctly names `npm test`,
  `npm run test:deep`, and `bash scripts/verify-work.sh --fast`.
- The README truthfully says `lint`, `typecheck`, and `docs:lint` are
  intentionally `not_configured`.
- Release/migration readiness exists and is covered by deep regression.
- GitHub Actions in the PR pipeline pin third-party actions by full SHA in the
  inspected workflow.

What does not work:

- Check-name parity is broken. The parity script reports workflow-only
  `actions-pinning`, `consistency-drift-advisory`, `dependency-review`, and
  policy-only `CodeRabbit`, `dependency-scan`, `docs-gate`, `orb-pinning`,
  `security-scan`.
- Makefile `diagrams-check` points to a missing script.
- `harness.contract.json` presents `security-scan`, `dependency-scan`, and
  `orb-pinning` as required checks even though the observed PR pipeline names
  differ.
- `lint` and `typecheck` jobs run placeholder scripts. That is acceptable only
  if branch policy and review templates treat them as "surface present, no
  substantive signal".

Governance verdict:

- The governance system is valuable but too willing to record desired controls
  before they are live, aligned controls.
- Policy should become more boring: fewer names, fewer surfaces, stronger
  parity.

## Refactor Recommendations

Priority order:

1. Fix CI/check-name parity before adding more governance. Either rename the
   live jobs, update policy names, or document an explicit mapping that the
   parity script recognizes.
2. Repair or remove `Makefile` `diagrams-check` until
   `scripts/check-diagram-freshness.sh` exists.
3. Keep JSC-319 JSON Schema extraction isolated in `src/schema/erd-extractor.js`
   and tests first. Do not rewrite `src/schema/erd-model.js` unless the fixture
   proves a normalization gap.
4. Split `src/commands/scan.js` around artifact write phases only if tests pin
   current behavior first. Candidate extraction: PR evidence invocation,
   manifest rebuild/write cycle, and final machine/text output.
5. Split `src/workflow/pr-impact.js` by calculation boundary: git delta, risk
   scoring, blast radius traversal, and render/summary generation.
6. Keep agent wrappers shallow. Add behavior to `scan`; let wrappers pass
   metadata.
7. Introduce source-kind metadata for ERD output as additive metadata, not as a
   new machine envelope shape.

## Anti-Patterns Identified

| Anti-Pattern | Evidence | Why It Matters | Fix |
| --- | --- | --- | --- |
| Assurance theater | Required-check names that do not match live jobs; no-op quality scripts | Makes governance look stronger than it is | Align check names and label no-op gates as non-substantive |
| God command | `src/commands/scan.js` at 844 lines | Artifact lifecycle, PR evidence, output, and failure handling are coupled | Extract contract-backed phases after tests |
| Policy/config sprawl | Many overlapping docs/contracts/skills/scripts | Agents spend context on routing before work | Reduce source-of-truth count and document hierarchy |
| Migration language leakage | `archscope`, `diagram`, `@brainwav/diagram`, `.diagram` | Weakens product recall and support clarity | Keep compatibility but make active guidance canonical-first |
| Inference without enough provenance | Static analysis and ERD relationship inference | Can appear more certain than it is | Carry provenance/confidence into artifacts and tests |
| Missing-script target | `Makefile` calls absent `scripts/check-diagram-freshness.sh` | Broken windows and failed local workflows | Restore script or delete target |

## Drift Risks

- CI policy drift: already present.
- ERD source-kind drift: likely if JSON Schema, YAML, TypeScript, SQL, and
  Prisma are all pushed through one parser path.
- Generated artifact truth drift: risk that an empty or low-confidence ERD
  exists on disk and appears complete.
- Naming drift: `diagram` compatibility may continue leaking into new docs if
  not policed.
- Harness artifact drift: `.harness/**` can become a parallel planning system
  unless artifacts are admitted, superseded, or archived clearly.
- Tooling-envelope drift: broad required-tool policy may diverge from actual
  contributor needs.

## Technical Debt Hotspots

| Hotspot | Evidence | Debt Type | Recommended Action |
| --- | --- | --- | --- |
| `src/commands/scan.js` | 844 lines; owns analysis, artifact writes, manifest rebuilds, PR evidence, output | Structural/temporal coupling | Extract tested internal helpers by lifecycle phase |
| `src/workflow/pr-impact.js` | 848 lines; PR analysis and rendering concerns | Structural coupling | Split compute from render and summary |
| `src/workflow/pr-command.js` | 694 lines; CLI command orchestration | Command complexity | Keep command layer thin; move domain calculations down |
| `scripts/codex-preflight.sh` | 860 lines; local workflow environment gate | Shell complexity | Keep stable unless contract changes; add shell tests before refactor |
| `src/schema/erd-extractor.js` | 504 lines before JSON Schema support | Parser growth risk | Move JSON Schema parser helpers behind source-kind boundary if it grows |
| `harness.contract.json` | Broad required checks/tooling policy | Governance debt | Reconcile with live workflows and docs |
| `Makefile` | Missing `diagrams-check` script | Broken local target | Repair or delete |

## Strategic Review

What I actually think:

- The project is coherent. It knows what it wants to become: a pre-edit and
  pre-review architecture evidence protocol for agents and humans.
- The complexity is partly justified. The evidence pack, manifest, PR impact,
  deterministic output, and partial-evidence model are worth the cost.
- The complexity is also partly self-inflicted. Governance has started to
  behave like product surface area instead of product support.
- The architecture is pragmatic in the runtime path and too ceremonial in the
  policy path.
- The abstraction quality is uneven. Artifact contracts are deep; policy lists
  and some command wrappers are shallow.
- The system is not overbuilt at the core. It is over-surrounded.
- The real problem is real: coding agents and reviewers need trustworthy
  architecture context before they touch a repo.
- Governance helps when it catches drift. Governance slows things down when it
  names checks that are not actually live under the same names.
- The smallest compelling version is: `archscope agent-pr`, manifest-first
  evidence pack, PR impact, agent context schema, ERD/source-kind extraction,
  and a small set of honest validators.
- Developers could adopt this if first-run setup is lighter than the maintainer
  harness. If adoption requires understanding the full governance universe,
  adoption will suffer.
- If the project fails, it will fail by turning into an elaborate local ritual
  that is harder than just reading files.
- If it succeeds, it will succeed because agents and reviewers form the habit:
  run Archscope first, read manifest first, trust only written evidence.

## Recommended Simplifications

- Collapse public product docs around three commands: `agent-pr`, `agent`,
  `scan`.
- Treat media commands as advanced/secondary unless a user explicitly asks for
  video or animated output.
- Document one validation truth table that says: substantive, no-op but honest,
  optional, external/CI-only.
- Keep `.harness` artifacts as planning state, but add status discipline:
  current, superseded, historical, or applied.
- Separate consumer install/runtime requirements from maintainer governance
  requirements.
- Prefer additive metadata over new artifact types for JSC-319/P0.
- Keep repo-local skills small and avoid creating a skill for every recurring
  preference.

## Recommended Deletions

Delete or demote only after confirming ownership:

- Delete or repair `Makefile` `diagrams-check`; the referenced script is absent.
- Delete stale required-check names or replace them with current names:
  `dependency-scan`, `orb-pinning`, `docs-gate`, `security-scan`, `CodeRabbit`
  if they are not intentionally external checks.
- Demote `lint` and `typecheck` from substantive gate language until real tools
  exist.
- Demote optional advanced media from first-run product positioning.
- Delete duplicate architecture/process docs when a newer `.harness` artifact
  or `docs/specs/**` file has clearly superseded them.

## Recommended Core Investments

- ERD source-kind architecture: JSON Schema first, YAML/TypeScript only after
  proof and separate admission.
- Artifact provenance and confidence metadata, especially for inferred
  relationships and placeholder diagrams.
- Agent-context schema stability and compatibility tests.
- CI/check-name parity as a hard governance invariant.
- PR impact quality: fewer false positives, clearer blast-radius provenance,
  and accessible HTML/report output.
- Smaller lifecycle boundaries in scan and PR workflow code.
- A "consumer first run" path that does not require harness literacy.

## Long-Term Scalability Risks

- Orchestration files keep growing because new behavior lands in the command
  path instead of a tested domain module.
- Source-kind support turns into parser sprawl without clear boundaries for
  SQL, Prisma, JSON Schema, YAML, TypeScript, and config-generated contracts.
- Governance keeps adding desired checks faster than live CI and docs can align.
- Agent context grows into a token-heavy report instead of a concise contract.
- The compatibility window for `diagram` remains open long enough that the
  canonical identity never fully wins.
- `.harness` becomes required cultural knowledge but not a stable product or
  contributor interface.

## Moat Analysis

Actual moat:

- A trustworthy, agent-readable evidence protocol that makes architecture state,
  PR blast radius, artifact status, and next safe actions explicit before
  humans or agents edit code.

Is the moat durable?

- Potentially yes, but only if the protocol becomes habitual and portable.
  The durable piece is not code volume. It is trust discipline plus repeated
  use across real repos.

Is the moat measurable?

- Partly. Useful metrics would include: PRs with Archscope evidence attached,
  false-positive/false-negative PR impact findings, agent edit success after
  reading manifest, number of blocked/degraded artifacts correctly reported,
  time-to-orientation for a new repo, and CI parity drift frequency.

Is the moat merely complexity?

- No at the core; yes around some governance. The evidence protocol is
  strategically meaningful. Mismatched required checks and broad tool lists are
  not moat.

Could a smaller competitor rebuild this quickly?

- They could rebuild a diagram CLI quickly. They could rebuild a basic
  manifest quickly. They would struggle more to rebuild the operational habit,
  edge-case taxonomy, migration evidence, agent-context contract, and learned
  review workflow if this project keeps using them in real work.

Strategically defensible parts:

- Manifest-first artifact protocol.
- Agent-context schema and partial-evidence semantics.
- PR impact plus reviewer checks.
- Source-kind ERD extraction with provenance/confidence.
- Validation truthfulness and drift detection, once parity is fixed.

Parts that only feel sophisticated:

- Check names that do not map to live jobs.
- No-op gates described as required quality.
- Broad maintainer tooling requirements presented like product requirements.
- Extra planning artifacts that do not feed implementation, validation, or
  review decisions.

What should be aggressively protected:

- Deterministic machine envelopes.
- Artifact status/read-order semantics.
- Local-only, no-network parser safety for schema extraction.
- `archscope` canonical identity.
- Tests that run the CLI as users and agents use it.
- Evidence claims that distinguish written, deferred, failed, partial, and
  unsupported states.

What should be simplified because it weakens the moat:

- Governance drift.
- Tooling bloat.
- Optional media prominence.
- Duplicate docs that make the source of truth unclear.
- Orchestrators that require whole-file reasoning for small changes.

Likely false moat assumptions:

- "More generated artifacts means more defensibility."
- "More governance files means more trust."
- "Mermaid output itself is hard to replicate."
- "Agent-native means prompts around code rather than machine-readable
  contracts."

If this project succeeded massively:

- Competitors would struggle because the value would come from trust,
  repeatable evidence, CI/review integration, and agent habit formation across
  repositories, not because any one parser is impossible.

If competitors could catch up quickly:

- It would be because this repo failed to simplify the public contract and let
  the core protocol disappear under local ceremony.

## Competitive Replication Risk

| Capability | Replication Difficulty | Why |
| --- | --- | --- |
| Mermaid diagram generation | Low | Many libraries and LLMs can generate diagrams |
| CLI command shell | Low | Straightforward engineering |
| Static import analysis | Medium | Needs language edge cases but common patterns exist |
| Manifest-first evidence pack | Medium | Easy to copy superficially, harder to make trusted |
| PR blast-radius evidence | Medium-high | Requires useful heuristics, rendering, and reviewer adoption |
| Agent-context contract | Medium-high | Requires schema discipline and real agent workflow feedback |
| Source-kind ERD provenance/confidence | Medium-high | Requires careful parser scope and trust semantics |
| Governance/CI drift prevention | Medium | Mostly operational discipline |
| Adoption habit among agents/reviewers | High | Requires distribution, trust, examples, and repetition |

Replication verdict:

- The technical pieces are individually replicable.
- The durable differentiation is the combined evidence discipline and habit
  loop. That becomes defensible only if the repo keeps reducing friction.

## Evidence & Traceability Matrix

| Claim | Classification | Evidence | Impact | Confidence |
| --- | --- | --- | --- | --- |
| `archscope` is canonical while `diagram` remains compatibility | Fact | `README.md`; `src/diagram.js` constants and bin config in `package.json` | Product identity and migration strategy | High |
| Evidence pack is the product core | Fact/strong inference | `README.md` evidence-pack sections; `src/commands/scan.js`; `src/artifacts/**`; tests `scan-*` and `agent-context-*` | Defines core investment | High |
| Agent-native runtime is real | Fact | Agent context schema, manifest read order, subprocess tests, deterministic machine output tests | Supports strategic positioning | High |
| Governance drift exists | Fact | `bash .codex/skills/ci-check-name-parity/scripts/report_check_name_drift.sh` output | Blocks higher confidence in operational readiness | High |
| No-op gates are explicitly configured | Fact | `package.json` `lint`, `typecheck`, `docs:lint`; README validation truthfulness | Prevents false test claims but weakens gate value | High |
| ERD currently supports only Prisma and SQL | Fact | `src/schema/erd-extractor.js` `SOURCE_PRECEDENCE`, `SOURCE_FILE_PATTERNS`, `SCHEMA_PARSERS`; tests | Justifies JSC-319 | High |
| JSON Schema ERD support is planned, not implemented | Fact | `.harness/specs/2026-05-13-JSC-319-json-schema-logical-erd-spec.md`; current source still lacks `json-schema` | Prevents overclaiming | High |
| Orchestrators are high-risk | Fact/strong inference | `wc -l` line counts and responsibility inspection | Refactor priority | High |
| The moat is evidence habit, not diagrams | Strong inference | Product surfaces, tests, agent context, planning artifacts | Strategic focus | Medium-high |
| Adoption will suffer if governance remains heavy | Strong inference | Setup/docs/governance breadth compared to runtime needs | Product risk | Medium |
| Current external branch protection matches local policy | Blocked | No live GitHub settings queried | Cannot claim production enforcement | Low |

## Validation Evidence

Fresh checks run during this review:

| Check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| Repository tests | pass | `npm test` -> 196 passing | Warnings about unknown npm project config keys were emitted, but tests passed |
| Deep regression | pass | `npm run test:deep` -> `deep-regression: OK` | Exercises packaged files, migration readiness, CLI behavior, and generated outputs |
| CI check-name parity report | fail | `bash .codex/skills/ci-check-name-parity/scripts/report_check_name_drift.sh` completed and reported workflow/policy mismatch | Script execution succeeded; architectural result is drift |
| Docs/governance wrapper after this artifact edit | pass | `bash scripts/verify-work.sh --fast` passed | Includes preflight, placeholder `lint`/`typecheck` truth, related-test check, migration readiness, and hook-governance checks |
| Interactive review prompt | blocked | `request_user_input` is Plan-mode only in the active tool context | Use normal chat follow-up for corrections in this mode |

## Open Corrections / Review Loop

Initial confidence: 78%. The previous architecture review was useful but stale
and did not account for JSC-319, current CI parity drift, or current validation
results.

After rewrite confidence: 89%. Confidence improved because current repository
evidence, validation output, source-kind direction, governance drift, and
post-edit wrapper validation were all incorporated.

Remaining blockers to confidence above 90%:

- Resolve or formally document CI/check-name drift.
- Decide whether `.harness/review/diagram-cli-architecture-review.md` is meant
  to be committed as canonical architecture cognition or kept local.
- Query live branch protection/GitHub required checks if production enforcement
  claims are needed.
- After JSC-319 implementation, rerun this review section against actual JSON
  Schema source support instead of the current spec-only state.

Loop outcome:

- `optimal within available evidence` for local architecture cognition.
- `blocked by unavailable interactive review tool` for the requested
  `request_user_input` correction loop in this Default-mode execution context.
