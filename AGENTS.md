schema_version: 1

# diagram-cli agent guide

Generate codebase architecture diagrams and architecture-rule test results from source code with static analysis and Mermaid.

## Mandatory workflow snippet
1. Explore project first, then invoke skill.
2. IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any React, Tauri, Apps-SDK-ui, Tailwind, Vite, Storybook + Chat Widget tasks.
3. Add a Table of Contents for docs.

## Table of Contents

- [Core commands](#core-commands)
- [Diagram context automation](#diagram-context-automation)
- [References](#references)

## Core commands

- Install: `npm install`
- Tests: `npm test` and `npm run test:deep`
- CLI help: `node src/diagram.js --help`

## Diagram context automation

- Refresh pack manually: `bash scripts/refresh-diagram-context.sh --force`
- Install silent-on-open hook: `bash scripts/install-repo-open-hook.sh`
- Canonical context file for agents: `AI/context/diagram-context.md`
- Generated diagrams live in: `AI/diagrams/*.mmd`

## References

- Automation details: [docs/diagram-context-automation.md](docs/diagram-context-automation.md)
