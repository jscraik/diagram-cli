const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk');

/**
 * Resolve candidate files either from an explicit list or by expanding glob patterns, returning a de-duplicated list of absolute file paths.
 *
 * When `explicitFiles` is a non-empty array it takes precedence: each entry is resolved to an absolute path (relative entries resolved against `rootPath`), discarded if outside `rootPath`, and kept only if it exists and is a file. When `explicitFiles` is not provided or empty, `patterns` are expanded with `glob` using `rootPath` as the current working directory and `exclude` as ignore patterns; invalid glob patterns are skipped with a warning.
 *
 * @param {string} rootPath - Base directory used to resolve relative explicit paths and as the `cwd` for globbing.
 * @param {string[]} patterns - Glob patterns to expand when `explicitFiles` is not provided or empty.
 * @param {string|string[]} exclude - Patterns to pass to glob's `ignore` option.
 * @param {string[]} explicitFiles - Optional explicit file paths; if provided and non-empty these are used instead of globbing.
 * @returns {string[]} An array of absolute, existing file paths with duplicates removed.
 */
async function resolveCandidateFiles(rootPath, patterns, exclude, explicitFiles) {
  if (Array.isArray(explicitFiles) && explicitFiles.length > 0) {
    return [...new Set(explicitFiles
      .map((filePath) => {
        const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(rootPath, filePath);
        const relativeToRoot = path.relative(rootPath, absolute);
        if (relativeToRoot.startsWith('..')) {
          return null;
        }
        return absolute;
      })
      .filter((filePath) => filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile())
    )];
  }

  const files = [];
  for (const pattern of patterns) {
    if (!pattern || pattern.trim() === '') continue;
    try {
      const matches = await glob(pattern.trim(), { cwd: rootPath, absolute: true, ignore: exclude });
      files.push(...matches);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(chalk.yellow(`⚠️  Invalid pattern: ${pattern} — ${message}`));
    }
  }
  return [...new Set(files)];
}

module.exports = {
  resolveCandidateFiles,
};
