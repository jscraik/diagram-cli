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
- Compacts the generated diagrams into `AI/context/diagram-context.md`.
- Writes `AI/context/diagram-context.meta.json` with timestamp/hash state.
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
- `AI/context/diagram-context.meta.json`
- `AI/context/refresh.log`

## How agents should consume it

- For architecture-aware tasks, load `AI/context/diagram-context.md` first.
- Treat it as derived context (regenerate instead of hand-editing).
- Claude CLI (optional): `claude --append-system-prompt "$(cat AI/context/diagram-context.md)"`
- Codex sessions: reference `AI/context/diagram-context.md` at task start.

## Troubleshooting

- If nothing refreshes, run `bash scripts/refresh-diagram-context.sh --force`.
- If hook is not active, restart shell or `source ~/.zshrc`.
- Cooldown default is 1800s. Override with:

```bash
DIAGRAM_REFRESH_MIN_SECONDS=60 bash scripts/refresh-diagram-context.sh
```
