# Architecture Testing

Validate your codebase architecture against declarative YAML rules. Catch architectural drift before it becomes technical debt.

## Table of Contents

- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Rule types](#rule-types)
- [Pattern syntax](#pattern-syntax)
- [CI/CD integration](#cicd-integration)
- [Exit codes](#exit-codes)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

## Quick start

```bash
# Generate starter configuration
diagram test --init

# Run validation
diagram test

# Preview file matching
diagram test --dry-run --verbose

# Output for CI
diagram test --format junit --output results.xml
```

## Configuration

Create `.architecture.yml` in your project root:

```yaml
version: "1.0"

rules:
  - name: "Domain isolation"
    description: "Domain logic should not depend on UI"
    layer: "src/domain"
    must_not_import_from: ["src/ui", "src/components"]

  - name: "API contract"
    description: "API routes only use domain and shared"
    layer: "src/api"
    may_import_from: ["src/domain", "src/shared", "src/types"]
    must_not_import_from: ["src/ui"]
```

### Configuration options

| Option | Type | Description |
|--------|------|-------------|
| `version` | string | Config version (default: "1.0") |
| `extends` | string | Path to base config (optional) |
| `rules` | array | List of rules to validate |

### Rule structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Unique rule name |
| `description` | string | | Human-readable description |
| `layer` | string \| array | ✅ | Glob pattern(s) for target files |
| `must_not_import_from` | array | | Forbidden import patterns |
| `may_import_from` | array | | Whitelist of allowed imports |
| `must_import_from` | array | | Required import patterns |

## Rule types

### must_not_import_from

Files in the layer cannot import from these patterns:

```yaml
rules:
  - name: "No UI in domain"
    layer: "src/domain"
    must_not_import_from: ["src/ui", "src/components"]
```

### may_import_from

Files in the layer can ONLY import from these patterns (whitelist):

```yaml
rules:
  - name: "API restricted imports"
    layer: "src/api"
    may_import_from: ["src/domain", "src/shared"]
```

### must_import_from

Files in the layer MUST import from at least one of these patterns:

```yaml
rules:
  - name: "Services need types"
    layer: "src/services"
    must_import_from: ["src/types"]
```

### Combining constraints

You can combine constraints in a single rule:

```yaml
rules:
  - name: "API contract"
    layer: "src/api"
    may_import_from: ["src/domain", "src/shared", "src/types"]
    must_not_import_from: ["src/ui"]
```

## Pattern syntax

Patterns use [picomatch](https://github.com/micromatch/picomatch) glob syntax:

| Pattern | Matches |
|---------|---------|
| `src/domain` | Files in src/domain directory |
| `src/**/*.ts` | All .ts files under src |
| `**/*.test.ts` | All test files |
| `src/{domain,shared}` | Files in domain OR shared |
| `!src/**/*.test.ts` | Negation (exclude test files) |

### Arrays for OR logic

```yaml
layer: ["src/core/**/*.ts", "src/shared/**/*.ts"]
```

Files matching ANY pattern are included.

### Security restrictions

- Patterns cannot contain `..` (directory traversal)
- Patterns cannot be absolute paths (`/home/user/...`)

## CI/CD integration

### GitHub Actions

```yaml
name: Architecture
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - run: npm run test:deep
      - run: node src/diagram.js test . --format junit --output results.xml
      - uses: dorny/test-reporter@v1
        if: success() || failure()
        with:
          name: Architecture Tests
          path: results.xml
          reporter: java-junit
```

### GitLab CI

```yaml
architecture-test:
  image: node:20
  script:
    - npm install -g @brainwav/diagram
    - diagram test --format junit --output results.xml
  artifacts:
    reports:
      junit: results.xml
    when: always
```

### CircleCI

```yaml
version: 2.1
jobs:
  architecture:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run: npm install -g @brainwav/diagram
      - run: diagram test
```

## Exit codes

| Code | Meaning | When to fail CI |
|------|---------|-----------------|
| 0 | All rules passed | ✅ Continue |
| 1 | One or more rules failed | ❌ Fail build |
| 2 | Configuration error | ❌ Fail build |

## Performance

Benchmarks for 1000 file codebase:

| Phase | Target | Typical |
|-------|--------|---------|
| File analysis | <3s | ~2s |
| Pattern matching | <100ms | ~20ms |
| Total | <5s | ~2.5s |

### Optimization tips

1. **Use specific patterns**: `src/domain` is faster than `**/domain/**`
2. **Limit max-files**: Use `-m, --max-files` for large codebases
3. **Pattern caching**: Patterns are compiled once and cached
4. **CI mode**: Automatically detected, disables progress spinners

## Troubleshooting

### No files matched layer pattern

Check your glob pattern:

```bash
# Preview matching
diagram test --dry-run --verbose
```

Common fixes:
- Use forward slashes: `src/domain` not `src\domain`
- Check file extensions: `**/*.ts` won't match `.js` files
- Verify directory structure matches your pattern

### Import not detected

Only these import styles are detected:
- ES6: `import X from 'module'`
- CommonJS: `require('module')`
- Dynamic: `import('module')`

### Pattern not matching

Test your pattern with picomatch:

```javascript
const pm = require('picomatch');
const isMatch = pm('src/**/*.ts');
console.log(isMatch('src/domain/User.ts')); // true/false
```

### YAML parse errors

The YAML parser provides detailed error messages:

```
YAMLParseError: Nested mappings are not allowed at line 5, column 12:
  5 |     host: localhost url: http://example.com
-------------------^
```

Common fixes:
- Quote strings with special characters: `"src/**/*"`
- Use proper indentation (2 spaces)
- Check for tabs vs spaces

## Examples

See the [examples/](../examples/) directory for:
- [Next.js applications](../examples/nextjs.architecture.yml)
- [Monorepos](../examples/monorepo.architecture.yml)

## Migration

Migrating from dependency-cruiser? See [migration-from-dependency-cruiser.md](migration-from-dependency-cruiser.md).
