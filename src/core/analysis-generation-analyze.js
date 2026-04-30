const chalk = require('chalk');
const { parseMaxFiles, parsePatterns, parseExclude } = require('./analysis-generation-analyze-options');
const { resolveCandidateFiles } = require('./analysis-generation-analyze-files');
const { extractComponents } = require('./analysis-generation-analyze-components');
const { linkDependencies } = require('./analysis-generation-analyze-dependencies');

/**
 * Orchestrates a multi-step analysis of files under a root path and returns a structured summary of the results.
 *
 * @param {string} rootPath - Filesystem root to analyse.
 * @param {Object} options - Analysis options.
 * @param {string[]} [options.includeFiles] - Explicit files to include in the analysis.
 * @param {boolean} [options.deterministic] - If true, sort candidate files deterministically.
 * @param {...*} [options.*] - Other options may influence patterns, exclusions and max-files.
 * @returns {Object} Analysis result containing:
 *  - rootPath: the analysed root path.
 *  - components: extracted component data.
 *  - entryPoints: discovered entry points.
 *  - languages: detected languages metadata.
 *  - directories: analysed directory metadata.
 *  - totalFilesFound: total number of candidate files discovered before truncation.
 *  - maxFilesApplied: the max-files limit that was applied.
 */
async function analyze(rootPath, options) {
  const maxFiles = parseMaxFiles(options);
  const patterns = parsePatterns(options);
  const exclude = parseExclude(options);
  const explicitFiles = Array.isArray(options.includeFiles) ? options.includeFiles : [];
  let allUniqueFiles = await resolveCandidateFiles(rootPath, patterns, exclude, explicitFiles);

  if (options.deterministic) {
    allUniqueFiles = allUniqueFiles.sort();
  }
  const totalFilesFound = allUniqueFiles.length;
  const uniqueFiles = allUniqueFiles.slice(0, maxFiles);

  if (totalFilesFound > maxFiles) {
    console.warn(
      chalk.yellow(
        `⚠️  Max-files limit reached: analyzing ${maxFiles} of ${totalFilesFound} files. Use --max-files ${Math.ceil(totalFilesFound / 100) * 100} to expand.`
      )
    );
  }

  const { components, entryPoints, languages, directories } = extractComponents(rootPath, uniqueFiles);
  linkDependencies(components, rootPath);

  return {
    rootPath,
    components,
    entryPoints,
    languages,
    directories,
    patterns,
    exclude,
    totalFilesFound,
    maxFilesApplied: maxFiles,
  };
}

module.exports = {
  analyze,
};
