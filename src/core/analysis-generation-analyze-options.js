/**
 * Determine and normalise the maximum number of files to analyse.
 *
 * @param {object} options - Options object.
 * @param {number|string} [options.maxFiles] - Desired maximum; parsed as a base-10 integer.
 * @returns {number} The validated `maxFiles` clamped to the range 1–10000; defaults to 100 when invalid.
 */
function parseMaxFiles(options) {
  let maxFiles = parseInt(options.maxFiles, 10);
  if (isNaN(maxFiles) || maxFiles < 1 || maxFiles > 10000) {
    maxFiles = 100;
  }
  return Math.min(Math.max(maxFiles, 1), 10000);
}

/**
 * Parse and return file glob patterns from an options object.
 *
 * If `options.patterns` is provided as a comma-separated string it is split
 * into an array of glob patterns; otherwise a default set of common source
 * file globs is returned.
 *
 * @param {Object} options - Options object that may contain a `patterns` property.
 *   When present, `options.patterns` must be a comma-separated string of glob patterns.
 * @returns {string[]} Array of glob patterns.
 * @throws {TypeError} If `options.patterns` is present and is not a string.
 */
function parsePatterns(options) {
  let patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go', '**/*.rs'];
  if (options.patterns) {
    if (typeof options.patterns !== 'string') {
      throw new TypeError('patterns must be a string');
    }
    patterns = options.patterns.split(',');
  }
  return patterns;
}

/**
 * Parse exclude glob patterns from the given options, falling back to a default set.
 *
 * @param {Object} options - Configuration object; may include an `exclude` property.
 * @param {string} [options.exclude] - Comma-delimited string of glob patterns to use instead of defaults.
 * @returns {string[]} The array of exclude glob patterns.
 * @throws {TypeError} If `options.exclude` is provided but is not a string.
 */
function parseExclude(options) {
  let exclude = ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.test.*', '*.spec.*'];
  if (options.exclude) {
    if (typeof options.exclude !== 'string') {
      throw new TypeError('exclude must be a string');
    }
    exclude = options.exclude.split(',');
  }
  return exclude;
}

module.exports = {
  parseMaxFiles,
  parsePatterns,
  parseExclude,
};
