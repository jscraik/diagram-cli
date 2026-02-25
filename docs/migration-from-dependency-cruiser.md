# Migration from dependency-cruiser

Move architecture validation rules from dependency-cruiser config to
`diagram test` YAML rules.

## Table of Contents

- [Why migrate](#why-migrate)
- [Configuration mapping](#configuration-mapping)
- [Migration steps](#migration-steps)
- [Feature parity and gaps](#feature-parity-and-gaps)
- [Troubleshooting](#troubleshooting)

## Why migrate

| Capability | dependency-cruiser | diagram-cli |
| --- | --- | --- |
| Config format | JavaScript/JSON | YAML |
| CI output | Multiple formats | Console, JSON, JUnit |
| Rule model | Regex-heavy | Path-pattern constraints |

## Configuration mapping

### dependency-cruiser (example)

```javascript
module.exports = {
  forbidden: [
    {
      name: "no-ui-in-domain",
      from: { path: "^src/domain" },
      to: { path: "^src/ui" }
    }
  ]
};
```

### diagram-cli (equivalent)

```yaml
version: "1.0"

rules:
  - name: "no-ui-in-domain"
    layer: "src/domain"
    must_not_import_from: ["src/ui"]
```

## Migration steps

1. Install diagram-cli in your project.

```bash
npm install --save-dev @brainwav/diagram
```

1. Generate starter config.

```bash
npx diagram test --init
```

1. Translate each dependency-cruiser rule:

- `from.path` -> `layer`
- `to.path` -> `must_not_import_from`
- `to.pathNot` patterns -> `may_import_from` allowlist design

1. Validate and compare.

```bash
# Existing
npx depcruise --validate .dependency-cruiser.js src

# New
npx diagram test
```

1. Update CI commands.

```yaml
# Before
- run: npx depcruise --validate .dependency-cruiser.js src

# After
- run: npx diagram test --format junit --output architecture-results.xml
```

1. Remove dependency-cruiser when parity is confirmed.

```bash
npm uninstall dependency-cruiser
rm .dependency-cruiser.js
```

## Feature parity and gaps

Currently supported:

- Forbidden import constraints (`must_not_import_from`)
- Allowlist constraints (`may_import_from`)
- Required import constraints (`must_import_from`)
- JSON and JUnit output modes

Current gaps (relative to advanced dependency-cruiser use cases):

- Custom JavaScript rule logic
- Severity levels (`warn`/`info`)
- tsconfig/webpack alias-aware resolution
- Built-in circular dependency rule type

## Troubleshooting

### Import aliases do not match

Use explicit source paths in rules (for example `src/ui`) unless your imports
are already resolved to that form.

### Rule seems too broad

Use tighter layer patterns (for example `src/api/**/*.ts` instead of `src/api`).

### Need examples

- [Architecture testing guide](architecture-testing.md)
- [Example configs](../examples/)
