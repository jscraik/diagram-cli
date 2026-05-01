# archscope

Architecture evidence for humans and AI coding agents.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture Evidence Pack](#architecture-evidence-pack)
- [Human Workflows](#human-workflows)
- [AI Agent Workflows](#ai-agent-workflows)
- [Machine Output Contracts](#machine-output-contracts)
- [Migration State](#migration-state)
- [Documentation Index](#documentation-index)
- [Development](#development)
- [Distribution](#distribution)

## Overview

`archscope` is the canonical CLI identity for the `@brainwav/diagram` package.
The compatibility command `diagram` remains available during the migration
window for existing scripts.

The CLI scans your repository and produces architecture evidence:

- A default evidence pack (`scan`) for first-run review and agent handoff
- Mermaid diagrams (`generate`, `generate-all`), including schema-backed ERD output
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

After `npm link`, use `archscope ...` for new workflows. Without `npm link`, run
commands with `node src/diagram.js ...`.

## Architecture Evidence Pack

Use this path for new repositories:

```bash
archscope init .
archscope doctor .
archscope scan .
```

What this gives you:

- `.architecture.yml` starter rules
- `.diagramrc` defaults
- CI step sample at `.diagram/ci/github-actions-step.yml`
- toolchain diagnostics before CI rollout
- `.diagram/manifest.json` as the stable artifact index
- `.diagram/brief.md` as the human architecture brief
- `.diagram/report.html` as the human architecture report
- `.diagram/agent-context.json` as the canonical agent handoff
- `.diagram/architecture.mmd` as the first architecture diagram

For PR review evidence, add git refs:

```bash
archscope scan . --base origin/main --head HEAD
```

That keeps the same evidence pack and adds `.diagram/pr-impact/pr-impact.json`
when refs resolve. `.diagram/report.html` is written by default and becomes the
primary human artifact when report generation succeeds.

## Human Workflows

```bash
# Analyze repository structure
archscope analyze .

# Generate the default evidence pack
archscope scan .

# Generate one diagram and open preview
archscope generate . --type architecture --open

# Analyze only changed files in your branch
archscope changed . --base origin/main --head HEAD

# Explain a local dependency neighborhood
archscope explain auth-service .

# PR risk/blast-radius report
archscope workflow pr . --base origin/main --head HEAD --risk-threshold medium --fail-on-risk

# PR evidence pack for reviewers and agents
archscope scan . --base origin/main --head HEAD
```

## AI Agent Workflows

```bash
# Stable machine outputs
archscope scan . --format json --deterministic
archscope generate . --type architecture --format json --deterministic
archscope workflow pr . --base origin/main --head HEAD --format json --deterministic

# Canonical agent read order
cat .diagram/manifest.json
cat .diagram/brief.md
cat .diagram/agent-context.json
```

Agents should read `.diagram/manifest.json` first, then consume only artifacts
whose manifest status is `written`. The standalone `context` command remains
available for refreshing the older `.diagram/context` pack when existing
automation depends on it.

## Machine Output Contracts

- Use `--format json` for machine output.
- `--json` is a compatibility alias and is normalized to `--format json`.
- Covered command outputs use the canonical machine envelope with `schemaVersion`,
  `command`, `status`, `meta`, `data`, `errors`, and optional `agentSummary`.
- Use `--deterministic` for stable ordering/timestamps in machine payloads.
- JSON-capable command coverage is tracked in
  `.diagram/contracts/machine-command-coverage.json`.
- `scan --format json` nests the evidence manifest under `data.evidencePack`
  and includes `data.pr` when PR refs are supplied.
- PR impact JSON nests its analytical payload under `data.prImpact` and includes
  `agentSummary` with:
  - `changedComponents`
  - `riskReasons`
  - `suggestedReviewerChecks`

## Migration State

Current migration state: `compatibility`.

- Canonical command: `archscope`
- Compatibility command: `diagram`
- Package name: `@brainwav/diagram`
- Finalization policy: `.diagram/migration/finalization-policy.json`
- Release readiness evidence: `.diagram/migration/releases/<releaseId>/migration-readiness.json`
- Latest readiness pointer: `.diagram/migration/migration-readiness.json`
- Append-only readiness ledger: `.diagram/migration/releases/ledger.json`

Do not treat the package as renamed or the compatibility command as removable
until the finalization policy and release evidence prove the required migration
window. See [Archscope compatibility migration](docs/migration/archscope-compatibility.md).

## Documentation Index

- [CLI reference](docs/cli-reference.md)
- [Getting started](docs/getting-started.md)
- [Architecture testing](docs/architecture-testing.md)
- [Archscope compatibility migration](docs/migration/archscope-compatibility.md)
- [Migration from dependency-cruiser](docs/migration-from-dependency-cruiser.md)
- [Maintainer docs index](docs/README.md)

## Development

```bash
npm install
npm test
npm run test:deep
npm run migration:readiness
node src/diagram.js --help
```

## License

Apache 2.0 - see [LICENSE](LICENSE).

## Distribution

Official installation instructions are maintained in this repository only.

Third-party indexes or mirrors may list this project, but they are not affiliated with, endorsed by, or maintained by this project unless explicitly stated here.
