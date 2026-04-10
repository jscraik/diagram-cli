const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const {
  detectLanguage,
  inferType,
  extractImportsWithPositions,
  normalizePath,
} = require('./analysis-generation-utils');
const { inferRoleTags } = require('./analysis-generation-role-tags');

/**
 * Extracts component metadata from a set of files beneath a root path.
 *
 * Processes each path in `uniqueFiles`, reading file contents (files larger than 10 MB are skipped), detecting language and relative path, identifying entry points, ensuring unique component names, extracting imports and type information, and collecting directory and language statistics.
 *
 * @param {string} rootPath - Root directory used to compute relative file paths.
 * @param {string[]} uniqueFiles - Array of file paths to analyse.
 * @returns {{components: Array, entryPoints: string[], languages: Object<string, number>, directories: string[]}} An object containing:
 *   - `components`: array of component descriptors with properties `{ name, originalName, filePath, type, imports, roleTags, directory }`.
 *   - `entryPoints`: list of relative file paths that match common entry-point filenames.
 *   - `languages`: mapping of detected language to file count.
 *   - `directories`: sorted array of unique relative directory names.
 */
function extractComponents(rootPath, uniqueFiles) {
  const components = [];
  const languages = {};
  const directories = new Set();
  const entryPoints = [];
  const seenNames = new Set();

  for (const filePath of uniqueFiles) {
    try {
      const fd = fs.openSync(filePath, 'r');
      let content;
      try {
        const { size } = fs.fstatSync(fd);
        if (size > 10 * 1024 * 1024) {
          console.warn(chalk.yellow(`⚠️  Skipping large file: ${path.basename(filePath)} (${(size / 1024 / 1024).toFixed(2)} MB)`));
          continue;
        }
        content = fs.readFileSync(fd, 'utf-8');
      } finally {
        // Close fd even if continue is called in the size check above (uniqueFiles loop)
        fs.closeSync(fd);
      }

      const lang = detectLanguage(filePath);
      let rel = normalizePath(path.relative(rootPath, filePath));
      const dir = path.dirname(rel);
      if (dir === '.') {
        rel = `./${rel}`;
      }

      languages[lang] = (languages[lang] || 0) + 1;
      if (dir !== '.') directories.add(dir);

      const entryPattern = /\/(index|main|app|server)\.(ts|js|tsx|jsx|mts|mjs|py|go|rs)$/i;
      if (entryPattern.test(rel)) {
        entryPoints.push(rel);
      }

      const baseName = path.basename(filePath, path.extname(filePath));
      let uniqueName = baseName;
      let counter = 1;
      while (seenNames.has(uniqueName)) {
        uniqueName = `${baseName}_${counter}`;
        counter++;
      }
      seenNames.add(uniqueName);

      const imports = extractImportsWithPositions(content, lang);
      const type = inferType(filePath, content);

      components.push({
        name: uniqueName,
        originalName: baseName,
        filePath: rel,
        type,
        imports,
        roleTags: inferRoleTags(rel, baseName, content, imports, type),
        directory: dir,
      });
    } catch (error) {
      if (process.env.DEBUG) {
        const safePath = path.basename(filePath);
        console.error(chalk.gray(`Skipped ${safePath}: ${error.message}`));
      }
    }
  }

  return {
    components,
    entryPoints,
    languages,
    directories: [...directories].sort(),
  };
}

module.exports = {
  extractComponents,
};