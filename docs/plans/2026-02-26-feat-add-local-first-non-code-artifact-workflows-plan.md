---
title: feat: Add local-first non-code artifact workflows
type: feat
status: active
date: 2026-02-26
origin: docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md
---

# ✨ feat: Add local-first non-code artifact workflows

## Enhancement Summary

**Deepened on:** 2026-02-26

**Sections enhanced:** 13

**Research agents used:**
- `cli-spec`, `docs-expert`, `writing-plans`, `systematic-debugging`
- Context7 (Commander, Mermaid, YAML)
- Web research (CLI/Node/path-security/`git diff` references)
- Local discovery in repo source and prior docs/plans

**Key Improvements:**
1. Expanded design around CLI behavior, command surface consistency, and output contracts.
2. Added concrete, production-safe security and portability patterns for path handling and input parsing.
3. Strengthened implementation guidance for deterministic artifact generation, testability, and acceptance gates.

**New Considerations Discovered:**
- No `docs/solutions/` corpus exists in this repo; related institutional learning must be pulled from broader plan artifacts.
- Existing code already has strong baseline output/error semantics, so new workflow should reuse existing command/runtime patterns to reduce risk.
- Windows path semantics and symlink/canonicalization behavior are now explicitly highlighted as a high-risk class in local-first file workflows.

## Table of Contents

- [Section Manifest](#section-manifest)
- [Enhancement Summary](#enhancement-summary)
- [Overview](#overview)
- [Problem Statement / Motivation](#problem-statement--motivation)
- [Research Summary and Decision](#research-summary-and-decision)
- [Proposed Solution](#proposed-solution)
- [Technical Considerations](#technical-considerations)
- [System-Wide Impact](#system-wide-impact)
- [Implementation Phases](#implementation-phases)
- [Alternative Approaches Considered](#alternative-approaches-considered)
- [Acceptance Criteria](#acceptance-criteria)
- [Success Metrics](#success-metrics)
- [Dependencies & Risks](#dependencies--risks)
- [Documentation Plan](#documentation-plan)
- [Sources & References](#sources--references)

## Section Manifest

1. **Overview** - Document plan goal/shape and target workflows.
2. **Problem Statement / Motivation** - Why local-first artifact workflows are needed.
3. **Research Summary and Decision** - Decision rationale and evidence trail.
4. **Proposed Solution** - New command/API and file contracts.
5. **Technical Considerations** - Implementation-level risk and design points.
6. **System-Wide Impact** - Flow, errors, and integration boundaries.
7. **Implementation Phases** - Execution order and file targets.
8. **Alternative Approaches Considered** - Explicitly rejected options and reasoning.
9. **Acceptance Criteria** - Functional and non-functional gates.
10. **Success Metrics** - Measurement outcomes for release.
11. **Dependencies & Risks** - Risks, assumptions, and mitigations.
12. **Documentation Plan** - Authoring and maintenance updates.
13. **Sources & References** - Evidence and traceability.

## Overview

Expand `diagram-cli` from code-structure outputs into two local-first, deterministic non-code artifact workflows in V1 (see brainstorm: `docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md`):

1. **State machine → Mermaid** conversion from YAML/JSON and DSL input.
2. **PR → interactive HTML explainer** generated from local git refs only, plus prompt-pack artifacts for optional downstream Codex/Claude enhancement.

### Research Insights

**Best Practices:**
- Treat this as a *new command-domain*, not a feature flag on `generate`; explicit verbs (`workflow state`, `workflow pr`) reduce accidental behavior drift and preserve help discoverability.
- Define machine-output contracts from day 0 (`--json`, stable schema version, deterministic ordering) and keep human-readable output optional.
- Use symmetric flags across subcommands (`--output`, `--validate-only`, `--format`, `--theme`, `--strict`) to reduce cognitive load for scripted and manual use.

**Performance Considerations:**
- Pre-validate input paths and options before any heavy git or parser work to fail fast on common user mistakes.
- Make artifact output deterministic by stable sorting (paths, nodes, diff blocks) and deterministic serialization order.
- For large repos/diffs, use bounded reads (size cap + line count cap) and summary-only fallbacks.

**Implementation Details:**
```js
// Suggested command pattern in docs/plans only (not implementation yet)
workflow {
  subcommands: ["state", "pr"],
  sharedFlags: ["--output", "--validate-only", "--json", "--manifest", "--version"],
  commandExit: {
    success: 0,
    validationFailure: 1,
    configUsageFailure: 2,
    partialSuccess: 4
  }
}
```

**Edge Cases:**
- Empty input should still produce a valid, explicit empty artifact (manifest + human explanation) instead of crash.
- Unicode and spaces in paths should round-trip safely in output references and manifest entries.

**References:**
- CLI design principles in `clig.dev`.
- Existing command conventions in `src/diagram.js`.

## Problem Statement / Motivation

Current capabilities center on code analysis/reporting commands and architecture test outputs. The brainstorm identified a gap: teams also need local, deterministic artifact workflows that explain changes and process logic for human review without introducing direct hosted model dependencies (see brainstorm: `docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md`).

### Research Insights

**Best Practices:**
- Keep CLI scope tightly constrained: this plan addresses deterministic artifact generation and analysis, not model execution.
- Preserve one-way trust: artifact generation should be verifiable from local inputs only.
- Provide clear failure taxonomy so automation can branch on actionable errors (`path input`, `parser`, `git`, `runtime`, `packaging`).

**Performance Considerations:**
- Problem resolution is local-first by design: avoid web calls and remote model calls by default.
- Parse once into canonical IR and share it with render + manifest steps to avoid duplicated expensive transformations.

**Implementation Details:**
```js
// Deterministic pipeline shape
Input -> Validate -> Normalize(IR) -> Render -> Package(manifest, prompt-pack)
```

**Edge Cases:**
- Mixed input formats (YAML/JSON/DSL) should fail with format-specific diagnostics (`unknown extension`, `parse error`, `schema mismatch`).
- For non-text/binary diffs in PR flow, produce bounded artifact + warning metadata rather than full inline embedding.

**References:**
- Problem framing in existing brainstorm plus plan body in this file.

## Research Summary and Decision

### Local research findings

- Existing CLI command/stage patterns can be reused (`src/diagram.js:721-1118`, `src/diagram.js:993-1115`).
- Existing output safety and formatter patterns should be retained (`src/diagram.js:607-653`, `src/formatters/index.js:13-32`).
- Existing validation/testing expectations should be preserved (`package.json:9-16`, `scripts/deep-regression.js:54-77`).
- No `docs/solutions/` directory exists (primary project learning corpus absent). Alternative learnings were not available via `docs/solutions`.

### External research decision

- Previous text stated “proceed without external research”; this has been superseded by current, multi-source research as of **2026**.

### Research Insights

**Best Practices:**
- Keep external research citations in the plan while clearly noting why internal artifacts were preferred for execution details.
- Convert the decision section into a mini ADR: what was considered, what was rejected, and why.
- Add a compatibility note for Windows/path handling and symlink-related traversal risks.

**Performance Considerations:**
- Document expected complexity classes per stage (parse O(n), render O(m), diff O(k)).
- For PR flow use incremental diff strategies when possible (`git diff <base>..<head> --name-status/--numstat`) before deep parsing.

**Implementation Details:**
```js
// Decision record skeleton
## Decision Record
- Inputs considered: local refs, local parsing, deterministic outputs
- Alternatives considered: remote model flow, single-output-only flow
- Decision: keep both artifact tracks in V1 with deterministic local processing
- Rationale: aligns reliability + auditability + reproducibility
```

**Edge Cases:**
- If local git refs are missing or shallow clone lacks history, decision should allow clear `E_REF`-class failures with suggested fallback commands.

**References:**
- `clig.dev`
- `git diff` docs (`git-scm.com/docs/git-diff`)
- `Node.js path` and `fs.realpathSync` docs

## Proposed Solution

Implement a staged workflow model with explicit local artifacts for each stage (see brainstorm: `docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md`).

### Planned command surface (v1)

- `diagram workflow state --input <path> --output <path> [--validate-only] [--format mermaid] [--manifest <path>]`
- `diagram workflow pr --base <ref> --head <ref> --output <path> [--validate-only] [--prompt-pack] [--manifest <path>]`

### Manifest contract
- Shared manifest flag: `--manifest <path>` (optional) writes manifest to the provided path; default is `artifacts/manifest.json` when omitted in V1 docs.
- When omitted, commands still emit manifest in default path to satisfy acceptance criteria.
- CLI contract for manifest is canonical across `workflow state` and `workflow pr`; do not duplicate different behaviors.

### Stage contracts

1. **Parse + Normalize**
   - State workflow: YAML/JSON/DSL → canonical state-machine IR.
   - PR workflow: local refs → canonical change IR.
2. **Validate**
   - IR integrity, deterministic ordering, path/output constraints.
3. **Render**
   - State workflow: Mermaid artifact.
   - PR workflow: offline interactive HTML explainer.
4. **Emit supporting artifacts**
   - Prompt-pack files (no model execution in CLI).
   - Manifest file listing generated artifacts and checksums.

### Research Insights

**Best Practices:**
- Use immutable IR boundaries between parse/validate/render to support deterministic snapshots and easier testing.
- Prefer explicit phase-level CLI flags (`--validate-only`, `--render-only`) over implicit mode inference.
- Keep prompt-pack as artifact-only; do not embed model calls.

**Performance Considerations:**
- Cache parsed Mermaid/theme config at command-level to avoid duplicate file reads.
- Use streaming where feasible in PR workflow (`execSync` style calls may duplicate memory usage); if history is large, chunk file-hash passes.
- Precompute and persist manifest entries as hashes while writing artifacts (single pass write + hash where possible).

**Implementation Details:**
```js
// Manifest-oriented output sketch
{
  "version": "0.1.0",
  "command": "diagram workflow state",
  "input": { "type": "file", "path": "path/to/input.yml" },
  "outputs": [
    { "kind": "mermaid", "path": "artifacts/state-machine.mmd", "sha256": "..." },
    { "kind": "manifest", "path": "artifacts/manifest.json", "sha256": "..." }
  ]
}
```

**Edge Cases:**
- Equivalent YAML/JSON inputs that represent same semantic graph should produce same IR hash (ordering/canonicalization).
- Empty PR (no file changes) should still generate an informative HTML artifact instead of failing the command.

**References:**
- `src/diagram.js` execution flow for subcommands and exit codes.
- Mermaid CLI/Commander docs for render and option behavior.

## Technical Considerations

- Reuse current staged CLI pattern and exit code conventions (`0` success, `1` rule/validation failure, `2` usage/input errors).
- Keep outputs local-first and deterministic by default; avoid embedded nondeterministic fields unless explicitly documented.
- Enforce output path guardrails (no traversal/symlink escape; handle spaces/unicode paths).
- Ensure HTML explainer can render without network dependency.
- Keep prompt-pack generation as artifact-only (no direct API/model calls), matching brainstorm decisions.

### Research Insights

**Best Practices:**
- Use command-level exit code map (`usage`, `validation`, `policy`, `partial`) as recommended in CLI guidance.
- Add strict path normalization + canonicalization (`realpath`) before write operations.
- Separate parsing errors from schema errors from rendering errors for precise remediation messages.

**Performance Considerations:**
- Use bounded IO for PR diffs (line and file thresholds) and degrade gracefully.
- Default to streaming and avoid loading entire diff/content into memory for very large refs.
- Prevalidate file extensions and content size before YAML parse/JSON parse to skip expensive failures.

**Implementation Details:**
```js
function safeOutputPath(outputPath, projectRoot) {
  const absoluteRoot = fs.realpathSync(projectRoot);
  const targetPath = path.resolve(outputPath);
  const targetDir = path.dirname(targetPath);
  const resolvedDir = resolveExistingParent(targetDir);

  const rel = path.relative(absoluteRoot, resolvedDir);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Invalid output path: traversal detected');
  }

  return targetPath;
}

function resolveExistingParent(dirPath) {
  let cursor = path.resolve(dirPath);
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) {
      break;
    }
    cursor = parent;
  }
  return fs.realpathSync(cursor);
}
```

**Edge Cases:**
- Windows path semantics and reserved device names can bypass naïve normalization logic; use conservative path checks and tests.
- Symlink traversal and non-existent path ancestors: validate each stage in deterministic order (exists check, canonicalization, relative check).
- Deterministic output requires stable property ordering and stable JSON serialization options.

**References:**
- Node.js `path` docs.
- Node.js `fs.realpathSync` docs.
- Security notes around path/canonical handling and recent Node path traversal advisories.

## System-Wide Impact

- **Interaction graph**: CLI command dispatch → workflow stage runner → IR builders → renderer(s) → artifact manifest/prompt-pack writer.
- **Error propagation**: parse/ref resolution errors return usage/input-class errors; validation failures return validation-class errors; rendering/file I/O errors propagate with explicit context.
- **State lifecycle risks**: partial writes could leave incomplete artifact sets; mitigate via temp output + atomic move and manifest completeness checks.
- **API surface parity**: align with existing command option style and formatter/reporting behavior.
- **Integration test scenarios**:
  1. Equivalent YAML/JSON/DSL inputs produce equivalent Mermaid output.
  2. PR refs missing merge-base in shallow clone fail with actionable error.
  3. Empty diff still generates valid explainer with “no changes” state.
  4. Large/binary/non-UTF8 diff content follows bounded/truncation policy.
  5. Output path traversal attempt is blocked.

### Research Insights

**Best Practices:**
- Represent this as a state machine with explicit transitions for `init -> parse -> validate -> render -> finalize`, which improves testability.
- Log only operationally useful context; keep user-facing messages concise and action-oriented.
- Return partial-success exit paths where manifest exists but some optional artifact is skipped (explicit code).

**Performance Considerations:**
- Keep stage graph lazy: skip rendering if `--validate-only` is set.
- In PR mode, compute change metadata once and feed both HTML and checksums.

**Implementation Details:**
```js
// Pipeline states and exit behavior
const STATES = {
  VALIDATE_ONLY: 'validate-only',
  EMIT_MANIFEST: 'emit-manifest',
  RENDER_MERMAID: 'render-mermaid',
  RENDER_HTML: 'render-html',
  DONE: 'done'
};
```

**Edge Cases:**
- Git base/head references may be tags, remote-tracking refs, SHAs, or ranges; resolve once and validate in one step.
- Non-empty `stdout` piping should avoid interactive-only diagnostics/prompts.

**References:**
- Existing `src/diagram.js` action/error style.
- `clig.dev` guidance on errors and human-friendly output.

## Implementation Phases

### Phase 1: Workflow foundations

- Define shared workflow stage interfaces and manifest contract.
- Add `--validate-only` behavior for both workflow tracks.
- Target files (planned):
  - `src/diagram.js`
  - `src/workflows/shared/*.js`
  - `src/schema/workflow-manifest.schema.json`

### Phase 2: State machine workflow

- Implement adapters for YAML/JSON/DSL into canonical state-machine IR.
- Implement Mermaid rendering and escaping rules.
- Add input-validation errors with line/column context.
- Target files (planned):
  - `src/workflows/state-machine/*.js`
  - `src/formatters/mermaid.js`
  - `examples/state-machines/*`

### Phase 3: PR explainer workflow

- Implement local git ref resolution and diff-to-IR pipeline.
- Build offline interactive HTML explainer output.
- Generate prompt-pack + manifest with checksums.
- Target files (planned):
  - `src/workflows/pr-explainer/*.js`
  - `src/templates/pr-explainer/*.html`
  - `src/workflows/prompt-pack/*.js`

### Phase 4: Validation + packaging + docs

- Add unit/integration/deep regression coverage for both flows.
- Add packaged-smoke verification for templates/assets.
- Update docs and examples.
- Target files (planned):
  - `scripts/deep-regression.js`
  - `package.json`
  - `docs/README.md`
  - `docs/architecture-testing.md`

### Research Insights

**Best Practices:**
- Phase gates should deliver testable outputs: parse tests first, then render, then packaging/docs.
- Keep each phase bounded by interface contracts (IR schema + manifest schema).
- Introduce `examples/` fixtures that prove deterministic output for multi-format input.

**Performance Considerations:**
- Add fixture-size and threshold tests for large diffs to prevent regressions.
- For packaging: smoke-check only generated assets (size + parseability + checksum consistency).

**Implementation Details:**
```js
// Example phase gate ordering
if (validateOnly) { parseAndValidate(); emitManifest(); return; }
buildArtifacts();
if (!isAtomicWriteSuccessful()) rollbackPartialWrites();
```

**Edge Cases:**
- `deep regression` should include binary diff case, empty diff case, and no-merges path.
- Avoid changing legacy command behavior in untouched command paths.

**References:**
- Existing `scripts/deep-regression.js` and `package.json` test scripts.
- Existing `docs/architecture-testing.md` test philosophy.

## Alternative Approaches Considered

- **LLM-first embedded execution** rejected (see brainstorm: `docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md`) to preserve deterministic local-first behavior.
- **Single-output-only V1** rejected in brainstorm; V1 ships both tracks to satisfy the agreed scope.
- **Remote PR provider API sourcing** rejected for V1; local git refs only.

### Research Insights

**Best Practices:**
- Keep rejected alternatives documented with explicit risk comparison:
  - Offline determinism vs latency/cost tradeoff
  - Data governance vs feature breadth
- For each alternative, capture a “when to revisit” condition.

**Performance Considerations:**
- LLM-first alternative likely increases non-determinism and response latency; avoided to preserve reproducibility.
- Remote PR API approach increases network dependency and auth complexity; avoided for V1 reliability.

**Implementation Details:**
- Add a short “Revisit only if...” block to prevent scope creep in later phases.

**Edge Cases:**
- If future scope adds API mode, require explicit new command/flag and separate compatibility policy.

**References:**
- Security/compliance principles in local-only model behavior.

## Acceptance Criteria

### Functional requirements

- [ ] State workflow accepts YAML/JSON/DSL and normalizes to one canonical IR.
- [ ] Equivalent YAML/JSON/DSL specs produce equivalent Mermaid output.
- [ ] PR workflow reads local git refs only and outputs interactive HTML explainer.
- [ ] PR workflow emits prompt-pack artifacts without invoking model APIs.
- [ ] Both workflows support `--validate-only` mode.
- [ ] Both workflows produce a manifest/index of generated artifacts.

### Non-functional requirements

- [ ] Invalid inputs return actionable errors with clear classification (usage/config vs validation).
- [ ] Output path validation blocks traversal/symlink escape and supports spaces/unicode.
- [ ] HTML explainer renders offline without required remote scripts.
- [ ] Prompt-pack and manifest outputs are deterministic for identical inputs.
- [ ] Large inputs/diffs use bounded behavior with explicit warnings.

### Quality gates

- [ ] `npm test` passes.
- [ ] `npm run test:deep` passes with new workflow happy/failure path coverage.
- [ ] `npm pack --dry-run` includes new templates/assets and packed smoke checks pass.
- [ ] Docs and examples updated for new commands.

### Research Insights

**Best Practices:**
- Add concrete measurable definitions (e.g., “equivalent output”) with checksums or parser canonicalization to avoid subjective pass/fail.
- Include negative-path acceptance for each criterion (`bad path`, `bad refs`, `binary diff`).
- Add `--json` acceptance test to capture machine-usable outputs.

**Performance Considerations:**
- Require benchmark-like guardrails: parse+validate under threshold for representative sample sizes.
- Add explicit regression budgets for deep regressions and run-time if possible.

**Implementation Details:**
```yaml
# Example acceptance matrix sample
criteria:
  deterministic_output: true
  max_wall_time_ms: 5000
  max_warnings_on_empty_diff: 1
  validate_only_exit_code: 0
```

**Edge Cases:**
- `npm test` and `npm run test:deep` may expose environment-dependent flakiness (git availability, temp permissions); codify expected preconditions.

**References:**
- Existing project quality gates in `package.json`.
- `scripts/deep-regression.js`.

## Success Metrics

- Workflow runs are reproducible locally with deterministic artifacts.
- Human reviewers can inspect PR explainer HTML without additional tooling/network.
- State-machine users can convert at least YAML/JSON/DSL sample cases to valid Mermaid with no manual edits.
- No regressions in existing `diagram test` and current command suite.

### Research Insights

**Best Practices:**
- Convert each metric to an observable test artifact (e.g., checksum map, openable HTML smoke, parse roundtrip checks).
- Track adoption proxies: `workflow` command usage, `--validate-only` failures, and deterministic-retry rates.
- Include a latency or size threshold to keep outputs useful in CI.

**Performance Considerations:**
- Track median runtime for local diff and state conversion on a fixed-size repo fixture.
- Track max artifact size and manifest size growth trends.

**Implementation Details:**
```text
SLA (proposed):
- 100KB input state graph: <2s render
- Typical PR diff (<=250 changed files): <8s end-to-end
- Empty diff explainer: <2s
```

**Edge Cases:**
- Define separate benchmarks for Windows/Unix due filesystem differences.
- Binary-heavy diffs should have alternate acceptance metric (artifact + warning, not full parse).

**References:**
- Internal performance baselines from existing `npm run test:deep` style execution.

## Dependencies & Risks

- **Dependencies**: local git availability for PR workflow; parser/renderer modules; template packaging in npm artifact.
- **Key risks**:
  - DSL grammar ambiguity causing inconsistent IR.
  - Large diff rendering performance and binary file handling.
  - Template asset omissions in packaged builds.
- **Mitigations**:
  - Canonical IR + deterministic sort rules.
  - Input size bounds and truncation policies.
  - Packaging smoke checks and manifest completeness checks.

### Research Insights

**Best Practices:**
- Convert risks into explicit owners and exit conditions (`P0/P1`) with rollback conditions.
- Add a risk-based test matrix: parsing, git behavior, output path security, packaging, rendering.

**Performance Considerations:**
- Treat large diff handling as a first-class risk with thresholds and fallback policies.
- Add artifact compression/templating strategy only after phase metrics indicate necessity.

**Implementation Details:**
```md
Risk Register
- R-PathTraversal: Owner=CLI runtime; Mitigation=canonical output validation + symlink checks; Trigger=security scan failure
- R-LargeDiff: Owner=workflow parsing; Mitigation=truncation+summary + `validate-only` gating; Trigger=fixture threshold breach
- R-Packaging: Owner=release; Mitigation=smoke checks on template/assets; Trigger=pack dry-run test failure
```

**Edge Cases:**
- Git history shape (detached HEAD, shallow clones, rename-heavy history) can alter output; define explicit behavior and tests.
- Non-UTF8 input should not corrupt output manifest.

**References:**
- Node path/canonical docs and security advisories on traversal boundaries.

## Documentation Plan

- Add workflow usage docs and examples to `docs/README.md`.
- Add command/help examples and troubleshooting notes.
- Add prompt-pack contract + manifest schema documentation.
- Include explicit non-goals in docs (no direct API calls, no remote PR provider integration in V1).

### Research Insights

**Best Practices:**
- Document command UX and failure modes side-by-side.
- Include example manifests and example error outputs for faster adoption.
- Keep docs canonical-first: one source-of-truth command contract, then per-topic examples.

**Performance Considerations:**
- Add “large repo / large PR” guidance and expected runtime in docs to reduce support churn.

**Implementation Details:**
### Usage example
```bash
diagram workflow state --input workflow.yml --output artifacts/state.mmd --format mermaid
```

### Debugging
- Use `--validate-only` first
- Inspect `manifest.json` for missing artifact failures
- Check path errors before rerunning full render


**Edge Cases:**
- Add separate examples for spaces in paths, Unicode filenames, and empty diffs.
- Clarify whether `--prompt-pack` is metadata-only and intentionally non-executing.

**References:**
- `docs/README.md` and existing docs style in this repo.

## Sources & References

### Origin

- **Brainstorm document:** `docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md`
- Key decisions carried forward:
  - local-first and deterministic architecture
  - both artifact tracks in V1
  - local git refs only for PR flow
  - prompt-pack artifacts without model execution

### Internal references

- `docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md:20-33`
- `docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md:42-65`
- `src/diagram.js:607-653`
- `src/diagram.js:721-1118`
- `src/rules.js:138-260`
- `src/formatters/index.js:13-32`
- `package.json:9-16`
- `scripts/deep-regression.js:54-77`
- `docs/plans/2026-02-24-feat-architecture-testing-rules-validation-plan-deepened.md:340-349`
- `docs/plans/2026-02-24-feat-architecture-testing-rules-validation-plan-deepened.md:374-383`
- `docs/plans/2026-02-24-feat-architecture-testing-rules-validation-plan-deepened.md:438-477`
- `docs/architecture-testing.md:86-89`
- `docs/architecture-testing.md:153-167`
- `BUG_AUDIT_REPORT.md:100-103`
- `BUG_AUDIT_REPORT.md:112-118`
- `BUG_AUDIT_REPORT.md:132-142`

### External references

- CLI patterns: [Command Line Interface Guidelines](https://clig.dev/)
- Commander internals & usage: [tj/commander.js README](https://github.com/tj/commander.js)
- Node path security and resolution: [Node.js Path API](https://nodejs.org/api/path.html), [Node.js fs API](https://nodejs.org/api/fs.html)
- YAML parsing/options: [eemeli YAML docs](https://eemeli.org/yaml/)
- Mermaid CLI usage and options: [mermaid-js/mermaid-cli](https://github.com/mermaid-js/mermaid-cli)
- Git diff behavior: [git diff docs](https://git-scm.com/docs/git-diff)

### Related work

- Existing plan baseline:
  - `docs/plans/2026-02-24-feat-architecture-testing-rules-validation-plan.md`
  - `docs/plans/2026-02-24-feat-architecture-testing-rules-validation-plan-deepened.md`
