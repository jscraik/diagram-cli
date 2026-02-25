# Migration from Dependency Cruiser

This guide helps you migrate from [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) to diagram-cli's architecture testing.

## Why Migrate?

| Feature | dependency-cruiser | diagram-cli |
|---------|-------------------|-------------|
| Configuration | JavaScript/JSON | YAML (simpler) |
| Setup | Complex (webpack, tsconfig paths) | Zero-config for basic use |
| Output | Various formats | Console, JSON, JUnit XML |
| Maintenance | Active | Simpler codebase |
| Learning curve | Steep | Minimal |

## Configuration Mapping

### dependency-cruiser (JS config)

```javascript
// .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'no-ui-in-domain',
      comment: 'Domain should not depend on UI',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: '^src/ui' }
    },
    {
      name: 'api-only-imports-domain',
      comment: 'API can only import from domain and shared',
      severity: 'error',
      from: { path: '^src/api' },
      to: { 
        path: '^(?!src/domain|src/shared)',
        pathNot: '^src/types'
      }
    }
  ]
};
```

### diagram-cli (YAML config)

```yaml
# .architecture.yml
version: "1.0"

rules:
  - name: "no-ui-in-domain"
    description: "Domain should not depend on UI"
    layer: "src/domain"
    must_not_import_from: ["src/ui"]

  - name: "api-only-imports-domain"
    description: "API can only import from domain and shared"
    layer: "src/api"
    may_import_from: ["src/domain", "src/shared", "src/types"]
```

## Pattern Conversion

| dependency-cruiser | diagram-cli |
|-------------------|-------------|
| `from: { path: '^src/domain' }` | `layer: "src/domain"` |
| `to: { path: '^src/ui' }` | `must_not_import_from: ["src/ui"]` |
| `to: { pathNot: '^src/types' }` | `may_import_from: ["src/types"]` |
| `path: '^src/(\\w+)'` | `layer: "src/*"` (glob) |
| `path: '\\.spec\\.ts$'` | `layer: "**/*.spec.ts"` |

## Severity Mapping

| dependency-cruiser | diagram-cli |
|-------------------|-------------|
| `severity: 'error'` | Default (exit code 1) |
| `severity: 'warn'` | Not yet supported (see roadmap) |
| `severity: 'info'` | Not yet supported |

## Migration Steps

1. **Install diagram-cli**
   ```bash
   npm install -g @jmc/diagram
   # or
   npm install --save-dev @jmc/diagram
   ```

2. **Generate starter config**
   ```bash
   diagram test --init
   ```

3. **Translate rules manually**
   - Copy each `forbidden` rule to `rules` array
   - Convert `from.path` regex to `layer` glob
   - Convert `to.path` to `must_not_import_from`
   - Convert `to.pathNot` to `may_import_from`

4. **Test the migration**
   ```bash
   # Run both tools and compare
   depcruise --validate .dependency-cruiser.js src
   diagram test
   ```

5. **Update CI/CD**
   ```yaml
   # Before (dependency-cruiser)
   - run: npx depcruise --validate .dependency-cruiser.js src
   
   # After (diagram-cli)
   - run: npx diagram test
   ```

6. **Remove dependency-cruiser**
   ```bash
   npm uninstall dependency-cruiser
   rm .dependency-cruiser.js
   ```

## Feature Comparison

### Supported in diagram-cli

- ✅ Import path validation
- ✅ Glob pattern matching
- ✅ Layer-based rules
- ✅ Whitelist (may_import_from)
- ✅ Blacklist (must_not_import_from)
- ✅ Required imports (must_import_from)
- ✅ JUnit XML output for CI
- ✅ JSON output for scripting

### Not yet supported

- ⚠️ Custom rules (JavaScript)
- ⚠️ tsconfig path resolution
- ⚠️ Webpack alias resolution
- ⚠️ Severity levels (warn/info)
- ⚠️ Circular dependency detection (Phase 2)

## Common Patterns

### Prevent circular dependencies

**dependency-cruiser:**
```javascript
{
  name: 'no-circular',
  severity: 'error',
  from: {},
  to: { circular: true }
}
```

**diagram-cli:**
```yaml
# Coming in Phase 2
rules:
  - name: "No circular dependencies"
    type: "no_circular_dependencies"
```

### Restrict imports to specific file types

**dependency-cruiser:**
```javascript
{
  from: { path: '\\.test\\.ts$' },
  to: { path: '\\.test\\.ts$', pathNot: '\\.test\\.ts$' }
}
```

**diagram-cli:**
```yaml
rules:
  - name: "Test isolation"
    layer: "**/*.test.ts"
    must_not_import_from: ["**/*.test.ts"]
```

## Troubleshooting

### Import aliases not resolving

diagram-cli uses simple glob matching, not webpack/tsconfig resolution:

```yaml
# Instead of relying on "@/components" resolution
rules:
  - name: "Domain isolation"
    layer: "src/domain"
    must_not_import_from: ["src/ui", "src/components"]
```

### More lenient matching

diagram-cli's glob matching is more lenient than regex:

```yaml
# This matches "src/ui", "src/ui/components", etc.
must_not_import_from: ["src/ui"]

# For exact matching (not yet supported):
# Use multiple patterns
must_not_import_from: ["src/ui/*", "src/ui/**/*"]
```

## Getting Help

- Open an issue: [github.com/jscraik/diagram-cli/issues](https://github.com/jscraik/diagram-cli/issues)
- Read the docs: [docs/architecture-testing.md](architecture-testing.md)
- Example configs: [examples/](../examples/)
