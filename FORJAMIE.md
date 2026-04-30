# FORJAMIE — diagram-cli

<!-- BRIEF: auto-updated by agents. Edit the static sections below manually. -->

## Table of Contents

- [Status](#status)
- [What this project does](#what-this-project-does)
- [Production timeline](#production-timeline)
- [What's done / what's not](#whats-done--whats-not)
- [Recent changes](#recent-changes)
- [Learnings & gotchas](#learnings--gotchas)
- [How to run locally](#how-to-run-locally)

## Status

<!-- STATUS_START — agents update this block -->
**Last updated:** 2026-04-30
**Production status:** LIVE
**Overall health:** 🟡 PR #75 triage in progress — local gate recovery underway

| Area | Status | Notes |
| --- | --- | --- |
| Build / CI | 🟡 | PR #75 still needs final PR readiness pass and CodeRabbit to settle |
| Tests | 🟡 | `npm test` green; deep regression and harness gates being rerun |
| Open PRs | 1 | #75 [codex] Align governance scope defaults |
| Blockers | 2 | Deep regression hit npm cache ownership drift; harness closeout metadata was stale |
<!-- STATUS_END -->

## What this project does

<!-- One paragraph. Written by a human or agent once, not auto-updated. -->

## Production timeline

<!-- GANTT_START — agents update this block -->
```mermaid
gantt
  title diagram-cli — production timeline
  dateFormat YYYY-MM-DD
  section Shipped
    Foundation :done, 2026-01-01, 2026-02-01
  section In progress
    Current milestone :active, 2026-02-01, 2026-03-15
  section Planned
    Next milestone : 2026-03-15, 2026-04-01
```
<!-- GANTT_END -->

## What's done / what's not

<!-- PROGRESS_START — agents update this block -->
| Feature | Done? | Notes |
| --- | --- | --- |
| Example feature | ✅ | Shipped in v1.2 |
| Example feature 2 | 🚧 In progress | ETA 2026-03-15 |
| Example feature 3 | 🔜 Planned | Not started |
<!-- PROGRESS_END -->

## Recent changes

<!-- CHANGES_START — agents prepend entries here, newest first -->

### 2026-04-30

- **PR #75 triage pass:** Re-ran local validation for `[codex] Align governance scope defaults`; `npm test` passed, `npm run test:deep` exposed an npm cache ownership dependency inside `scripts/deep-regression.js`, and `harness:check` surfaced stale closeout metadata in `memory.json` / `FORJAMIE.md`.

### 2026-04-07

- **CI full pipeline hardening (PR #56):** Comprehensive CI fixes:
  - Added `registry-url` + `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` to all workflow `setup-node` steps across 4 workflow files
  - Bumped `@brainwav/coding-harness` from `^0.6.0` to `^0.12.0`, regenerated `package-lock.json`
  - Bumped `node-version` from `20` to `24` across all workflow files (CI now runs on Node 24; `engines.node` in package.json remains `>=18` for consumers)
  - Moved `CONTRACT_PATH` from `$RUNNER_TEMP` into `.harness/` inside workspace (harness flags out-of-cwd paths as path traversal)
  - Fixed `pnpm exec tsx src/cli.ts drift-gate` → `npx harness drift-gate` for both advisory and health drift-gate jobs
  - Added missing npm scripts `lint`, `typecheck`, `audit`, `check` required by harness-generated pipeline jobs
- **CodeQL remediation (merged PR #55):** All 6 open CodeQL scanning alerts resolved — 4× unused variable (`crypto` ×2, dead function, unused binding) removed; 2× TOCTOU race fixed with atomic `wx` flag write and `openSync`+`fstatSync(fd)` byte-size guard.

### 2026-03-09

- What changed and why

<!-- CHANGES_END -->

## Learnings & gotchas

<!-- Point to shared Learnings.md or add project-specific notes here -->
See also: `~/.codex/instructions/Learnings.md`

- {Project-specific gotcha, if any}

## How to run locally

```bash
# Add project-specific commands here
```

---
<!-- MACHINE_READABLE_START
project: diagram-cli
repo: ~/dev/diagram-cli
status: LIVE
health: green
last_updated: 2026-04-30
open_prs: 1
blockers: local gate recovery in progress for PR #75
next_milestone: Clear deep regression and harness gate blockers for PR #75
next_milestone_date: 2026-04-30
MACHINE_READABLE_END -->
