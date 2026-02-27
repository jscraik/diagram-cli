---
date: 2026-02-26
topic: local-first-non-code-artifact-workflows
---

# Local-first Non-code Artifact Workflows

## Table of Contents

- [What We're Building](#what-were-building)
- [Why This Approach](#why-this-approach)
- [V1 Scope and Non-goals](#v1-scope-and-non-goals)
- [Key Decisions](#key-decisions)
- [Resolved Questions](#resolved-questions)
- [Open Questions](#open-questions)
- [Next Steps](#next-steps)

## What We're Building

diagram-cli will expand from code-structure diagrams into local-first non-code artifact workflows for Codex and Claude Code.

V1 includes two outcomes:
1. **State machine → Mermaid** conversion
2. **PR → interactive HTML explainer** for human review

The PR explainer flow is deterministic and local: it reads local git refs, creates structured change context, renders an HTML explainer, and emits prompt-pack artifacts for optional agent enhancement.

The state-machine flow supports both **structured specs** (YAML/JSON) and **DSL input** to minimize adoption friction.

## Why This Approach

A staged workflow model fits agent-driven usage better than one-off commands because each stage produces reusable artifacts. It also keeps diagram-cli aligned with its core identity: local-first, deterministic, and composable.

This balances two needs:
- richer outputs beyond static diagrams
- no hard dependency on hosted model APIs

Prompt-packs preserve LLM interoperability while keeping AI execution outside the CLI runtime.

## V1 Scope and Non-goals

**In scope (V1):**
- Pipeline-style workflow command model
- PR explainer from local git refs only
- Interactive HTML review artifact generation
- Prompt-pack generation for downstream Codex/Claude use
- State-machine inputs via YAML/JSON and DSL
- Mermaid output from state-machine workflow

**Out of scope (V1):**
- Direct LLM/API calls from diagram-cli
- Remote PR provider integration (GitHub/GitLab API fetch)
- Compliance/audit-first report modes
- Multi-format publishing beyond HTML + Mermaid-focused outputs

## Key Decisions

- Keep diagram-cli local-first and agent-facing (Codex/Claude Code), not LLM-first.
- Ship both artifact tracks in V1: PR explainer + state-machine to Mermaid.
- Use local git refs as the only PR explainer input in V1.
- Optimize PR explainer for human review clarity.
- Emit prompt-packs; do not execute model calls in CLI.
- Use a staged workflow approach (pipeline model, Approach C).
- Default PR workflow should produce full local outputs (data + HTML + prompt-pack).
- Support both structured spec and DSL for state-machine inputs.

## Resolved Questions

- Should this become an LLM-first product? **No** — local-first remains core.
- Which artifact ships first? **Both** (PR explainer and state-machine Mermaid).
- PR input source for V1? **Local git refs**.
- PR artifact orientation? **Human review clarity**.
- LLM integration mode? **Prompt-pack only**.
- Command model? **Pipeline/staged workflow (Approach C)**.
- PR explainer default stage depth? **Generate everything local by default**.
- State-machine input surface? **Both structured spec and DSL**.

## Open Questions

None currently.

## Next Steps

Proceed to `/prompts:workflow-plan` to define command surface, stage contracts, validation criteria, and rollout order.
