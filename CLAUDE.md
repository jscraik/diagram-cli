# Claude Context: diagram-cli

Generate architecture diagrams and architecture-rule test results from source
code using static analysis and Mermaid.

## Table of Contents

- [When to use this tool](#when-to-use-this-tool)
- [Local commands](#local-commands)
- [Codebase shape](#codebase-shape)
- [Implementation notes](#implementation-notes)
- [Validation](#validation)

## When to use this tool

- Analyze repository structure and imports.
- Generate Mermaid diagrams (`architecture`, `sequence`, `dependency`, `class`,
  `flow`).
- Validate architecture constraints via `diagram test`.
- Export animated SVG/video outputs when optional dependencies are installed.

## Local commands

```bash
npm install
npm test
npm run test:deep

# CLI help
node src/diagram.js --help
node src/diagram.js test --help

# Typical usage
node src/diagram.js analyze .
node src/diagram.js generate . --type dependency
node src/diagram.js test .
```

## Codebase shape

```text
src/
  diagram.js    # CLI entrypoint, analysis, generation, test command
  rules.js      # rules engine and config loading
  graph.js      # component graph helper
  formatters/   # console/json/junit format output
  video.js      # optional animation/video rendering
```

## Implementation notes

- Runtime target: Node.js 18+.
- Module system: CommonJS (`require`/`module.exports`).
- Mermaid node IDs are sanitized and suffixed with SHA-256 hash fragments for
  collision resistance.
- Path handling normalizes separators for cross-platform matching.
- Output paths are validated to prevent directory traversal.

## Validation

Before shipping behavior changes:

1. Run `npm test`.
2. Run `npm run test:deep`.
3. Verify examples in `README.md` and `docs/` still match CLI help output.

## Command preflight helper
- Source `scripts/codex-preflight.sh` and run `preflight_repo` before command-heavy, destructive, or path-sensitive work.
- Validate required bins and target paths first so mistakes are prevented before edits.
