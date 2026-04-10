const chalk = require('chalk');
const { parseMaxFiles, parsePatterns, parseExclude } = require('./analysis-generation-analyze-options');
const { resolveCandidateFiles } = require('./analysis-generation-analyze-files');
const { extractComponents } = require('./analysis-generation-analyze-components');
const { linkDependencies } = require('./analysis-generation-analyze-dependencies');

async function analyze(rootPath, options = {}) {
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
    totalFilesFound,
    maxFilesApplied: maxFiles,
  };
}

module.exports = {
  analyze,
};
