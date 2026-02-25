const { ImportRule } = require('./types/import-rule');

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
    
    // Import rules have import-related constraints
    if (config.must_not_import_from || 
        config.may_import_from || 
        config.must_import_from) {
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
