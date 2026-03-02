---
title: feat: Add PR Architecture Impact Workflow
type: feat
status: active
date: 2026-03-01
---

# ✨ feat: Add PR Architecture Impact Workflow

## Enhancement Summary

**Deepened on:** 2026-03-01  
**Sections enhanced:** 9  
**Research agents used:** local-only deepening pass (repo patterns + test/CI contracts)

### Key Improvements

1. Added explicit **non-mutating git snapshot** strategy to avoid checkout/index side effects.
2. Added deterministic **risk scoring formula** with fixed severity thresholds for stable CI behavior.
3. Added stricter **manifest compatibility contract** to preserve existing `diagram manifest` consumers.
4. Added explicit **CI ref-fetch** expectations for PR contexts.
5. Added explicit **HTML escaping/sanitization** requirements for explainer output.

### New Considerations Discovered

- Existing deep regression coverage can be extended to include PR-impact smoke contracts rather than creating an entirely separate test harness.
- The safest V1 output contract is additive (`prImpact` optional block) instead of modifying existing `diagrams` semantics.
- Risk gating will only be trusted if scoring is deterministic and surfaced in machine-readable output.

## Table of Contents
- [Technical Review Findings](#technical-review-findings)
- [Overview](#overview)
- [Problem Statement / Motivation](#problem-statement--motivation)
- [Research Summary and Decision](#research-summary-and-decision)
- [SpecFlow Analysis (User/System Flows)](#specflow-analysis-usersystem-flows)
- [Proposed Solution](#proposed-solution)
- [Git Snapshot Strategy (Non-Mutating)](#git-snapshot-strategy-non-mutating)
- [CLI Contract (Draft)](#cli-contract-draft)
- [Artifact Contract (Delta Pack)](#artifact-contract-delta-pack)
- [Risk Flag Model](#risk-flag-model)
- [System-Wide Impact](#system-wide-impact)
- [Implementation Phases](#implementation-phases)
- [Alternative Approaches Considered](#alternative-approaches-considered)
- [Acceptance Criteria](#acceptance-criteria)
- [Success Metrics](#success-metrics)
- [Dependencies & Risks](#dependencies--risks)
- [Testing Plan](#testing-plan)
- [Documentation Plan](#documentation-plan)
- [Sources & References](#sources--references)

## Technical Review Findings

### Priority updates captured in this deepening pass

| Priority | Finding | Plan update |
| --- | --- | --- |
| P1 | Git snapshot approach was underspecified | Added non-mutating git object-read strategy |
| P1 | CI refs may be missing in shallow clones | Added explicit `fetch-depth: 0` guidance |
| P1 | Risk severity logic could drift between runs | Added deterministic scoring formula + tie-break |
| P2 | Manifest extension could break existing readers | Constrained to additive optional `prImpact` block |
| P2 | HTML explainer could render unsafe strings | Added explicit escaping/sanitization requirements |

## Overview

Add a new workflow command, `diagram workflow pr`, that turns a PR diff (`base → head`) into a deterministic architecture impact pack:

- Mermaid delta diagram
- Machine-readable JSON delta summary
- Human-readable HTML explainer
- Manifest entry + CI-ready pass/fail signals

This extends diagram-cli from static architecture snapshots into PR-time change intelligence while reusing existing analysis, role-tagging, manifest, and CI patterns.

## Problem Statement / Motivation

Current commands can describe architecture state, but reviewers still have to manually infer **impact of change** from raw diffs. That slows review and increases risk for sensitive paths (auth/security/database).

This feature should make PR risk visible immediately by answering:

- What components changed?
- What dependency edges changed?
- What downstream modules are in blast radius?
- Did this touch sensitive security/data/auth surfaces?

## Research Summary and Decision

### Local findings

- Existing CLI command architecture is centralized and extensible in `/Users/jamiecraik/dev/diagram-cli/src/diagram.js:1272-1785`.
- Existing analysis primitives (imports, role tags, dependency graph material) exist in `/Users/jamiecraik/dev/diagram-cli/src/diagram.js:87-566`.
- Existing manifest contracts are implemented in `/Users/jamiecraik/dev/diagram-cli/src/diagram.js:1077-1139`.
- Existing CI artifact + manifest gating already exists in `/Users/jamiecraik/dev/diagram-cli/.github/workflows/architecture.yml:37-46`.
- Existing scripts already support deep validation patterns in `/Users/jamiecraik/dev/diagram-cli/package.json:10-18`.
- No `docs/solutions/` institutional-learning corpus exists in this repo, so this plan relies on local source patterns and current docs.

### External research decision

Proceeding **without external research**. Rationale: the command is an internal extension of established local patterns (CLI structure, manifest format, CI checks), and no high-risk external API/security protocol change is required in V1.

## SpecFlow Analysis (User/System Flows)

1. **PR author flow**
   - Runs `diagram workflow pr --base <auto-detected-pr-base> --head <auto-detected-pr-head>`.
   - Receives delta artifacts and quick risk verdict.

2. **CI flow**
   - Workflow runs command for pull request refs.
   - CI fails when configured thresholds are exceeded (for example, high-risk auth/security/database changes unless an explicit override is provided).

3. **Reviewer flow**
   - Opens HTML explainer artifact.
   - Uses Mermaid + JSON to inspect edge deltas and blast radius.

4. **No-change flow**
   - Empty or non-code diff still emits deterministic artifacts with explicit "no architecture-impact" status.

## Proposed Solution

Introduce a new `workflow pr` subcommand namespace under `diagram` with an end-to-end local pipeline:

1. Resolve base/head refs and changed file set.
2. Build analyzed snapshots for base and head full graphs.
3. Compute component and edge deltas.
4. Compute blast radius (N-hop downstream impact).
5. Compute risk flags using existing `roleTags` (`auth`, `security`, `database`).
6. Emit Mermaid, JSON, HTML, and manifest entry.
7. Exit with deterministic status codes for CI.

### Delivery strategy (YAGNI-first)

- **V1 (required):** JSON delta artifact + HTML explainer + deterministic risk/exit contract + CI gating.
- **V1.1 (follow-up):** Mermaid delta diagram + optional manifest extension.
- Tune risk formula from V1 evidence before widening surface area.

### Research Insights

**Best Practices:**
- Reuse the single CLI entrypoint pattern already used by `analyze`, `generate`, `all`, `manifest`, and `test` to keep command behavior predictable.
- Keep output deterministic by sorting changed files, component names, and edge tuples before serialization.

**Performance Considerations:**
- Bound blast-radius traversal depth and node count to prevent explosive fanout in monorepos.
- Compute component indexes once per snapshot and reuse for delta + risk phases.

**Implementation Details:**
```js
// file: /Users/jamiecraik/dev/diagram-cli/src/diagram.js
// high-level pipeline (plan pseudocode)
const diff = getChangedFiles(baseRef, headRef, { detectRenames: true });
const baseGraph = analyzeSnapshot(baseRef, { mode: 'full-graph' });
const headGraph = analyzeSnapshot(headRef, { mode: 'full-graph' });
const delta = computeDelta(baseGraph, headGraph);
const risk = scoreRisk(delta, options);
emitArtifacts(delta, risk, options);
```

**Edge Cases:**
- Empty diff should still emit valid artifacts + explicit `noImpact` summary.
- Non-code-only diffs should not fail command; they should produce zero-impact output.

## Git Snapshot Strategy (Non-Mutating)

To avoid mutating local working state, V1 should read both snapshots directly from git objects instead of checkout/reset flows.

- Use read-only git access (`git diff --name-status -M <base>...<head>`, `git show <ref>:<path>`) for snapshot inputs.
- Do not switch branches, alter index, or write to tracked files.
- If refs are missing, fail with explicit diagnostics and exit code `2`.
- Keep all intermediate state in memory or temp files under the output directory.
- Run git subprocesses with explicit timeout/kill policy to avoid hung CI runs.

### Research Insights

**Best Practices:**
- Use `git merge-base <base> <head>` for stable diff baselines in CI and local runs.
- Prefer object reads (`git show <ref>:<path>`) over worktree mutation to avoid developer-environment side effects.

**Performance Considerations:**
- Cache `git cat-file`/`git show` reads per `<ref,path>` pair to avoid repeated subprocess overhead on large PRs.
- Enforce command timeout defaults (for example 10s) with configurable upper bound to prevent stuck jobs.

**Edge Cases:**
- Shallow clones with missing base history must fail fast with actionable guidance.
- Deleted files should remain represented in delta metadata even when snapshot content is unavailable at head.
- Renamed files must be represented as rename events rather than delete+add pairs when detectable.

## CLI Contract (Draft)

```bash
# File: /Users/jamiecraik/dev/diagram-cli/src/diagram.js

diagram workflow pr [path] \
  --base <ref> \
  --head <ref> \
  --output-dir <dir> \
  --manifest-dir <dir> \
  --max-depth <n> \
  --max-nodes <n> \
  --risk-threshold <none|low|medium|high> \
  --fail-on-risk \
  --risk-override-reason <string> \
  --json

Defaults:
  --max-depth 2        # Blast radius traversal depth
  --max-nodes 50       # Max components in blast radius output
  --output-dir .diagram/pr-impact
```

`--risk-override-reason` contract (proposed):
- Allowed only when `--fail-on-risk` would fail due to threshold breach.
- Must be non-empty.
- Must be captured in JSON output metadata for auditability.

### Exit code contract (proposed)

- `0`: success, below threshold
- `1`: success, but failed quality gate (`--fail-on-risk`)
- `2`: usage/config/path/git failure

## Artifact Contract (Delta Pack)

Default output location: `.diagram/pr-impact/`

**V1 outputs:**
- `pr-impact.json` — structured diff, blast radius, risk summary
- `pr-impact.html` — reviewer explainer (offline, no external calls)

**V1.1 outputs:**
- `pr-impact.mmd` — architecture delta Mermaid diagram

Manifest integration:

- Preserve existing top-level manifest fields (`generatedAt`, `rootPath`, `diagramDir`, `diagrams`) exactly.
- Add PR-impact metadata under a new optional top-level field: `prImpact`.
- Keep `diagrams` semantics unchanged so `diagram manifest` remains backward compatible without requiring `prImpact`.
- Treat unknown top-level fields as ignorable in readers.

### Research Insights

**Best Practices:**
- Keep JSON schema versioned from V1 (`schemaVersion`) to support additive evolution.
- Generate HTML from escaped template interpolation only (no runtime script evaluation needed).

**Implementation Details:**
```json
{
  "generatedAt": "2026-03-01T00:00:00.000Z",
  "diagrams": [],
  "prImpact": {
    "version": "1.0",
    "riskLevel": "medium",
    "artifactDir": ".diagram/pr-impact"
  }
}
```

### JSON contract sketch

```json
{
  "schemaVersion": "1.0",
  "base": "<resolved-base-ref-or-sha>",
  "head": "<resolved-head-ref-or-sha>",
  "changedFiles": [],
  "renamedFiles": [],
  "unmodeledChanges": [],
  "changedComponents": [],
  "dependencyEdgeDelta": {
    "added": [],
    "removed": []
  },
  "blastRadius": {
    "depth": 2,
    "truncated": false,
    "omittedCount": 0,
    "impactedComponents": []
  },
  "risk": {
    "score": 3,
    "level": "medium",
    "flags": ["auth_touch", "security_boundary_touch", "database_path_touch"],
    "factors": {
      "authTouch": true,
      "securityBoundaryTouch": false,
      "databasePathTouch": true,
      "blastRadiusSize": 7,
      "blastRadiusDepth": 2,
      "edgeDeltaCount": 4
    },
    "override": {
      "applied": false,
      "reason": null
    }
  }
}
```

## Risk Flag Model

Use current role inference and dependency graph to classify impact:

- `auth_touch`: changed component has `auth` role or directly impacts auth component
- `security_boundary_touch`: changed component has `security` role or crosses integration boundary
- `database_path_touch`: changed component has `database` role or modifies dependency path to database component

Risk severity proposal:

- `low`: one sensitive role touched with shallow blast radius
- `medium`: multiple sensitive roles touched or broad blast radius
- `high`: auth+security+database convergence and/or deep/high-fanout blast radius

### Deterministic scoring formula (V1)

Compute a numeric score and map to severity:

| Factor | Weight | Rationale |
|--------|--------|-----------|
| `auth_touch` | +3 | Highest risk — identity/credential surface |
| `security_boundary_touch` | +3 | Trust boundary crossing — equal priority to auth |
| `database_path_touch` | +2 | Data integrity risk, but often more contained |
| Blast radius size ≥ 5 nodes | +1 | Broad impact amplifies any change |
| Blast radius depth ≥ 2 | +1 | Deep propagation = harder to reason about |
| Edge delta (added + removed) ≥ 10 | +1 | Many edge changes = structural shift |

Severity mapping:

| Score | Severity |
|-------|----------|
| 0-2 | `low` |
| 3-5 | `medium` |
| 6+ | `high` |

### Blast radius bounds (defaults)

| Parameter | Default | Behavior |
|-----------|---------|----------|
| `--max-depth` | 2 | Captures direct dependents + one hop downstream |
| `--max-nodes` | 50 | Caps total components in blast radius output |

When node cap is hit:
- Stop traversal
- Set `blastRadius.truncated: true` in JSON
- Include `blastRadius.omittedCount` so reviewer knows what was cut

### Research Insights

**Best Practices:**
- Keep risk scoring transparent by returning both raw score and contributing factors in JSON.
- Keep threshold policy explicit via CLI flags to avoid hidden CI behavior.

**Performance Considerations:**
- Compute flag contributors during delta traversal to avoid a second full graph walk.

**Edge Cases:**
- Components with multiple roles should contribute once per role, not once per edge, to prevent inflated scores.
- Missing role tags should default to neutral instead of implicit low-risk suppression.

## System-Wide Impact

- **Interaction graph:** Adds a new command path under existing CLI entrypoint; reuses analyzer and manifest utilities.
- **Error propagation:** New failure points at git ref resolution and diff extraction; should map to existing exit-code semantics.
- **State lifecycle risks:** Artifacts are write-only outputs; no persistent DB/state mutation introduced.
- **API surface parity:** Existing commands remain unchanged; `workflow pr` is additive.
- **Integration scenarios:** PR CI on forked refs, empty diffs, large diffs, non-code-only diffs, and protected branch refs.

## Implementation Phases

### Phase 1 — Command surface + contracts

Files:
- `/Users/jamiecraik/dev/diagram-cli/src/diagram.js`
- `/Users/jamiecraik/dev/diagram-cli/README.md`

Tasks:
- [ ] Add `workflow` command group and `pr` subcommand.
- [ ] Add option parsing and validation for `--base`, `--head`, `--output-dir`, `--max-depth`, `--max-nodes`, `--fail-on-risk`, `--risk-override-reason`.
- [ ] Define and document exit code behavior.

Success criteria:
- `node src/diagram.js --help` lists `workflow` and `workflow pr`.
- Invalid/missing ref arguments fail with exit code `2` and clear diagnostics.

### Phase 2 — Git diff ingestion + snapshot preparation

Files:
- `/Users/jamiecraik/dev/diagram-cli/src/diagram.js`
- `/Users/jamiecraik/dev/diagram-cli/src/utils/commands.js` (if helper needed)

Tasks:
- [ ] Resolve and validate refs.
- [ ] Extract changed file paths deterministically using rename-aware git diff (`--name-status -M`).
- [ ] Build base/head full-graph analysis payloads from existing analyzer (scope reporting/output only).
- [ ] Implement git subprocess timeout wrapper with explicit error mapping.

Success criteria:
- Read-only git operations only (no branch/index mutation).
- Same refs produce identical changed-file ordering across runs.
- Rename events are classified consistently in delta JSON.
- Risk/blast-radius scoring includes transitive dependencies beyond directly changed files.
- Timed-out git commands fail with exit code `2` and actionable stderr guidance.

### Phase 3 — Delta engine + blast radius

Files:
- `/Users/jamiecraik/dev/diagram-cli/src/diagram.js`
- (optional extraction) `/Users/jamiecraik/dev/diagram-cli/src/pr-impact.js`

Tasks:
- [ ] Compute changed components.
- [ ] Compute added/removed dependency edges.
- [ ] Compute downstream blast radius with depth and node caps.
- [ ] Add deterministic sorting for stable artifacts.

Success criteria:
- Delta JSON always sorted by `filePath`, then `component`, then edge tuple.
- Blast radius output is bounded by configured depth/node cap.

### Phase 4 — Risk model + renderers + manifest

Files:
- `/Users/jamiecraik/dev/diagram-cli/src/diagram.js`
- `/Users/jamiecraik/dev/diagram-cli/src/formatters/json.js` (only if shared formatting is reused)

Tasks:
- [ ] Implement risk flag and severity calculation with differentiated weights.
- [ ] Generate `pr-impact.json` with score, factors, and blast radius (including truncation metadata).
- [ ] Generate `pr-impact.html` reviewer explainer.
- [ ] Extend manifest output safely without breaking existing consumers.
- [ ] Escape/sanitize all HTML-rendered user-controlled content (paths, file names, component labels, diff snippets).

V1.1 follow-up:
- [ ] Generate Mermaid delta diagram (`pr-impact.mmd`).

Success criteria:
- Risk score, factors, and severity are all present in JSON output.
- `diagram manifest` remains functional when `prImpact` field exists.

### Phase 5 — CI + docs + regression checks

Files:
- `/Users/jamiecraik/dev/diagram-cli/.github/workflows/architecture.yml`
- `/Users/jamiecraik/dev/diagram-cli/package.json`
- `/Users/jamiecraik/dev/diagram-cli/docs/architecture-testing.md`
- `/Users/jamiecraik/dev/diagram-cli/CHANGELOG.md`

Tasks:
- [ ] Add CI invocation for PR-impact artifact generation.
- [ ] Add optional fail gate on risk threshold.
- [ ] Document usage and expected outputs.
- [ ] Add/update deep regression coverage for command behavior.

Success criteria:
- CI uploads `.diagram/pr-impact` artifacts on pull requests.
- Risk threshold gate can fail or pass predictably based on fixture inputs.

## Alternative Approaches Considered

1. **Diff-only reporter (no architecture model)**
   - Pros: fastest to build
   - Cons: low signal; does not reveal graph-level blast radius

2. **Static report only (JSON, no HTML/Mermaid)**
   - Pros: simplest machine integration
   - Cons: weak reviewer UX and lower adoption

3. **Recommended: staged delta pack (V1: JSON + HTML, V1.1: +Mermaid)**
   - Pros: serves CI automation and human review immediately; Mermaid deferred as nice-to-have
   - Cons: moderate implementation scope (deliver in staged rollout)

## Acceptance Criteria

### Functional requirements
- [ ] `diagram workflow pr` command exists and validates required refs.
- [ ] Produces JSON and HTML delta artifacts in deterministic order (Mermaid deferred to V1.1).
- [ ] Captures changed components, edge deltas, and blast radius with depth/node caps.
- [ ] Emits risk flags with differentiated weights (auth/security +3, database +2).
- [ ] Writes manifest entry consumable by CI checks.
- [ ] Captures rename events distinctly from add/delete where git provides rename detection.
- [ ] Includes `unmodeledChanges` in JSON output for changed files outside analyzer scope.
- [ ] Supports explicit risk override reason and records override metadata in JSON.
- [ ] Reports blast radius truncation when node cap is hit.

### Non-functional requirements
- [ ] No network dependency in generation path.
- [ ] Deterministic outputs for same input refs.
- [ ] Handles empty or non-code diffs gracefully.

### Quality gates
- [ ] `npm test` passes.
- [ ] `npm run test:deep` passes with new command coverage.
- [ ] CI workflow can fail on configured risk threshold.

## Success Metrics

- PR reviewers can identify sensitive architectural impact in under 2 minutes from artifacts.
- Reduced manual review comments asking "what is impacted?" for architecture-sensitive PRs.
- High adoption in CI (enabled on primary PR workflow).

## Dependencies & Risks

### Dependencies

- Git refs available in local/CI context.
- Existing analyzer handles relevant changed file types.
- CI checkout must include required refs/history (for example `fetch-depth: 0` or explicit ref fetch).

### Risks

- Ref resolution differences in forked PR CI contexts.
- False-positive/false-negative risk scoring in V1 heuristic model.
- Large diffs causing noisy visuals.
- Missing base refs in CI due to shallow fetch defaults.
- HTML rendering risk if diff/path text is not escaped before writing explainer output.
- Rename misclassification can distort blast-radius and risk summaries.
- Hung git subprocesses can stall CI jobs.

### Mitigations

- Provide clear fallback behavior and explicit diagnostics for missing refs.
- Keep risk logic transparent and documented in JSON output.
- Cap render depth and include summary-first HTML layout.
- Require CI ref-fetch strategy in workflow docs and sample YAML.
- Apply strict HTML escaping for all dynamic strings before template insertion.
- Use `git diff --name-status -M` and persist rename metadata in JSON.
- Enforce git subprocess timeout + kill with explicit exit code `2` mapping.

## Testing Plan

```bash
# File: /Users/jamiecraik/dev/diagram-cli/package.json
npm test
npm run test:deep

# New command smoke checks
node src/diagram.js workflow pr . --base HEAD~1 --head HEAD --output-dir .diagram/pr-impact
node src/diagram.js workflow pr . --base "$(git rev-parse HEAD~1)" --head "$(git rev-parse HEAD)" --output-dir .diagram/pr-impact --fail-on-risk --risk-threshold medium
node src/diagram.js workflow pr . --base HEAD~5 --head HEAD --output-dir .diagram/pr-impact --json
```

CI validation additions (proposal):

```yaml
# File: /Users/jamiecraik/dev/diagram-cli/.github/workflows/architecture.yml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- name: Generate PR architecture impact
  run: node src/diagram.js workflow pr . --base "${{ github.event.pull_request.base.sha }}" --head "${{ github.event.pull_request.head.sha }}" --output-dir .diagram/pr-impact
```

## Documentation Plan

- Update `/Users/jamiecraik/dev/diagram-cli/README.md` command list and examples.
- Add deeper behavior docs to `/Users/jamiecraik/dev/diagram-cli/docs/architecture-testing.md` (or new `docs/pr-impact.md` if scope grows).
- Add release note entry to `/Users/jamiecraik/dev/diagram-cli/CHANGELOG.md` under Unreleased.

## Sources & References

### Internal references

- CLI command registration: `/Users/jamiecraik/dev/diagram-cli/src/diagram.js:1272-1785`
- Analyzer/roles/deps primitives: `/Users/jamiecraik/dev/diagram-cli/src/diagram.js:87-566`
- Manifest helpers: `/Users/jamiecraik/dev/diagram-cli/src/diagram.js:1077-1139`
- Command utility helpers: `/Users/jamiecraik/dev/diagram-cli/src/utils/commands.js:1-47`
- Existing architecture CI: `/Users/jamiecraik/dev/diagram-cli/.github/workflows/architecture.yml:1-78`
- Existing scripts/contracts: `/Users/jamiecraik/dev/diagram-cli/package.json:10-18`
- Deep regression baseline: `/Users/jamiecraik/dev/diagram-cli/scripts/deep-regression.js:1-260`
- Architecture testing documentation: `/Users/jamiecraik/dev/diagram-cli/docs/architecture-testing.md:1-220`

### Related planning context

- Broader local-first workflow plan: `/Users/jamiecraik/dev/diagram-cli/docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
