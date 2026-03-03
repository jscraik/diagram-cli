---
title: feat: Add PR Review Explainer Template Enhancements
type: feat
status: completed
date: 2026-03-03
origin: docs/brainstorms/2026-03-03-visual-explainer-integration-brainstorm.md
---

# ✨ feat: Add PR Review Explainer Template Enhancements

## Enhancement Summary

**Deepened on:** 2026-03-03  
**Sections enhanced:** 11  
**Research agents used:** local code/docs review, `diagram-cli` skill, `writing-plans`, `test-driven-development`, `fixing-accessibility`, `cli-spec`-based contract checks, security-focused review

### Key Improvements

1. Aligned plan checks with actual `workflow pr` behavior (especially early return on empty diff and `--json`-driven artifact skipping).
2. Added explicit coverage for payload-driven grouping (`changedFiles`, `renamedFiles`, `addedFiles`, `deletedFiles`, `unmodeledChanges`) and `risk.override.*` traceability.
3. Strengthened deterministic, accessible HTML rendering requirements and added regex-style guardrails for stable structure and escaping.

### New Considerations Discovered

- The plan uses an explicit no-change policy: keep current behavior. For empty diffs, non-JSON and `--json` paths intentionally do not write artifacts before returning.
- `changedComponents` is architectural diff, not path status; grouped-change output should use dedicated file status arrays.
- `--json` is the actual output-quieting switch; there is no `--json-only`/`--no-html` flag in this CLI path.
- Risk override fields are already available in payload (`risk.override.*`) and should be surfaced in HTML for auditability.

---

## Section Manifest

1. **Objective and Boundaries** — validate scope (V1 narrative-only PR explainer) and invariant assumptions.
2. **Task 1 — Baseline lock and pre-checks** — verify real CLI contract and payload shape from code/docs.
3. **Task 2 — Build PR explainer content model** — research helper-style, deterministic model construction.
4. **Task 3 — Extend HTML renderer sections** — map reviewer-facing sections to concrete payload keys.
5. **Task 4 — Safety hardening and deterministic output** — security, escaping, ordering, and accessibility semantics.
6. **Task 5 — Add regression test hooks** — define RED→GREEN gated tests and stability assertions.
7. **Task 6 — Documentation and changelog updates** — synchronize external-facing guidance with true behavior.
8. **Task 7 — Execution gates and handoff checks** — create compatibility matrix and release-ready sequencing.
9. **Acceptance Criteria** — strengthen contract-level criteria for machines + reviewers.
10. **Risk Register** — add code-grounded and accessibility-driven risks.

## Table of Contents

- [Enhancement Summary](#enhancement-summary)
- [Section Manifest](#section-manifest)
- [Table of Contents](#table-of-contents)
- [Objective and Boundaries](#objective-and-boundaries)
- [Execution-Ready Decomposition](#execution-ready-decomposition)
  - [Task 1 — Baseline lock and pre-checks](#task-1--baseline-lock-and-pre-checks)
  - [Task 2 — Build PR explainer content model](#task-2--build-pr-explainer-content-model)
  - [Task 3 — Extend HTML renderer sections](#task-3--extend-html-renderer-sections)
  - [Task 4 — Safety hardening and deterministic output](#task-4--safety-hardening-and-deterministic-output)
  - [Task 5 — Add regression test hooks](#task-5--add-regression-test-hooks)
  - [Task 6 — Documentation and changelog updates](#task-6--documentation-and-changelog-updates)
  - [Task 7 — Execution gates and handoff checks](#task-7--execution-gates-and-handoff-checks)
- [Acceptance Criteria](#acceptance-criteria)
- [Risk Register](#risk-register)

## Objective and Boundaries

Improve the existing `diagram workflow pr` HTML artifact (`pr-impact.html`) to be reviewer-friendly while keeping machine output unchanged (`pr-impact.json`), with no new flags, no external calls, and zero contract changes outside presentation.

## Execution-Ready Decomposition

### Task 1 — Baseline lock and pre-checks

**Outcome:** confirm all required starting conditions and current behavior are captured before edits.

**File targets:**
- `docs/plans/2026-03-03-feat-add-pr-review-explainer-template-plan.md` (this file)
- `src/diagram.js`
- `README.md`
- `docs/architecture-testing.md`
- `CHANGELOG.md`
- `test/rules.test.js` (or new `test/pr-impact.test.js`)

**Steps:**
1. Re-open the existing `generateHtmlExplainer` and `writePrImpactArtifacts` sections.
2. Confirm line references for artifact paths and risk/blast-radius payloads.
3. Record acceptance gates and assumptions in this plan (no hidden prerequisites).

**Verification commands:**
- `rg "function generateHtmlExplainer|function writePrImpactArtifacts|workflow pr" src/diagram.js`
- `rg "pr-impact\.json|pr-impact\.html|workflow pr" README.md docs/architecture-testing.md`
- `rg "risk\.level|risk\.flags|risk\.factors|blastRadius" src/diagram.js`

**Checkpoint:** proceed only after output fields in `generateHtmlExplainer` are confirmed and stable (`result.risk`, `result.changedComponents`, `result.blastRadius`, `result.unmodeledChanges`, `result.renamedFiles`, `result.addedFiles`, `result.deletedFiles`).

### Research Insights

**Best practices:**
- Add a **CLI Contract Lock** subsection to avoid accidental behavior drift in V1 (command name, options, default artifact paths).
- Validate empty-change behavior against real code before implementation: this path currently exits early before `writePrImpactArtifacts` in non-JSON mode.

**Performance considerations:**
- Capture behavior checks using fixture repos/refs once, not repeated manual snapshots; cache base/head examples for repeatable regression.

**Implementation details:**
- Add a compatibility matrix task for:
  - `diagram workflow pr . --base <base> --head <head> --json` (non-empty): verify JSON parseable output and verify `pr-impact.json` is written while `pr-impact.html` is not.
  - `diagram workflow pr . --base <base> --head <head>` (non-empty): verify both `pr-impact.json` and `pr-impact.html` are written.
  - `diagram workflow pr . --base <base> --head <head>` where refs are identical (empty diff): verify deterministic no-artifact behavior and documented exit path.
- Include explicit assertions for this policy in tests and docs.

**Edge cases:**
- Empty diff: lock to current behavior. Both `--json` and non-JSON empty-diff flows do not emit `.diagram/pr-impact/*`; `--json` returns machine output on stdout and non-JSON prints a concise status message.
- Malformed refs / invalid options should keep current commander behavior and documented exit mapping.

**References:**
- `src/diagram.js:2356`, `src/diagram.js:2475-2526`, `src/diagram.js:2958-2976`
- `README.md`, `docs/architecture-testing.md`, `src/diagram.js` command handling near `workflow pr`

---

### Task 2 — Build PR explainer content model

**Outcome:** model the HTML content in deterministic arrays/maps before string concatenation.

**File targets:** `src/diagram.js`

**Steps:**
1. Add private helper(s) inside `src/diagram.js` near other local helpers:
   - path-group helper for `{ changed, renamed, added, deleted, unmodeled }` with stable sort and unique + bounded preview defaults.
   - risk narrative helper mapping flags/factors/risk score to readable bullets.
   - summary helper for core counters and metadata defaults.
2. Include fallback defaults so missing payload fields render safely (`[]`, `0`, `'unknown'`, etc.).

**Verification commands:**
- `node -e "const fs=require('fs'); const c=fs.readFileSync('src/diagram.js','utf8'); ['groupChangePaths','buildRiskNarrative','buildSummaryMeta'].forEach(n=>{if(!c.includes(n)) process.exitCode=1;});"`

**Checkpoint:** no renderer string is changed in this task; only reusable deterministic model functions are added.

### Research Insights

**Best practices:**
- Use pure helper functions returning plain data objects, then render in one final template step. This improves testability and ordering guarantees.
- Keep `escapeHtml()` applied right at render boundary, not deep inside helper sorting/mapping.

**Performance considerations:**
- Memoize computed path groups once per render; avoid repeated filter/reduction of same arrays.

**Implementation details:**
- Source grouping from payload keys that already exist in CLI result:
  - `result.changedFiles`, `result.renamedFiles`, `result.addedFiles`, `result.deletedFiles`, `result.unmodeledChanges`
  - keep `result.changedComponents` as the architectural impact section.
- Sort inputs before rendering and preserve deterministic `slice()` caps where list previews are bounded.

**Edge cases:**
- Missing arrays or `null` values should render as explicit empty states.
- File names with special chars must stay escaped in template output.

**References:**
- `src/diagram.js:2599-2604` (status-based paths), `src/diagram.js:2604-2608` (`changedComponents` mapping path), `src/diagram.js:2762`, `src/diagram.js:2842`

---

### Task 3 — Extend HTML renderer sections

**Outcome:** enrich `generateHtmlExplainer(result)` with explicit reviewer sections and stable ordering.

**File targets:** `src/diagram.js`

**Steps:**
1. Preserve existing data flow and canonical JSON contract.
2. Replace component-only rendering with sectioned output:
   - Executive summary (risk, score, risk state, counts)
   - Change story grouped by path status
   - Risk explanation with rationale tied to flags/factors
   - Blast-radius walk with truncation note
   - Action checklist
3. Ensure deterministic ordering via helper outputs from Task 2.
4. Keep `escapeHtml` on all runtime strings.

**Verification commands:**
- `node - <<'NODE'\nconst fs=require('fs');
const src=fs.readFileSync('src/diagram.js','utf8');
const required=['Change Story','Risk Reasoning','Blast Radius','Action Checklist','Risk Level'];
const missing=required.filter(s=>!src.includes(s));
if(missing.length) {console.error('missing headings', missing); process.exit(1)}
console.log('sections-present');
NODE`

**Checkpoint:** generated HTML must include all five section headings in a non-empty run and still render `no changes detected` for empty diff paths.

### Research Insights

**Best practices:**
- Add explicit renderer sections for:
  - direct changed footprint
  - blast-radius impacted scope + truncation
  - risk override attribution (`result.risk.override.applied`, `override.reason`).
- Keep wording reviewer-first: “what changed → why risky → what to review next.”

**Performance considerations:**
- Keep expensive string operations on arrays bounded by defaults to avoid very large HTML bloat.

**Implementation details:**
- Add `override` subsection only when `result.risk?.override?.applied` is true.
- Include blast-radius truncation metadata in narrative (`depth`, `truncated`, `omittedCount`) so reviewers can distinguish full/partial expansion.
- Use semantic section wrappers (`<main>`, `<section aria-labelledby=...>`, `<h2>/<h3>` hierarchy).

**Edge cases:**
- Empty payload should still emit coherent no-change sections (or explicit no-artifact plan decision).
- Mixed change set where same path appears in multiple status buckets should be deduped.

**References:**
- `src/diagram.js:2606-2611`, `src/diagram.js:2617-2620`, `src/diagram.js:2652-2666`, `src/diagram.js:2701-2756`, `src/diagram.js:2819-2872`

**Research-augmented acceptance:**
- `[ ] include explicit risk override section when overrides are applied` 
- `[ ] include blast radius truncation statement when `blastRadius.truncated` is true`

---

### Task 4 — Safety hardening and deterministic output

**Outcome:** prevent regressions and keep output diff-stable over repeated runs.

**File targets:** `src/diagram.js`

**Steps:**
1. Ensure every newly inserted dynamic value is escaped through `escapeHtml`.
2. Keep no new script tags, no inline event handlers, and no dynamic eval.
3. Stabilize sort order in risk/action/path lists.
4. Keep truncation logic explicit and user-visible in both UI and narrative copy.

**Verification commands:**
- `rg "escapeHtml\(" src/diagram.js`
- `node - <<'NODE'\nconst fs=require('fs'); const src=fs.readFileSync('src/diagram.js','utf8'); if(!src.includes('const escapeHtml')) process.exit(1); if(!src.includes('aria-labelledby')) console.warn('warning: aria landmark check missing'); console.log('checks-done');\nNODE`

**Checkpoint:** run one manual diff-review of generated HTML blocks: identical fixture input should produce identical section ordering and text ordering.

### Research Insights

**Best practices:**
- Prefer static semantic HTML; avoid introducing JS interaction in V1 for reviewer safety and predictability.
- Escape every runtime value at render boundary; do not rely on trust boundaries of git output.

**Accessibility findings:**
- Add a `<main>` wrapper, consistent heading levels (no skips), and list-based grouped sections (`<ul>/<li>`).
- Avoid color-only status signals; keep explicit text (“Risk: High”, “No risks detected”).

**Performance considerations:**
- Keep deterministic ordering deterministic even when object keys are not guaranteed by JS insertion order in intermediate maps.
- Sort on stable keys (status + path + component name) to make snapshots stable.

**Implementation details:**
- Include lightweight structure checks in tests: one `<main>`, one `<h1>`, and section-level lists.
- For no JS mode, explicitly assert no new script/event-handler markers are added.

**References:**
- `src/diagram.js:2827-2835`, `src/diagram.js:2819-2872`

---

### Task 5 — Add regression test hooks

**Outcome:** add targeted, runnable tests for renderer correctness and output stability.

**File targets:**
- `test/pr-impact.test.js` (preferred)
- `test/fixtures/pr-impact-empty.json` (optional)
- `test/fixtures/pr-impact-high-risk.json` (optional)
- `src/diagram.js` (add test export gate if needed)

**Steps:**
1. Add deterministic tests that exercise:
   - empty output path (no components changed)
   - standard mixed-path payload (added/renamed/deleted/unmodeled)
   - high-risk path with ordered flags/factors
   - HTML escaping of `<`, `&`, and quotes in file names/paths.
2. Keep tests under 2–5 minutes each and no external dependencies.
3. If `generateHtmlExplainer` is not directly importable, add a conditional test-only export in `src/diagram.js`.

**Verification commands:**
- `npm test`
- `npm run test:deep`

**Checkpoint:** add at least one test assertion that will fail if section headings or escaping behavior regress.

### Research Insights (RED → GREEN Gates)

#### Gate A — HTML rendering sections
- **RED:** HTML payload lacks required section headings or empty-state copy.
- **GREEN:** HTML includes `Executive Summary`, `Change Story`, `Risk Reasoning`, `Blast Radius`, `Action Checklist`.
- **Command:** `npm test -- test/pr-impact.test.js -t "pr-impact renderer sections"`

#### Gate B — Deterministic order
- **RED:** repeated runs of same fixture produce different heading or list ordering.
- **GREEN:** fixture-to-fixture render digest is stable across 3 consecutive runs.
- **Command:** `npm test -- test/pr-impact.test.js -t "pr-impact render ordering is stable"`

#### Gate C — Blast-radius metadata
- **RED:** truncated blast-radius states do not expose omitted count/depth.
- **GREEN:** HTML contains explicit `truncated`, `depth`, `omittedCount` text when truncation is true.
- **Command:** `npm test -- test/pr-impact.test.js -t "pr-impact blast-radius metadata"`

#### Gate D — Artifact compatibility
- **RED:** empty-diff path writes artifacts unexpectedly or violates the matrix policy.
- **GREEN:** behavior is deterministic and matches the explicit compatibility matrix in Task 7.
- **Command:** `npm test -- test/pr-impact.test.js -t "pr-impact no-change artifact contract"`

**Note:** implement each gate directly in `test/pr-impact.test.js` (no external helper scripts required).

### Testing requirements (expanded)

- [ ] Gate A through D assertions are present and green.
- [ ] Escaping test includes `<`, `&`, `"`, `'`, and nested unicode path names.
- [ ] Empty diff path test pinned to the no-artifact contract:
  - no files + exit 0 for both non-JSON and `--json` empty-diff paths.
- [ ] `npm test` and `npm run test:deep` pass with new assertions.

---

### Task 6 — Documentation and changelog updates

**Outcome:** keep user-facing docs aligned with the new HTML intent.

**File targets:**
- `README.md`
- `docs/architecture-testing.md`
- `CHANGELOG.md`

**Steps:**
1. Add one paragraph to PR artifact docs describing the new explainer flow:
   "what changed → why risky → what to review next".
2. Add a minimal output example listing the new sections.
3. Add changelog note scoped to PR-review artifact readability only.

**Verification commands:**
- `rg "pr-impact\.json|pr-impact\.html|reviewer|risk" README.md docs/architecture-testing.md`
- `rg "PR Review Explainer|pr-impact" CHANGELOG.md`

**Checkpoint:** docs mention canonical file paths unchanged and explicitly note no JSON schema change.

### Research Insights

**Best practices:**
- Document canonical JSON as source-of-truth and HTML as a narrative projection.
- Keep docs aligned with actual CLI behavior around no-change artifact policy and `--json` behavior.

**Implementation details:**
- Add a short “Compatibility and output model” note in both docs:
  - `.diagram/pr-impact/pr-impact.json` (machine-readable, stable contract)
  - `.diagram/pr-impact/pr-impact.html` (human review narrative)
- Add explicit note if no-change mode intentionally does not emit files.

**References:**
- `README.md` `:436+`
- `docs/architecture-testing.md` `:267+`

---

### Task 7 — Execution gates and handoff checks

**Outcome:** provide a clear, sequential, handoff-ready completion gate sequence.

**Compatibility matrix (insert before running gates):**

| Command | Expected artifacts | Expected parsing | Recommended assertion |
| --- | --- | --- | --- |
| `diagram workflow pr . --base <base> --head <head> --json` (non-empty) | `pr-impact.json` only | JSON parseable | assert JSON parses and HTML path is absent |
| `diagram workflow pr . --base <base> --head <head>` (non-empty, non-JSON) | `pr-impact.json`, `pr-impact.html` | not JSON-only | assert both files created |
| `diagram workflow pr . --base <base> --head <head>` (empty diff, non-JSON) | none | text status + exit 0 | assert no files and deterministic message |
| `diagram workflow pr . --base <base> --head <head> --json` (empty diff) | none | text JSON + exit 0 | assert no artifacts and no silent failure |

**Verification commands (run in order):**
1. `npm test`
2. `npm run test:deep`
3. `npm run ci:artifacts`
4. Manual smoke:
   - JSON path: `node src/diagram.js workflow pr --base <known-base> --head <known-head> --json`
     - confirm file policy from compatibility matrix (JSON only)
   - HTML path: `node src/diagram.js workflow pr --base <known-base> --head <known-head>`
     - confirm new section headings and stable ordering in `.diagram/pr-impact/pr-impact.html`.
5. CLI contract checks:
   - `node src/diagram.js workflow pr --help`
   - `node src/diagram.js workflow pr --base bad-ref --head HEAD` (expect exit 2)

**Handoff note to next executor:** stop after each command; if any gate fails, fix before continuing to the next task sequence step. Keep checkpoints in this exact order: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7.

### Research Insights

**Best practices:**
- Add exit-code checks where feasible:
  - `--help` and usage errors should remain stable and documented.
  - Keep `--json` path the deterministic machine-output mode.
- Split manual smoke from automated gates to avoid flaky human verification.

**Performance considerations:**
- Use fixture repositories or temp worktrees for repeatability; avoid remote network in gates.

**Implementation details:**
- Include explicit `--help` snapshot and invalid ref command checks (negative paths).
- If behavior diverges from existing contract, update this plan/compat matrix first, then implementation.

---

## Acceptance Criteria

- [x] Task 1 complete: baseline verified (2026-03-03)
- [x] Task 2 complete: content model helpers added (2026-03-03)
- [x] Task 3 complete: HTML renderer extended with new sections (2026-03-03)
- [x] Task 4 complete: safety hardening verified (2026-03-03)
- [x] Task 5 complete: regression tests added (25 new tests, 47 total) (2026-03-03)
- [x] Task 6 complete: documentation and changelog updated (2026-03-03)
- [x] Task 7 complete: all execution gates passed (2026-03-03)
- [x] `diagram workflow pr --help` output remains stable for command name/options; `--json`, `--verbose`, and risk flags still work.
- [x] `pr-impact.json` schema shape is unchanged.
- [x] `pr-impact.html` contains all new reviewer sections for non-empty diff inputs.
- [x] Output ordering is deterministic across repeated runs.
- [x] All dynamic strings are escaped, and no inline script/eval is introduced.
- [x] Tests for renderer sections, escaping, and empty-state path exist and pass.
- [x] Docs and changelog reflect new behavior and constraints.
- [x] No hidden CLI contract changes are introduced: command name/options remain stable.
- [x] Empty-change behavior is explicitly documented and tested in the compatibility matrix as non-artifact/no-change for both JSON and non-JSON mode.
- [x] Risk override details (`result.risk.override.applied` / `reason`) are reflected in HTML and tests.
- [x] Blast-radius truncation (`truncated`, `omittedCount`, `depth`) is visible to reviewers.

### Research-linked Criteria

- [x] Task 1-7 now include a compatibility policy for no-change path and `--json` behavior.
- [x] Grouping logic uses file status payload keys and does not use `changedComponents` as a path-status fallback.
- [x] Accessibility checks validate heading structure and list semantics.

## Risk Register

- Risk: reviewer sections become too verbose.
  Mitigation: keep each section short, high-signal only.
- Risk: section ordering drifts across refactors.
  Mitigation: enforce canonical sorting in Task 2 and test snapshots in Task 5.
- Risk: testability friction because `generateHtmlExplainer` is not exported.
  Mitigation: add a test-only export path in `src/diagram.js`.
- Risk: unescaped content in path/file/risk fields.
  Mitigation: keep `escapeHtml` checks at render boundary and fixture-driven regression tests.
- Risk: silent ambiguity around empty-diff contract.
  Mitigation: make no-change artifact behavior explicit in acceptance criteria and docs.
- Risk: accessibility regressions (structure/empty states).
  Mitigation: add section/list/heading structure assertions in tests and static review.
