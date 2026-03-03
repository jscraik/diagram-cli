# Architecture Testing

Validate repository import boundaries with `diagram test` and declarative
`.architecture.yml` rules.

## Table of Contents

- [Plain-language overview](#plain-language-overview)
- [Quick start](#quick-start)
- [Configuration file](#configuration-file)
- [Rule fields](#rule-fields)
- [Command reference](#command-reference)
- [Output formats and exit codes](#output-formats-and-exit-codes)
- [CI integration](#ci-integration)
- [Troubleshooting](#troubleshooting)

## Plain-language overview

`diagram test` checks imports in your code.
You write rules in `.architecture.yml`.
Each rule names a code area.
Each rule says what that area can import.
The CLI checks files and reports breaks.
Exit code `0` means pass.
Exit code `1` means at least one rule failed.
Exit code `2` means config or setup is wrong.
Use `--dry-run` to see file matches first.

## Quick start

```bash
# Generate starter configuration
diagram test --init

# Validate rules
diagram test

# Preview matching files only
diagram test --dry-run --verbose

# JUnit output for CI
diagram test --format junit --output architecture-results.xml
```

## Configuration file

Create `.architecture.yml` in your project root.

```yaml
version: "1.0"

rules:
  - name: "Domain isolation"
    description: "Domain logic must not depend on UI"
    layer: "src/domain"
    must_not_import_from: ["src/ui", "src/components"]

  - name: "API contract"
    description: "API can only import domain/shared/types"
    layer: "src/api"
    may_import_from: ["src/domain", "src/shared", "src/types"]
    must_not_import_from: ["src/ui"]
```

## Rule fields

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `name` | Yes | string | Rule label shown in output |
| `description` | No | string | Additional context |
| `layer` | Yes | string or string[] | Glob-like path matcher(s) |
| `must_not_import_from` | No* | string[] | Forbidden imports |
| `may_import_from` | No* | string[] | Allowlist imports |
| `must_import_from` | No* | string[] | Required imports |
| `inward_only` | No* | boolean | **Directional:** Other protected layers cannot import from this layer |

`*` At least one constraint must be present (`must_not_import_from`, `may_import_from`, `must_import_from`, or `inward_only`).

### Directional constraints with `inward_only`

The `inward_only: true` flag enables directional import constraints for Clean Architecture and DDD patterns. When enabled, files in that layer can only be imported by:

- Same layer hierarchy (e.g., `src/domain/**` can import from `src/domain/**`)
- Unprotected paths (paths NOT covered by any `inward_only` rule)
- External packages (node_modules, npm:)

**Example: Hexagonal Architecture**

```yaml
version: "1.0"

rules:
  # Core domain - no outer layer can import from it
  - name: "Domain core"
    layer: "src/domain"
    inward_only: true

  # Application layer - also protected
  - name: "Application services"
    layer: "src/application"
    inward_only: true

  # Infrastructure can import from anyone
  - name: "Infrastructure"
    layer: "src/infrastructure"
    # No inward_only - can be imported by any layer

  # Shared utilities - no protection, can be used anywhere
  # (no rule needed for unprotected paths)
```

**How cross-layer blocking works:**

If `src/domain` and `src/application` both have `inward_only: true`:
- Domain cannot be imported by Application
- Application cannot be imported by Domain
- Both can still import from `src/shared/` (unprotected)
- Both can still import from external packages

**When to use `inward_only`:**

- Clean Architecture: Protect domain layer from outer layers
- DDD bounded contexts: Isolate contexts from each other
- Plugin architectures: Prevent plugins from importing each other

**Security limits:**

- Maximum 50 `inward_only` rules per config
- Pattern length: 200 characters max
- Brace depth: 3 levels max (ReDoS protection)

Pattern restrictions:

- Relative patterns only.
- No absolute paths.
- No directory traversal patterns like `..`.

Note on `extends`:

- The schema accepts an optional `extends` field.
- Current CLI behavior does not merge inherited configs yet; only `rules` in
  the loaded file are evaluated.

## Command reference

```bash
diagram test [path] [options]
```

Options (current CLI):

- `-c, --config <file>` config file path (default: `.architecture.yml`)
- `-f, --format <format>` `console|json|junit` (default: `console`)
- `-o, --output <file>` write JSON/JUnit output to file
- `-p, --patterns <list>` analyzed file patterns
- `-e, --exclude <list>` excluded paths
- `-m, --max-files <n>` max files to analyze (default: `100`)
- `--dry-run` preview file matching only
- `--verbose` verbose output
- `--init` generate starter config
- `--force` overwrite existing config when used with `--init`

## Output formats and exit codes

Exit codes:

- `0`: validation passed
- `1`: one or more rules failed
- `2`: config/usage error (invalid config, missing config, invalid output path)

Format behavior:

- `console` prints human-readable output.
- `json` prints JSON to stdout unless `--output` is provided.
- `junit` prints XML to stdout unless `--output` is provided.

## CI integration

### GitHub Actions

```yaml
name: Architecture Testing
on: [push, pull_request]

jobs:
  architecture-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test
      - run: npm run test:deep
      - run: npm run ci:artifacts
      - uses: actions/upload-artifact@v4
        with:
          name: diagram-ci-artifacts
          path: .diagram
```

The `.diagram/` directory is an AI-agent-facing, non-user-facing artifact output
path in CI. It is uploaded as a workflow artifact and is not intended to be
checked into source control by default.

## Troubleshooting

### No config found

```bash
diagram test --init
```

### Rule matched zero files

```bash
diagram test --dry-run --verbose
```

### Output file write errors

- Ensure output path is inside the target project root.
- Ensure parent directory is writable.

### Import match confusion

- Use forward slashes in patterns.
- Prefer explicit folder prefixes (example: `src/domain` instead of broad globs).

## Examples

- [Next.js example config](../examples/nextjs.architecture.yml)
- [Monorepo example config](../examples/monorepo.architecture.yml)
- [Migration guide](migration-from-dependency-cruiser.md)

---

## PR Architecture Impact Analysis

An the `diagram workflow pr` command analyzes the architecture impact of PR changes and including:
 blast radius, risk scoring, and### Quick start

```bash
# Basic usage (analyzes current PR against merge base)
diagram workflow pr . --base origin/main --head HEAD

# With explicit refs
diagram workflow pr . --base v1.0.0 --head v1.2.0

# With risk threshold anddiagram workflow pr . --base origin/main --head HEAD \
  --risk-threshold medium --fail-on-risk

# JSON output only
diagram workflow pr . --base HEAD~1 --head HEAD --json

# Verbose output
diagram workflow pr . --base HEAD~1 --head HEAD --verbose
```

### Command options

| Option | Description |
|--------|-------------|
| `--base <ref>` | Base git ref (SHA, branch, tag). Required unless auto-detected. |
| `--head <ref>` | Head git ref (SHA, branch, tag). Defaults to HEAD. |
| `-o, --output-dir <dir>` | Output directory for artifacts. Default: `.diagram/pr-impact` |
| `--max-depth <n>` | Maximum blast radius traversal depth. Default: 2. |
| `--max-nodes <n>` | Maximum components in blast radius. Default: 50. |
| `--risk-threshold <level>` | Risk threshold for gating: none, low, medium, high. Default: none. |
| `--fail-on-risk` | Exit with code 1 if risk meets or exceeds threshold. |
| `--risk-override-reason <string>` | Override risk gate with documented reason. |
| `-j, --json` | Output as JSON only (skip HTML generation). |
| `--verbose` | Show detailed output. |

### Output artifacts

| File | Description |
|------|-------------|
| `pr-impact.json` | Full JSON report with all analysis details (machine-readable, stable contract) |
| `pr-impact.html` | Human-readable HTML explainer with structured review narrative |

#### Compatibility and Output Model

- **`.diagram/pr-impact/pr-impact.json`** — Machine-readable artifact with stable schema. Use for CI tooling, dashboards, and automated processing.
- **`.diagram/pr-impact/pr-impact.html`** — Human-readable narrative for reviewers. Includes Executive Summary, Change Story, Risk Reasoning, Blast Radius, and Action Checklist sections.

**Empty diff behavior:** When base and head refs are identical, no artifacts are generated. The command exits 0 with a status message (non-JSON) or empty result JSON (`--json`).

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success, below risk threshold |
| 1 | Risk threshold exceeded (with `--fail-on-risk`) |
| 2 | Configuration or git error |

### CI integration

Add to your PR workflow:

```yaml
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "25"
      - run: npm install
      - name: Run architecture impact analysis
        run: node src/diagram.js workflow pr . --base ${{ github.event.pull_request.base.sha }} --head ${{ github.event.pull_request.head.sha }} --verbose
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
      - run: npm install
      - run: node src/diagram.js workflow pr . --base ${{ github.event.pull_request.base.sha }} --head ${{ github.event.pull_request.head.sha }} --risk-threshold high --fail-on-risk
```

### Risk scoring

The risk score uses differentiated weights:

| Factor | Weight |
|--------|-------|
| Auth touch | +3 |
| Security boundary touch | +3 |
| Database path touch | +2 |
| Blast radius ≥ 5 nodes | +1 |
| Edge delta ≥ 10 edges | +1 |

**Severity mapping:**

| Score | Level |
|-------|-------|
| 0 | none |
| 1-2 | low |
| 3-5 | medium |
| 6+ | high |

### Blast radius

Blast radius represents components potentially impacted by the PR changes through transitive dependencies. The traversal is bounded by:
- Depth: maximum hops from changed components (default: 2)
- Node cap: maximum components to report (default: 50)

When the node cap is hit:
- `blastRadius.truncated: true` in output
- `blastRadius.omittedCount` shows how many were cut

### Example workflow

```yaml
# .github/workflows/architecture-impact.yml
name: Architecture Impact Analysis
on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: node src/diagram.js workflow pr . --base ${{ github.event.pull_request.base.sha }} --head ${{ github.event.pull_request.head.sha }} --verbose
      - uses: actions/upload-artifact@v4

  risk-gate:
    needs: analyze
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: node src/diagram.js workflow pr . --base ${{ github.event.pull_request.base.sha }} --head ${{ github.event.pull_request.head.sha }} --risk-threshold high --fail-on-risk
```
