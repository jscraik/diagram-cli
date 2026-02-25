/**
 * Base Rule class for architecture testing
 * All rule types extend this class
 */
class Rule {
  constructor(config) {
    this.config = config;
  }

  get name() {
    return this.config.name;
  }

  get description() {
    return this.config.description || '';
  }

  get layer() {
    return this.config.layer;
  }

  /**
   * Validate a file against this rule
   * @param {Object} file - Component file object
   * @param {ComponentGraph} graph - Component graph for lookups
   * @returns {Array<Violation>} Array of violations (empty if passed)
   */
  validate(file, graph) {
    throw new Error(`Rule "${this.name}" must implement validate()`);
  }

  /**
   * Get required data fields for this rule
   * @returns {Array<string>} Required fields (e.g., ['imports'])
   */
  getRequiredData() {
    return ['imports'];
  }

  /**
   * Check if this rule applies to a given file path
   * @param {string} filePath - File path to check
   * @param {Array<Function>} matchers - Compiled picomatch functions
   * @returns {boolean}
   */
  matchesLayer(filePath, matchers) {
    return matchers.some(matcher => matcher(filePath));
  }
}

module.exports = { Rule };
