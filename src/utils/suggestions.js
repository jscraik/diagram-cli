const chalk = require('chalk');

/**
 * Compute the Levenshtein edit distance between two strings.
 *
 * @param {string} a - First string to compare.
 * @param {string} b - Second string to compare.
 * @returns {number} The minimum number of single-character insertions, deletions or substitutions required to transform `a` into `b`.
 */
function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Selects the closest matching option to the given input from an array of candidates.
 *
 * Compares `input` (stringified and lowercased) against each element of `options` (stringified and lowercased)
 * using Levenshtein edit distance and returns the candidate with the lowest distance only if that distance
 * is within an acceptance threshold proportional to the input length; otherwise returns `null`.
 *
 * @param {*} input - Value to match; it will be converted to a string for comparison.
 * @param {Array<*>} options - Array of candidate values (each will be converted to a string).
 * @returns {*} The best matching option from `options` if its edit distance is acceptable, `null` otherwise.
 */
function findClosestMatch(input, options) {
  if (!input || !Array.isArray(options) || options.length === 0) return null;

  const normalizedInput = String(input).toLowerCase();
  const scored = options
    .map((option) => ({ option, score: levenshtein(normalizedInput, String(option).toLowerCase()) }))
    .sort((a, b) => a.score - b.score);

  if (!scored.length) return null;
  const best = scored[0];
  return best.score <= Math.max(2, Math.floor(normalizedInput.length / 3)) ? best.option : null;
}

/**
 * Format a suggestion message for display.
 * @param {string} suggestion - The suggested alternative to present to the user.
 * @returns {string} A grey-coloured string in the form "   Did you mean: <suggestion>".
 */
function formatSuggestion(suggestion) {
  return chalk.gray(`   Did you mean: ${suggestion}`);
}

module.exports = {
  findClosestMatch,
  formatSuggestion,
};
