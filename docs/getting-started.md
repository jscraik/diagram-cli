# Getting Started

## Table of Contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [Run the CLI](#run-the-cli)
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
```

## Troubleshooting

- Command not found (`diagram`):
  - Run `npm link` from the repo root.
- SVG/PNG export fails:
  - Install Mermaid CLI: `npm install -g @mermaid-js/mermaid-cli`.
- Large repos produce huge preview URLs:
  - Save output with `--output diagram.mmd` instead of relying on preview URL.
