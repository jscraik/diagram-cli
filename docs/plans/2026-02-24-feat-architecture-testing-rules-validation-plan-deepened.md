---
title: Add Architecture Testing with YAML Rules Validation
type: feat
status: active
date: 2026-02-24
---

# Add Architecture Testing with YAML Rules Validation

## Enhancement Summary

**Deepened on:** 2026-02-24  
**Sections enhanced:** 8  
**Research agents used:** CLI best practices, glob pattern matching, YAML config patterns

### Key Improvements

1. **Exit code strategy** - Unix-compliant (0=success, 1=validation failed, 2=config error)
2. **Glob pattern library** - picomatch for 2M+ ops/sec matching performance
3. **YAML parser** - `yaml` library with security hardening (maxAliasCount, file size limits)
4. **Output formatters** - Console (chalk/Table), JSON (schema), JUnit XML (CI)
5. **Configuration discovery** - cosmiconfig pattern for multiple file locations
6. **Caching strategy** - Pre-compiled matchers with options-aware cache keys
7. **Rule architecture** - Strategy pattern for extensible rule types
8. **Security** - Path traversal prevention, YAML bomb protection

### New Considerations Discovered

- **CI vs Local output** - Auto-detect CI env, disable colors/spinners, ASCII fallback
- **Performance at scale** - 1000+ files requires compiled matchers, not regex per file
- **Error message quality** - Show file path, line numbers, source extract, suggestions
- **Security hardening** - YAML bombs, path traversal, symlink handling
- **Dry-run mode** - Preview file matching before validation
- **IDE support** - JSON Schema for autocomplete and validation
- **Line number tracking** - Import extraction needs position capture for accurate violation reporting

---

## Technical Review Findings

### Critical Issues Resolved (P1)

| Issue | Finding | Resolution |
|-------|---------|------------|
| **Module System** | Plan showed ESM imports, existing code uses CommonJS | Use `require()` syntax for all new dependencies |
| **YAML Security** | No protection against Billion Laughs attacks | Add `maxAliasCount: 100`, file size limit (1MB) |
| **Exit Codes** | Inconsistent codes (1 vs 10) shown in different sections | Standardize: 0=success, 1=validation failed, 2=config error |
| **Test Strategy** | No testing approach defined | Added comprehensive testing section |

### Important Issues Addressed (P2)

| Issue | Finding | Resolution |
|-------|---------|------------|
| **Rule Architecture** | No strategy pattern for extensibility | Define `Rule` base class with `validate()` method |
| **Graph Abstraction** | References "component graph" but returns flat array | Create `ComponentGraph` wrapper with indexes |
| **Dry-Run Mode** | No way to preview file matching | Add `--dry-run` flag to show matched files |
| **Path Traversal** | Patterns like `../**/*.ts` could escape project root | Validate patterns, reject `..` and absolute paths |
| **Cache Keys** | picomatch options not part of cache key | Include options in cache key: `${pattern}::${JSON.stringify(options)}` |
| **Rule Factory** | Referenced in interaction graph but not defined | Add `RuleFactory` class with `createRules()` method |
| **Layer Arrays** | Schema shows string, caching shows array support | Clarify: layer supports single string or array of strings |

### Nice-to-Have Items (P3)

| Item | Resolution |
|------|------------|
| IDE Support | Provide `.architecture.schema.json` for autocomplete |
| Unicode Icons | Detect CI/encoding, fallback to ASCII: `[OK]` `[FAIL]` `[WARN]` |
| Config Inheritance | Support `extends: ./base.architecture.yml` |
| Symlink Handling | Add `resolveRealPath()` to prevent symlink-based traversal |
| Violation Structure | Define explicit `Violation` interface for consistency |

---

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
    
  - name: "Test independence"
    description: "Tests should not import other tests"
    layer: "**/*.test.ts"
    must_not_import_from: ["**/*.test.ts", "**/*.spec.ts"]
    
  - name: "Multi-layer rule"
    description: "Layer can be array for OR matching"
    layer: ["src/core/**/*.ts", "src/shared/**/*.ts"]
    must_not_import_from: ["src/ui"]
```

Run in CI:
```bash
$ diagram test
✅ All 12 rules passed

$ diagram test
❌ Rule "Domain isolation" failed:
   src/domain/entities/User.ts:15 imports from src/ui/components/Button.ts
   Suggestion: Move shared code to src/shared/ or use dependency injection
   Allow with comment: // architecture-allow: domain-imports-ui
```

### Research Insights

**Best Practices:**
- Support multiple config file locations (`.architecture.yml`, `architecture.config.yml`, `package.json` key)
- Use cosmiconfig for standardized config discovery
- Auto-detect CI via `process.env.CI` or `!process.stdout.isTTY`
- Disable colors/progress spinners in CI environments
- Use ASCII fallbacks `[OK]` `[FAIL]` when Unicode not supported

**CLI Pattern:**
```javascript
// Exit codes (Unix-compliant)
const ExitCodes = {
  SUCCESS: 0,              // All checks passed
  VALIDATION_FAILED: 1,    // Rules found violations
  CONFIG_ERROR: 2,         // Invalid YAML or schema
};

// CI detection with encoding support
const isCI = process.env.CI === 'true' || !process.stdout.isTTY;
const supportsUnicode = process.env.LC_ALL?.includes('UTF') || 
                        process.platform !== 'win32';

const icons = isCI || !supportsUnicode 
  ? { success: '[OK]', error: '[FAIL]', warning: '[WARN]' }
  : { success: '✅', error: '❌', warning: '⚠' };
```

---

## Technical Considerations

### Architecture

**New Components:**
1. `src/rules.js` - Rule engine with strategy pattern
2. `src/rules/types/base.js` - Rule base class
3. `src/rules/types/import-rule.js` - Import constraint rules
4. `src/graph.js` - ComponentGraph wrapper with indexes
5. `src/formatters/` - Output formatters (console, json, junit)
6. `.architecture.yml` schema definition

**Rule Strategy Pattern:**
```javascript
// src/rules/types/base.js
class Rule {
  constructor(config) { this.config = config; }
  get name() { return this.config.name; }
  validate(file, componentGraph) { throw new Error('implement'); }
  getRequiredData() { return ['imports']; }
}

// src/rules/types/import-rule.js
class ImportRule extends Rule {
  validate(file, componentGraph) {
    // Implementation for import constraints
    // Returns: Array<Violation>
  }
}

// src/rules/factory.js
class RuleFactory {
  static createRules(config) {
    return config.rules.map(ruleConfig => {
      const type = this.detectRuleType(ruleConfig);
      switch (type) {
        case 'import':
          return new ImportRule(ruleConfig);
        default:
          throw new Error(`Unknown rule type for "${ruleConfig.name}": ${type}`);
      }
    });
  }
  
  static detectRuleType(config) {
    if (config.must_not_import_from || config.may_import_from || config.must_import_from) {
      return 'import';
    }
    throw new Error(`Cannot determine rule type for: ${config.name}`);
  }
}
```

**Violation Interface:**
```javascript
// Violation structure returned by rule.validate()
interface Violation {
  ruleName: string;           // Name of the rule that failed
  severity: 'error' | 'warning';
  file: string;              // File with the violation
  line?: number;             // Line number (if available)
  column?: number;           // Column (if available)
  message: string;           // Human-readable description
  source?: string;           // Source code extract
  suggestion?: string;       // How to fix
  relatedFile?: string;      // For import violations, the target file
}
```

**ComponentGraph Wrapper:**
```javascript
// src/graph.js
class ComponentGraph {
  constructor(analyzeResult) {
    this.components = analyzeResult.components;
    this._buildIndexes();
  }
  
  getDependencies(componentName) { /* forward lookup */ }
  getDependents(componentName) { /* reverse lookup */ }
  findCycles() { /* for Phase 2 circular dependency detection */ }
}
```

**Line Number Tracking:**
```javascript
// Phase 1: Update extractImports to capture positions
function extractImportsWithPositions(content, lang) {
  const lines = content.split('\n');
  const imports = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // ES6 imports
    const es6Match = line.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/);
    if (es6Match) {
      imports.push({ path: es6Match[1], line: lineNum });
      return;
    }
    
    // CommonJS requires
    const cjsMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (cjsMatch) {
      imports.push({ path: cjsMatch[1], line: lineNum });
    }
  });
  
  return imports;
}

// Component structure with positions
interface Component {
  name: string;
  filePath: string;
  language: string;
  imports: Array<{
    path: string;
    line: number;      // NEW: Line number for violation reporting
    resolved?: string; // Resolved absolute/relative path
  }>;
  dependencies: string[];
}
```

**Integration Points:**
- Reuses existing `analyze()` function from `diagram.js`
- Uses existing `sanitize()` and `normalizePath()` utilities
- Follows Commander.js command pattern
- All code uses CommonJS (`require()`) for consistency

### Rule Types

**Phase 1 (MVP):**
- `layer` + `must_not_import_from` - Forbidden imports
- `layer` + `may_import_from` - Whitelist imports
- `layer` + `must_import_from` - Required imports

**Phase 2 (Future):**
- `no_circular_dependencies` - Detect cycles (uses ComponentGraph.findCycles())
- `max_dependencies` - Limit dependency count
- `file_naming` - Enforce naming conventions

### Research Insights: Glob Pattern Matching

**Library Choice: picomatch**

| Library | Speed | Use Case |
|---------|-------|----------|
| **picomatch** | 4.4M ops/sec | ✅ Pattern matching (our use case) |
| micromatch | 3.2M ops/sec | Pattern matching + brace expansion |
| minimatch | 632K ops/sec | npm's internal (slower) |

**Key Implementation Pattern:**
```javascript
const picomatch = require('picomatch');

class PatternCache {
  #cache = new Map();
  
  getMatcher(pattern, options = {}) {
    // Include options in cache key
    const key = `${pattern}::${JSON.stringify(options)}`;
    if (!this.#cache.has(key)) {
      this.#cache.set(key, picomatch(pattern, options));
    }
    return this.#cache.get(key);
  }
}

// Pattern validation for security
function validatePattern(pattern) {
  if (pattern.includes('..')) {
    throw new Error(`Invalid pattern "${pattern}": directory traversal not allowed`);
  }
  if (path.isAbsolute(pattern)) {
    throw new Error(`Invalid pattern "${pattern}": absolute paths not allowed`);
  }
  return pattern;
}

// Symlink handling for additional security
const fs = require('fs');

function resolveRealPath(filepath) {
  try {
    // Resolve symlinks to prevent escaping via symlinks
    return fs.realpathSync(filepath);
  } catch {
    return filepath;
  }
}

function isWithinProject(filepath, projectRoot) {
  const realFile = resolveRealPath(filepath);
  const realRoot = resolveRealPath(projectRoot);
  return realFile.startsWith(realRoot);
}

// Usage: Pre-compile all layer patterns
const isDomain = cache.getMatcher('src/domain/**/*.ts', { dot: true });
```

**Performance Considerations:**
- Compile patterns once, match many times (1000x faster)
- Batch process files to maximize throughput
- Cache file-to-layer classifications
- picomatch is 7x faster than minimatch for `*` patterns

**Edge Cases to Handle:**
- Windows paths: Always use forward slashes in patterns
- Dotfiles: Use `{ dot: true }` option to match `.hidden.ts`
- Negation: Leading `!` negates patterns
- Case sensitivity: Defaults to platform behavior (use `{ nocase: true }` for cross-platform)

### Output Formats

**Console (default):**
```
✅ Domain isolation (12 files checked)
✅ API contract (8 files checked)
❌ Test independence (3 violations):
   src/utils/helpers.test.ts:15 → src/api/routes.test.ts
   Suggestion: Remove cross-test dependency or use shared fixtures
   
   src/ui/Button.test.ts:8 → src/hooks/useAuth.test.ts
   src/domain/Order.test.ts:22 → src/services/Payment.test.ts

3 rules passed, 1 failed
```

**JSON (`--format json`):**
```json
{
  "version": "1.0.0",
  "schema": "https://diagram-cli.dev/schemas/output-v1.json",
  "summary": { 
    "passed": 3, 
    "failed": 1, 
    "total": 4,
    "duration": 0.452
  },
  "rules": [
    { "name": "Domain isolation", "status": "passed", "filesChecked": 12 },
    { "name": "Test independence", "status": "failed", "violations": [...] }
  ]
}
```

**JUnit (`--format junit`):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Architecture" tests="4" failures="1" time="0.452">
  <testsuite name="Architecture Validation" 
             tests="4" failures="1" errors="0" 
             time="0.452" timestamp="2024-01-15T10:30:00Z">
    <testcase name="Domain isolation"/>
    <testcase name="Test independence">
      <failure message="3 violations found" type="ArchitectureViolation">
        Rule: Test independence
        File: src/utils/helpers.test.ts:15
        Import from test file not allowed
      </failure>
    </testcase>
  </testsuite>
</testsuites>
```

### Research Insights: YAML Security & Error Handling

**Library Choice: `yaml` (eemeli/yaml)**

| Feature | js-yaml | yaml (eemeli/yaml) |
|---------|---------|-------------------|
| Error messages | Good | ✅ **Excellent** (source extract) |
| Pretty errors | No | ✅ **Yes** (shows line + context) |
| Security | Basic | ✅ **Configurable limits** |

**Secure YAML Loader:**
```javascript
const YAML = require('yaml');
const fs = require('fs');

const MAX_CONFIG_SIZE = 1024 * 1024; // 1MB limit

function loadYamlConfig(filepath) {
  // Security: Check file size
  const stats = fs.statSync(filepath);
  if (stats.size > MAX_CONFIG_SIZE) {
    throw new Error(`Config file too large: ${stats.size} bytes (max ${MAX_CONFIG_SIZE})`);
  }
  
  const content = fs.readFileSync(filepath, 'utf8');
  
  try {
    return YAML.parse(content, {
      prettyErrors: true,
      strict: true,
      maxAliasCount: 100,        // Prevent Billion Laughs attack
      customTags: [],            // Disable dangerous tags like !!js/function
    });
  } catch (error) {
    // Error includes visual extract of source
    const enhanced = new Error(`Failed to parse ${filepath}: ${error.message}`);
    enhanced.filepath = filepath;
    throw enhanced;
  }
}
```

**Example Error Output:**
```
YAMLParseError: Nested mappings are not allowed in compact mappings at line 5, column 12:

  3 |   port: 3000
  4 |   database:
  5 |     host: localhost url: http://example.com
-------------------^
  6 |     port: 5432
```

### Schema Definition

**JSON Schema for IDE Support (`.architecture.schema.json`):**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Architecture Rules",
  "type": "object",
  "required": ["rules"],
  "properties": {
    "version": { "type": "string", "default": "1.0" },
    "extends": { "type": "string", "description": "Path to base config" },
    "rules": {
      "type": "array",
      "items": { "$ref": "#/definitions/rule" }
    }
  },
  "definitions": {
    "rule": {
      "type": "object",
      "required": ["name", "layer"],
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" },
        "layer": {
          "oneOf": [
            { "type": "string", "description": "Glob pattern for files" },
            { 
              "type": "array", 
              "items": { "type": "string" },
              "description": "Multiple glob patterns (OR logic)"
            }
          ]
        },
        "must_not_import_from": { "type": "array", "items": { "type": "string" } },
        "may_import_from": { "type": "array", "items": { "type": "string" } },
        "must_import_from": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

---

## System-Wide Impact

### Interaction Graph

```
CLI command "diagram test"
  → loads .architecture.yml (yaml.parse with security limits)
  → calls analyze(rootPath, options) [existing]
    → glob file discovery [existing]
    → extractImports() [existing]
    → build component array [existing]
  → ComponentGraph.wrap(analyzeResult)
    → build reverse lookup indexes
  → RuleFactory.createRules(config)
    → ImportRule instances
  → validateRules(rules, componentGraph)
    → for each rule
      → find matching files (picomatch with cache)
      → check imports against constraints
      → collect violations
  → formatOutput(violations, format, environment)
    → console.table() or JSON.stringify()
  → process.exit(exitCode)
    → 0 = success
    → 1 = validation failed
    → 2 = config error
```

### Error & Failure Propagation

| Error Type | Handling |
|------------|----------|
| Missing `.architecture.yml` | Exit 2 with "No rules file found" message |
| Invalid YAML syntax | Exit 2 with parse error, line number, source extract |
| Invalid glob pattern | Exit 2 with pattern error (e.g., `..` detected) |
| Unknown rule type | Warning, skip rule, continue |
| No matching files for layer | Warning, rule skipped |
| Analysis errors | Exit 2, propagate from analyze() |

### State Lifecycle Risks

- No persistent state (read-only operation)
- Temp files from analysis cleaned up automatically
- No side effects beyond stdout/stderr and exit code

### API Surface Parity

The `test` command accepts same options as `analyze`:
- `-p, --patterns` - File patterns
- `-e, --exclude` - Exclude patterns
- `-m, --max-files` - Max files to analyze

Plus test-specific options:
- `-c, --config` - Config file path (default: `.architecture.yml`)
- `-f, --format` - Output format (console, json, junit)
- `--dry-run` - Preview file matching without validation
- `--verbose` - Show each file checked with match reasons

---

## Testing Strategy

### Unit Tests

```javascript
// tests/rules/import-rule.test.js
const { ImportRule } = require('../../src/rules/types/import-rule');
const { ComponentGraph } = require('../../src/graph');
const { RuleFactory } = require('../../src/rules/factory');

describe('ImportRule', () => {
  test('detects forbidden imports', () => {
    const rule = new ImportRule({
      name: 'no-ui-in-domain',
      layer: 'src/domain',
      must_not_import_from: ['src/ui']
    });
    
    const graph = new ComponentGraph({
      components: [{
        name: 'User',
        filePath: 'src/domain/User.ts',
        imports: [{ path: '../ui/Button', line: 15 }],  // With line numbers
        dependencies: ['Button']
      }]
    });
    
    const violations = rule.validate(graph.components[0], graph);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      ruleName: 'no-ui-in-domain',
      file: 'src/domain/User.ts',
      line: 15,
      severity: 'error'
    });
  });
  
  test('factory creates correct rule types', () => {
    const rules = RuleFactory.createRules({
      rules: [{
        name: 'test-rule',
        layer: 'src/**/*.ts',
        must_not_import_from: ['src/forbidden']
      }]
    });
    expect(rules[0]).toBeInstanceOf(ImportRule);
  });
});
```

### Integration Tests

```javascript
// tests/integration/cli.test.js
describe('diagram test CLI', () => {
  test('exit code 0 when all rules pass', async () => {
    const result = await runCLI(['test', '--config', 'fixtures/passing.yml']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('All rules passed');
  });
  
  test('exit code 1 when rules fail', async () => {
    const result = await runCLI(['test', '--config', 'fixtures/failing.yml']);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('violations');
  });
  
  test('exit code 2 for invalid config', async () => {
    const result = await runCLI(['test', '--config', 'fixtures/invalid.yml']);
    expect(result.exitCode).toBe(2);
  });
  
  test('JSON output format', async () => {
    const result = await runCLI(['test', '--format', 'json']);
    const json = JSON.parse(result.stdout);
    expect(json.version).toBe('1.0.0');
    expect(json.summary).toBeDefined();
  });
});
```

### Platform-Specific Tests

```javascript
// tests/cross-platform/paths.test.js
describe('Windows path handling', () => {
  test('normalizes backslashes to forward slashes', () => {
    const normalized = normalizePath('src\\domain\\User.ts');
    expect(normalized).toBe('src/domain/User.ts');
  });
  
  test('glob patterns match normalized paths', () => {
    const isDomain = picomatch('src/domain/**/*.ts');
    expect(isDomain('src/domain/User.ts')).toBe(true);
    expect(isDomain('src\\domain\\User.ts')).toBe(true);
  });
});
```

---

## Acceptance Criteria

- [ ] `diagram test` command exists and shows help
- [ ] Loads `.architecture.yml` configuration file with security limits
- [ ] Supports `must_not_import_from` rule type
- [ ] Supports `may_import_from` rule type
- [ ] Supports glob patterns in layer definitions (single string or array)
- [ ] Validates patterns (rejects `..` and absolute paths)
- [ ] Console output shows pass/fail per rule with file paths
- [ ] Violations include line numbers when available
- [ ] `--format json` outputs machine-readable JSON with schema version
- [ ] `--format junit` outputs JUnit XML for CI
- [ ] Exit code 0 when all rules pass
- [ ] Exit code 1 when any rule fails
- [ ] Exit code 2 for configuration errors
- [ ] `--dry-run` previews file matching
- [ ] Works in CI environments (no TTY assumptions, ASCII fallback)
- [ ] Validates YAML schema and reports errors with line numbers
- [ ] Includes `.architecture.schema.json` for IDE support
- [ ] Includes documentation in README.md

---

## Success Metrics

- **Adoption**: Can be adopted by existing diagram-cli users with minimal setup
- **CI Integration**: Works in GitHub Actions, CircleCI, etc. without configuration
- **Performance**: Test runs in <5 seconds for 1000 file codebase
- **Error Clarity**: Violation messages include file path, line number, and suggestion
- **Security**: No path traversal vulnerabilities, YAML bomb protection

### Research Insights: Performance Targets

**Benchmarks for 1000 files:**
- File analysis: ~2 seconds (existing `analyze()`)
- Pattern matching: <100ms (with compiled picomatch matchers)
- Total validation: <5 seconds target

**Caching Strategy:**
```javascript
class ArchitectureValidator {
  #patternCache = new Map();
  #fileLayerCache = new Map();
  
  validate(files, rules) {
    // Pre-compile all patterns once
    const compiledRules = rules.map(rule => {
      // Support single string or array of patterns for layer
      const layerPatterns = Array.isArray(rule.layer) ? rule.layer : [rule.layer];
      return {
        ...rule,
        matchers: layerPatterns.map(p => this.#getMatcher(p, { dot: true }))
      };
    });
    
    // Batch classify files
    return files.map(file => this.#validateFile(file, compiledRules));
  }
  
  #getMatcher(pattern, options) {
    const key = `${pattern}::${JSON.stringify(options)}`;
    if (!this.#patternCache.has(key)) {
      this.#patternCache.set(key, picomatch(pattern, options));
    }
    return this.#patternCache.get(key);
  }
  
  // Check if file matches any pattern in the layer
  #matchesLayer(filePath, matchers) {
    return matchers.some(matcher => matcher(filePath));
  }
}
```

---

## Dependencies & Risks

**Dependencies:**
- `yaml` - YAML parsing with security hardening (maxAliasCount)
- `picomatch` - High-performance glob matching
- `chalk` - Terminal colors (already in project, v4 compatible)
- `cli-table3` - Table output for violations
- `zod` - Schema validation (optional but recommended)

**Risks & Mitigations:**

| Risk | Mitigation |
|------|------------|
| Rule pattern complexity | picomatch with caching, compile patterns once |
| False positives (alias imports) | Document limitations, support `// architecture-allow` comments |
| YAML fatigue | Provide `diagram test --init` to generate starter config |
| Path traversal | Validate patterns, reject `..` and absolute paths |
| Symlink attacks | Use `resolveRealPath()` and `isWithinProject()` checks |
| YAML bombs | maxAliasCount: 100, file size limit 1MB |
| Performance at scale | Benchmark analyze(), use async I/O if needed |

---

## Implementation Plan

### Phase 1: Core Rule Engine

1. Add dependencies: `yaml`, `picomatch`, `cli-table3`
2. Create `src/rules/types/base.js` - Rule base class
3. Create `src/rules/types/import-rule.js` - Import constraint rules
4. Create `src/graph.js` - ComponentGraph wrapper
5. Create `src/rules.js` - Rule engine with factory pattern
6. Add `diagram test` command to CLI
7. Implement console formatter with tables and ASCII/Unicode detection
8. Add `--dry-run` and `--verbose` flags

### Phase 2: Schema & Validation

1. Add `zod` dependency
2. Create `src/schema/rules-schema.js` - Zod schema
3. Create `.architecture.schema.json` - JSON Schema for IDE support
4. Add `--init` flag to generate starter config
5. Add pattern validation (security: no `..`, no absolute paths)

### Phase 3: Output Formats

1. Create `src/formatters/json.js` with schema version
2. Create `src/formatters/junit.js` with timing
3. Add `--format` option
4. Add `--output` option for file output

### Phase 4: Polish & Documentation

1. Performance optimization (caching)
2. Documentation and examples
3. Migration guide from dependency-cruiser
4. GitHub Actions example workflow
5. Real-world example configs (Next.js, monorepo, etc.)

---

## Documentation Plan

- **README.md**: Add "Architecture Testing" section with quickstart
- **docs/architecture-testing.md**: Full documentation with rule examples
- **docs/migration-from-dependency-cruiser.md**: Migration guide
- **.architecture.yml**: Example in repo root
- **examples/**: Real-world configs for common patterns
- **.github/workflows/architecture.yml**: CI example

---

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
- [picomatch](https://github.com/micromatch/picomatch) - Glob matching library
- [yaml](https://github.com/eemeli/yaml) - YAML parser with security features
- [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) - Config file discovery
- [Billion Laughs Attack](https://en.wikipedia.org/wiki/Billion_laughs_attack) - YAML security concern

### Similar Tools

- ArchUnit (Java) - Architecture testing for Java
- Import Lint (Python) - Import constraint checker
- TSLint's no-restricted-imports - Single rule, not comprehensive
- depcheck - Dependency checker (different use case)

### Research Sources

- CLI best practices research - Exit codes, formatting, table output
- Glob pattern research - picomatch performance, caching strategies
- YAML config research - `yaml` library, security hardening
- Technical review - Architecture patterns, security, testing
