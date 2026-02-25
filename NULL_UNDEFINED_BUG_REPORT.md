# Null/Undefined Handling Bug Report

> Historical snapshot: this report reflects point-in-time analysis from its date and is not the source of truth for current project status. Use README.md and CHANGELOG.md for current behavior.


**Project:** diagram-cli  
**Analysis Date:** 2026-02-24  
**Files Analyzed:** 12 source files in `src/**/*.js`

---

## Executive Summary

Found **14 null/undefined handling issues** across the codebase, with severity breakdown:
- 🔴 **Critical:** 3 issues (will cause runtime crashes)
- 🟠 **High:** 4 issues (likely to cause crashes in edge cases)
- 🟡 **Medium:** 5 issues (potential bugs with malformed inputs)
- 🟢 **Low:** 2 issues (defensive coding recommendations)

---

## Critical Issues

### 1. Missing `dependencies` null check before array method call
**File:** `src/diagram.js:407`  
**Severity:** 🔴 Critical

```javascript
for (const d of c.dependencies.slice(0, 3)) {
```

**Issue:** `c.dependencies` is accessed without checking if it exists. While components are initialized with `dependencies: []` during analysis, future code changes or data sources could omit this field.

**Impact:** TypeError: Cannot read property 'slice' of undefined

**Proposed Fix:**
```javascript
for (const d of (c.dependencies || []).slice(0, 3)) {
// or
if (c.dependencies) {
  for (const d of c.dependencies.slice(0, 3)) {
```

---

### 2. Variable used before declaration
**File:** `src/video.js:171`  
**Severity:** 🔴 Critical

```javascript
execSync(`"${ffmpegCmd}" -encoders | grep libx264`, { stdio: 'pipe' });
// ...
let ffmpegCmd = 'ffmpeg';
```

**Issue:** `ffmpegCmd` is used on line 171 but only declared on line 190. This is a ReferenceError.

**Impact:** ReferenceError: ffmpegCmd is not defined

**Proposed Fix:** Move the `let ffmpegCmd = 'ffmpeg';` declaration to before line 171.

---

### 3. Missing null check on `data` parameter in generators
**File:** `src/diagram.js:252-447`  
**Severity:** 🔴 Critical

All generator functions access `data.components` without validating `data`:
```javascript
function generateArchitecture(data, focus) {
  // No validation that data exists or has components
  const comps = focusNorm ? data.components.filter(...) : data.components;
```

**Impact:** TypeError if `data` is null/undefined or missing `components`

**Proposed Fix:**
```javascript
function generateArchitecture(data, focus) {
  if (!data || !Array.isArray(data.components)) {
    return 'graph TD\n  Note["No data available"]';
  }
  // ... rest of function
}
```

---

## High Severity Issues

### 4. Unsafe regex match result access
**File:** `src/diagram.js:57, 60, 63, 66, 69`  
**Severity:** 🟠 High

```javascript
es6.forEach(m => imports.push(m[1]));
```

**Issue:** Match results are accessed at index `[1]` without checking if the match array has that element. While regex patterns should always have a capture group, malformed regex or edge case inputs could produce unexpected results.

**Proposed Fix:**
```javascript
es6.forEach(m => {
  if (m && m[1]) imports.push(m[1]);
});
```

---

### 5. Missing null check on `imp` before `startsWith`
**File:** `src/diagram.js:223, 358`  
**Severity:** 🟠 High

```javascript
const importPath = typeof imp === 'string' ? imp : imp.path;
if (importPath.startsWith('.')) {
```

**Issue:** In the dependency resolution loop (line 223), `imp` comes from `comp.imports` which is populated by `extractImportsWithPositions`. While the function should always return valid objects, there's no guarantee `imp.path` won't be null/undefined.

In `generateDependency` (line 358), `imp` is iterated directly from `c.imports`:
```javascript
for (const imp of c.imports) {
  if (!imp.startsWith('.')) {
```

Here `c.imports` could contain null/undefined values from malformed data.

**Proposed Fix:**
```javascript
// Line 223-224
const importPath = typeof imp === 'string' ? imp : imp?.path;
if (importPath?.startsWith('.')) {

// Line 358
for (const imp of c.imports || []) {
  if (imp && !imp.startsWith('.')) {
```

---

### 6. Missing `config` validation in RuleFactory
**File:** `src/rules/factory.js:13, 36-42`  
**Severity:** 🟠 High

```javascript
static detectRuleType(config) {
  if (config.must_not_import_from || 
      config.may_import_from || 
      config.must_import_from) {
    return 'import';
  }
  throw new Error(`Cannot determine rule type for: ${config.name || 'unnamed rule'}`);
}
```

**Issue:** If `config` is null/undefined, accessing `config.name` in the error message will throw a different error than intended.

**Proposed Fix:**
```javascript
static detectRuleType(config) {
  if (!config) {
    throw new Error('Config is required');
  }
  // ... rest of function
  throw new Error(`Cannot determine rule type for: ${config?.name || 'unnamed rule'}`);
}
```

---

### 7. Potential undefined access in formatters
**File:** `src/formatters/console.js:70, 108-109`, `src/formatters/json.js:23-27`, `src/formatters/junit.js:19-21`  
**Severity:** 🟠 High

All formatters access `results.summary` properties without null checks:
```javascript
console.log(`  ${c.originalName} (${c.type})${deps}`);
// c.originalName and c.type could be undefined
```

**Proposed Fix:** Add optional chaining or default values:
```javascript
console.log(`  ${c.originalName || 'unknown'} (${c.type || 'file'})${deps}`);
```

---

## Medium Severity Issues

### 8. Missing bounds check on array access
**File:** `src/diagram.js:359`  
**Severity:** 🟡 Medium

```javascript
const pkg = imp.split('/')[0];
```

**Issue:** If `imp` is an empty string after split, `[0]` could be undefined. Later code uses `pkg` in `if (pkg)` check which is good, but explicit handling is safer.

**Proposed Fix:** Already partially mitigated, but consider:
```javascript
const parts = imp?.split('/') || [];
const pkg = parts[0];
```

---

### 9. Unsafe property access on `ruleConfig`
**File:** `src/rules/factory.js:18, 24`  
**Severity:** 🟡 Medium

```javascript
const type = this.detectRuleType(ruleConfig);
throw new Error(`Unknown rule type for "${ruleConfig.name}": ${type}`);
```

**Issue:** `ruleConfig.name` is accessed without checking if `ruleConfig` has that property.

**Proposed Fix:**
```javascript
throw new Error(`Unknown rule type for "${ruleConfig?.name || 'unnamed rule'}": ${type}`);
```

---

### 10. Missing check on `analyzeResult` in ComponentGraph
**File:** `src/graph.js:6-14`  
**Severity:** 🟡 Medium

```javascript
constructor(analyzeResult) {
  this.components = analyzeResult.components || [];
  this.rootPath = analyzeResult.rootPath;
```

**Issue:** If `analyzeResult` is null/undefined, this will crash immediately.

**Proposed Fix:**
```javascript
constructor(analyzeResult) {
  if (!analyzeResult) {
    throw new Error('analyzeResult is required');
  }
  this.components = analyzeResult.components || [];
  // ...
}
```

---

### 11. No validation of `matchers` parameter
**File:** `src/graph.js:159-163`  
**Severity:** 🟡 Medium

```javascript
getFilesInLayer(matchers) {
  return this.components.filter(component => {
    if (!component.filePath) return false;
    return matchers.some(matcher => matcher(component.filePath));
  });
}
```

**Issue:** If `matchers` is null/undefined or not an array, `matchers.some()` will throw.

**Proposed Fix:**
```javascript
getFilesInLayer(matchers) {
  if (!Array.isArray(matchers)) return [];
  return this.components.filter(component => {
    if (!component.filePath) return false;
    return matchers.some(matcher => matcher(component.filePath));
  });
}
```

---

### 12. Unchecked array access in JUnit formatter
**File:** `src/formatters/junit.js:31-37`  
**Severity:** 🟡 Medium

```javascript
const violations = rule.violations.map(v => {
  let msg = `File: ${v.file}`;
  if (v.line) msg += `:${v.line}`;
```

**Issue:** While `rule.violations` is checked via `map()`, individual violation properties like `v.file` could be undefined.

**Proposed Fix:**
```javascript
const violations = (rule.violations || []).map(v => {
  let msg = `File: ${v?.file || 'unknown'}`;
  if (v?.line) msg += `:${v.line}`;
```

---

## Low Severity Issues

### 13. Missing default for `options` in constructor
**File:** `src/rules.js:15-17`  
**Severity:** 🟢 Low

```javascript
constructor() {
  this.patternCache = new Map();
}
```

**Issue:** The constructor doesn't accept or validate options. While not currently a bug, future extensions might expect options handling.

**Proposed Fix:** Document as intentional or add options parameter with defaults.

---

### 14. Missing check on `this.config` in Rule base class
**File:** `src/rules/types/base.js:6-20`  
**Severity:** 🟢 Low

```javascript
constructor(config) {
  this.config = config;
}

get name() {
  return this.config.name;
}
```

**Issue:** If `config` is not provided to constructor, accessing `this.config.name` will throw. The Zod schema validation should catch this, but defensive programming would add a check.

**Proposed Fix:**
```javascript
constructor(config) {
  if (!config) {
    throw new Error('Config is required for Rule');
  }
  this.config = config;
}
```

---

## Recommendations

### Immediate Actions (Critical/High)
1. Fix the `ffmpegCmd` declaration order in `video.js` - this is a guaranteed crash
2. Add null checks for `dependencies` property access in `diagram.js`
3. Validate `data` parameter in all generator functions
4. Add defensive checks for config objects in RuleFactory

### Code Quality Improvements (Medium/Low)
1. Add JSDoc `@param` types with nullability indicators
2. Consider using TypeScript for compile-time null safety
3. Add runtime assertions for critical function parameters
4. Implement input validation at public API boundaries

### Testing Recommendations
1. Add unit tests with null/undefined inputs
2. Add integration tests with malformed YAML configs
3. Add fuzzing tests for the analyze function
4. Test edge cases with empty arrays and missing properties

---

## Appendix: Quick Reference Table

| # | File | Line | Severity | Issue Type |
|---|------|------|----------|------------|
| 1 | diagram.js | 407 | Critical | Missing null check before array method |
| 2 | video.js | 171 | Critical | Variable used before declaration |
| 3 | diagram.js | 252-447 | Critical | Missing data validation in generators |
| 4 | diagram.js | 57,60,63,66,69 | High | Unsafe regex match access |
| 5 | diagram.js | 223,358 | High | Missing null check on imp/path |
| 6 | rules/factory.js | 13,36-42 | High | Missing config validation |
| 7 | formatters/*.js | Multiple | High | Missing results.summary checks |
| 8 | diagram.js | 359 | Medium | Missing bounds check on split |
| 9 | rules/factory.js | 18,24 | Medium | Unsafe ruleConfig access |
| 10 | graph.js | 6-14 | Medium | Missing analyzeResult check |
| 11 | graph.js | 159-163 | Medium | No matchers validation |
| 12 | formatters/junit.js | 31-37 | Medium | Unchecked violation properties |
| 13 | rules.js | 15-17 | Low | Missing options parameter |
| 14 | rules/types/base.js | 6-20 | Low | Missing config validation |
