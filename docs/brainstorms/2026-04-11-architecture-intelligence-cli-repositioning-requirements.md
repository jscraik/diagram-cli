---
title: Architecture Intelligence CLI Repositioning and Rename Requirements
date: 2026-04-11
status: draft
spec_required: lite
risk_level: medium
complexity: medium
---

# Architecture Intelligence CLI Repositioning and Rename Requirements

## Table of Contents
- [Problem Frame](#problem-frame)
- [Requirements](#requirements)
- [Approach Comparison](#approach-comparison)
- [Recommendation](#recommendation)
- [Success Criteria](#success-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Key Decisions](#key-decisions)
- [Dependencies and Assumptions](#dependencies-and-assumptions)
- [Outstanding Questions](#outstanding-questions)
- [Next Steps](#next-steps)

## Problem Frame
`diagram-cli` now behaves like an architecture intelligence tool, not only a diagram renderer. It handles policy validation, PR blast-radius/risk analysis, and AI context-pack generation in addition to Mermaid output.

The current name and first-impression messaging understate this broader value. That mismatch creates adoption friction for both humans and AI agents:
- Humans can misclassify the tool as "nice-to-have visualization" instead of "architecture governance + review acceleration".
- AI agents can over-index on the diagram path and underuse the stronger workflow commands (`validate`, `workflow pr`, `context`).

The goal is to make product identity and command experience accurately reflect the real user job: architecture understanding and governance at development speed.

## Requirements
**Positioning and Messaging**
- R1. The tool must have one canonical value proposition sentence that includes diagrams, policy validation, PR risk analysis, and AI context artifacts.
- R2. Documentation entrypoints must describe the tool as architecture intelligence/governance, not only diagram generation.
- R3. Human and AI workflows must be presented as first-class peers in top-level docs.

**Naming and Discoverability**
- R4. The project must define explicit rename criteria: descriptive accuracy, memorability, CLI ergonomics, migration cost, and ecosystem confusion risk.
- R5. The project must choose one naming strategy: retain current name, full rename, or dual-brand transition.
- R6. If a new product name is chosen, migration messaging must preserve continuity for existing `diagram` command users.

**User Experience Clarity**
- R7. Command grouping must make "analyze, validate, workflow, context" feel like the primary lifecycle, with "generate" as one capability within that lifecycle.
- R8. Default behavior must reduce accidental misreads (for example partial analysis mistaken as full analysis).

**Agent Experience Clarity**
- R9. Machine-output contract shape must be consistent enough that agent integrations do not require per-command custom parsing.
- R10. Agent-facing output must prioritize concise summaries and artifact pointers over large inline payloads unless explicitly requested.

## Approach Comparison
| Approach | Description | Pros | Cons | Best Fit |
| --- | --- | --- | --- | --- |
| A. Keep `diagram-cli`, reposition messaging only | Preserve current package/command identity and modernize messaging + docs hierarchy. | Lowest migration cost, minimal ecosystem breakage. | Name remains partially misleading; long-term positioning debt persists. | If short-term delivery speed matters more than long-term brand accuracy. |
| B. Full immediate rename | Rename project/package/command in one coordinated cutover. | Maximum clarity and strongest signal of product scope. | Highest migration and compatibility risk; churn for existing users and scripts. | If user base is small and team can absorb migration support quickly. |
| C. Dual-brand transition (recommended) | Introduce a new product name now, keep `diagram` command as compatibility alias for a defined transition window. | Balances accuracy with pragmatism; reduces adoption shock; supports staged proof. | Requires deliberate migration comms and temporary naming complexity. | If the goal is durable positioning with controlled risk. |

## Recommendation
Choose **Approach C (dual-brand transition)**.

Reasoning:
- It improves product truthfulness immediately without forcing a brittle one-shot migration.
- It aligns with the current mixed audience (humans + AI agents + CI scripts) where abrupt command breakage is expensive.
- It leaves room to validate the best final name with real usage before hard-cutting aliases.

Working shortlist for naming exploration:
- `archscope` (architecture scope + impact)
- `archguard` (governance and policy emphasis)
- `repostruct` (repository structure + architecture intelligence)

## Success Criteria
- External-facing docs accurately communicate the full job-to-be-done, not only diagram rendering.
- New users can identify validation/risk/context workflows within one minute of opening the README.
- Agent integrations can consume machine output contracts without command-specific parsers.
- Existing `diagram` users retain a non-breaking migration path during transition.

## Scope Boundaries
- Non-goal: choosing implementation-level migration mechanics in this stage (release sequencing, package publishing choreography, CLI parser internals).
- Non-goal: broad feature expansion unrelated to positioning clarity.
- Non-goal: replacing existing workflow capabilities; this effort is positioning and usability alignment.

## Key Decisions
- Decision: Treat rename discussion as a product strategy decision, not a cosmetic branding task.
  Rationale: Current naming materially affects feature discoverability and workflow adoption.
- Decision: Use a staged transition rather than immediate hard rename.
  Rationale: Preserves trust with existing users while increasing descriptive accuracy.
- Decision: Use `archscope` as the primary candidate name for next-stage validation.
  Rationale: Best balance of descriptive accuracy, command ergonomics, and multi-workflow fit.
- Decision: Keep focus on WHAT users should understand and expect; defer migration HOW to planning/spec.
  Rationale: Reduces premature implementation coupling.

## Dependencies and Assumptions
- Assumption: Existing users rely on `diagram` command in scripts and CI.
- Assumption: Docs and command-surface framing influence adoption more than adding net-new features right now.
- Dependency: Final naming choice requires maintainer decision before planning can lock migration scope.

## Outstanding Questions
### Resolve Before Planning
- None. Resolved in brainstorm:
  - Naming strategy: dual-brand transition.
  - Primary candidate: `archscope`.

### Deferred to Planning
- [Affects R6][Technical] What deprecation/alias window is acceptable before any hard rename of command/package surfaces?
- [Affects R9, R10][Technical] Which canonical machine-output schema should become the compatibility contract across all commands?
- [Affects R2, R3][Execution] Which documentation entrypoints should move first to maximize clarity with minimal churn?

## Next Steps
`Resolve Before Planning` is empty.

-> Proceed to `/ce:spec` to define rename/migration contract and machine-output consistency contract.
