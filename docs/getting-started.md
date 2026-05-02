# Getting Started

Install and run the canonical `archscope` command locally from this repository.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [First Run](#first-run)
- [Machine Output Mode](#machine-output-mode)
- [Compatibility Command](#compatibility-command)
- [Verify Setup](#verify-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+
- npm
- Git

## Install

```bash
git clone https://github.com/jscraik/diagram-cli.git
cd diagram-cli
npm install
```

Optional local command link:

```bash
npm link
```

## First Run

Before you review a PR, run Archscope. The first scan writes a compact evidence
pack for both human reviewers and AI coding agents.

```bash
archscope init .
archscope doctor .
archscope scan .
```

The first scan writes the default architecture evidence pack:

- `.diagram/manifest.json` - stable artifact index and status source
- `.diagram/brief.md` - human architecture brief
- `.diagram/agent-context.json` - canonical AI-agent handoff
- `.diagram/architecture.mmd` - first architecture diagram
- `.diagram/report.html` - static human evidence report

For PR review evidence, include refs:

```bash
archscope scan . --base origin/main --head HEAD
```

When refs resolve, the PR scan also writes
`.diagram/pr-impact/pr-impact.json`. If the HTML report cannot be written,
read `.diagram/manifest.json` and `.diagram/brief.md` first.

The compatibility command remains available for existing automation:

```bash
diagram validate .
```

Without linking:

```bash
node src/diagram.js init .
node src/diagram.js doctor .
node src/diagram.js scan .
```

## Machine Output Mode

Prefer `--format json` for automation:

```bash
archscope scan . --format json --deterministic
archscope scan . --base origin/main --head HEAD --format json --deterministic
archscope generate . --type architecture --format json --deterministic
archscope workflow pr . --base origin/main --head HEAD --format json --deterministic
```

Compatibility note:

- `--json` is supported as an alias, but canonical usage is `--format json`.
- Covered JSON commands emit the canonical machine envelope with `schemaVersion`,
  `command`, `status`, `meta`, `data`, and `errors`.

## Compatibility Command

The package still installs `diagram` as a compatibility command while the
migration state is `compatibility`. Existing scripts can continue to call
`diagram`; new examples and automation should prefer `archscope`.

The package name remains `@brainwav/diagram`. This delivery does not rename the
npm package.

## Verify Setup

```bash
node src/diagram.js --help
node src/diagram.js validate --help
npm test
```

Expected results:

- `--help` commands print usage text.
- `npm test` exits with code `0`.

## Troubleshooting

- Command not found (`archscope` or `diagram`):
  - Run `npm link` from the repo root.
- SVG/PNG export fails:
  - Run `archscope doctor .`.
  - Install Mermaid CLI if needed: `npm install -g @mermaid-js/mermaid-cli`.
- `archscope generate-video` or `archscope generate-animated` fails:
  - Treat video and animation as optional advanced media surfaces; run
    `archscope scan .` first if you only need architecture evidence.
  - Install Playwright runtime: `npx playwright install chromium`.
  - Install ffmpeg: `brew install ffmpeg` (macOS).
- Large repositories produce oversized preview URLs:
  - Save output to file with `--output` and use artifact workflows instead.
