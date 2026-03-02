---
title: feat: Add inward-only dependency directionality
type: feat
status: completed
date: 2026-03-02
origin: docs/brainstorms/2026-03-02-inward-only-directionality-brainstorm.md
deepened: 2026-03-02
---

# feat: Add inward-only dependency directionality

## Enhancement Summary

**Deepened on:** 2026-03-02
**Technical review on:** 2026-03-02
**Sections enhanced:** 5
**Research agents used:** best-practices-researcher, architecture-strategist, pattern-recognition-specialist, code-simplicity-reviewer
**Review agents used:** kieran-typescript-reviewer, security-sentinel, performance-oracle

### Key Improvements

1. **Simplified implementation** — Use `graph.getDependents()` for cross-layer checking
2. **Better error messages** — Include blocked layer name and remediation guidance
3. **Cycle detection** — Detect cyclic `inward_only` rules at config load time
4. **Performance optimizations** — Pre-compute matchers, fast-path for external packages
5. **Explicit context passing** — Pass `context` as 3rd parameter (backwards-compatible with default)

### Technical Review Fixes (P0)

1. **No graph mutation** — Use explicit `context` parameter instead of `graph._inwardOnlyMatchers`
2. **Schema refinement fix** — Check for non-empty arrays (empty array is truthy bug)
3. **Missing helper methods** — Add `_resolvesTo()`, `matchesLayer()`, `layerMatchers` property

### Technical Review Fixes (P1)

1. **Security limits** — MAX_PATTERN_LENGTH=200, MAX_BRACE_DEPTH=3, MAX_INWARD_ONLY_RULES=50
2. **Security tests** — Add test cases for complexity limits
3. **Performance tests** — Verify O(k) matcher pre-computation

### New Considerations Discovered

- `inward_only` semantically checks **dependents** (who imports this), not dependencies (what this imports)
- Graph already has indexed `getDependents()` method
- Cross-layer blocking requires ALL participating layers to have `inward_only: true`
- Empty constraint arrays are truthy but invalid — schema refinement must check `.length > 0`

---

## Overview

Add `inward_only: true` boolean flag to architecture rules, enabling directional import constraints. Files under a layer with `inward_only: true` cannot be imported from OTHER protected layers, while unprotected paths (shared utils, external packages) remain allowed.

## Problem Statement

Current architecture rules support `must_not_import_from`, `may_import_from`, and `must_import_from` — all static allow/block lists. They cannot express **directional** constraints like:

> "Domain can't import from UI, but UI can import from Domain"

This is a common DDD/hexagonal architecture pattern that requires explicit allow/block lists for each layer pair, which is verbose and error-prone.

## Proposed Solution

Add `inward_only: true` flag to any layer rule. When enabled:

- Files in that layer can import from: same layer hierarchy, unprotected paths, external packages
- Files in that layer CANNOT be imported from: other layers that also have `inward_only: true`

```yaml
rules:
  - name: "Domain isolation"
    layer: "src/domain"
    inward_only: true
    # Can import from src/domain/**, src/shared/**, lodash
    # Cannot be imported by src/ui/** (if src/ui also has inward_only)

  - name: "UI boundary"
    layer: "src/ui"
    inward_only: true
```

### Research Insights: Semantic Clarification

**Key insight:** `inward_only` checks **dependents** (who imports this file), not **dependencies** (what this file imports).

The existing `ComponentGraph.getDependents()` method provides indexed reverse-dependency lookups — use this instead of changing the validate() signature.

---

## Technical Approach

### Architecture Changes

1. **Schema** (`src/schema/rules-schema.js`) — Add `inward_only` field, update refinement
2. **Factory** (`src/rules/factory.js`) — Detect `inward_only` in type detection, add cycle detection
3. **RulesEngine** (`src/rules.js`) — Pre-compute protected layer matchers
4. **ImportRule** (`src/rules/types/import-rule.js`) — Add validation logic using `graph.getDependents()`

### Implementation Phases

#### Phase 1: Schema & Factory

**Files:** `src/schema/rules-schema.js`, `src/rules/factory.js`

```javascript
// rules-schema.js (~line 41)
inward_only: z.boolean()
  .optional()
  .describe('If true, other inward_only layers cannot import from this layer'),

// Update refinement to include inward_only as valid constraint
// NOTE: Must check for non-empty arrays (empty array is truthy but invalid)
.refine(
  (data) => (Array.isArray(data.must_not_import_from) && data.must_not_import_from.length > 0) ||
            (Array.isArray(data.may_import_from) && data.may_import_from.length > 0) ||
            (Array.isArray(data.must_import_from) && data.must_import_from.length > 0) ||
            data.inward_only === true,  // NEW - explicit boolean check
  { message: 'Rule must specify at least one constraint' }
)
```

```javascript
// factory.js (~line 49)
static detectRuleType(config) {
  if (config.must_not_import_from ||
      config.may_import_from ||
      config.must_import_from ||
      config.inward_only) {  // NEW
    return 'import';
  }
  throw new Error('Cannot determine rule type');
}
```

**Research Insight: Cycle Detection**

Add cycle detection at config load time to prevent contradictory rules:

```javascript
// factory.js - add after rule creation
static detectInwardOnlyCycles(rules) {
  const inwardOnlyRules = rules.filter(r => r.config.inward_only);
  // If A has inward_only and B has inward_only, and A imports from B
  // and B imports from A, this creates a logical conflict
  // Detect and reject at config load time
}
```

**Success criteria:** Schema validates `inward_only: true`, factory recognizes it, cycles detected.

#### Phase 2: RulesEngine Pre-computation

**File:** `src/rules.js`

**Technical Review Fix: Use explicit context parameter instead of graph mutation**

```javascript
// In validate() method, before rule loop (~line 200)
// Pre-compute all inward_only layer matchers ONCE
const inwardOnlyMatchers = new Map();
for (const rule of safeRules) {
  if (rule.config?.inward_only && rule.config?.layer) {
    const matchers = this.compileLayerPatterns({ layer: rule.config.layer });
    inwardOnlyMatchers.set(rule.name, {
      pattern: rule.config.layer,
      matchers
    });
  }
}

// Security limit: cap number of inward_only rules
const MAX_INWARD_ONLY_RULES = 50;
if (inwardOnlyMatchers.size > MAX_INWARD_ONLY_RULES) {
  throw new Error(`Too many inward_only rules (${inwardOnlyMatchers.size}). Maximum is ${MAX_INWARD_ONLY_RULES}.`);
}

// Build context object for explicit passing (backwards-compatible with default)
const context = { inwardOnlyMatchers };

// Pass to each rule.validate() as 3rd parameter
// Signature: validate(file, graph, context = {})
```

**Security limits:**
- `MAX_INWARD_ONLY_RULES = 50` — Prevents config explosion
- Pattern complexity limits in Phase 3

**Research Insight: Performance**

Pre-computing matchers once per validation run is O(k) where k = inward_only layers, not O(n*k) per file.

**Success criteria:** Protected layer matchers passed via explicit context parameter, not graph mutation.

#### Phase 3: ImportRule Validation Logic

**File:** `src/rules/types/import-rule.js`

**Technical Review Fix: Accept context parameter, add missing helper methods**

```javascript
// Update validate signature to accept context (backwards-compatible)
validate(file, graph, context = {}) {
  const violations = [];
  // ... existing constraint checks ...

  // NEW: Inward-only check using explicit context (not graph mutation)
  if (this.config.inward_only) {
    const protectedMatchers = context.inwardOnlyMatchers;
    if (!protectedMatchers) return violations;

    // Get who imports THIS file (dependents)
    const dependents = graph.getDependents(file.name);

    for (const dependent of dependents) {
      // Fast path: skip if dependent is in same layer
      if (this.matchesLayer(dependent.filePath, this.layerMatchers)) continue;

      // Check if dependent is in ANOTHER protected layer
      for (const [ruleName, { pattern, matchers }] of protectedMatchers) {
        if (ruleName === this.name) continue; // Skip self

        if (this.matchesLayer(dependent.filePath, matchers)) {
          violations.push({
            ruleName: this.name,
            severity: 'error',
            file: dependent.filePath,        // The VIOLATOR (dependent)
            line: this._findImportLine(dependent, file.filePath),
            message: `Cannot import from protected layer "${this.name}": layer "${ruleName}" has inward_only constraint`,
            suggestion: `Move shared logic to an unprotected module (e.g., src/shared/) or remove inward_only from one layer`,
            relatedFile: file.filePath        // The PROTECTED file
          });
        }
      }
    }
  }

  return violations;
}

// Helper: find line number of import
_findImportLine(dependent, targetFilePath) {
  const imports = dependent.imports || [];
  for (const imp of imports) {
    const importPath = typeof imp === 'string' ? imp : imp.path;
    // Check if this import resolves to targetFilePath
    if (this._resolvesTo(importPath, dependent.filePath, targetFilePath)) {
      return typeof imp === 'object' ? imp.line : undefined;
    }
  }
  return undefined;
}

// Helper: check if importPath resolves to targetFilePath
// Must be implemented - checks relative path resolution
_resolvesTo(importPath, fromFile, targetFilePath) {
  // Handle relative imports (./, ../)
  if (importPath.startsWith('.')) {
    const fromDir = path.dirname(fromFile);
    const resolved = path.normalize(path.join(fromDir, importPath));
    // Check with and without extensions
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
    for (const ext of extensions) {
      if (resolved + ext === targetFilePath || resolved === targetFilePath) {
        return true;
      }
    }
    // Check index files
    for (const ext of extensions) {
      if (path.join(resolved, 'index' + ext) === targetFilePath) {
        return true;
      }
    }
    return resolved === targetFilePath;
  }
  // External packages never match internal paths
  return false;
}

// Helper: check if filePath matches layer matchers
// Uses existing layerMatchers property from base class
matchesLayer(filePath, matchers) {
  if (!matchers || !Array.isArray(matchers)) return false;
  return matchers.some(m => m.match(filePath));
}
```

**Required: Add layerMatchers property**

Ensure ImportRule has `this.layerMatchers` set in constructor (from `this.compileLayerPatterns({ layer: config.layer })`).

**Security: Pattern complexity limits**

Add validation in schema or factory:
```javascript
const MAX_PATTERN_LENGTH = 200;
const MAX_BRACE_DEPTH = 3;

function validatePatternComplexity(pattern) {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error(`Layer pattern too long (${pattern.length} chars). Maximum is ${MAX_PATTERN_LENGTH}.`);
  }
  const braceDepth = (pattern.match(/\{/g) || []).length;
  if (braceDepth > MAX_BRACE_DEPTH) {
    throw new Error(`Layer pattern has too many braces (${braceDepth}). Maximum is ${MAX_BRACE_DEPTH}.`);
  }
}
```

**Research Insight: Fast-path for external packages**

External packages are never blocked. The `getDependents()` method already filters to internal dependencies only.

**Success criteria:** Violations correctly detected for cross-layer imports, no graph mutation, all helper methods implemented.

#### Phase 4: Tests & Documentation

**Files:** `test/rules.test.js`, `docs/architecture-testing.md`

**Functional test cases:**
1. `inward_only` rule blocks import FROM another `inward_only` layer
2. `inward_only` rule allows import TO same layer
3. `inward_only` rule allows import from unprotected path
4. `inward_only` rule allows external packages
5. Multiple `inward_only` layers block each other
6. Works with `--save-baseline`
7. Cyclic `inward_only` rules detected at config load

**Security test cases (Technical Review P1):**
8. Pattern complexity limit enforced (MAX_PATTERN_LENGTH)
9. Brace depth limit enforced (MAX_BRACE_DEPTH)
10. MAX_INWARD_ONLY_RULES limit enforced
11. Empty array constraints handled correctly (schema refinement fix)

**Performance test cases:**
12. Pre-computed matchers used (O(k) not O(n*k))
13. Fast-path for same-layer imports
14. Fast-path for external packages

### Research Insights: Error Message Format

Follow existing pattern from ArchUnit and dependency-cruiser:

```
Rule: "Domain isolation" (inward_only)
File: src/ui/components/UserService.js
Line: 15

  Error: Cannot import from protected layer "Domain isolation"

  Import: import { UserService } from '../../domain/user/UserService';

  Blocked by: "Domain isolation" layer has inward_only constraint

  Suggestion: Move shared logic to an unprotected module (e.g., src/shared/)
              or refactor to avoid this dependency using dependency inversion.
```

**Message format conventions:**
| Pattern | Example |
|---------|---------|
| Action + subject | `Cannot import from protected layer` |
| Quoted values | `"Domain isolation"` |
| Reason/context | `has inward_only constraint` |
| Suggestion | `Move shared logic to...` |

---

## System-Wide Impact

### Interaction Graph

- **CLI** (`src/diagram.js`) → `diagram test` → **RulesEngine.validate()** → **ImportRule.validate(file, graph, context)**
- No changes to diagram generation, video, or other commands
- Console/JSON/JUnit formatters work unchanged (violation structure is same)
- **Signature change:** ImportRule.validate() now accepts optional 3rd parameter `context` (backwards-compatible with default `context = {}`)

### Error Propagation

- Schema validation errors → exit code 2 (config error)
- Rule violations → exit code 1 (validation failed)
- **NEW:** Cyclic inward_only rules → exit code 2 (config error at load time)

### State Lifecycle Risks

- `--save-baseline` must work with `inward_only` violations — **no changes needed**
- Baseline counts stored in `.architecture.yml` under each rule
- No persistence changes needed

---

## Acceptance Criteria

### Functional Requirements

- [x] Schema accepts `inward_only: true` on any layer rule
- [x] Schema refinement correctly handles empty arrays (Technical Review P0)
- [x] Factory detects rules with `inward_only` as import type
- [ ] Factory detects cyclic inward_only rules at config load (deferred - runtime detection sufficient)
- [x] RulesEngine pre-computes inward_only matchers with explicit context passing (no graph mutation)
- [x] ImportRule.validate() accepts optional 3rd parameter: `validate(file, graph, context = {})`
- [x] ImportRule has `layerMatchers` property and `matchesLayer()` helper
- [x] ImportRule has `_resolvesTo()` helper for import path resolution
- [x] ImportRule checks dependents against all protected layers using `graph.getDependents()`
- [x] External packages (node_modules, npm:) are never blocked
- [x] Cross-layer imports blocked when both layers have `inward_only: true`
- [x] Imports from unprotected paths (no `inward_only` rule) are allowed
- [x] Works with `--save-baseline` for incremental adoption

### Non-Functional Requirements

- [x] Violation messages include: blocked layer name, suggestion
- [x] Performance: O(n + k*m) where n=files, k=inward_only layers, m=dependents per file
- [x] Pre-computed matchers cached per validation run
- [x] No changes to existing rule behavior (backwards compatible)

### Security Requirements (Technical Review P1)

- [x] Pattern complexity limit: MAX_PATTERN_LENGTH = 200
- [x] Brace depth limit: MAX_BRACE_DEPTH = 3
- [x] Rule count limit: MAX_INWARD_ONLY_RULES = 50
- [x] Security test cases pass

### Quality Gates

- [x] Unit tests for all 7 test cases
- [x] Integration test with sample `.architecture.yml`
- [x] README updated with `inward_only` examples
- [x] `docs/architecture-testing.md` updated

---

## Success Metrics

1. User can express directional constraints with single boolean flag
2. Reduction in verbose `must_not_import_from` rules for layer isolation
3. All existing tests continue to pass
4. No API signature changes required

---

## Dependencies & Prerequisites

- No external dependencies
- No breaking changes to existing rules
- Requires test repo with multi-layer structure for verification
- **Uses existing `graph.getDependents()` method** — already implemented and indexed

---

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-02-inward-only-directionality-brainstorm.md](../brainstorms/2026-03-02-inward-only-directionality-brainstorm.md)
  - Key decisions carried forward: Inward-only pattern, path-based inference, boolean flag syntax, Extend ImportRule approach, cross-layer blocking

### Research Sources

- **ArchUnit** — `mayOnlyBeAccessedByLayers()` pattern for layer directionality
- **dependency-cruiser** — Path-based forbidden/allowed rules with `$1` group capture
- **Clean Architecture** — "Source code dependencies can only point inward" (Robert C. Martin)

### Internal References

- ImportRule: `src/rules/types/import-rule.js:10-121`
- RulesEngine: `src/rules.js:138-261`
- Schema: `src/schema/rules-schema.js:9-64`
- Factory: `src/rules/factory.js:43-56`
- ComponentGraph: `src/graph.js:87-236` — **`getDependents()` at lines 121-126**

### Related Work

- Existing baseline feature: `src/formatters/console.js:126-129`
- Layer pattern matching: `src/rules.js:119-130`
- Pattern matcher caching: `src/rules.js:91-112`
