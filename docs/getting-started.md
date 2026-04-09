# Getting Started

Install and run `diagram-cli` locally from this repository.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [First Run](#first-run)
- [Machine Output Mode](#machine-output-mode)
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

```bash
diagram init .
diagram doctor .
diagram analyze .
diagram generate-all . --output-dir .diagram --artifact-profile agent
diagram context .
diagram validate .
```

Without linking:

```bash
node src/diagram.js init .
node src/diagram.js doctor .
node src/diagram.js validate .
```

## Machine Output Mode

Prefer `--format json` for automation:

```bash
diagram generate . --type architecture --format json --deterministic
diagram workflow pr . --base origin/main --head HEAD --format json --deterministic
```

Compatibility note:

- `--json` is supported as an alias, but canonical usage is `--format json`.

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

- Command not found (`diagram`):
  - Run `npm link` from the repo root.
- SVG/PNG export fails:
  - Run `diagram doctor .`.
  - Install Mermaid CLI if needed: `npm install -g @mermaid-js/mermaid-cli`.
- `diagram generate-video` or `diagram generate-animated` fails:
  - Install Playwright runtime: `npx playwright install chromium`.
  - Install ffmpeg: `brew install ffmpeg` (macOS).
- Large repositories produce oversized preview URLs:
  - Save output to file with `--output` and use artifact workflows instead.

