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

**Sections enhanced:** 14

**Research agents used:**
- `cli-spec`, `docs-expert`, `writing-plans`, `architecture-interview`, `security-best-practices`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `tech-spec`
- Context7: /tj/commander.js, /mermaid-js/mermaid-cli, /eemeli/yaml
- Web research (Node.js path/path traversal advisories, Git diff scalability guidance, command semantics)
- Local discovery in repo source, prior plans, and security review outputs

**Key Improvements:**
1. Added explicit ADR section, phase-gated execution plan, and stronger validation/rollback checkpoints.
2. Deepened path, launch, verification, and attestation safeguards for local-first reproducibility.
3. Added concrete performance/scale constraints, test taxonomy, and documentation mapping for workflow operators.

**New Considerations Discovered:**
- No `docs/solutions/` corpus exists in this repo; no local learnings could be imported.
- `security_best_practices_report.md` surfaced high-impact local-first risks around `--open`, path trust boundaries, and verify/read-only semantics.
- Windows device-name traversal behavior and symlink traversal remain a live security test matrix item for all path inputs (`--output`, `--manifest`, `--attest-key`, `--verify`).

## Table of Contents

- [Section Manifest](#section-manifest)
- [Enhancement Summary](#enhancement-summary)
- [Overview](#overview)
- [Problem Statement / Motivation](#problem-statement--motivation)
- [Research Summary and Decision](#research-summary-and-decision)
- [Decision Record](#decision-record)
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
13. **Decision Record** - ADRs, alternatives rejected, and revisit conditions.
14. **Sources & References** - Evidence and traceability.

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
  sharedFlags: ["--output", "--validate-only", "--json", "--manifest", "--open", "--attest", "--attest-key", "--verify", "--version"],
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

### Deepened Research Insights

**Operational improvements:**
- Add explicit *minimum working example* for each input type at command level to lower adoption friction.
- Define artifact naming defaults (`artifacts/<workflow>/<timestamp>-state.mmd`) to avoid collisions across parallel runs.

**Performance and portability:**
- Keep rendering deterministic by normalizing newline conventions before mermaid serialization.
- Pre-create output directories only after `--validate-only` succeeds.

**Security note:**
- Validate both input/output roots once and reuse canonical paths for manifest and provenance fingerprinting.

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

### Deepened Research Insights

**Why local-first matters:**
- Maintains reproducibility under restricted CI environments and satisfies audit requirements without external API reachability dependencies.
- Enables artifact review in constrained environments where outbound network is blocked or denied by policy.

**Edge-case framing:**
- Empty PRs and parse-only no-op cases should still emit traceable `manifest + --json` signals.
- Binary or non-text diffs should emit bounded extraction output with explicit `E_INPUT_BIN` diagnostics.

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
- Add a separate `## Decision Record` section directly before implementation details.
- Capture decisions as ADR-0001 with explicit options, rationale, and consequences.
- Ensure the decision is reflected in acceptance and risk matrices so implementation is auditable.

### Deepened Research Insights

**Research synthesis:**
- Synthesize skill guidance into executable decisions: command-domain clarity (cli-spec), section-by-section implementation checkpoints (writing-plans), and security gates (security-best-practices).
- Keep the decision log explicit and durable in a separate ADR-style section.

**Evidence policy:**
- Cite only verifiable local source lines and authoritative external docs; mark unsupported assumptions with `TODO` in the plan when needed.

**Decision-ready inputs:**
- Inputs considered: local refs, local parsing, deterministic outputs, and bounded filesystem behavior.
- Alternatives considered: remote model flow and single-output-only flow.
- Decision: keep both artifact tracks in V1 with deterministic local processing.
- Rationale: aligns reliability + auditability + reproducibility while preserving offline CI usage.

**Next action:**
- Record the final choice as a separate `## Decision Record` section before proceeding to implementation details.

**Edge Cases:**
- If local git refs are missing or shallow clone lacks history, decision should allow clear `E_REF`-class failures with suggested fallback commands.

**References:**
- `clig.dev`
- `git diff` docs (`git-scm.com/docs/git-diff`)
- `Node.js path` and `fs.realpathSync` docs

## Decision Record

### ADR-0001: Ship dual-track local-first workflow commands in V1

**Status:** Accepted

**Context:**
- The command expansion must support offline, deterministic artifact generation for non-code workflows and PR explainability without introducing remote-model execution.
- Existing CLI conventions favor explicit command surfaces and deterministic artifacts.

**Options considered:**
1. **LLM-first embedded execution** (rejected): non-deterministic runtime and network dependencies conflict with local-first guarantees.
2. **Single-output-only flow** (rejected): reduces flexibility and increases follow-up rework for common review workflows.
3. **Dual-track local-only flow with offline render + attest/verify hooks** (selected): aligns safety and operator visibility goals.

**Decision:**
- Implement both `workflow state` and `workflow pr` in V1 under a common local-first command domain.
- Keep all outputs deterministic, offline-rendered, and manifest/provenance-aware.
- Keep `--open` as optional, non-blocking side-effect only, and non-breaking for automation/CI.

**Consequences:**
- Requires additional schema/versioned machine output (`workflow.result/0.2.0`, manifest/provenance contracts), and expanded test coverage for parse/render/security phases.
- Adds short-term implementation effort but reduces ambiguity for later v2 feature scope.

## Proposed Solution

Implement a staged workflow model with explicit local artifacts for each stage (see brainstorm: `docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md`).

### Planned command surface (v1)

- `diagram workflow state --input <path> --output <path> [--validate-only] [--format mermaid] [--json] [--manifest <path>] [--open html|video|all|auto|none] [--attest] [--attest-key <path>] [--verify <path>]`
- `diagram workflow pr --base <ref> --head <ref> --output <path> [--validate-only] [--prompt-pack] [--json] [--manifest <path>] [--open html|video|all|auto|none] [--attest] [--attest-key <path>] [--verify <path>]`

### Artifact launch contract (`--open`)

- Scope: Both `workflow state` and `workflow pr`.
- Purpose: quick visual verification when local review is active, without making launch part of validation correctness.
- Values:
  - `none` (default): do not launch anything.
  - `auto`: launch the primary artifact only in interactive sessions.
  - `html`: launch HTML artifact if present.
  - `video`: launch video artifact if present (future-proof for `video` outputs).
  - `all`: attempt launch for all recognized artifact types in a stable priority order.
- Behavior:
  - Non-interactive / CI environments force `none` regardless of `--open` (unless process policy explicitly allows interactive launch).
  - If the requested type is missing, emit warning diagnostic and continue with non-blocking status.
  - Launch failures are non-fatal and must be captured in diagnostics.
- Security/UX guardrails:
  - Never launch automatically by default.
  - Log requested vs executed launch mode into `--json` and manifest for audit.
- Output example extension in `--json`:

```json
{
  "launch": {
    "requested": "html",
    "executed": true,
    "artifacts": [
      { "kind": "html", "path": "artifacts/pr-explainer.html", "result": "opened" }
    ],
    "errors": []
  }
}
```

### Auto launch of HTML/video artifacts

- Define deterministic priority for automatic launch:
  - `auto`:
    1. Launch HTML if available.
    2. If HTML is unavailable and video is available, launch video.
    3. If neither exists, emit warning diagnostic and continue non-fatally.
  - `all`:
    1. Launch HTML if available.
    2. Launch video if available.
    3. Continue and report per-artifact results in launch diagnostics.
- Execution order and safety:
  - Launch is best-effort and post-render only.
  - If a launch fails, continue the command as success/failure according to render outcome (never flip success on launch error).
  - Never retry failed launches automatically in the same process.
- Supported artifact kinds by workflow:
  - `state`: `mermaid` and (future) `video` artifact launch candidates.
  - `pr`: `html`, `manifest`, `prompt-pack`, and (future) `video` launch candidates.
- Validation:
  - `--open=video` and `--open=all` are legal now; `video` launches only occur when a video artifact is present.
  - Add tests for:
    - `--open=auto` preferring HTML when both exist.
    - Missing kind fallback behavior in `auto`.
    - Multi-launch behavior for `all` with one success + one failure path.

### Machine output contract (`--json`)

- Scope: Both `workflow state` and `workflow pr`.
- Behavior: `--json` prints a machine-readable report to **stdout** and exits with the command-specific exit code.
- Purpose: Deterministic automation and CI consumption while preserving default human-readable output.
- Output shape (stable schema):

```json
{
  "schemaVersion": "workflow.result/0.2.0",
  "command": "diagram workflow state | diagram workflow pr",
  "mode": "validate-only | execute",
  "status": "ok | validation-failed | config-error",
  "durationMs": 1234,
  "artifacts": [
    { "kind": "mermaid", "path": "artifacts/workflow-state.mmd", "sha256": "..." },
    { "kind": "html", "path": "artifacts/pr-explainer.html", "sha256": "..." },
    { "kind": "manifest", "path": "artifacts/manifest.json", "sha256": "..." }
  ],
  "diagnostics": [
    { "code": "E_PATH", "message": "Invalid output path", "file": "N/A" }
  ]
}
```

- Failure handling: If validation/render fails, output `status` should be non-`ok` with diagnostics.

### Reproducibility & Attestation (`--attest`, `--verify`)

- Scope: both `workflow state` and `workflow pr`.
- Purpose: provide a machine-verifiable trust envelope for reproducibility, CI gating, and incident review.
- `--attest` (default off):
  - Emits `artifacts/provenance.json` by default (same base output directory as manifest).
  - Captures an immutable run envelope including:
    - `schemaVersion` (provenance + manifest contract)
    - normalized invocation and versioned flags
    - CLI/app version and execution context (`platform`, `node`, `locale`, `cwd`)
    - deterministic input fingerprints:
      - file-based: path canonicalization + size + SHA-256
      - git-based: base/head refs + commit/tree/object IDs used
    - template/asset hashes consumed by render
    - output artifact hashes and ordered manifest index
    - diagnostics summary and exit status
  - default: unsigned hash chain (hash-bound attestation).
  - optional: `--attest-key <path>` to apply local signing (HMAC/signature policy explicit in implementation).
- `--verify <path>`:
  - Read-only mode: no launch, no prompt-pack regeneration, and no side-effectful optional steps unless explicitly requested.
  - No re-render unless explicit `--validate-only`/`--attest` behavior requires it.
  - Recomputes fingerprints and compares against recorded provenance:
    - schema/version
    - invocation and normalized options
    - input digest set
    - ordered outputs + checksums
    - manifest hash chain
  - Emits actionable diagnostics on drift (e.g., changed input, platform-dependent rendering difference, missing files).

Example provenance fragment:

```json
{
  "schemaVersion": "workflow.provenance/0.1.0",
  "command": "diagram workflow pr --base main --head HEAD --output artifacts/pr-explainer.html --attest",
  "runEnvelope": {
    "cliVersion": "0.12.0",
    "startedAt": "2026-02-26T10:00:00.000Z",
    "durationMs": 842,
    "environment": { "platform": "darwin", "node": "20.18.0", "locale": "en_US.UTF-8", "cwd": "/repo/diagram-cli" }
  },
  "inputs": {
    "mode": "git",
    "base": "main",
    "head": "HEAD",
    "refs": { "baseTree": "abc123", "headTree": "def456" }
  },
  "artifacts": [
    { "kind": "html", "path": "artifacts/pr-explainer.html", "sha256": "..." },
    { "kind": "manifest", "path": "artifacts/manifest.json", "sha256": "..." }
  ],
  "signature": {
    "algorithm": "HMAC-SHA256",
    "signedBy": null,
    "value": "ab12..."
  }
}
```

### Manifest contract
- Shared manifest flag: `--manifest <path>` (optional) writes manifest to the provided path; default is `artifacts/manifest.json` when omitted in V1 docs.
- When omitted, commands still emit manifest in default path to satisfy acceptance criteria.
- CLI contract for manifest is canonical across `workflow state` and `workflow pr`; do not duplicate different behaviors.
- `--json` and `--manifest` are independent: `--manifest` controls artifact index output, `--json` controls machine-result formatting.
- Extend manifest schema with provenance linkage and execution envelope metadata:
  - `schemaVersion: "workflow.manifest/0.3.0"`
  - `commandInvocation` (normalized)
  - canonical `outputs` ordering + artifact hashes
  - `provenance` pointer (`path`, `sha256`, `signed`)

```json
{
  "schemaVersion": "workflow.manifest/0.3.0",
  "commandInvocation": {
    "command": "diagram workflow pr --base main --head HEAD --prompt-pack --manifest artifacts/manifest.json"
  },
  "outputs": [
    { "kind": "html", "path": "artifacts/pr-explainer.html", "sha256": "..." },
    { "kind": "manifest", "path": "artifacts/manifest.json", "sha256": "..." }
  ],
  "provenance": {
    "path": "artifacts/provenance.json",
    "sha256": "…",
    "signed": false
  },
  "launch": {
    "requested": "html",
    "executed": true,
    "artifacts": [
      { "kind": "html", "path": "artifacts/pr-explainer.html", "result": "opened" }
    ]
  }
}
```

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
5. **Attestation step (optional)**
   - If `--attest`, emit `artifacts/provenance.json`.
   - Capture a hash chain over input fingerprint + output hashes + diagnostics.
   - Optionally sign with `--attest-key`.
6. **Optional launch step**
   - Launch selected artifact(s) based on `--open` when execution context permits.

### Research Insights

**Best Practices:**
- Use immutable IR boundaries between parse/validate/render to support deterministic snapshots and easier testing.
- Prefer explicit phase-level CLI flags (`--validate-only`, `--render-only`) over implicit mode inference.
- Keep prompt-pack as artifact-only; do not embed model calls.
- Keep launch as a side effect only, executed after successful render and artifact verification.

**Performance Considerations:**
- Cache parsed Mermaid/theme config at command-level to avoid duplicate file reads.
- Use streaming where feasible in PR workflow (`execSync` style calls may duplicate memory usage); if history is large, chunk file-hash passes.
- Precompute and persist manifest entries as hashes while writing artifacts (single pass write + hash where possible).

**Implementation Details:**
```js
// Manifest-oriented output sketch
{
  "schemaVersion": "workflow.manifest/0.3.0",
  "commandInvocation": {
    "command": "diagram workflow state"
  },
  "input": { "type": "file", "path": "path/to/input.yml" },
  "provenance": {
    "path": "artifacts/provenance.json",
    "sha256": "..."
  },
  "outputs": [
    { "kind": "mermaid", "path": "artifacts/state-machine.mmd", "sha256": "..." },
    { "kind": "manifest", "path": "artifacts/manifest.json", "sha256": "..." },
    { "kind": "provenance", "path": "artifacts/provenance.json", "sha256": "..." }
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
- Treat optional launch operations (`--open`) as non-blocking side effects and avoid leaking them into render/validation contracts.
- Keep attestation hashing deterministic and stable across path separators and locale-sensitive formatting.

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
function safeOutputPath(outputPath, projectRoot, options = { validateOnly: false, createParents: false }) {
  const absoluteRoot = fs.realpathSync(projectRoot);
  const targetPath = path.resolve(outputPath);
  const targetDir = path.dirname(targetPath);
  const resolvedDir = resolveExistingParent(targetDir);

  const rel = path.relative(absoluteRoot, resolvedDir);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Invalid output path: traversal detected');
  }

  if (!options.validateOnly && options.createParents) {
    fs.mkdirSync(targetDir, { recursive: true });
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

### Output behavior contract (validate-only vs render)

- `--validate-only` phase **must not** create directories or files.
- Render/write phase performs directory creation explicitly via `safeOutputPath(..., { validateOnly: false, createParents: true })` and only after successful validation checks.
- If validation fails, no artifact directories/files are created (pure read/verification path).
- If render fails after directory creation, return a partial artifact state with explicit diagnostics and cleanup for confirmed temporary artifacts.

**Edge Cases:**
- Windows path semantics and reserved device names can bypass naïve normalization logic; use conservative path checks and tests.
- Symlink traversal and non-existent path ancestors: validate each stage in deterministic order (exists check, canonicalization, relative check).
- Deterministic output requires stable property ordering and stable JSON serialization options.

**References:**
- Node.js `path` docs.
- Node.js `fs.realpathSync` docs.
- Security notes around path/canonical handling and recent Node path traversal advisories.

### Deepened Research Insights

**Command/IO contract:**
- Add per-command `--offline` guard (or equivalent invariant check) to keep V1 deterministic and avoid network-dependent runtime fallback paths.
- Keep `--json` schema versioning additive (`workflow.result/0.2.0` already good); document semantic version bump rules.

**Path and security hardening:**
- Centralize path validation for **all** user-provided paths (`--output`, `--manifest`, `--attest-key`, `--verify`) with canonicalization and symlink policy checks before any write.
- Apply Windows-specific checks for reserved device names when running on windows paths.

**Parsing and rendering:**
- Explicitly define parser fail-closed behavior: parse policy breaches should emit structured error codes and stop file writes.
- Use deterministic sorting for maps/nodes/manifest entries before serialization.

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
  6. `--open` launches expected artifact in interactive mode and degrades gracefully when artifacts are missing or open fails.
  7. Replaying a prior attested command with `--verify` succeeds for unchanged inputs and highlights drift with actionable mismatch reasons.

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

### Deepened Research Insights

**Traceability model:**
- Add a standard execution envelope for all runs: command input hash, normalized flags, normalized manifest, and provenance record pointer.
- Separate transient runtime warnings from canonical state transitions (`DONE`, `VALIDATE_ONLY`, `MANIFEST_ONLY`, `ERROR`).

**Non-functional impact:**
- Open handling remains a side-effect phase with strict CI-safe default (`none`).
- Keep failure codes machine-actionable for orchestration tools and automation dashboards.

## Implementation Phases

### Phase 1: Workflow foundations

- Define shared workflow stage interfaces and manifest contract.
- Add `--validate-only` behavior for both workflow tracks.
- Add `--open` surface and launch-safe execution helper (`openArtifact`).
- Add attestation primitives:
  - schema for `provenance.json`
  - deterministic hash utilities (input + output + manifest chain)
  - optional signing verifier adapter for `--attest-key`
- Target files (planned):
  - `src/diagram.js`
  - `src/workflows/shared/*.js`
  - `src/schema/workflow-manifest.schema.json`
  - `src/schema/workflow-provenance.schema.json`

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
- Add `--open` acceptance tests:
  - explicit launch behavior in interactive mode,
  - missing-artifact warning + non-blocking behavior,
  - failure diagnostics logging.
- Add `--attest`/`--verify` acceptance tests:
  - attested successful run writes deterministic provenance
  - `--verify` succeeds on unchanged replay
  - `--verify` reports mismatched inputs/digests for drift simulation
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

### Deepened Research Insights

**Phase gates (from writing-plans):**
- Phase 1 gate: schema + security validation contracts approved before implementation starts.
- Phase 2 gate: deterministic parser/rendering golden tests exist for all supported inputs.
- Phase 3 gate: integration and path-security tests include negative cases.
- Phase 4 gate: docs/tests green (`npm test`, targeted deep-regression cases) before docs handoff.

**Execution notes:**
- Add atomic writes for manifests/provenance to avoid partial artifact sets on crash.
- Add `scripts` smoke checks for open artifact launch policy and verify-only mode safety.

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

### Deepened Research Insights

**Revisit conditions:**
- Consider remote model augmentation in a v2 flow **only** if policy requires AI-assisted content enrichment.
- Revisit single-output-first model only if scope narrows and product usage proves one flow has zero adoption.

**Decision rationale reinforcement:**
- Local-only + dual-track remains the safer default for compatibility, auditability, and deterministic CI use.

## Acceptance Criteria

### Functional requirements

- [ ] State workflow accepts YAML/JSON/DSL and normalizes to one canonical IR.
- [ ] Equivalent YAML/JSON/DSL specs produce equivalent Mermaid output.
- [ ] PR workflow reads local git refs only and outputs interactive HTML explainer.
- [ ] PR workflow emits prompt-pack artifacts without invoking model APIs.
- [ ] Both workflows support `--validate-only` mode.
- [ ] `--json` output conforms to `workflow.result/0.2.0` on both success and failure for `workflow state` and `workflow pr`.
- [ ] Both workflows produce a manifest/index of generated artifacts.
- [ ] `--open=html|video|all|auto|none` performs artifact launch behavior without changing pipeline success/failure semantics.
- [ ] `--attest` writes `artifacts/provenance.json` with immutable run envelope and deterministic hashes.
- [ ] `--verify <path>` validates deterministic replay against a previous provenance envelope.

### Non-functional requirements

- [ ] Invalid inputs return actionable errors with clear classification (usage/config vs validation).
- [ ] Output path validation blocks traversal/symlink escape and supports spaces/unicode.
- [ ] `--validate-only` does not create directories or write output files.
- [ ] HTML explainer renders offline without required remote scripts.
- [ ] Prompt-pack and manifest outputs are deterministic for identical inputs.
- [ ] Large inputs/diffs use bounded behavior with explicit warnings.
- [ ] `--open` is no-op in non-interactive environments unless explicitly forced and does not fail command execution on launch errors.
- [ ] Open actions are recorded in diagnostics/manifest/`--json` for auditability.
- [ ] Provenance includes command, environment fingerprint, input manifest, output ordering, and diagnostics summary.
- [ ] `--attest` should be deterministic across OS path separators once canonicalization is applied.

### Quality gates

- [ ] `npm test` passes.
- [ ] `npm run test:deep` passes with new workflow happy/failure path coverage.
- [ ] `npm run test:deep` includes open-mode coverage (`--open=html`, missing artifact, launch failure simulation).
- [ ] `npm run test:deep` includes attestation coverage:
  - signed + unsigned `--attest`
  - `--verify` pass/fail replay scenarios
  - deterministic hash ordering validation
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

### Deepened Research Insights

**Validation structure:**
- Convert each criterion into one measurable check with expected status code and diagnostic class.
- Add explicit non-goals to prevent ambiguity (e.g., remote model calls, cross-repo writes, interactive prompts in `--no-input`).

**Quality gates to add:**
- `--verify` test: fail if manifest/provenance inputs differ after canonicalization.
- `--open` test: CI-mode enforces zero launch attempts and zero file writes outside write mode.
- `--validate-only` test: guarantee zero side effects.

## Success Metrics

- Workflow runs are reproducible locally with deterministic artifacts.
- Human reviewers can inspect PR explainer HTML without additional tooling/network.
- `--open` enables one-command human verification loop for artifact review in interactive environments.
- `--attest` + `--verify` enables trustable reproducibility checks for CI and security review loops.
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

### Deepened Research Insights

**Operational telemetry:**
- Track median runtime for representative state and pr artifacts by input size band.
- Track failure-code distribution (`E_VALIDATION`, `E_PARSE`, `E_OPEN`, `E_VERIFY`).
- Track `--json` and manifest schema validation pass-rate.

**Quality targets:**
- Reproducibility replay pass on unchanged inputs: 100%.
- Non-interactive `--open` attempts: 0.
- Validate-only side effects: 0 writes outside manifest/provenance output targets.

## Dependencies & Risks

- **Dependencies**: local git availability for PR workflow; parser/renderer modules; template packaging in npm artifact.
- **Key risks**:
  - DSL grammar ambiguity causing inconsistent IR.
  - Large diff rendering performance and binary file handling.
  - Template asset omissions in packaged builds.
  - Auto-launch side effects in non-interactive environments.
  - Attestation key management and local signing hygiene.
- **Mitigations**:
  - Canonical IR + deterministic sort rules.
  - Input size bounds and truncation policies.
  - Packaging smoke checks and manifest completeness checks.
- **Risk handling for `--open`**:
  - Treat open as best-effort and never a gate for success.
  - Log launch attempts and failures in `--json` diagnostics and manifest.
  - In CI/non-interactive runs, force `none` behavior to avoid process/UX issues.
- **Risk handling for `--attest/--verify`**:
  - Keep `--attest-key` local-only and optional; default to unsigned hash-chain mode.
  - Record key-id metadata (never key material) in provenance.
  - Fail deterministically with actionable drift report when environment or inputs differ.

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

### Deepened Research Insights

**Risk register (sample):**
- **R-PATHTRAVERSAL (Owner: CLI security):** Windows and symlink traversal bypass.
  - Mitigation: canonical path policy + adversarial fixture tests.
- **R-SCRIPTDEP (Owner: Tooling):** Mermaid/git availability drift.
  - Mitigation: explicit dependency checks + immutable execution contract.
- **R-DIFFSCALE (Owner: Performance):** Large git diffs.
  - Mitigation: `--name-status`/metadata-first path and bounded fallback summary.
- **R-VERIFY (Owner: Reliability):** `--verify` side effects.
  - Mitigation: hard denylist of writes/launch in verify mode + regression tests.

## Documentation Plan

### Plan intent

- Create `docs/README.md` as the single source of truth for `diagram workflow` usage.
- Keep docs implementation-focused and avoid duplication in plans, changelogs, and issue templates.
- Ensure docs are usable without model access or remote services.

### Doc requirements

- Audience: intermediate-to-advanced CLI users and maintainers.
- Scope: command contract, output contracts, troubleshooting, and verification flow for workflow commands.
- Non-scope: hosted model execution, remote PR provider integrations, and package-distribution documentation.
- Owner: CLI maintainer; updates are required whenever command flags or outputs change.
- Review cadence: each feature flag or schema change before merge.

### Targeted documentation structure updates

1. **`docs/README.md` — Workflow command block**
   - Add a dedicated section `## Workflow commands`.
   - Add a command matrix with columns:
     - command
     - required inputs
     - outputs
     - failure handling
   - Add a `### Prerequisites` subsection with Node/git expectations.

2. **`docs/README.md` — `workflow state` section**
   - Clarify input formats and deterministic behavior.
   - Document `--validate-only`, `--json`, `--manifest`, and exit-code mapping.
   - Include one happy-path command and one validation failure command.

3. **`docs/README.md` — `workflow pr` section**
   - Clarify local-ref resolution and failure classes (`base/head` resolution, shallow clone).
   - Document prompt-pack behavior as artifact-only (no model execution).
   - Add examples for `--open=auto`, `--open=all`, and `--open=none`.

4. **`docs/README.md` — Reproducibility section**
   - Add explicit `Reproducibility & Verify` subsection:
     - what `--attest` captures and where `provenance.json` is written
     - required immutable inputs for `--verify`
     - common drift classes and likely remediation.

5. **Troubleshooting and risk section**
   - Document top failure classes with corrective actions:
     - path validation and traversal prevention
     - missing or invalid git refs
     - output write permissions
     - interactive launch policy in CI
     - large/binary diffs and truncation mode

6. **Validation section**
   - Add a `### Verify` block with expected outputs:
     - manifest path and shape
     - `--json` status and diagnostic patterns
     - attestation file and signature metadata.

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
diagram workflow state --input workflow.yml --output artifacts/state.mmd --validate-only
diagram workflow state --input workflow.yml --output artifacts/state.mmd --manifest artifacts/manifest.json --open auto
diagram workflow state --input workflow.yml --output artifacts/state.mmd --attest --attest-key ~/.config/diagram/attest-key.pem
diagram workflow pr --base main --head HEAD --output artifacts/pr-explainer.html --manifest artifacts/manifest.json --prompt-pack
diagram workflow pr --base main --head HEAD --output artifacts/pr-explainer.html --open all
diagram workflow pr --base main --head HEAD --output artifacts/pr-explainer.html --verify artifacts/provenance.json
```

### Debugging
- Use `--validate-only` first.
- Inspect `manifest.json` (or explicit `--manifest` path) for artifact completeness and missing outputs.
- Check path/read errors before rerunning render-heavy commands.
- `--open` is disabled in non-interactive runs unless explicitly allowed by environment policy.
- Re-run failed outputs with `--verify artifacts/provenance.json` to isolate replay drift vs runtime transient error.


**Edge Cases:**
- Add separate examples for spaces in paths, Unicode filenames, and empty diffs.
- Clarify whether `--prompt-pack` is metadata-only and intentionally non-executing.

### References
- `docs/README.md` canonical doc path for command contracts and troubleshooting.
- `docs/architecture-testing.md` for quality and verification style.
- `CHANGELOG.md` for release-level feature framing.
- Repo policy files: `README`, `CONTRIBUTING`, `SECURITY`, `SUPPORT`.

### Deepened Research Insights

**Doc-first implementation checklist:**
- Add `workflow` command matrix in `docs/README.md` (flags, outputs, exit codes, examples).
- Add a troubleshooting map for error classes with remediation examples.
- Include reproducibility examples (`--attest` + `--verify`) as separate quick checks.

**Community/operability polish:**
- Add references to manifest schema files and sample artifacts used in tests to avoid docs drift from implementation.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md](docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md)
- Key decisions carried forward:
  - local-first and deterministic architecture
  - both artifact tracks in V1
  - local git refs only for PR flow
  - prompt-pack artifacts without model execution

### Internal references

- [Brainstorm: requirements + alternatives](docs/brainstorms/2026-02-26-local-first-non-code-artifact-workflows-brainstorm.md)
- [CLI dispatch and subcommand wiring](src/diagram.js)
- [Rule and validation behavior](src/rules.js)
- [Formatter output behavior](src/formatters/index.js)
- [Project scripts and quality gates](package.json)
- [Regression suite entry points](scripts/deep-regression.js)
- [Architecture testing plan (deepened)](docs/plans/2026-02-24-feat-architecture-testing-rules-validation-plan-deepened.md)
- [Architecture testing reference points](docs/architecture-testing.md)
- [Bug audit evidence](BUG_AUDIT_REPORT.md)
- [Earlier planning baseline 1](docs/plans/2026-02-24-feat-architecture-testing-rules-validation-plan.md)
- [Earlier planning baseline 2](docs/plans/2026-02-24-feat-architecture-testing-rules-validation-plan-deepened.md)

### Reference quality checks

- Prefer anchorless relative links for local files during planning to avoid broken line-number references after edits.
- Before merging: run one link sweep on this section and `docs/README.md` to confirm no missing local targets.
- Group evidence references by type (Brainstorm, implementation, tests, security/risk) to reduce lookup time for reviewers.

### External references

- CLI patterns: [Command Line Interface Guidelines](https://clig.dev/)
- Commander internals & usage: [tj/commander.js README](https://github.com/tj/commander.js)
- Node path security and resolution: [Node.js Path API](https://nodejs.org/api/path.html), [Node.js fs API](https://nodejs.org/api/fs.html)
- YAML parsing/options: [eemeli YAML docs](https://eemeli.org/yaml/)
- Mermaid CLI usage and options: [mermaid-js/mermaid-cli](https://github.com/mermaid-js/mermaid-cli)
- Git diff behavior: [git diff docs](https://git-scm.com/docs/git-diff)
- SLSA provenance principles (inspiration for envelope fields): [SLSA](https://slsa.dev/spec/v1.0)

### Related work

- Existing plan baseline:
  - [Architecture testing baseline plan](docs/plans/2026-02-24-feat-architecture-testing-rules-validation-plan.md)
  - [Architecture testing deepened plan](docs/plans/2026-02-24-feat-architecture-testing-rules-validation-plan-deepened.md)

### Link/checklist recommendations

#### Recommended quick link checks

- `docs/README.md` should link to:
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `SUPPORT.md`
  - `CHANGELOG.md`
  - `LICENSE`
- Add links from this plan section to the exact plan sections that define:
  - manifest schema expectations
  - attestation behavior
  - open/launch behavior

#### Recommended docs checklist snapshot (`references/CHECKLIST.md`)

- Structure and navigation: TOC exists, informative headings, prerequisite→quickstart→troubleshooting flow.
- Skimmability: short topic sentences + bulleting for flag semantics and failure modes.
- Correctness and verification: verify outcomes and unknowns are explicit.
- Requirements/risks: assumptions and risk assumptions are documented for docs with operational impact.
- Community health: CODEOWNERS currently not present at repo root (`CODEOWNERS` gap to decide).

### Deepened Research Insights

**Additional authoritative references:**
- Commander.js docs for error/output and exit behavior (via Context7: `/tj/commander.js`).
- Mermaid CLI option and rendering docs (via Context7: `/mermaid-js/mermaid-cli`).
- YAML parser semantics and schema options (via Context7: `/eemeli/yaml`).
- Node.js `path` and `fs.realpath` APIs (Node docs).
- Git `diff` docs and platform diff-limit guidance.
- Node path traversal CVE advisory context (2025 Node advisory) for high-risk path cases.
