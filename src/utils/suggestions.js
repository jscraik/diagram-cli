const chalk = require('chalk');

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

function findClosestMatch(input, options) {
  if (!input || !Array.isArray(options) || options.length === 0) return null;

  const normalizedInput = String(input).toLowerCase();
  const scored = options
    .map((option) => ({ option, score: levenshtein(normalizedInput, String(option).toLowerCase()) }))
    .sort((a, b) => a.score - b.score);

  const best = scored[0];
  return best.score <= Math.max(2, Math.floor(normalizedInput.length / 3)) ? best.option : null;
}

function formatSuggestion(suggestion) {
  return chalk.gray(`   Did you mean: ${suggestion}`);
}

module.exports = {
  findClosestMatch,
  formatSuggestion,
};
