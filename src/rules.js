const YAML = require('yaml');
const fs = require('fs');
const path = require('path');
const picomatch = require('picomatch');
const { RuleFactory } = require('./rules/factory');
const { ComponentGraph } = require('./graph');

const MAX_CONFIG_SIZE = 1024 * 1024; // 1MB limit

/**
 * Architecture Rules Engine
 * Validates codebase against declarative rules
 */
class RulesEngine {
  constructor() {
    this.patternCache = new Map();
  }

  /**
   * Load and parse YAML configuration file
   * @param {string} configPath - Path to .architecture.yml
   * @returns {Object} Parsed configuration
   */
  loadConfig(configPath) {
    // Security: Read file first, then check size to avoid TOCTOU race
    let content;
    try {
      content = fs.readFileSync(configPath, 'utf8');
    } catch (e) {
      throw new Error(`Config file not found or not accessible: ${configPath}`);
    }
    
    // Check buffer size after reading
    if (content.length > MAX_CONFIG_SIZE) {
      throw new Error(
        `Config file too large (${content.length} bytes)`
      );
    }

    try {
      return YAML.parse(content, {
        prettyErrors: true,
        strict: true,
        maxAliasCount: 100, // Prevent Billion Laughs attack
        customTags: [], // Disable dangerous tags
        schema: 'json' // Use JSON schema for safety
      });
    } catch (error) {
      const enhanced = new Error(
        `Failed to parse ${configPath}: ${error.message}`
      );
      enhanced.filepath = configPath;
      enhanced.originalError = error;
      throw enhanced;
    }
  }

  /**
   * Validate a pattern for security issues
   * @param {string} pattern - Glob pattern
   * @param {string} context - Context for error messages
   */
  validatePattern(pattern, context = 'pattern') {
    // Normalize path before checking
    const normalizedPattern = path.normalize(pattern);
    
    if (normalizedPattern.includes('..')) {
      throw new Error(
        `Invalid ${context}: directory traversal not allowed`
      );
    }
    if (path.isAbsolute(normalizedPattern)) {
      throw new Error(
        `Invalid ${context}: absolute paths not allowed`
      );
    }
  }

  /**
   * Get or create a compiled pattern matcher
   * @param {string} pattern - Glob pattern
   * @param {Object} options - picomatch options
   * @returns {Function}
   */
  getMatcher(pattern, options = { dot: true }) {
    // Validate options are serializable
    let optionsKey;
    try {
      optionsKey = JSON.stringify(options);
    } catch (e) {
      optionsKey = String(options);
    }
    
    // Include options in cache key
    const key = `${pattern}::${optionsKey}`;
    
    if (!this.patternCache.has(key)) {
      this.validatePattern(pattern);
      this.patternCache.set(key, picomatch(pattern, options));
    }
    
    return this.patternCache.get(key);
  }

  /**
   * Compile layer patterns for a rule
   * @param {Object} rule - Rule configuration
   * @returns {Array<Function>} Compiled matchers
   */
  compileLayerPatterns(rule) {
    const layers = Array.isArray(rule.layer) ? rule.layer : [rule.layer];
    return layers.map(layer => this.getMatcher(layer, { dot: true }));
  }

  /**
   * Validate rules against component graph
   * @param {Array<Rule>} rules - Rule instances
   * @param {ComponentGraph} graph - Component graph
   * @returns {Object} Validation results
   */
  validate(rules, graph) {
    const results = {
      summary: {
        total: rules.length,
        passed: 0,
        failed: 0,
        violations: 0
      },
      rules: []
    };

    for (const rule of rules) {
      const matchers = this.compileLayerPatterns(rule);
      const filesInLayer = graph.getFilesInLayer(matchers);
      
      const ruleResult = {
        name: rule.name,
        description: rule.description,
        status: 'passed',
        filesChecked: filesInLayer.length,
        violations: []
      };

      // Skip if no files match
      if (filesInLayer.length === 0) {
        ruleResult.status = 'skipped';
        ruleResult.message = 'No files matched layer pattern';
        results.rules.push(ruleResult);
        continue;
      }

      // Validate each file with error handling per rule
      for (const file of filesInLayer) {
        try {
          const violations = rule.validate(file, graph);
          if (violations && violations.length > 0) {
            ruleResult.violations.push(...violations);
          }
        } catch (validationError) {
          ruleResult.violations.push({
            ruleName: rule.name,
            severity: 'error',
            file: file.filePath,
            message: `Rule validation failed: ${validationError.message}`
          });
        }
      }

      // Determine status
      if (ruleResult.violations.length > 0) {
        ruleResult.status = 'failed';
        results.summary.failed++;
        results.summary.violations += ruleResult.violations.length;
      } else {
        results.summary.passed++;
      }

      results.rules.push(ruleResult);
    }

    return results;
  }

  /**
   * Find configuration file
   * @param {string} searchPath - Directory to search
   * @returns {string|null} Path to config file or null
   */
  findConfig(searchPath) {
    const configNames = [
      '.architecture.yml',
      '.architecture.yaml',
      'architecture.config.yml',
      'architecture.config.yaml'
    ];

    // Case-insensitive search on Windows
    const isWindows = process.platform === 'win32';
    
    for (const name of configNames) {
      const fullPath = path.join(searchPath, name);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
      
      // On Windows, also try case-insensitive match
      if (isWindows) {
        const lowerName = name.toLowerCase();
        try {
          const files = fs.readdirSync(searchPath);
          const match = files.find(f => f.toLowerCase() === lowerName);
          if (match) {
            return path.join(searchPath, match);
          }
        } catch (e) {
          // Directory not readable
        }
      }
    }

    return null;
  }

  /**
   * Preview which files match each rule (dry-run mode)
   * @param {Array<Rule>} rules - Rule instances
   * @param {ComponentGraph} graph - Component graph
   * @returns {Object} File matching results
   */
  previewMatches(rules, graph) {
    const preview = {
      rules: []
    };
    
    const MAX_PREVIEW_FILES = 100; // Limit output size

    for (const rule of rules) {
      try {
        const matchers = this.compileLayerPatterns(rule);
        const filesInLayer = graph.getFilesInLayer(matchers);
        
        const matchedFiles = filesInLayer.map(f => f.filePath);
        const truncated = matchedFiles.length > MAX_PREVIEW_FILES;
        
        preview.rules.push({
          name: rule.name,
          layer: rule.layer,
          matchedFiles: truncated ? matchedFiles.slice(0, MAX_PREVIEW_FILES) : matchedFiles,
          truncated: truncated,
          totalFiles: matchedFiles.length
        });
      } catch (e) {
        preview.rules.push({
          name: rule.name || 'unnamed',
          layer: rule.layer,
          error: e.message
        });
      }
    }

    return preview;
  }
}

module.exports = { RulesEngine, MAX_CONFIG_SIZE };
