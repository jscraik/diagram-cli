# diagram-cli

Generate architecture diagrams, validation reports, and PR impact artifacts from source code.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Opinionated Starter Path](#opinionated-starter-path)
- [Human Workflows](#human-workflows)
- [AI Agent Workflows](#ai-agent-workflows)
- [Machine Output Contracts](#machine-output-contracts)
- [Documentation Index](#documentation-index)
- [Development](#development)
- [Distribution](#distribution)

## Overview

`diagram-cli` scans your repository and produces:

- Mermaid diagrams (`generate`, `generate-all`)
- Architecture policy validation (`validate`)
- PR architecture impact reports (`workflow pr`)
- AI-context artifacts (`context`)

Default resolution precedence for scan parameters is explicit:

1. CLI flags
2. `.diagramrc`
3. command built-ins

This applies to `patterns`, `exclude`, `maxFiles`, and `theme` where relevant.

## Quick Start

```bash
git clone https://github.com/jscraik/diagram-cli.git
cd diagram-cli
npm install
npm link
```

Without `npm link`, run commands with `node src/diagram.js ...`.

## Opinionated Starter Path

Use this path for new repositories:

```bash
diagram init .
diagram doctor .
diagram validate .
diagram generate-all . --output-dir .diagram --artifact-profile agent
diagram context .
```

What this gives you:

- `.architecture.yml` starter rules
- `.diagramrc` defaults
- CI step sample at `.diagram/ci/github-actions-step.yml`
- toolchain diagnostics before CI rollout
- compact AI-friendly architecture artifacts

## Human Workflows

```bash
# Analyze repository structure
diagram analyze .

# Generate one diagram and open preview
diagram generate . --type architecture --open

# Analyze only changed files in your branch
diagram changed . --base origin/main --head HEAD

# Explain a local dependency neighborhood
diagram explain auth-service .

# PR risk/blast-radius report
diagram workflow pr . --base origin/main --head HEAD --risk-threshold medium --fail-on-risk
```

## AI Agent Workflows

```bash
# Stable machine outputs
diagram generate . --type architecture --format json --deterministic
diagram workflow pr . --base origin/main --head HEAD --format json --deterministic

# Compact context pack for agent token budgets
diagram generate-all . --output-dir .diagram --artifact-profile agent
diagram context .
```

## Machine Output Contracts

- Use `--format json` for machine output.
- `--json` is a compatibility alias and is normalized to `--format json`.
- Command outputs include explicit `schemaVersion` values.
- Use `--deterministic` for stable ordering/timestamps in machine payloads.
- PR impact JSON includes `agentSummary` with:
  - `changedComponents`
  - `riskReasons`
  - `suggestedReviewerChecks`

## Documentation Index

- [CLI reference](docs/cli-reference.md)
- [Getting started](docs/getting-started.md)
- [Architecture testing](docs/architecture-testing.md)
- [Migration from dependency-cruiser](docs/migration-from-dependency-cruiser.md)
- [Maintainer docs index](docs/README.md)

## Development

```bash
npm install
npm test
npm run test:deep
node src/diagram.js --help
```

## License

Apache 2.0 - see [LICENSE](LICENSE).

## Distribution

Official installation instructions are maintained in this repository only.

Third-party indexes or mirrors may list this project, but they are not affiliated with, endorsed by, or maintained by this project unless explicitly stated here.
