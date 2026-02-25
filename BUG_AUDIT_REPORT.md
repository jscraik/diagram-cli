# Comprehensive Bug Audit Report

> Historical snapshot: this report reflects point-in-time analysis from its date and is not the source of truth for current project status. Use README.md and CHANGELOG.md for current behavior.


**Project:** diagram-cli  
**Date:** 2026-02-25  
**Total Bugs Found:** 40  
**Severity:** 5 Critical, 12 High, 15 Medium, 8 Low

---

## 🔴 CRITICAL (Fix Immediately)

### BUG-001: Incomplete Mermaid Escaping (diagram.js:132-143)
**Issue:** `escapeMermaid()` doesn't escape curly braces `{}` and pipe `|`, which are special characters in Mermaid syntax.
```javascript
// Missing escapes:
.replace(/\{/g, '\\{')
.replace(/\}/g, '\\}')
.replace(/\|/g, '\\|')
```
**Impact:** Diagrams with these characters will fail to render or render incorrectly.

### BUG-002: Missing .cts Extension Support (diagram.js:228-246)
**Issue:** Dependency resolution missing `.cts` and `/index.cts` extensions.
**Impact:** TypeScript CommonJS files not resolved properly.

### BUG-003: Unhandled execFileSync Error (diagram.js:572)
**Issue:** `execFileSync` call for mermaid-cli not wrapped in try-catch, will crash process if command fails.
**Impact:** Process termination on rendering failure.

### BUG-004: Path Validation Missing for Video Output (diagram.js:644)
**Issue:** `path.resolve(options.output)` not validated for directory traversal before passing to video module.
**Impact:** Potential arbitrary file write via `diagram video` command.

### BUG-005: Incomplete Shell Escape (video.js:19-28)
**Issue:** `escapeShellArg()` still vulnerable to injection via backticks and `$()` even after previous fix.
**Impact:** Command injection possible (though execFileSync now used in main path).

---

## 🟠 HIGH (Fix Soon)

### BUG-006: Race Condition in Config Loading (rules.js:24)
**Issue:** `fs.statSync()` called without checking if file exists first - TOCTOU race condition.
```javascript
// Should check existence first or use try-catch
const stats = fs.statSync(configPath); // Can throw if file deleted between check and stat
```

### BUG-007: No Directory Existence Check for Output (json.js:53, junit.js:58)
**Issue:** `fs.writeFileSync()` will fail if output directory doesn't exist.
**Impact:** Users must manually create directories.

### BUG-008: Missing Null Check for Data (diagram.js:262)
**Issue:** `data.components.filter()` assumes data is not null/undefined.
**Impact:** Crash if analyze returns null.

### BUG-009: Circular Reference Crash (diagram.js:465)
**Issue:** `JSON.stringify(mermaidCode)` will throw if object contains circular references.
**Impact:** Process crash on malformed input.

### BUG-010: Missing .cts in Dependency Generator (diagram.js:367-385)
**Issue:** `generateDependency()` doesn't check for `.cts` extension.
**Impact:** Dependencies to `.cts` files not shown.

### BUG-011: Unvalidated Component Names (graph.js:20-58)
**Issue:** `_buildIndexes()` doesn't handle duplicate component names gracefully.
**Impact:** Later components overwrite earlier ones in the index.

### BUG-012: Stack Overflow Risk (graph.js:117-143)
**Issue:** `findCycles()` uses recursion without depth limit - could hit max stack for large graphs.
**Impact:** Process crash on large codebases with deep dependencies.

### BUG-013: Empty Array Not Validated (factory.js:12-15)
**Issue:** `createRules()` accepts empty rules array but schema requires at least one.
**Impact:** Inconsistent validation behavior.

### BUG-014: Imp Check Missing (diagram.js:369)
**Issue:** `imp.startsWith('.')` assumes imp is a string but could be object with path property.
**Impact:** TypeError if import is an object.

### BUG-015: Windows File URL Construction (video.js:135)
**Issue:** File URL construction for Windows might not handle all path edge cases.
**Impact:** Video generation may fail on Windows with certain paths.

### BUG-016: Progress Bar Issues (video.js:153-156)
**Issue:** Progress indicator uses `process.stdout.write` without checking if TTY.
**Impact:** Can corrupt output in non-TTY environments.

---

## 🟡 MEDIUM (Address When Convenient)

### BUG-017: Missing Error Context (rules.js:42-49)
**Issue:** YAML parse error doesn't include line numbers for user guidance.
**Impact:** Harder for users to fix config errors.

### BUG-018: Pattern Validation Throws (rules.js:57-67)
**Issue:** `validatePattern()` throws Error but callers don't always catch.
**Impact:** Potential crashes on invalid patterns.

### BUG-019: Temp Directory Cleanup (video.js:246-248)
**Issue:** Cleanup doesn't handle case where `rmSync` fails due to permissions.
**Impact:** Temp files left behind.

### BUG-020: Version Check Uses Shell (video.js:192)
**Issue:** Version check still uses `execSync` with shell string instead of `execFileSync`.
**Impact:** Inconsistent security approach.

### BUG-021: Empty Pattern Check (import-rule.js:87-118)
**Issue:** `_matchesPattern()` doesn't handle empty pattern string.
**Impact:** Empty pattern matches everything (unexpected behavior).

### BUG-022: Trailing Slash Issue (import-rule.js:99)
**Issue:** Pattern with trailing slash won't match correctly.
**Impact:** `src/ui/` pattern doesn't match `src/ui/Button.ts`.

### BUG-023: Negative Skipped Count (json.js:26, junit.js:21)
**Issue:** Skipped calculation can be negative if passed + failed > total.
**Impact:** Invalid output data (already fixed in console.js).

### BUG-024: Unicode Detection (console.js:14)
**Issue:** `supportsUnicode` check doesn't handle all terminal types.
**Impact:** Incorrect icon display in some terminals.

### BUG-025: Line Number Falsy Check (console.js:90)
**Issue:** Line 0 is falsy, so wouldn't display: `v.line ? ...`
**Impact:** Line number not shown for line 0 (rare but possible).

### BUG-026: Dry Run Missing Validation (diagram.js:778-793)
**Issue:** `previewMatches()` doesn't validate rules is array before iterating.
**Impact:** Crash if rules undefined.

### BUG-027: Config Path Leak (factory.js:42)
**Issue:** Error message includes config details that might be sensitive.
**Impact:** Information disclosure in error logs.

### BUG-028: No Duplicate Rule Detection (rules.js:104-155)
**Issue:** Multiple rules with same name not detected as error.
**Impact:** Confusing output when rules have identical names.

### BUG-029: Missing Array Validation (graph.js:159-163)
**Issue:** `getFilesInLayer()` doesn't validate matchers is array.
**Impact:** Crash if undefined passed.

### BUG-030: Constructor Validation (graph.js:6-10)
**Issue:** Constructor doesn't validate analyzeResult is object.
**Impact:** Cryptic errors if null/undefined passed.

### BUG-031: Dry Run Output Path (diagram.js:800-808)
**Issue:** Output path validation happens after dry run check, but should happen before.
**Impact:** User might not realize path is invalid until after dry run.

---

## 🟢 LOW (Nice to Fix)

### BUG-032: Missing Semicolon (diagram.js:172)
**Issue:** `const uniqueFiles = [...new Set(files)].slice(0, maxFiles)` could be clearer.
**Impact:** Readability only.

### BUG-033: Hardcoded Timeout (video.js:129, 136, 139, 142)
**Issue:** Timeouts are hardcoded without user override option.
**Impact:** Slow networks or large diagrams may timeout.

### BUG-034: No Progress for SVG (video.js:264-375)
**Issue:** `generateAnimatedSVG()` has no progress indicator.
**Impact:** User doesn't know if process is working.

### BUG-035: Unused Import (formatters/index.js:1)
**Issue:** `ExitCodes` imported but not re-exported properly.
**Impact:** None, just cleanup.

### BUG-036: Magic Numbers (diagram.js:153-156)
**Issue:** File limit validation uses magic numbers (100, 10000).
**Impact:** Maintainability.

### BUG-037: No Schema Version Check (rules.js:36-41)
**Issue:** YAML parser doesn't validate schema version compatibility.
**Impact:** Future breaking changes not handled gracefully.

### BUG-038: Temp File Race (diagram.js:567)
**Issue:** `Date.now()` for temp file could collide in parallel runs.
**Impact:** Rare file collision.

### BUG-039: Missing Documentation (console.js:46)
**Issue:** startTime parameter not documented in JSDoc.
**Impact:** Developer experience.

### BUG-040: Inconsistent Exit Codes (junit.js:24, json.js:24)
**Issue:** Both formatters define own ExitCodes instead of importing.
**Impact:** Code duplication.

---

## Fix Priority Matrix

| Priority | Count | Issues |
|----------|-------|--------|
| P0 (Now) | 5 | BUG-001, BUG-002, BUG-003, BUG-004, BUG-005 |
| P1 (This Sprint) | 12 | BUG-006 through BUG-016 |
| P2 (Next Sprint) | 15 | BUG-017 through BUG-031 |
| P3 (Backlog) | 8 | BUG-032 through BUG-040 |

---

## Testing Recommendations

1. Add unit tests for each bug fix
2. Add integration tests with edge cases (empty files, circular deps, etc.)
3. Add security tests for path traversal and injection attempts
4. Add performance tests for large codebases (10,000+ files)
5. Add Windows-specific path handling tests
