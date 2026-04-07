# CLI Command Reference

This document is the primary command reference for `diagram-cli`. It covers all available commands, options, and diagram types.

## Table of Contents

- [Commands](#commands)
  - [diagram analyze](#diagram-analyze-path)
  - [diagram generate](#diagram-generate-path)
  - [diagram generate-all](#diagram-generate-all-path)
  - [diagram validate](#diagram-validate-path)
  - [diagram workflow pr](#diagram-workflow-pr-path)
  - [diagram diff](#diagram-diff-base-head)
  - [diagram generate-video](#diagram-generate-video-path)
  - [diagram generate-animated](#diagram-generate-animated-path)
- [Diagram Types](#diagram-types)

---

## Commands

### `diagram analyze [path]`

Analyze file structure and dependencies without rendering a diagram.

```bash
diagram analyze ./my-project
diagram analyze . --format json
diagram analyze . --patterns "**/*.py,**/*.go"
diagram analyze . --max-files 200
```

**Options:**

- `-p, --patterns <list>` — file patterns (default: `**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.go,**/*.rs`)
- `-e, --exclude <list>` — exclude patterns (default: `node_modules/**,.git/**,dist/**`)
- `-m, --max-files <n>` — max files to analyze (default: `100`)
- `--analyzer <name>` — analyzer plugin (default: `default`)
- `--emit-ir` — write typed IR artifact to `.diagram/ir/architecture-ir.json`
- `--incremental` — use incremental cache at `.diagram/cache` when available
- `--format <fmt>` — output format: `json` for machine-readable output (default: human-readable text)

---

### `diagram generate [path]`

Generate one Mermaid diagram and print a preview URL.

```bash
diagram generate .
diagram generate . --type sequence
diagram generate . --focus src/api
diagram generate . --theme dark
diagram generate . --output diagram.svg
diagram generate . --open
diagram generate . --validate
```

**Options:**

- `-t, --type <type>` — diagram type (default: `architecture`); see [Diagram Types](#diagram-types)
- `-f, --focus <module>` — focus on one module or directory
- `-o, --output <file>` — write `.svg` or `.png`
- `-m, --max-files <n>` — max files to analyze (default: `100`)
- `--analyzer <name>` — analyzer plugin (default: `default`)
- `--emit-ir` — write typed IR artifact to `.diagram/ir/architecture-ir.json`
- `--incremental` — use incremental cache at `.diagram/cache` when available
- `--theme <theme>` — `default|dark|forest|neutral|light` (default: `default`)
- `--validate` — validate Mermaid syntax after generation
- `--fail-on-validation-error` — exit 1 if validation fails (requires `--validate`)
- `--confidence-report` — write confidence report artifact
- `--strict-confidence` — exit 1 when confidence degrades
- `--capability-check-only` — run capability checks only and exit
- `--open` — open generated preview URL in browser

---

### `diagram generate-all [path]`

Generate all supported diagram types in one run.

```bash
diagram generate-all .
diagram generate-all . --output-dir ./docs/diagrams
```

**Options:**

- `-o, --output-dir <dir>` — output directory (default: `./diagrams`)
- `--analyzer <name>` — analyzer plugin (default: `default`)
- `--emit-ir` — write typed IR artifact to `.diagram/ir/architecture-ir.json`
- `--incremental` — use incremental cache at `.diagram/cache` when available

---

### `diagram validate [path]`

Validate codebase architecture against declarative rules in `.architecture.yml`.

```bash
diagram validate --init   # generate a starter .architecture.yml
diagram validate .        # run validation checks
```

**Options:**

- `-c, --config <file>` — config file path (default: `.architecture.yml`)

---

### `diagram workflow pr [path]`

Analyze the blast-radius of architectural changes for a pull request. Produces `pr-impact.html` and JSON artifacts.

```bash
diagram workflow pr . --base origin/main --head HEAD
diagram workflow pr . --base origin/main --head HEAD --risk-threshold medium --fail-on-risk
diagram workflow pr . --base origin/main --head HEAD --format json
```

**Options:**

- `--base <ref>` — base git ref to compare from
- `--head <ref>` — head git ref to compare to
- `--risk-threshold <level>` — risk level that triggers the gate: `none` (default, gate disabled), `low`, `medium`, `high`
- `--fail-on-risk` — exit 1 when detected risk meets or exceeds `--risk-threshold` (has no effect when `--risk-threshold` is `none`)
- `--risk-override-reason <string>` — document a reason to suppress the exit 1 (requires `--fail-on-risk`)
- `--format <fmt>` — output format: `text` (default) or `json`

---

---

### `diagram diff <base> <head>`

Compare architecture diagrams between two git refs.

```bash
diagram diff origin/main HEAD
```

**Options:**

- `--format <fmt>` — output format: `json` for machine-readable output (default: human-readable text)
- `-m, --max-files <n>` — max files to analyze per ref (default: `100`)
- `-p, --patterns <list>` — file patterns to include
- `-e, --exclude <list>` — paths to exclude
- `--verbose` — show detailed output

---

### `diagram generate-video [path]`

Generate an animated video (`.mp4`, `.webm`, `.mov`) from a Mermaid diagram.

**Prerequisites:**

```bash
npm install -g @mermaid-js/mermaid-cli
npx playwright install chromium
brew install ffmpeg
```

```bash
diagram generate-video . --duration 8 --fps 60 --width 1920 --height 1080
```

**Options:**

- `-t, --type <type>` — diagram type (default: `architecture`)
- `-o, --output <file>` — output file (default: `diagram.mp4`)
- `-d, --duration <sec>` — video duration in seconds (default: `5`)
- `-f, --fps <n>` — frames per second (default: `30`)
- `--width <n>` — video width px (default: `1280`)
- `--height <n>` — video height px (default: `720`)
- `--theme <theme>` — `default|dark|forest|neutral|light` (default: `dark`)
- `-m, --max-files <n>` — max files to analyze (default: `100`)

---

### `diagram generate-animated [path]`

Generate an animated SVG with CSS animations.

**Options:**

- `-t, --type <type>` — diagram type (default: `architecture`)
- `-o, --output <file>` — output file (default: `diagram-animated.svg`)
- `--theme <theme>` — `default|dark|forest|neutral|light` (default: `dark`)
- `-m, --max-files <n>` — max files to analyze (default: `100`)

---

## Diagram Types

| Type | Description | Best for |
| --- | --- | --- |
| `architecture` | Component hierarchy by directory | Overall structure |
| `sequence` | Service or module interactions | API and flow analysis |
| `dependency` | Internal and external imports | Dependency review |
| `class` | Class-oriented relationships | OOP-heavy codebases |
| `flow` | Process/data flow | Control-flow mapping |
| `database` | Database operations and condition paths | Conditional persistence flows |
| `user` | User-facing entrypoints and handlers | Interaction flow mapping |
| `events` | Event streams and async channels | Event-driven architecture |
| `auth` | Authentication and authorization checks | Credential/identity flow |
| `security` | Security boundaries and trust paths | Threat/risk analysis |
| `agent` | Multi-agent orchestration and decision flows | AI workflow orchestration |
| `c4context` | C4-style context-level diagrams | High-level system context and actors |
| `rag` | Retrieval-Augmented Generation pipelines | RAG architecture and data retrieval flows |
