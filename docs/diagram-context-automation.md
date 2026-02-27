# Diagram Context Automation

Keep Mermaid architecture context fresh for Codex and Claude with one reusable flow.

## Table of Contents

- [What this does](#what-this-does)
- [Local setup](#local-setup)
- [Output files](#output-files)
- [How agents should consume it](#how-agents-should-consume-it)
- [Troubleshooting](#troubleshooting)

## What this does

- Generates all Mermaid diagrams into `AI/diagrams`.
- Generates an agent-first pack at `AI/context/diagram-context.md` (index + full Mermaid payloads).
- Generates a lightweight index `AI/context/diagram-context-lite.md`.
- Generates a machine-readable index `AI/context/diagram-context.index.json`.
- Writes `AI/context/diagram-context.meta.json` with timestamp, hashes, and diagram metadata for change detection.
- Supports quiet operation for shell hooks.

## Local setup

Run once:

```bash
bash scripts/install-repo-open-hook.sh
```

Manual refresh:

```bash
bash scripts/refresh-diagram-context.sh --force
```

## Output files

- `AI/diagrams/*.mmd`
- `AI/context/diagram-context.md`
- `AI/context/diagram-context-lite.md`
- `AI/context/diagram-context.index.json`
- `AI/context/diagram-context.meta.json`
- `AI/context/refresh.log`

## How agents should consume it

- For architecture-aware tasks, prefer:
  - `AI/context/diagram-context.md` when you want embedded Mermaid plus short guidance.
  - `AI/context/diagram-context-lite.md` when you only need a quick index.
  - `AI/context/diagram-context.index.json` for deterministic selection by tags/use-cases.
- Treat it as derived context (regenerate instead of hand-editing).
- Claude CLI (optional): `claude --append-system-prompt "$(cat AI/context/diagram-context.md)"`
- Codex sessions: reference `AI/context/diagram-context.md` at task start.
- For fast discovery, pick the first matching entry by `recommended_for` in the index JSON (example: `npm run` related tasks -> `sequence` and `flow` diagrams).

## Troubleshooting

- If nothing refreshes, run `bash scripts/refresh-diagram-context.sh --force`.
- If hook is not active, restart shell or `source ~/.zshrc`.
- Cooldown default is 1800s. Override with:

```bash
DIAGRAM_REFRESH_MIN_SECONDS=60 bash scripts/refresh-diagram-context.sh
```
