# CLI Command Reference

Primary command reference for the canonical `archscope` CLI.

## Table of Contents

- [Command Set](#command-set)
- [Core Commands](#core-commands)
- [Workflow Commands](#workflow-commands)
- [Video and Animation Commands](#video-and-animation-commands)
- [Diagram Types](#diagram-types)
- [Defaults and Precedence](#defaults-and-precedence)
- [Machine Output](#machine-output)
- [Compatibility Aliases](#compatibility-aliases)
- [Migration State](#migration-state)

## Command Set

```bash
archscope init [path]
archscope doctor [path]
archscope scan [path]
archscope analyze [path]
archscope generate [path]
archscope generate-all [path]
archscope changed [path]
archscope context [path]
archscope explain <component> [path]
archscope validate [path]
archscope workflow pr [path]
archscope diff <base> <head>
archscope generate-video [path]
archscope generate-animated [path]
```

## Core Commands

### `archscope init [path]`

Bootstrap starter files for architecture workflows.

```bash
archscope init .
archscope init . --force
```

Creates:

- `.architecture.yml`
- `.diagramrc`
- `.diagram/ci/github-actions-step.yml`

### `archscope doctor [path]`

Run environment diagnostics for Mermaid, Playwright, ffmpeg, git history depth, write permissions, and npm cache.

```bash
archscope doctor .
archscope doctor . --format json
```

### `archscope scan [path]`

Generate the default architecture evidence pack.

```bash
archscope scan .
archscope scan . --base origin/main --head HEAD
archscope scan . --format json --deterministic
```

Writes the first-run evidence pack to `.diagram` by default:

- `manifest.json`
- `brief.md`
- `agent-context.json`
- `architecture.mmd`

When `--base` or `--head` is supplied and refs resolve, scan also writes
`.diagram/pr-impact/pr-impact.json` by reusing the `workflow pr` contract.
`report.html` is optional and deferred until the report UI workflow is present.

Key options:

- `--output-dir <dir>`
- `--base <ref>`
- `--head <ref>`
- `--patterns <list>`
- `--exclude <list>`
- `--max-files <n>`
- `--format <text|json>`
- `--deterministic`

### `archscope analyze [path]`

Analyze repository structure without rendering a diagram.

```bash
archscope analyze .
archscope analyze . --format json --deterministic
```

### `archscope generate [path]`

Generate one diagram.

```bash
archscope generate . --type architecture
archscope generate . --type security --format json --deterministic
archscope generate . --type erd --format json --deterministic
archscope generate . --output diagram.svg --validate
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

### `archscope generate-all [path]`

Generate all supported diagram types and manifest.

```bash
archscope generate-all .
archscope generate-all . --output-dir .diagram --artifact-profile agent
archscope generate-all . --format json --deterministic
```

Key options:

- `--output-dir <dir>`
- `--artifact-profile <full|agent|ultra-compact>`
- `--format <type>`
- `--deterministic`

### `archscope changed [path]`

Analyze only git-changed files (branch delta or working tree).

```bash
archscope changed . --base origin/main --head HEAD
archscope changed . --format json --deterministic
```

### `archscope context [path]`

Refresh AI-focused context pack artifacts under `.diagram/context`.

```bash
archscope context .
archscope context . --force
archscope context . --format json --deterministic
```

### `archscope explain <component> [path]`

Explain a local dependency neighborhood in text + Mermaid.

```bash
archscope explain auth-service .
archscope explain src/api/routes/users.ts . --depth 3 --format json --deterministic
```

### `archscope validate [path]`

Validate architecture rules from `.architecture.yml`.

```bash
archscope validate --init
archscope validate .
archscope validate . --format junit --output architecture-results.xml
```

Key options:

- `--init`
- `--config <file>`
- `--dry-run`
- `--save-baseline`
- `--format <console|json|junit>`

## Workflow Commands

### `archscope workflow pr [path]`

Compute PR architecture delta, blast radius, and risk.

```bash
archscope workflow pr . --base origin/main --head HEAD
archscope workflow pr . --base origin/main --head HEAD --risk-threshold medium --fail-on-risk
archscope workflow pr . --base origin/main --head HEAD --format json --deterministic
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

### `archscope diff <base> <head>`

Compare architecture between two refs.

```bash
archscope diff origin/main HEAD
archscope diff origin/main HEAD --format json --deterministic
```

## Video and Animation Commands

### `archscope generate-video [path]`

Generate animated video output (`.mp4`, `.webm`, `.mov`).

```bash
archscope generate-video . --duration 8 --fps 60 --width 1920 --height 1080
```

### `archscope generate-animated [path]`

Generate animated SVG output.

```bash
archscope generate-animated . --type architecture --output diagram-animated.svg
```

Use `archscope doctor .` first if runtime dependencies are missing.

## Diagram Types

| Type           | Description                                               |
| -------------- | --------------------------------------------------------- |
| `architecture` | Component hierarchy by directory                          |
| `sequence`     | Service/module interaction flow                           |
| `dependency`   | Internal and external import graph                        |
| `class`        | Class-oriented relationships                              |
| `flow`         | Process/data flow                                         |
| `database`     | Persistence-related paths                                 |
| `erd`          | Entity relationship diagram from supported schema sources |
| `user`         | User interaction entrypaths                               |
| `events`       | Event-driven architecture paths                           |
| `auth`         | Authentication and authorization flow                     |
| `security`     | Security boundary and trust paths                         |
| `agent`        | Multi-agent orchestration paths                           |
| `c4context`    | Context-level system map                                  |
| `rag`          | Retrieval-augmented generation flow                       |

## Defaults and Precedence

For `patterns`, `exclude`, `maxFiles`, and `theme`, defaults resolve as:

1. CLI flags
2. `.diagramrc`
3. built-ins

## Machine Output

- Canonical machine mode: `--format json`
- Stability mode: `--deterministic`
- Covered JSON payloads use the canonical root envelope:
  - `schemaVersion`
  - `command`
  - `status`
  - `meta`
  - `data`
  - `errors`
  - optional `agentSummary`
- JSON-capable command coverage is tracked in
  `.diagram/contracts/machine-command-coverage.json`
- `scan --format json` nests the evidence manifest under `data.evidencePack`
  and adds `data.pr` for PR evidence runs.
- PR impact JSON nests its analytical payload under `data.prImpact` and
  includes `agentSummary`:
  - `changedComponents`
  - `riskReasons`
  - `suggestedReviewerChecks`

## Compatibility Aliases

These aliases are accepted for backward compatibility and normalized at runtime:

- `archscope test` -> `archscope validate`
- `archscope all` -> `archscope generate-all`
- `archscope video` -> `archscope generate-video`
- `archscope animate` -> `archscope generate-animated`
- `--json` / `-j` -> `--format json`

The command name `diagram` remains available as a compatibility entrypoint in
the `compatibility` migration state. New documentation and scripts should prefer
`archscope`, while existing `diagram` automation can continue during the
declared migration window.

## Migration State

- Current state: `compatibility`
- Canonical command: `archscope`
- Compatibility command: `diagram`
- Package name boundary: `@brainwav/diagram` is unchanged in this delivery.
- Finalization policy: `.diagram/migration/finalization-policy.json`
- Migration guide: [Archscope compatibility migration](migration/archscope-compatibility.md)
