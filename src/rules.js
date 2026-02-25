const YAML = require('yaml');
const fs = require('fs');
const path = require('path');
const picomatch = require('picomatch');
const { RuleFactory } = require('./rules/factory');
const { ComponentGraph } = require('./graph');

const MAX_CONFIG_SIZE = 1024 * 1024; // 1MB limit
const MAX_PATTERN_CACHE_SIZE = 5000;

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
    
    const contentSize = Buffer.byteLength(content, 'utf8');
    if (contentSize > MAX_CONFIG_SIZE) {
      throw new Error(
        `Config file too large (${contentSize} bytes)`
      );
    }

    try {
      return YAML.parse(content, {
        prettyErrors: true,
        strict: true,
        maxAliasCount: 100, // Prevent Billion Laughs attack
        customTags: [] // Disable dangerous tags like !!js/function
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
    if (typeof pattern !== 'string' || pattern.trim() === '') {
      throw new Error(`Invalid ${context}: pattern must be a non-empty string`);
    }
    if (pattern.includes('\0')) {
      throw new Error(`Invalid ${context}: null bytes are not allowed`);
    }

    const normalizedPattern = path.posix.normalize(pattern.trim().replace(/\\/g, '/'));
    
    if (normalizedPattern === '..' || normalizedPattern.startsWith('../')) {
      throw new Error(
        `Invalid ${context}: directory traversal not allowed`
      );
    }
    if (path.posix.isAbsolute(normalizedPattern) || /^[a-zA-Z]:\//.test(normalizedPattern)) {
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
      if (this.patternCache.size >= MAX_PATTERN_CACHE_SIZE) {
        this.patternCache.clear();
      }
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
    const layers = Array.isArray(rule?.layer) ? rule.layer : [rule?.layer];
    const normalizedLayers = layers
      .filter(layer => typeof layer === 'string' && layer.trim() !== '')
      .map(layer => layer.trim());

    if (normalizedLayers.length === 0) {
      throw new Error(`Rule "${rule?.name || 'unnamed'}" has no valid layer patterns`);
    }

    return normalizedLayers.map(layer => this.getMatcher(layer, { dot: true }));
  }

  /**
   * Validate rules against component graph
   * @param {Array<Rule>} rules - Rule instances
   * @param {ComponentGraph} graph - Component graph
   * @returns {Object} Validation results
   */
  validate(rules, graph) {
    if (!graph || typeof graph.getFilesInLayer !== 'function') {
      throw new TypeError('graph must expose getFilesInLayer(matchers)');
    }

    const safeRules = Array.isArray(rules) ? rules : [];
    const results = {
      summary: {
        total: safeRules.length,
        passed: 0,
        failed: 0,
        violations: 0
      },
      rules: []
    };

    const seenRuleNames = new Set();

    for (let index = 0; index < safeRules.length; index++) {
      const rule = safeRules[index] || {};
      const ruleName =
        typeof rule.name === 'string' && rule.name.trim() !== ''
          ? rule.name
          : `rule-${index + 1}`;
      const ruleResult = {
        name: ruleName,
        description: typeof rule.description === 'string' ? rule.description : '',
        status: 'passed',
        filesChecked: 0,
        violations: []
      };

      if (seenRuleNames.has(ruleName)) {
        ruleResult.violations.push({
          ruleName,
          severity: 'error',
          message: `Duplicate rule name "${ruleName}" detected`
        });
      } else {
        seenRuleNames.add(ruleName);
      }

      let filesInLayer = [];
      try {
        const matchers = this.compileLayerPatterns(rule);
        filesInLayer = graph.getFilesInLayer(matchers);
        ruleResult.filesChecked = filesInLayer.length;
      } catch (error) {
        ruleResult.status = 'failed';
        ruleResult.violations.push({
          ruleName,
          severity: 'error',
          message: `Rule setup failed: ${error.message}`
        });
        results.summary.failed++;
        results.summary.violations += ruleResult.violations.length;
        results.rules.push(ruleResult);
        continue;
      }

      // Skip if no files match
      if (filesInLayer.length === 0) {
        if (ruleResult.violations.length > 0) {
          ruleResult.status = 'failed';
          results.summary.failed++;
          results.summary.violations += ruleResult.violations.length;
        } else {
          ruleResult.status = 'skipped';
          ruleResult.message = 'No files matched layer pattern';
        }
        results.rules.push(ruleResult);
        continue;
      }

      if (typeof rule.validate !== 'function') {
        ruleResult.violations.push({
          ruleName,
          severity: 'error',
          message: `Rule "${ruleName}" does not implement validate()`
        });
      }

      // Validate each file with error handling per rule
      for (const file of filesInLayer) {
        if (!file || typeof file !== 'object') continue;
        try {
          if (typeof rule.validate !== 'function') {
            break;
          }
          const violations = rule.validate(file, graph);
          if (Array.isArray(violations) && violations.length > 0) {
            ruleResult.violations.push(...violations);
          } else if (violations != null && !Array.isArray(violations)) {
            ruleResult.violations.push({
              ruleName,
              severity: 'error',
              file: file.filePath,
              message: 'Rule returned invalid violation payload'
            });
          }
        } catch (validationError) {
          ruleResult.violations.push({
            ruleName,
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

    if (!graph || typeof graph.getFilesInLayer !== 'function') {
      return {
        rules: [{
          name: 'preview',
          layer: '',
          error: 'Invalid graph input'
        }]
      };
    }
    
    const MAX_PREVIEW_FILES = 100; // Limit output size
    const safeRules = Array.isArray(rules) ? rules : [];

    for (let index = 0; index < safeRules.length; index++) {
      const rule = safeRules[index] || {};
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
          name: rule.name || `rule-${index + 1}`,
          layer: rule.layer,
          error: e.message
        });
      }
    }

    return preview;
  }
}

module.exports = { RulesEngine, MAX_CONFIG_SIZE };
