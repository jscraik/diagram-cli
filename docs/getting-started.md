# Getting Started

Install and run `diagram-cli` locally from this repository.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [Run the CLI](#run-the-cli)
- [Verify your setup](#verify-your-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+
- npm

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

## Run the CLI

```bash
diagram analyze .
diagram generate .
diagram all .
```

Without linking:

```bash
node src/diagram.js analyze .
node src/diagram.js generate .
node src/diagram.js all .
```

## Verify your setup

```bash
node src/diagram.js --help
node src/diagram.js test --help
npm test
```

Expected results:

- `--help` commands print usage text.
- `npm test` exits with code `0`.

## Troubleshooting

- Command not found (`diagram`):
  - Run `npm link` from the repo root.
- SVG/PNG export fails:
  - Install Mermaid CLI: `npm install -g @mermaid-js/mermaid-cli`.
- `diagram video` or `diagram animate` fails:
  - Install Playwright browser runtime: `npx playwright install chromium`.
  - Install ffmpeg for video export.
- Large repos produce huge preview URLs:
  - Save output with `--output diagram.mmd`.
