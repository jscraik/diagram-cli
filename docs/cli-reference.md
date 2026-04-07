# CLI Command Reference

This document provides an exhaustive list of commands and options for `diagram-cli`.

## Commands

### `diagram analyze [path]`
Analyze file structure and dependencies without rendering a diagram.

```bash
diagram analyze ./my-project
diagram analyze . --json
diagram analyze . --patterns "**/*.py,**/*.go"
diagram analyze . --max-files 200
```
**Options:**
- `-p, --patterns <list>` file patterns (default: `**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.go,**/*.rs`)
- `-e, --exclude <list>` exclude patterns
- `-m, --max-files <n>` max files to analyze (default: `100`)
- `--analyzer <name>` analyzer plugin (default: `default`)
- `--emit-ir` write typed IR artifact to `.diagram/ir/architecture-ir.json`
- `--incremental` use incremental cache at `.diagram/cache` when available
- `-j, --json` JSON output

### `diagram generate [path]`
Generate one Mermaid diagram and print a preview URL.

```bash
diagram generate .
diagram generate . --type sequence
diagram generate . --focus src/api
diagram generate . --theme dark
diagram generate . --output diagram.mmd
diagram generate . --output diagram.svg
diagram generate . --open
```
**Options:**
- `-t, --type <type>` `architecture|sequence|dependency|class|flow|database|user|events|auth|security` (default: `architecture`)
- `-f, --focus <module>` focus on one module or directory
- `-o, --output <file>` write `.mmd`, `.svg`, or `.png`
- `-m, --max-files <n>` max files to analyze
- `--analyzer <name>` analyzer plugin (default: `default`)
- `--emit-ir` write typed IR artifact to `.diagram/ir/architecture-ir.json`
- `--incremental` use incremental cache at `.diagram/cache` when available
- `--theme <theme>` `default|dark|forest|neutral`
- `--confidence-report` write confidence report
- `--strict-confidence` exit 1 when confidence degrades
- `--capability-check-only` run capability checks only and exit
- `--open` open generated preview URL

### `diagram all [path]`
Generate all diagram types in one run.

```bash
diagram all .
diagram all . --output-dir ./docs/diagrams
```
**Options:**
- `-o, --output-dir <dir>` output directory (default: `./diagrams`)
- `--analyzer <name>` analyzer plugin (default: `default`)
- `--emit-ir` write typed IR artifact to `.diagram/ir/architecture-ir.json`
- `--incremental` use incremental cache at `.diagram/cache` when available

### `diagram manifest [path]`
Summarize the generated `.diagram/manifest.json` artifact.

### `diagram diff <base> <head>`
Compare architecture diagrams between two git refs.

### `diagram video [path]`
Generate an animated video (`.mp4`, `.webm`, `.mov`) from a Mermaid diagram.

**Prerequisites:** 
```bash
npm install -g @mermaid-js/mermaid-cli
npx playwright install chromium
brew install ffmpeg
```

```bash
diagram video . --duration 8 --fps 60 --width 1920 --height 1080
```

### `diagram animate [path]`
Generate an animated SVG with CSS animations.

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
