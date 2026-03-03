---
date: 2026-03-03
topic: visual-explainer-integration
status: refined
title: Visual Explainer Integration for PR Review
---

# Brainstorm: Visual Explainer Integration for PR Review

## What We're Building

Add a deterministic, local-only **review explainer layer** to `diagram-cli` that improves how architecture-impact results are presented during PR review. The first release should make `diagram workflow pr` artifacts more immediately understandable to humans while preserving current analysis behavior.

The proposal is to enrich the existing `pr-impact.html` output with stronger narrative structure, reviewer-friendly summaries, and clearer risk articulation tied directly to changed components and blast radius.

The result should still be fully machine-readable via `pr-impact.json` for tooling and easy to consume in CI, while `pr-impact.html` becomes the human gateway for architecture review.

## Why This Approach

This is a **minimal-risk, V1-first** direction: `diagram workflow pr` already exists, already emits JSON + HTML, and already has manifest/CI integration and tests. Enhancing that path avoids creating a new command family before we validate usage patterns, while still unlocking the exact value you named: clearer PR review narrative.

YAGNI check: we do **not** add model-assisted generation in V1, do **not** add new artifact command families, and do **not** require external services. We can evolve into reusable templates only after proving reviewer benefit and adoption.

## Approaches Considered

### Approach A (Recommended): Extend current `workflow pr` HTML template
**Description (2–3 sentences):** Keep the current command and artifact contract intact, but improve `pr-impact.html` with structured sections: what changed, why it matters, risk breakdown, and next reviewer actions. Keep output generation purely local and deterministic.

**Pros:** Smallest blast radius, faster delivery, less risk to existing CI and manifest consumers, easier to validate quickly.

**Cons:** Reuse across non-PR explainers will come later.

**Best when:** You need fast value for PR review without changing command behavior.

### Approach B: Add a shared explainer renderer library first
**Description:** Introduce shared template fragments used by `pr-impact` and future explainers (plan/project/fact-check style).

**Pros:** Cleaner consistency and lower long-term duplication.

**Cons:** Higher V1 complexity; larger surface for validation and regressions.

**Best when:** You are already committing to multiple explainer types in the same release.

### Approach C: Create `workflow explain` + `workflow pr`
**Description:** Keep PR analysis current but add a second explain command for non-PR use cases.

**Pros:** Better product taxonomy and cleaner future growth.

**Cons:** Adds new command UX decisions and documentation burden in V1.

**Best when:** Multi-audience narrative outputs are a current priority.

## Key Decisions

- **V1 scope:** PR review-first explainers only, centered on `diagram workflow pr`.
- **Determinism:** No model calls, no network calls, and stable artifact ordering.
- **Compatibility:** Keep manifest and artifact paths stable (`.diagram/pr-impact`).
- **Quality bar:** Keep JSON as source-of-truth; improve HTML as a human digest.
- **Success metric:** Faster triage for changes in `auth`, `security`, and `database` areas.

## Open Questions

None.

## Next Steps

Proceed to planning when ready: `/prompts:workflow-plan`.
