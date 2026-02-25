const { Rule } = require('./base');
const path = require('path');
const picomatch = require('picomatch');

/**
 * Import constraint rule
 * Validates imports against allowed/forbidden patterns
 */
class ImportRule extends Rule {
  validate(file, graph) {
    const violations = [];
    const imports = file.imports || [];

    // Check must_not_import_from constraints
    if (this.config.must_not_import_from) {
      for (const importInfo of imports) {
        const importPath = typeof importInfo === 'string' ? importInfo : importInfo.path;
        
        for (const forbidden of this.config.must_not_import_from) {
          if (this._matchesPattern(importPath, forbidden, file.filePath)) {
            violations.push({
              ruleName: this.name,
              severity: 'error',
              file: file.filePath,
              line: typeof importInfo === 'object' ? importInfo.line : undefined,
              message: `Forbidden import: "${importPath}" matches "${forbidden}"`,
              suggestion: 'Remove this import or add to allowed list',
              relatedFile: importPath
            });
          }
        }
      }
    }

    // Check may_import_from whitelist constraints
    if (this.config.may_import_from) {
      for (const importInfo of imports) {
        const importPath = typeof importInfo === 'string' ? importInfo : importInfo.path;
        const isAllowed = this.config.may_import_from.some(allowed => 
          this._matchesPattern(importPath, allowed, file.filePath)
        );
        
        if (!isAllowed) {
          violations.push({
            ruleName: this.name,
            severity: 'error',
            file: file.filePath,
            line: typeof importInfo === 'object' ? importInfo.line : undefined,
            message: `Import not in whitelist: "${importPath}"`,
            suggestion: `Add to may_import_from or use allowed import`,
            relatedFile: importPath
          });
        }
      }
    }

    // Check must_import_from required constraints
    if (this.config.must_import_from) {
      for (const required of this.config.must_import_from) {
        const hasImport = imports.some(importInfo => {
          const importPath = typeof importInfo === 'string' ? importInfo : importInfo.path;
          return this._matchesPattern(importPath, required, file.filePath);
        });
        
        if (!hasImport) {
          violations.push({
            ruleName: this.name,
            severity: 'error',
            file: file.filePath,
            message: `Missing required import matching "${required}"`,
            suggestion: `Add an import that matches "${required}"`
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check if an import path matches a pattern
   * @param {string} importPath - The import path
   * @param {string} pattern - The pattern to match against
   * @param {string} sourceFile - The file containing the import (for relative path resolution)
 * @returns {boolean}
   */
  _matchesPattern(importPath, pattern, sourceFile) {
    // Handle empty pattern
    if (!pattern || pattern.trim() === '') {
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
      const matcher = picomatch(normalizedPattern, { dot: true });
      return matcher(normalizedImport);
    }
    
    // Handle relative imports by resolving against source file
    if (importPath.startsWith('.')) {
      const sourceDir = path.dirname(sourceFile).replace(/\\/g, '/');
      const resolvedPath = path.posix.join(sourceDir, normalizedImport);
      return resolvedPath === normalizedPattern || 
             resolvedPath.startsWith(normalizedPattern + '/');
    }
    
    return false;
  }
}

module.exports = { ImportRule };
