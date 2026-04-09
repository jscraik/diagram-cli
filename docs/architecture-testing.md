# Architecture Testing

Use `diagram validate` and `diagram workflow pr` to enforce architecture rules and review PR blast radius.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration File](#configuration-file)
- [Rule Fields](#rule-fields)
- [Validate Command](#validate-command)
- [PR Impact Command](#pr-impact-command)
- [Output Contracts](#output-contracts)
- [CI Integration](#ci-integration)
- [Troubleshooting](#troubleshooting)

## Overview

`diagram validate` checks imports against declarative rules in `.architecture.yml`.

Exit codes:

- `0`: validation passed
- `1`: one or more rules failed
- `2`: configuration or usage error

`diagram workflow pr` computes:

- changed modeled components
- dependency edge delta
- blast radius
- risk score/level and risk flags

## Quick Start

```bash
# Scaffold starter rules
diagram validate --init

# Run validation
diagram validate .

# Preview matching files
diagram validate . --dry-run --verbose

# PR risk analysis
diagram workflow pr . --base origin/main --head HEAD
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

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `name` | Yes | string | Rule label in output |
| `layer` | Yes | string or string[] | File scope matcher |
| `description` | No | string | Human context |
| `must_not_import_from` | No* | string[] | Forbidden imports |
| `may_import_from` | No* | string[] | Allowlist imports |
| `must_import_from` | No* | string[] | Required imports |
| `inward_only` | No* | boolean | Protected layer directionality |

`*` At least one constraint field is required.

## Validate Command

```bash
diagram validate [path] [options]
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
diagram validate .
diagram validate . --format json --deterministic
diagram validate . --format junit --output architecture-results.xml
```

## PR Impact Command

```bash
diagram workflow pr [path] [options]
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
diagram workflow pr . --base origin/main --head HEAD
diagram workflow pr . --base origin/main --head HEAD --risk-threshold medium --fail-on-risk
diagram workflow pr . --base origin/main --head HEAD --format json --deterministic
```

## Output Contracts

`diagram workflow pr` writes:

- `.diagram/pr-impact/pr-impact.json`
- `.diagram/pr-impact/pr-impact.html` (skipped in `--format json`)

Machine-output guidance:

- Use `--format json` (canonical).
- Use `--deterministic` for stable timestamps/order.
- JSON includes explicit `schemaVersion`.
- JSON includes `agentSummary` with:
  - `changedComponents`
  - `riskReasons`
  - `suggestedReviewerChecks`

No-change behavior:

- If base/head refs have no diff, command exits `0`.
- Text mode prints a concise status message.
- JSON mode returns an empty-impact result payload.

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
      - run: diagram workflow pr . --base ${{ github.event.pull_request.base.sha }} --head ${{ github.event.pull_request.head.sha }} --risk-threshold high --fail-on-risk
      - uses: actions/upload-artifact@v4
        with:
          name: diagram-artifacts
          path: .diagram
```

## Troubleshooting

- Missing `.architecture.yml`:
  - Run `diagram validate --init`.
- Unexpected matches:
  - Run `diagram validate --dry-run --verbose`.
- Output write failures:
  - Ensure output paths are inside the project root and writable.
- PR ref resolution failures:
  - Provide explicit `--base` and `--head`, and ensure git history is available (`fetch-depth: 0` in CI).
