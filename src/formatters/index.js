const { formatConsole, ExitCodes } = require('./console');
const { formatJSON } = require('./json');
const { formatJUnit } = require('./junit');

/**
 * Format results based on specified format
 * @param {Object} results - Validation results
 * @param {string} format - Output format (console, json, junit)
 * @param {Object} options - Output options
 * @param {number} startTime - Start timestamp for duration calculation
 * @returns {number} Exit code
 */
function formatResults(results, format, options = {}, startTime = Date.now()) {
  switch (format) {
    case 'json':
      return formatJSON(results, options, startTime);
    case 'junit':
      return formatJUnit(results, options, startTime);
    case 'console':
    default:
      return formatConsole(results, options, startTime);
  }
}

module.exports = {
  formatResults,
  formatConsole,
  formatJSON,
  formatJUnit,
  ExitCodes
};
