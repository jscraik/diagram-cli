# Brainstorm: Inward-Only Dependency Directionality

**Date:** 2026-03-02
**Status:** Explored, ready for planning
**Related:** Architecture testing limitations (see skill references)

## What We're Building

Add **inward-only** dependency direction rules to diagram-cli's architecture testing. This allows enforcing that "inner" layers (e.g., `src/domain`) cannot import from "outer" layers (e.g., `src/ui`), while outer layers can freely import from inner ones.

This addresses the most requested limitation of current architecture testing: the inability to express directional constraints.

## Why This Approach

**Chosen: Extend ImportRule** (vs. new rule class vs. auto-infer)

1. **Minimal schema change** - Single boolean flag (`inward_only: true`)
2. **Path-based inference** - No explicit layer ordering required; subdirectories are "inner" to parent paths
3. **Uses existing graph** - ComponentGraph already has dependency data
4. **Consistent with existing patterns** - Follows same extension pattern as baselines

## Proposed YAML Syntax

```yaml
version: "1.0"
rules:
  - name: "Domain isolation (directional)"
    layer: "src/domain"
    inward_only: true
    # src/domain/** cannot import from anything OUTSIDE src/domain
    # But src/ui can import from src/domain

  - name: "Core protection"
    layer: "src/core"
    inward_only: true
    baseline: 2  # Works with existing baseline feature
```

### How Path Inference Works

**Key insight:** An `inward_only` rule only blocks imports that would go **into another protected layer**. Unprotected paths (shared utils, external packages) are always allowed.

| Layer | Import Target | Protected? | Allowed? | Reason |
|-------|---------------|------------|----------|--------|
| `src/domain` | `src/domain/user` | No | ✅ | Target is inner (subdirectory of same layer) |
| `src/domain` | `src/shared/utils` | No | ✅ | Target is unprotected (no `inward_only` rule covers it) |
| `src/domain` | `src/ui/components` | **Yes** | ❌ | Target is protected by a different `inward_only` rule |
| `src/domain` | `lodash` | No | ✅ | External package (node_modules) |
| `src/domain/user` | `src/domain` | No | ✅ | Importing "up" to parent within same layer |

**Definition:** A path is "protected" if it matches the `layer` pattern of **any** rule with `inward_only: true`.

**Rule:** A file under `layer/X` with `inward_only: true` can only import from:
- `layer/X/**` (same layer hierarchy)
- Paths NOT covered by any other `inward_only` rule
- External packages (node_modules, npm:)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pattern | Inward-only (vs downward) | Simpler, fits DDD/hexagonal, less config |
| Detection | Path-based inference | No explicit ordering, intuitive |
| Syntax | Boolean flag `inward_only: true` | Minimal, composable with existing constraints |
| Implementation | Extend ImportRule | Least code, consistent with existing patterns |
| Error messages | Standard violation + suggestion | Clear, actionable feedback |

## Constraints

- **Relative imports must be resolvable** — The analyzer already resolves relative imports to absolute paths; this feature depends on that.
- **Layer patterns use picomatch** — Same matching as existing `layer` field.
- **External packages always allowed** — node_modules, npm: imports are never flagged.
- **Cross-layer imports blocked** — If `src/domain` and `src/ui` both have `inward_only: true`, neither can import from the other.

## Implementation Outline

### 1. Schema Extension (`rules-schema.js`)

```javascript
const ruleSchema = z.object({
  // ... existing fields ...
  inward_only: z.boolean()
    .optional()
    .describe('If true, files in layer cannot import from paths outside this layer'),
});
```

### 2. ImportRule Extension (`import-rule.js`)

```javascript
validate(file, graph) {
  const violations = [];

  // Existing constraint checks...

  // NEW: Inward-only check
  if (this.config.inward_only) {
    for (const imp of file.imports) {
      if (this.isOutwardImport(file.filePath, imp.path)) {
        violations.push({
          ruleName: this.name,
          file: file.filePath,
          line: imp.line,
          message: `Inward-only layer cannot import from outer path: ${imp.path}`,
          suggestion: `Move shared logic to a common module or refactor to avoid this dependency`,
        });
      }
    }
  }

  return violations;
}

isOutwardImport(fromPath, importPath) {
  // Resolve import to file path
  // Check if importPath is outside the layer boundary
  // Return true if import is "outward"
}
```

### 3. Path Inference Logic

```javascript
isOuterImport(fromFile, importPath, allInwardOnlyLayers) {
  // Resolve import to absolute file path
  const target = this.resolveImport(fromFile, importPath);

  // External packages are never blocked
  if (this.isExternalPackage(target)) {
    return false;
  }

  // If target is inside THIS layer, allowed
  if (this.isInsideLayer(target, this.layer)) {
    return false;
  }

  // If target is inside ANOTHER inward_only layer, blocked
  for (const protectedLayer of allInwardOnlyLayers) {
    if (protectedLayer === this.layer) continue; // Skip self
    if (this.isInsideLayer(target, protectedLayer)) {
      return true; // Importing into another protected layer
    }
  }

  // Target is unprotected (shared/common), allowed
  return false;
}
```

**Key:** The rules engine must pass all `inward_only` layer patterns to each rule so it can check against other protected layers.

## Out of Scope (Future)

- **Downward directionality** - Explicit layer ordering (levels 1, 2, 3...)
- **Acyclic with depth limits** - Cycle detection + max chain length
- **API surface analysis** - Export constraints
- **Abstraction levels** - Stable vs volatile module classification

## Open Questions

### Resolved Questions

1. ~~Which directionality pattern?~~ → **Inward-only**
2. ~~How to detect inner/outer?~~ → **Path-based inference**
3. ~~YAML syntax preference?~~ → **Boolean flag `inward_only: true`**
4. ~~Implementation approach?~~ → **Extend ImportRule**

### Remaining Questions

None - design is clear enough to proceed to planning.

## Success Criteria

1. `inward_only: true` can be added to any existing layer rule
2. Violations clearly identify the outer import and suggest remediation
3. Works with `--save-baseline` for incremental adoption
4. External imports (node_modules, external packages) are not flagged
5. Documentation updated with examples

## Next Steps

Run `/workflows:plan` to create implementation plan covering:
1. Schema changes
2. ImportRule extension
3. Path inference utility
4. Test cases
5. Documentation updates
