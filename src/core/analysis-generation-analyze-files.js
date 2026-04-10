const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk');

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
