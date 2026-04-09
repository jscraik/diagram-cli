# CLI Command Reference

Primary command reference for `diagram-cli`.

## Table of Contents

- [Command Set](#command-set)
- [Core Commands](#core-commands)
- [Workflow Commands](#workflow-commands)
- [Video and Animation Commands](#video-and-animation-commands)
- [Diagram Types](#diagram-types)
- [Defaults and Precedence](#defaults-and-precedence)
- [Machine Output](#machine-output)
- [Compatibility Aliases](#compatibility-aliases)

## Command Set

```bash
diagram init [path]
diagram doctor [path]
diagram analyze [path]
diagram generate [path]
diagram generate-all [path]
diagram changed [path]
diagram context [path]
diagram explain <component> [path]
diagram validate [path]
diagram workflow pr [path]
diagram diff <base> <head>
diagram generate-video [path]
diagram generate-animated [path]
```

## Core Commands

### `diagram init [path]`

Bootstrap starter files for architecture workflows.

```bash
diagram init .
diagram init . --force
```

Creates:

- `.architecture.yml`
- `.diagramrc`
- `.diagram/ci/github-actions-step.yml`

### `diagram doctor [path]`

Run environment diagnostics for Mermaid, Playwright, ffmpeg, git history depth, write permissions, and npm cache.

```bash
diagram doctor .
diagram doctor . --format json
```

### `diagram analyze [path]`

Analyze repository structure without rendering a diagram.

```bash
diagram analyze .
diagram analyze . --format json --deterministic
```

### `diagram generate [path]`

Generate one diagram.

```bash
diagram generate . --type architecture
diagram generate . --type security --format json --deterministic
diagram generate . --output diagram.svg --validate
```

Key options:

- `--type <type>`
- `--focus <module>`
- `--output <file>`
- `--theme <theme>`
- `--validate`
- `--fail-on-validation-error`
- `--format <type>`
- `--deterministic`

### `diagram generate-all [path]`

Generate all supported diagram types and manifest.

```bash
diagram generate-all .
diagram generate-all . --output-dir .diagram --artifact-profile agent
diagram generate-all . --format json --deterministic
```

Key options:

- `--output-dir <dir>`
- `--artifact-profile <full|agent|ultra-compact>`
- `--format <type>`
- `--deterministic`

### `diagram changed [path]`

Analyze only git-changed files (branch delta or working tree).

```bash
diagram changed . --base origin/main --head HEAD
diagram changed . --format json --deterministic
```

### `diagram context [path]`

Refresh AI-focused context pack artifacts under `.diagram/context`.

```bash
diagram context .
diagram context . --force
diagram context . --format json --deterministic
```

### `diagram explain <component> [path]`

Explain a local dependency neighborhood in text + Mermaid.

```bash
diagram explain auth-service .
diagram explain src/api/routes/users.ts . --depth 3 --format json --deterministic
```

### `diagram validate [path]`

Validate architecture rules from `.architecture.yml`.

```bash
diagram validate --init
diagram validate .
diagram validate . --format junit --output architecture-results.xml
```

Key options:

- `--init`
- `--config <file>`
- `--dry-run`
- `--save-baseline`
- `--format <console|json|junit>`

## Workflow Commands

### `diagram workflow pr [path]`

Compute PR architecture delta, blast radius, and risk.

```bash
diagram workflow pr . --base origin/main --head HEAD
diagram workflow pr . --base origin/main --head HEAD --risk-threshold medium --fail-on-risk
diagram workflow pr . --base origin/main --head HEAD --format json --deterministic
```

Writes artifacts to `.diagram/pr-impact` by default:

- `pr-impact.json`
- `pr-impact.html` (skipped when `--format json`)

Key options:

- `--base <ref>`
- `--head <ref>`
- `--output-dir <dir>`
- `--max-depth <n>`
- `--max-nodes <n>`
- `--risk-threshold <none|low|medium|high>`
- `--fail-on-risk`
- `--risk-override-reason <string>`
- `--format <text|json>`
- `--deterministic`
- `--max-files <n>`
- `--patterns <list>`
- `--exclude <list>`

### `diagram diff <base> <head>`

Compare architecture between two refs.

```bash
diagram diff origin/main HEAD
diagram diff origin/main HEAD --format json --deterministic
```

## Video and Animation Commands

### `diagram generate-video [path]`

Generate animated video output (`.mp4`, `.webm`, `.mov`).

```bash
diagram generate-video . --duration 8 --fps 60 --width 1920 --height 1080
```

### `diagram generate-animated [path]`

Generate animated SVG output.

```bash
diagram generate-animated . --type architecture --output diagram-animated.svg
```

Use `diagram doctor .` first if runtime dependencies are missing.

## Diagram Types

| Type | Description |
| --- | --- |
| `architecture` | Component hierarchy by directory |
| `sequence` | Service/module interaction flow |
| `dependency` | Internal and external import graph |
| `class` | Class-oriented relationships |
| `flow` | Process/data flow |
| `database` | Persistence-related paths |
| `user` | User interaction entrypaths |
| `events` | Event-driven architecture paths |
| `auth` | Authentication and authorization flow |
| `security` | Security boundary and trust paths |
| `agent` | Multi-agent orchestration paths |
| `c4context` | Context-level system map |
| `rag` | Retrieval-augmented generation flow |

## Defaults and Precedence

For `patterns`, `exclude`, `maxFiles`, and `theme`, defaults resolve as:

1. CLI flags
2. `.diagramrc`
3. built-ins

## Machine Output

- Canonical machine mode: `--format json`
- Stability mode: `--deterministic`
- JSON payloads include explicit `schemaVersion`
- PR impact JSON includes `agentSummary`:
  - `changedComponents`
  - `riskReasons`
  - `suggestedReviewerChecks`

## Compatibility Aliases

These aliases are accepted for backward compatibility and normalized at runtime:

- `diagram test` -> `diagram validate`
- `diagram all` -> `diagram generate-all`
- `diagram video` -> `diagram generate-video`
- `diagram animate` -> `diagram generate-animated`
- `--json` / `-j` -> `--format json`

