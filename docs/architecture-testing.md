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

`*` At least one of the three constraint arrays must be present.

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
      - run: node src/diagram.js test . --format junit --output architecture-results.xml
```

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
