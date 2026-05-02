---
schema_version: 1
title: Archscope Evidence Report UI Spec
type: ui-spec
status: draft
date: 2026-05-01
parent_spec: docs/specs/2026-05-01-feat-archscope-architecture-evidence-experience-spec.md
parent_plan: docs/plans/2026-05-01-feat-archscope-architecture-evidence-experience-plan.md
ui_required_for: .diagram/report.html
---

# Archscope Evidence Report UI Spec

## Table of Contents

- [Purpose](#purpose)
- [Product Role](#product-role)
- [Invocation Policy](#invocation-policy)
- [Information Architecture](#information-architecture)
- [Modes](#modes)
- [Interaction and States](#interaction-and-states)
- [Responsive Requirements](#responsive-requirements)
- [Accessibility Requirements](#accessibility-requirements)
- [Content Contract](#content-contract)
- [Artifact and Manifest Contract](#artifact-and-manifest-contract)
- [Visual Acceptance Criteria](#visual-acceptance-criteria)
- [Verification Plan](#verification-plan)
- [Traceability](#traceability)
- [Implementation Handoff](#implementation-handoff)

## Purpose

This UI spec defines the required behavior and acceptance criteria for
`.diagram/report.html`, the generated human-facing Archscope evidence report.
The parent product spec requires this companion UI spec before `report.html` can
be marked complete.

This document does not implement the report. It freezes the product, layout,
accessibility, and verification contract that P5 must satisfy.

## Product Role

The report is the richer human entrypoint for an Archscope evidence pack. It
must help a maintainer understand repository or PR architecture evidence without
reading raw JSON first.

The report must not become a separate source of truth. It renders the same
normalized evidence model used by:

- `.diagram/manifest.json`
- `.diagram/brief.md`
- `.diagram/agent-context.json`
- `.diagram/architecture.mmd`
- `.diagram/pr-impact/pr-impact.json` when present

Agents and CI continue to read `.diagram/manifest.json` first. The report is for
human scanning, review, and handoff.

## Invocation Policy

P5 must implement `report.html` generation as part of `archscope scan` by
default once the report writer satisfies this UI spec.

Required behavior:

- `archscope scan .` writes `.diagram/report.html` when report generation
  succeeds.
- `archscope scan . --base <ref> --head <ref>` writes `.diagram/report.html`
  with PR sections when PR evidence is available.
- Failed report generation must exit non-zero while preserving the useful
  non-visual evidence already written.
- Failed report generation must mark the report artifact `failed` in
  `.diagram/manifest.json` with a stable `report_generation_unavailable` or
  `write_failure` category.
- Environments that cannot render the report must still produce `brief.md`,
  `agent-context.json`, `architecture.mmd`, and `manifest.json`, with the
  manifest recording `report.html` as `failed`.

Deferred follow-up:

- A future `--no-report` or artifact profile option may be added for constrained
  environments, but P5 does not require it.

## Information Architecture

The report must use this top-level order:

1. Header summary
2. Evidence status
3. Risk and review focus
4. Architecture components
5. Dependency neighborhood
6. Diagrams
7. Validation and evidence
8. Agent handoff
9. Raw artifacts

The first viewport must show:

- product name or report title
- repository or PR mode
- generated status
- primary risk or evidence status
- the next most important section starting below the fold

No migration or finalization machinery may appear in the first viewport unless
the current evidence pack specifically contains a migration/finalization failure.

## Modes

### Repository Scan Mode

Used when `scan` runs without comparison refs.

Required sections:

- repository summary
- detected components
- architecture areas
- diagram preview or Mermaid source block
- validation summary
- agent handoff
- raw artifact links

Risk content may be shown as `unknown` or `not evaluated` in repository mode.

### PR Review Mode

Used when `scan` runs with comparison refs and PR evidence is available.

Required sections:

- PR base and head refs
- changed components
- changed files summary
- blast radius
- risk level
- risk reasons
- suggested reviewer checks
- PR impact artifact link
- agent handoff

When PR refs are unavailable, the report must remain useful in repository mode
and show the PR evidence failure as a recoverable warning.

## Interaction and States

The report is a local static HTML artifact. It must not require a server,
network access, external fonts, CDN scripts, or hosted assets.

Required interactions:

- expandable raw artifact details
- copyable artifact path text using plain selectable text
- intra-page navigation links for major sections
- accessible fallback when JavaScript is disabled

Required states:

- success
- partial
- failed report with non-visual evidence still available
- repository mode
- PR mode
- unavailable PR refs
- empty or low-signal repository

## Responsive Requirements

The report must be readable at:

- 375px mobile width
- 768px tablet width
- 1280px desktop width

Responsive rules:

- No horizontal page scrolling for normal content.
- Tables may become stacked lists on mobile.
- Mermaid source blocks and raw JSON links may scroll inside their own region.
- Header summary and risk/status content must not overlap at any viewport.
- Navigation must remain usable with keyboard and touch.

## Accessibility Requirements

P5 must satisfy these minimum accessibility requirements:

- Valid document language and title.
- One `h1` and ordered heading hierarchy.
- Landmark structure for header, main, navigation, and footer or equivalent
  semantic regions.
- Text contrast at least WCAG AA for normal and large text.
- Keyboard access to links, expandable sections, and navigation.
- Visible focus states.
- Status and risk must not rely on color alone.
- Diagrams must include a text alternative or adjacent summary.
- Raw artifact links must have descriptive labels.
- Generated timestamps must be machine-readable when shown.

## Content Contract

The report must render from the same evidence model as the non-visual pack.

Required content fields:

- command and mode
- manifest path
- primary human artifact
- primary agent artifact
- generated artifact statuses
- warnings and errors
- detected or changed components
- architecture areas when available
- validation evidence when available
- agent handoff and read order

PR mode additionally requires:

- base ref
- head ref
- risk level
- risk reasons
- blast radius
- suggested reviewer checks
- PR impact artifact path

Unsupported claims must render as `unknown`, `not evaluated`, or `unavailable`
rather than inventing confidence.

## Artifact and Manifest Contract

When report generation succeeds:

- `.diagram/report.html` exists.
- `.diagram/manifest.json` records the `report` artifact as `written`.
- `primaryHumanArtifact` becomes `.diagram/report.html`.
- `.diagram/brief.md` remains written and indexed.
- `.diagram/manifest.json` remains first in `artifactReadOrder`.

When report generation fails:

- `.diagram/report.html` may be absent or partial.
- `.diagram/manifest.json` records the `report` artifact as `failed`.
- `primaryHumanArtifact` remains `.diagram/brief.md`.
- Required non-visual artifacts remain available when their writers succeed.
- Scan machine output records a stable report error category.

## Visual Acceptance Criteria

| ID   | Acceptance Criteria                                                                                                                                 | Parent Mapping |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| VAC1 | Report renders as a complete static HTML document without external network requests.                                                                | SA6            |
| VAC2 | First viewport identifies Archscope evidence, mode, status, primary risk/evidence state, and hints at the next section.                             | SA6            |
| VAC3 | Repository mode includes summary, detected components, diagrams, validation/evidence, agent handoff, and raw artifact links.                        | SA6            |
| VAC4 | PR mode includes base/head refs, changed components, blast radius, risk, risk reasons, reviewer checks, agent handoff, and PR impact artifact link. | SA6            |
| VAC5 | Report preserves non-visual evidence as source of truth and links to manifest, brief, agent context, diagram, and PR impact artifacts.              | SA6            |
| VAC6 | Report remains readable without horizontal page scroll at 375px, 768px, and 1280px widths.                                                          | SA6            |
| VAC7 | Keyboard navigation, focus states, semantic headings, and non-color status cues satisfy the accessibility requirements in this spec.                | SA6            |
| VAC8 | Report failure keeps scan useful by preserving non-visual artifacts and manifest status semantics.                                                  | SA6            |
| VAC9 | This UI spec exists and is linked before P5 marks `report.html` complete.                                                                           | SA15           |

## Verification Plan

P5 must add verification that covers:

- static render smoke for repository mode
- static render smoke for PR mode
- report failure path and manifest status fallback
- no external network asset references
- responsive screenshot or DOM layout check at 375px, 768px, and 1280px
- keyboard/focus and semantic heading checks
- artifact link existence checks against the generated evidence pack

Suggested commands for P5 to finalize:

```bash
npm test -- test/scan-report-html.test.js
npm run docs:style:changed
bash scripts/verify-work.sh --fast
npm test
npm run test:deep
```

## Traceability

Parent product spec:

- `SA6`: HTML report supports scan and PR modes with required evidence sections.
- `SA15`: Companion UI spec exists before report implementation is accepted.

Parent plan:

- `AC11`: Companion UI spec exists and maps report visual acceptance to SA6 and
  SA15.
- `P4`: Create this UI spec before P5.
- `P5`: Implement `report.html` according to this UI spec.

## Implementation Handoff

Next phase: P5 / Unit 6.

Implementation must render `report.html` from existing scan evidence data and
must not create a second analysis pipeline. If P5 cannot satisfy this UI spec
without changing the non-visual evidence contract, stop and update the plan
before implementation continues.
