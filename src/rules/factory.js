const { ImportRule } = require('./types/import-rule');

// Security limits for inward_only rules
const MAX_PATTERN_LENGTH = 200;
const MAX_BRACE_DEPTH = 3;

/**
 * Validate pattern complexity for ReDoS protection
 * @param {string} pattern - Layer pattern to validate
 * @param {string} ruleName - Rule name for error messages
 */
function validatePatternComplexity(pattern, ruleName) {
  if (typeof pattern !== 'string') return;

  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error(
      `Rule "${ruleName}": Layer pattern too long (${pattern.length} chars). Maximum is ${MAX_PATTERN_LENGTH}.`
    );
  }

  const braceDepth = (pattern.match(/\{/g) || []).length;
  if (braceDepth > MAX_BRACE_DEPTH) {
    throw new Error(
      `Rule "${ruleName}": Layer pattern has too many braces (${braceDepth}). Maximum is ${MAX_BRACE_DEPTH}.`
    );
  }
}

/**
 * RuleFactory - Creates rule instances from configuration
 */
class RuleFactory {
  /**
   * Create rule instances from config
   * @param {Object} config - Configuration object with rules array
   * @returns {Array<Rule>}
   */
  static createRules(config) {
    if (!config || typeof config !== 'object') {
      throw new TypeError('Config must be an object');
    }

    if (!Array.isArray(config.rules)) {
      throw new TypeError('Config must have a "rules" array');
    }

    // Limit number of rules
    if (config.rules.length > 10000) {
      throw new Error('Too many rules (maximum 10000)');
    }

    return config.rules.map((ruleConfig, index) => {
      const type = this.detectRuleType(ruleConfig);

      // Validate pattern complexity for inward_only rules
      if (ruleConfig.inward_only === true && ruleConfig.layer) {
        const layers = Array.isArray(ruleConfig.layer) ? ruleConfig.layer : [ruleConfig.layer];
        for (const layer of layers) {
          validatePatternComplexity(layer, ruleConfig.name || `rule ${index}`);
        }
      }

      switch (type) {
        case 'import':
          return new ImportRule(ruleConfig);
        default:
          throw new Error(`Unknown rule type for "${ruleConfig?.name || `rule ${index}`}": ${type}`);
      }
    });
  }

  /**
   * Detect rule type from configuration
   * @param {Object} config - Rule configuration
   * @returns {string} Rule type identifier
   */
  static detectRuleType(config) {
    if (!config || typeof config !== 'object') {
      throw new TypeError('Rule config must be an object');
    }

    // Import rules have import-related constraints (including inward_only)
    if (config.must_not_import_from ||
        config.may_import_from ||
        config.must_import_from ||
        config.inward_only === true) {
      return 'import';
    }

    throw new Error(`Cannot determine rule type for: ${config?.name || 'unnamed rule'}`);
  }

  /**
   * Get required data fields for a rule type
   * @param {string} type - Rule type
   * @returns {Array<string>}
   */
  static getRequiredData(type) {
    switch (type) {
      case 'import':
        return ['imports'];
      default:
        return [];
    }
  }
}

module.exports = { RuleFactory };
