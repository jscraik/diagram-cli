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

- `-t, --type <type>` `architecture|sequence|dependency|class|flow` (default: `architecture`)
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

### `diagram video [path]`

Generate an animated video (`.mp4`, `.webm`, `.mov`) from a Mermaid diagram.

```bash
diagram video .
diagram video . --type dependency --output architecture.mp4
diagram video . --duration 8 --fps 60 --width 1920 --height 1080
```

Options:

- `-t, --type <type>` `architecture|sequence|dependency|class|flow` (default: `architecture`)
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

- `-t, --type <type>` `architecture|sequence|dependency|class|flow` (default: `architecture`)
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

## Output formats

- Terminal Mermaid output
- `.mmd` Mermaid source files
- `.svg`/`.png` rendered images (requires Mermaid CLI)
- `.mp4`/`.webm`/`.mov` video export (requires Playwright + ffmpeg)
- Animated `.svg` export (requires Playwright)

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
