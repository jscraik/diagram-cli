# diagram-cli

Generate codebase architecture diagrams from source files. No AI required.

## Table of Contents

- [Upgrade notice](#upgrade-notice)
- [Plain-language summary](#plain-language-summary)
- [Install](#install)
- [Quick start](#quick-start)
- [First-run checklist](#first-run-checklist)
- [Commands](#commands)
- [Diagram types](#diagram-types)
- [AI-focused diagram outputs](#ai-focused-diagram-outputs)
- [Output formats](#output-formats)
- [Video and animation prerequisites](#video-and-animation-prerequisites)
- [Architecture Testing](#architecture-testing)
- [Documentation](#documentation)
- [Development](#development)
- [License](#license)

## Upgrade notice

⚠️ `@brainwav/diagram@1.0.0` had a packaging regression and failed at runtime with
`Cannot find module './utils/commands'`. Please use
`@brainwav/diagram@1.0.1` or later.

## Plain-language summary

This tool reads code and draws a map.
You point it at a repo.
It scans files.
It finds links.
It prints a clear graph.
You can save that graph.
You can save PNG or SVG files.
You can make short video clips.
You can test code layer rules.
You can run it on your laptop.
You can run it in CI.
The goal is simple: keep the code map clear and keep rule drift low.

## Install

```bash
# Clone and link locally
git clone https://github.com/jscraik/diagram-cli.git
cd diagram-cli
npm install
npm link
```

## Quick start

```bash
# Analyze repository structure
diagram analyze .

# Generate architecture diagram (default type)
diagram generate .

# Generate all diagram types into ./diagrams
diagram all .
```

## First-run checklist

Use a small test repo first.
Run from the repo root.
Start with `diagram analyze .`.
Read the file and link count.
Next, run `diagram generate .`.
Save one file with `--output`.
Pick `.mmd` for text output.
Pick `.svg` for image output.
Use `diagram all .` for all views.
Use `--max-files` if runs are slow.
Keep path globs short and clear.
Skip build and vendored dirs.
Try `diagram test --init` for rules.
Then run `diagram test` to check rules.
Use `--dry-run` when match sets look odd.
Use `--verbose` if you need more detail.
Run `npm test` to check local health.
Run `npm run test:deep` for deep checks.

## Commands

### `diagram analyze [path]`

Analyze file structure and dependencies without rendering a diagram.

```bash
diagram analyze ./my-project
diagram analyze . --json
diagram analyze . --patterns "**/*.py,**/*.go"
diagram analyze . --max-files 200
```

Options:

- `-p, --patterns <list>` file patterns (default: `**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.go,**/*.rs`)
- `-e, --exclude <list>` exclude patterns
- `-m, --max-files <n>` max files to analyze (default: `100`)
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

Options:

- `-t, --type <type>` `architecture|sequence|dependency|class|flow|database|user|events|auth|security` (default: `architecture`)
- `-f, --focus <module>` focus on one module or directory
- `-o, --output <file>` write `.mmd`, `.svg`, or `.png`
- `-m, --max-files <n>` max files to analyze
- `--theme <theme>` `default|dark|forest|neutral`
- `--open` open generated preview URL

### `diagram all [path]`

Generate all diagram types in one run.

```bash
diagram all .
diagram all . --output-dir ./docs/diagrams
```

Options:

- `-o, --output-dir <dir>` output directory (default: `./diagrams`)

### `diagram manifest [path]`

Summarize the generated `.diagram/manifest.json` artifact.

```bash
diagram manifest .
diagram manifest . --manifest-dir .diagram --output .diagram/manifest-summary.json
diagram manifest . --manifest-dir .diagram --require-types architecture,security --fail-on-placeholder
```

Options:

- `-d, --manifest-dir <dir>` directory containing `manifest.json` (default: `.diagram`)
- `-o, --output <file>` write summary JSON to file
- `--require-types <list>` require specific diagram types, comma-separated
- `--fail-on-placeholder` fail if any diagram entry is a placeholder

### `diagram video [path]`

Generate an animated video (`.mp4`, `.webm`, `.mov`) from a Mermaid diagram.

```bash
diagram video .
diagram video . --type dependency --output architecture.mp4
diagram video . --duration 8 --fps 60 --width 1920 --height 1080
```

Options:

- `-t, --type <type>` `architecture|sequence|dependency|class|flow|database|user|events|auth|security` (default: `architecture`)
- `-o, --output <file>` output file (default: `diagram.mp4`)
- `-d, --duration <sec>` video duration in seconds (default: `5`)
- `-f, --fps <n>` frames per second (default: `30`)
- `--width <n>` output width in pixels (default: `1280`)
- `--height <n>` output height in pixels (default: `720`)
- `--theme <theme>` `default|dark|forest|neutral` (default: `dark`)
- `-m, --max-files <n>` max files to analyze (default: `100`)

### `diagram animate [path]`

Generate an animated SVG with CSS animations.

```bash
diagram animate .
diagram animate . --type sequence --output sequence-animated.svg
diagram animate . --theme forest
```

Options:

- `-t, --type <type>` `architecture|sequence|dependency|class|flow|database|user|events|auth|security` (default: `architecture`)
- `-o, --output <file>` output file (default: `diagram-animated.svg`)
- `--theme <theme>` `default|dark|forest|neutral` (default: `dark`)
- `-m, --max-files <n>` max files to analyze (default: `100`)

## Diagram types

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

## AI-focused diagram outputs

For agent workflows, the Mermaid output is especially useful because it is
compact, textual, and structured. Feeding `.mmd` into an AI at startup lets it
understand architecture faster than reading all source files.

The generated types cover these high-value areas for automated reasoning:

- **Database Operations** — conditional record paths (for example "record exists?"
  / "not found" branches), storage and mutation decisions.
- **User Actions and Interactions** — user entrypoints and downstream handler
  chains.
- **Events and Channels** — internal publishers, workers, listeners, and trigger
  paths.
- **Authentication Flows** — step-by-step identity and credential checks.
- **Security and Data Flows** — trust boundaries, sensitive components, and
  integrations to support security review and compliance context.

When reviewing PRs, run:

```bash
diagram all . --output-dir .diagram
```

so `.diagram/` includes the new AI-oriented variants beside the classic ones.

The command also writes `.diagram/manifest.json` summarizing what diagrams were
produced and whether any outputs are placeholder/no-data (helpful for CI and
agent bootstrap checks).

## Output formats

- Terminal Mermaid output
- `.mmd` Mermaid source files
- `.svg`/`.png` rendered images (requires Mermaid CLI)
- `.mp4`/`.webm`/`.mov` video export (requires Playwright + ffmpeg)
- Animated `.svg` export (requires Playwright)
- `.diagram/manifest.json` machine-readable artifact index

Install Mermaid CLI for image export:

```bash
npm install -g @mermaid-js/mermaid-cli
```

## Video and animation prerequisites

Install Playwright browser dependencies:

```bash
npm install
npx playwright install chromium
```

Install ffmpeg for `diagram video`:

```bash
brew install ffmpeg
```

Quick verification:

```bash
diagram video . --duration 2 --output smoke-test.mp4
diagram animate . --output smoke-test-animated.svg
```

## Architecture Testing

Validate codebase architecture against declarative YAML rules
to prevent architectural drift.

### Architecture test quick start

```bash
# Generate starter configuration
diagram test --init

# Run validation
diagram test

# Preview file matching without validating
diagram test --dry-run

# CI-friendly output
diagram test --format junit --output test-results.xml
```

### Configuration (`.architecture.yml`)

```yaml
version: "1.0"

rules:
  - name: "Domain isolation"
    description: "Domain logic should not depend on UI"
    layer: "src/domain"
    must_not_import_from: ["src/ui", "src/components"]

  - name: "API contract"
    description: "API routes only use domain and shared"
    layer: "src/api"
    may_import_from: ["src/domain", "src/shared", "src/types"]
    must_not_import_from: ["src/ui"]

  - name: "Test independence"
    description: "Tests should not import other tests"
    layer: "**/*.test.ts"
    must_not_import_from: ["**/*.test.ts", "**/*.spec.ts"]
```

### Rule types

| Constraint | Description |
| --- | --- |
| `must_not_import_from` | Forbidden import patterns |
| `may_import_from` | Whitelist of allowed imports |
| `must_import_from` | Required import patterns |
| `inward_only` | **Directional:** Other protected layers cannot import from this layer |

### Directional constraints with `inward_only`

Use `inward_only: true` to enforce directional import constraints (Clean Architecture/DDD pattern):

```yaml
rules:
  # Domain layer - only allows inward imports
  - name: "Domain isolation"
    layer: "src/domain"
    inward_only: true
    # Domain can import from: src/domain/**, src/shared/**, external packages
    # Domain CANNOT be imported by: other layers with inward_only

  # UI layer - also protected
  - name: "UI boundary"
    layer: "src/ui"
    inward_only: true
    # Now UI and Domain are mutually isolated from each other
```

**How it works:**
- Files in `inward_only` layers can import from: same layer, unprotected paths (no `inward_only` rule), external packages
- Files in `inward_only` layers CANNOT be imported from: other layers that also have `inward_only: true`
- Use unprotected paths (e.g., `src/shared/`) for code that needs to be shared between protected layers

### Command options

```bash
diagram test [path] [options]

Options:
  -c, --config <file>    Config file (default: ".architecture.yml")
  -f, --format <format>  Output: console, json, junit
  -o, --output <file>    Write output to file
  --dry-run              Preview file matching
  --verbose              Show detailed output
  --init                 Generate starter config
  --force                Overwrite existing config when used with --init
```

### Exit codes

| Code | Meaning |
| --- | --- |
| 0 | All rules passed |
| 1 | One or more rules failed |
| 2 | Configuration error |

### CI Integration

```yaml
# .github/workflows/architecture.yml
name: Architecture
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - run: npm run test:deep
      - run: npm run ci:artifacts
      - uses: actions/upload-artifact@v4
        with:
          name: diagram-ci-artifacts
          path: .diagram
      - uses: dorny/test-reporter@v1
        if: success() || failure()
        with:
          name: Architecture Tests
          path: .diagram/architecture-results.xml
          reporter: java-junit
```

## PR Architecture Impact Analysis

  Analyze the architecture impact of PR changes including blast radius
  and risk scoring.

### PR impact quick start

```bash
# Analyze PR changes (auto-detect base from GitHub Actions)
diagram workflow pr .

# With explicit refs
diagram workflow pr . --base origin/main --head HEAD

# With risk threshold
diagram workflow pr . --risk-threshold medium --fail-on-risk

# JSON output only
diagram workflow pr . --json

# Verbose output
diagram workflow pr . --verbose
```

### Command options

```bash
diagram workflow pr [path] [options]
```

Options:
  --base <ref>                    Base git ref (SHA, branch, tag)
  --head <ref>                    Head git ref (default: HEAD)
  -o, --output-dir <dir>          Output directory (default: .diagram/pr-impact)
  --max-depth <n>                 Max blast radius depth (default: 2)
  --max-nodes <n>                 Max blast radius nodes (default: 50)
  --risk-threshold <level>        Risk threshold: none, low, medium, high
  --fail-on-risk                  Exit 1 if risk exceeds threshold
  --risk-override-reason <string> Override risk gate with documented reason
  -j, --json                       JSON output only (skip HTML)
  --verbose                       Show detailed output
```

### Output artifacts

| File | Description |
|------|-------------|
| `pr-impact.json` | Full JSON report with delta, blast radius, and risk (machine-readable, stable contract) |
| `pr-impact.html` | Human-readable HTML explainer with structured review narrative |

#### HTML Explainer Sections

The `pr-impact.html` artifact provides a reviewer-friendly narrative organized into sections:

1. **Executive Summary** — High-level impact overview: files touched, components changed, risk level
2. **Change Story** — Files grouped by status: modified, renamed, added, deleted, unmodeled
3. **Changed Components** — Architecture components with role tags and NEW badges
4. **Risk Reasoning** — Human-readable explanations of why the PR is flagged
5. **Blast Radius** — Downstream components that may be affected (with truncation metadata)
6. **Action Checklist** — Suggested review actions based on risk factors

The explainer follows the narrative flow: *what changed → why it's risky → what to review next*.

**Note:** Empty diffs (identical base/head) do not generate artifacts. Use `--json` for machine output only.

The risk score uses differentiated weights:

| Factor | Weight |
|--------|-------|
| Auth component changed | +3 |
| Security boundary touched | +3 |
| Database path touched | +2 |
| Blast radius ≥ 5 nodes | +1 |
| Edge delta ≥ 10 edges | +1 |

**Severity mapping:**

| Score | Level |
|-------|-------|
| 0 | none |
| 1-2 | low |
| 3-5 | medium |
| 6+ | high |

### CI Integration

```yaml
# .github/workflows/architecture-impact.yml
name: Architecture Impact Analysis
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: node src/diagram.js workflow pr . --base ${{ github.event.pull_request.base.sha }} --head ${{ github.event.pull_request.head.sha }} --verbose
      - uses: actions/upload-artifact@v4
        with:
          name: pr-impact
          path: .diagram/pr-impact/

  risk-gate:
    needs: analyze
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: node src/diagram.js workflow pr . --base ${{ github.event.pull_request.base.sha }} --head ${{ github.event.pull_request.head.sha }} --risk-threshold high --fail-on-risk
```

## Documentation

- Getting started: [docs/getting-started.md](docs/getting-started.md)
- Architecture testing guide: [docs/architecture-testing.md](docs/architecture-testing.md)
- Migration guide: [docs/migration-from-dependency-cruiser.md](docs/migration-from-dependency-cruiser.md)
- Contributor guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Support policy: [SUPPORT.md](SUPPORT.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Maintainer docs index: [docs/README.md](docs/README.md)
- Release history: [CHANGELOG.md](CHANGELOG.md)

## Documentation signature

brAInwav - from demo to duty

## Development

```bash
npm install
npm test
npm run test:deep
node src/diagram.js --help
```

## License

MIT - see [LICENSE](LICENSE).
