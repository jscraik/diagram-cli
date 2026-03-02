const { Rule } = require('./base');
const path = require('path');
const picomatch = require('picomatch');

/**
 * Import constraint rule
 * Validates imports against allowed/forbidden patterns
 * Supports inward_only for directional layer constraints
 */
class ImportRule extends Rule {
  /**
   * Get compiled layer matchers for this rule
   * @returns {Array<Function>}
   */
  get layerMatchers() {
    if (!this._layerMatchers) {
      const layers = Array.isArray(this.layer) ? this.layer : [this.layer];
      this._layerMatchers = layers
        .filter(l => typeof l === 'string' && l.trim() !== '')
        .map(l => picomatch(l.trim(), { dot: true }));
    }
    return this._layerMatchers;
  }

  /**
   * Validate a file against this rule
   * @param {Object} file - Component file object
   * @param {ComponentGraph} graph - Component graph for lookups
   * @param {Object} context - Optional context with inwardOnlyMatchers
   * @returns {Array<Violation>} Array of violations
   */
  validate(file, graph, context = {}) {
    const violations = [];
    const imports = Array.isArray(file?.imports) ? file.imports : [];

    const truncateText = (value, max = 100) => String(value ?? '').slice(0, max);

    // Helper to safely extract import path
    const getImportPath = (importInfo) => {
      if (typeof importInfo === 'string') return importInfo;
      if (importInfo && typeof importInfo.path === 'string') return importInfo.path;
      return null;
    };

    // Helper to safely extract line number
    const getLineNumber = (importInfo) => {
      if (importInfo && Number.isInteger(importInfo.line) && importInfo.line > 0) {
        return importInfo.line;
      }
      return undefined;
    };

    // Check must_not_import_from constraints
    if (Array.isArray(this.config.must_not_import_from)) {
      for (const importInfo of imports) {
        const importPath = getImportPath(importInfo);
        if (!importPath) continue;
        
        for (const forbidden of this.config.must_not_import_from) {
          try {
            if (this._matchesPattern(importPath, forbidden, file.filePath)) {
              violations.push({
                ruleName: this.name,
                severity: 'error',
                file: file.filePath,
                line: getLineNumber(importInfo),
                message: `Forbidden import: "${truncateText(importPath)}" matches "${truncateText(forbidden)}"`,
                suggestion: 'Remove this import or add to allowed list',
                relatedFile: importPath
              });
              break; // Found match, no need to check other forbidden patterns
            }
          } catch (e) {
            // Regex error, skip this pattern
          }
        }
      }
    }

    // Check may_import_from whitelist constraints
    if (Array.isArray(this.config.may_import_from) && this.config.may_import_from.length > 0) {
      for (const importInfo of imports) {
        const importPath = getImportPath(importInfo);
        if (!importPath) continue;
        
        let isAllowed = false;
        for (const allowed of this.config.may_import_from) {
          try {
            if (this._matchesPattern(importPath, allowed, file.filePath)) {
              isAllowed = true;
              break; // Found match, no need to check other allowed patterns
            }
          } catch (e) {
            // Regex error, continue checking
          }
        }
        
        if (!isAllowed) {
          violations.push({
            ruleName: this.name,
            severity: 'error',
            file: file.filePath,
            line: getLineNumber(importInfo),
            message: `Import not in whitelist: "${truncateText(importPath)}"`,
            suggestion: `Add to may_import_from or use allowed import`,
            relatedFile: importPath
          });
        }
      }
    }

    // Check must_import_from required constraints
    if (Array.isArray(this.config.must_import_from) && this.config.must_import_from.length > 0) {
      for (const required of this.config.must_import_from) {
        let hasImport = false;
        for (const importInfo of imports) {
          const importPath = getImportPath(importInfo);
          if (!importPath) continue;
          
          try {
            if (this._matchesPattern(importPath, required, file.filePath)) {
              hasImport = true;
              break;
            }
          } catch (e) {
            // Regex error, continue checking
          }
        }
        
        if (!hasImport) {
          violations.push({
            ruleName: this.name,
            severity: 'error',
            file: file.filePath,
            message: `Missing required import matching "${truncateText(required)}"`,
            suggestion: `Add an import that matches "${truncateText(required, 200)}"`
          });
        }
      }
    }

    // Check inward_only constraint (who imports THIS file)
    // This checks DEPENDENTS, not dependencies
    if (this.config.inward_only === true) {
      const protectedMatchers = context?.inwardOnlyMatchers;
      if (protectedMatchers && protectedMatchers.size > 0 && file?.name) {
        // Get who imports THIS file (dependents)
        const dependents = graph.getDependents(file.name);

        for (const dependent of dependents) {
          if (!dependent?.filePath) continue;

          // Fast path: skip if dependent is in same layer
          if (this.layerMatchers.length > 0 && this.matchesLayer(dependent.filePath, this.layerMatchers)) {
            continue;
          }

          // Check if dependent is in ANOTHER protected layer
          for (const [ruleName, { matchers }] of protectedMatchers) {
            if (ruleName === this.name) continue; // Skip self

            if (matchers && matchers.length > 0 && this.matchesLayer(dependent.filePath, matchers)) {
              violations.push({
                ruleName: this.name,
                severity: 'error',
                file: dependent.filePath,        // The VIOLATOR (dependent file)
                line: this._findImportLine(dependent, file.filePath),
                message: `Cannot import from protected layer "${this.name}": layer "${ruleName}" has inward_only constraint`,
                suggestion: `Move shared logic to an unprotected module (e.g., src/shared/) or remove inward_only from one layer`,
                relatedFile: file.filePath        // The PROTECTED file
              });
              break; // One violation per dependent, not per matching rule
            }
          }
        }
      }
    }

    return violations;
  }

  /**
   * Find the line number of the import that targets a specific file
   * @param {Object} dependent - Dependent component with imports
   * @param {string} targetFilePath - The file being imported
   * @returns {number|undefined}
   */
  _findImportLine(dependent, targetFilePath) {
    const imports = dependent?.imports || [];
    for (const imp of imports) {
      const importPath = typeof imp === 'string' ? imp : imp?.path;
      if (!importPath) continue;

      // Check if this import resolves to targetFilePath
      if (this._resolvesTo(importPath, dependent.filePath, targetFilePath)) {
        return typeof imp === 'object' ? imp.line : undefined;
      }
    }
    return undefined;
  }

  /**
   * Check if an import path resolves to a target file path
   * @param {string} importPath - The import path (may be relative)
   * @param {string} fromFile - The file containing the import
   * @param {string} targetFilePath - The expected resolved path
   * @returns {boolean}
   */
  _resolvesTo(importPath, fromFile, targetFilePath) {
    // External packages never match internal paths
    if (!importPath?.startsWith('.')) {
      return false;
    }

    const fromDir = path.dirname(fromFile || '.');
    const resolved = path.normalize(path.join(fromDir, importPath));

    // Check with common extensions
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
    for (const ext of extensions) {
      if (resolved + ext === targetFilePath) return true;
    }

    // Check index files
    for (const ext of extensions) {
      if (path.join(resolved, 'index' + ext) === targetFilePath) return true;
    }

    return resolved === targetFilePath;
  }

  /**
   * Check if an import path matches a pattern
   * @param {string} importPath - The import path
   * @param {string} pattern - The pattern to match against
   * @param {string} sourceFile - The file containing the import (for relative path resolution)
 * @returns {boolean}
   */
  _matchesPattern(importPath, pattern, sourceFile) {
    // Handle empty or invalid inputs
    if (!pattern || typeof pattern !== 'string' || pattern.trim() === '') {
      return false;
    }
    if (!importPath || typeof importPath !== 'string') {
      return false;
    }
    
    // Normalize paths for comparison
    const normalizedImport = importPath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/').replace(/\/$/, ''); // Remove trailing slash
    
    // Exact match
    if (normalizedImport === normalizedPattern) {
      return true;
    }
    
    // Check if import is within the pattern directory (path boundary)
    // e.g., 'src/ui/Button' matches 'src/ui' but 'src/ui-core' does not
    if (normalizedImport.startsWith(normalizedPattern + '/')) {
      return true;
    }
    
    // Glob pattern matching for patterns with wildcards
    if (normalizedPattern.includes('*') || normalizedPattern.includes('?')) {
      try {
        const matcher = picomatch(normalizedPattern, { dot: true });
        return matcher(normalizedImport);
      } catch (e) {
        // Invalid glob pattern
        return false;
      }
    }
    
    // Handle relative imports by resolving against source file
    if (importPath.startsWith('.')) {
      const sourceDir = path.dirname(sourceFile || '.').replace(/\\/g, '/');
      const resolvedPath = path.posix.normalize(path.posix.join(sourceDir, normalizedImport));
      return resolvedPath === normalizedPattern || 
             resolvedPath.startsWith(normalizedPattern + '/');
    }
    
    return false;
  }
}

module.exports = { ImportRule };
