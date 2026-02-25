---
title: Add Architecture Testing with YAML Rules Validation
type: feat
status: archived
date: 2026-02-24
---

# Add Architecture Testing with YAML Rules Validation

Historical status: implemented in this repository. This file is retained as a planning artifact.

## Overview

Add a `diagram test` command that validates codebase architecture against declarative rules defined in `.architecture.yml`. This transforms diagrams from passive documentation into active guardrails that prevent architectural drift.

## Problem Statement / Motivation

Codebases naturally drift from their intended architecture over time:
- UI components start importing database code directly
- Domain logic leaks into API routes
- Circular dependencies form between modules
- Tests become interdependent and fragile

Current tools like `dependency-cruiser` exist but require JavaScript configs and complex setup. Teams need a simple, YAML-based rule system that integrates seamlessly with the existing `diagram analyze` engine.

## Proposed Solution

A new `diagram test` command that:
1. Reads `.architecture.yml` rules file
2. Runs the existing `analyze()` function to build component graph
3. Validates rules against the graph
4. Reports violations with file paths and line numbers
5. Exits with code 0 (pass) or 1 (fail) for CI integration

### Example Usage

```yaml
# .architecture.yml
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
    
  - name: "Test independence"
    description: "Tests should not import other tests"
    layer: "**/*.test.ts"
    must_not_import_from: ["**/*.test.ts", "**/*.spec.ts"]
```

Run in CI:
```bash
$ diagram test
✅ All 12 rules passed

$ diagram test
❌ Rule "Domain isolation" failed:
   src/domain/entities/User.ts imports from src/ui/components/Button.ts
   Violation: src/domain/entities/User.ts → src/ui/components/Button.ts
```

## Technical Considerations

### Architecture

**New Components:**
1. `src/rules.js` - Rule engine (load YAML, validate against component graph)
2. `src/formatters/` - Output formatters (console, json, junit)
3. `.architecture.yml` schema definition

**Integration Points:**
- Reuses existing `analyze()` function from `diagram.js`
- Uses existing component graph with `dependencies` array
- Leverages existing `sanitize()` and `normalizePath()` utilities
- Follows Commander.js command pattern

### Rule Types

**Phase 1 (MVP):**
- `layer` + `must_not_import_from` - Forbidden imports
- `layer` + `may_import_from` - Whitelist imports
- `layer` + `must_import_from` - Required imports

**Phase 2 (Future):**
- `no_circular_dependencies` - Detect cycles
- `max_dependencies` - Limit dependency count
- `file_naming` - Enforce naming conventions

### Output Formats

**Console (default):**
```
✅ Domain isolation (12 files checked)
✅ API contract (8 files checked)
❌ Test independence (3 violations):
   src/utils/helpers.test.ts → src/api/routes.test.ts
   src/ui/Button.test.ts → src/hooks/useAuth.test.ts
   src/domain/Order.test.ts → src/services/Payment.test.ts

3 rules passed, 1 failed
```

**JSON (`--format json`):**
```json
{
  "summary": { "passed": 3, "failed": 1, "total": 4 },
  "rules": [
    { "name": "Domain isolation", "status": "passed", "filesChecked": 12 },
    { "name": "Test independence", "status": "failed", "violations": [...] }
  ]
}
```

**JUnit (`--format junit`):**
```xml
<testsuites>
  <testsuite name="Architecture" tests="4" failures="1">
    <testcase name="Domain isolation"/>
    <testcase name="Test independence">
      <failure message="3 violations found">...</failure>
    </testcase>
  </testsuite>
</testsuites>
```

## System-Wide Impact

### Interaction Graph

```
CLI command "diagram test"
  → loads .architecture.yml (yaml.parse)
  → calls analyze(rootPath, options) [existing]
    → glob file discovery [existing]
    → extractImports() [existing]
    → build component graph [existing]
  → validateRules(rules, components)
    → for each rule
      → find matching files (minimatch/glob)
      → check imports against constraints
      → collect violations
  → formatOutput(violations, format)
    → console.table() or JSON.stringify()
  → process.exit(violations.length > 0 ? 1 : 0)
```

### Error & Failure Propagation

| Error Type | Handling |
|------------|----------|
| Missing `.architecture.yml` | Exit 1 with "No rules file found" message |
| Invalid YAML syntax | Exit 1 with parse error and line number |
| Unknown rule type | Warning, skip rule, continue |
| No matching files for layer | Warning, rule skipped |
| Analysis errors | Propagate from analyze(), exit 1 |

### State Lifecycle Risks

- No persistent state (read-only operation)
- Temp files from analysis cleaned up automatically
- No side effects beyond stdout/stderr and exit code

### API Surface Parity

The `test` command should accept same options as `analyze`:
- `-p, --patterns` - File patterns
- `-e, --exclude` - Exclude patterns
- `-m, --max-files` - Max files to analyze

Plus test-specific options:
- `-c, --config` - Config file path (default: `.architecture.yml`)
- `-f, --format` - Output format (console, json, junit)

## Acceptance Criteria

- [ ] `diagram test` command exists and shows help
- [ ] Loads `.architecture.yml` configuration file
- [ ] Supports `must_not_import_from` rule type
- [ ] Supports `may_import_from` rule type
- [ ] Supports glob patterns in layer definitions
- [ ] Console output shows pass/fail per rule
- [ ] `--format json` outputs machine-readable JSON
- [ ] `--format junit` outputs JUnit XML for CI
- [ ] Exit code 0 when all rules pass
- [ ] Exit code 1 when any rule fails
- [ ] Works in CI environments (no TTY assumptions)
- [ ] Validates YAML schema and reports errors
- [ ] Includes documentation in README.md

## Success Metrics

- **Adoption**: Can be adopted by existing diagram-cli users with minimal setup
- **CI Integration**: Works in GitHub Actions, CircleCI, etc. without configuration
- **Performance**: Test runs in <5 seconds for 1000 file codebase
- **Error Clarity**: Violation messages include file path and specific import

## Dependencies & Risks

**Dependencies:**
- `yaml` or `js-yaml` package for YAML parsing
- No changes to existing dependencies

**Risks:**
- **Rule pattern complexity**: Glob matching performance on large codebases
- **False positives**: Import resolution edge cases (alias imports, tsconfig paths)
- **YAML fatigue**: Another config file for teams to maintain

**Mitigations:**
- Cache glob results within single run
- Document limitations (only relative imports, no tsconfig path resolution)
- Provide `diagram test --init` to generate starter config

## Implementation Plan

### Phase 1: Core Rule Engine

1. Add `js-yaml` dependency
2. Create `src/rules.js` with:
   - `loadRules(configPath)` - Parse YAML
   - `validateRules(rules, components)` - Check against graph
   - `matchLayer(layer, filePath)` - Glob matching
3. Add `diagram test` command to CLI
4. Implement `must_not_import_from` rule type

### Phase 2: Output Formats

1. Create `src/formatters/console.js`
2. Create `src/formatters/json.js`
3. Create `src/formatters/junit.js`
4. Add `--format` option

### Phase 3: Polish

1. Add `--init` flag to generate starter config
2. Add schema validation for YAML
3. Performance optimization (caching)
4. Documentation and examples

## Documentation Plan

- **README.md**: Add "Architecture Testing" section with quickstart
- **docs/architecture-testing.md**: Full documentation with rule examples
- **.architecture.yml examples**: In repo root and examples/ directory

## Sources & References

### Internal References

- `src/diagram.js:101-198` - analyze() function
- `src/diagram.js:52-72` - extractImports() function
- `src/diagram.js:170-195` - Dependency resolution logic
- `src/diagram.js:434-570` - CLI command pattern

### External References

- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) - Inspiration for rule types
- [Semgrep](https://semgrep.dev/) - Alternative approach using AST patterns
- [Mermaid](https://mermaid.js.org/) - Existing diagram format

### Similar Tools

- ArchUnit (Java) - Architecture testing for Java
- Import Lint (Python) - Import constraint checker
- TSLint's no-restricted-imports - Single rule, not comprehensive
