# Architecture Testing

Use `archscope scan`, `archscope validate`, and `archscope workflow pr` to generate architecture evidence, enforce rules, and review PR blast radius.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration File](#configuration-file)
- [Rule Fields](#rule-fields)
- [Validate Command](#validate-command)
- [Scan Evidence Pack](#scan-evidence-pack)
- [PR Impact Command](#pr-impact-command)
- [Output Contracts](#output-contracts)
- [CI Integration](#ci-integration)
- [Troubleshooting](#troubleshooting)

## Overview

`archscope validate` checks imports against declarative rules in `.architecture.yml`.
`archscope scan` writes the default evidence pack for human review, CI upload,
and AI-agent handoff.

Exit codes:

- `0`: validation passed
- `1`: one or more rules failed
- `2`: configuration or usage error

`archscope workflow pr` computes:

- changed modeled components
- dependency edge delta
- blast radius
- risk score/level and risk flags

## Quick Start

```bash
# Scaffold starter rules
archscope validate --init

# Run validation
archscope validate .

# Generate evidence pack
archscope scan .

# Preview matching files
archscope validate . --dry-run --verbose

# PR evidence and risk analysis
archscope scan . --base origin/main --head HEAD
```

## Configuration File

Create `.architecture.yml` in the repo root:

```yaml
version: "1.0"
rules:
  - name: "Domain isolation"
    layer: "src/domain"
    must_not_import_from: ["src/ui", "src/components"]

  - name: "API contract"
    layer: "src/api"
    may_import_from: ["src/domain", "src/shared", "src/types"]
    must_not_import_from: ["src/ui"]
```

## Rule Fields

| Field                  | Required | Type               | Notes                          |
| ---------------------- | -------- | ------------------ | ------------------------------ |
| `name`                 | Yes      | string             | Rule label in output           |
| `layer`                | Yes      | string or string[] | File scope matcher             |
| `description`          | No       | string             | Human context                  |
| `must_not_import_from` | No\*     | string[]           | Forbidden imports              |
| `may_import_from`      | No\*     | string[]           | Allowlist imports              |
| `must_import_from`     | No\*     | string[]           | Required imports               |
| `inward_only`          | No\*     | boolean            | Protected layer directionality |

`*` At least one constraint field is required.

## Validate Command

```bash
archscope validate [path] [options]
```

Options:

- `--config <file>`
- `--format <console|json|junit>`
- `--output <file>`
- `--patterns <list>`
- `--exclude <list>`
- `--max-files <n>`
- `--dry-run`
- `--verbose`
- `--init`
- `--force`
- `--save-baseline`

Examples:

```bash
archscope validate .
archscope validate . --format json --deterministic
archscope validate . --format junit --output architecture-results.xml
```

## Scan Evidence Pack

```bash
archscope scan [path] [options]
```

Repository scan outputs:

- `.diagram/manifest.json`
- `.diagram/brief.md`
- `.diagram/agent-context.json`
- `.diagram/architecture.mmd`
- `.diagram/report.html`

PR scan outputs:

- all repository scan outputs
- `.diagram/pr-impact/pr-impact.json` when `--base` or `--head` refs resolve

Key options:

- `--output-dir <dir>`
- `--base <ref>`
- `--head <ref>`
- `--format <text|json>`
- `--deterministic`
- `--patterns <list>`
- `--exclude <list>`
- `--max-files <n>`
- `--analyzer <name>`

Agents and CI should read `.diagram/manifest.json` first and only consume
artifacts whose status is `written`. Repository scans keep the PR impact artifact
`deferred`; PR scans mark it `written` when refs resolve or `failed` with
`git_refs_missing` when they do not.

## PR Impact Command

```bash
archscope workflow pr [path] [options]
```

Key options:

- `--base <ref>`
- `--head <ref>`
- `--output-dir <dir>`
- `--max-depth <n>`
- `--max-nodes <n>`
- `--risk-threshold <none|low|medium|high>`
- `--fail-on-risk`
- `--risk-override-reason <string>`
- `--format <text|json>`
- `--deterministic`
- `--max-files <n>`
- `--patterns <list>`
- `--exclude <list>`

Examples:

```bash
archscope workflow pr . --base origin/main --head HEAD
archscope workflow pr . --base origin/main --head HEAD --risk-threshold medium --fail-on-risk
archscope workflow pr . --base origin/main --head HEAD --format json --deterministic
```

## Output Contracts

`archscope scan . --base <ref> --head <ref>` writes the default evidence pack and
adds `.diagram/pr-impact/pr-impact.json`.

`archscope workflow pr` remains the lower-level PR impact command and writes:

- `.diagram/pr-impact/pr-impact.json`
- `.diagram/pr-impact/pr-impact.html` (skipped in `--format json`)

Machine-output guidance:

- Use `--format json` (canonical).
- Use `--deterministic` for stable timestamps/order.
- Covered JSON commands emit the canonical root machine envelope with
  `schemaVersion`, `command`, `status`, `meta`, `data`, `errors`, and optional
  `agentSummary`.
- JSON-capable command coverage is tracked in `.diagram/contracts/machine-command-coverage.json`.
- Scan JSON nests the evidence manifest under `data.evidencePack` and includes
  `data.pr` for PR evidence runs.
- PR impact JSON nests its analytical payload under `data.prImpact` and includes
  `agentSummary` with:
  - `changedComponents`
  - `riskReasons`
  - `suggestedReviewerChecks`

No-change behavior:

- If base/head refs have no diff, command exits `0`.
- Text mode prints a concise status message.
- JSON mode returns an empty-impact result payload.

Compatibility note:

- `diagram validate` and `diagram workflow pr` remain available during the
  `compatibility` migration state.
- New docs and automation should prefer `archscope`.

## CI Integration

```yaml
name: Architecture Checks
on: [pull_request]

jobs:
  architecture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test
      - run: npm run test:deep
      - run: npm run ci:artifacts
        env:
          ARCHSCOPE_BASE_REF: ${{ github.event.pull_request.base.sha }}
          ARCHSCOPE_HEAD_REF: ${{ github.event.pull_request.head.sha }}
      - run: node src/diagram.js workflow pr . --base ${{ github.event.pull_request.base.sha }} --head ${{ github.event.pull_request.head.sha }} --risk-threshold high --fail-on-risk
      - uses: actions/upload-artifact@v4
        with:
          name: archscope-artifacts
          path: .diagram
```

`npm run ci:artifacts` asserts the required scan contract:

| Artifact                            | Repository scan | PR scan   |
| ----------------------------------- | --------------- | --------- |
| `.diagram/manifest.json`            | `written`       | `written` |
| `.diagram/brief.md`                 | `written`       | `written` |
| `.diagram/agent-context.json`       | `written`       | `written` |
| `.diagram/architecture.mmd`         | `written`       | `written` |
| `.diagram/pr-impact/pr-impact.json` | `deferred`      | `written` |
| `.diagram/report.html`              | `written`       | `written` |

## Troubleshooting

- Missing `.architecture.yml`:
  - Run `archscope validate --init`.
- Unexpected matches:
  - Run `archscope validate --dry-run --verbose`.
- Output write failures:
  - Ensure output paths are inside the project root and writable.
- PR ref resolution failures:
  - Provide explicit `--base` and `--head`, and ensure git history is available (`fetch-depth: 0` in CI).
