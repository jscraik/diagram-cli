const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { analyze, generate } = require('../core/analysis-generation');
const {
  applyDiagramRcDefaults,
  getDiagramRcFromProgram,
  normalizeThemeOption,
  resolveRootPathOrExit,
  validateOutputPath,
} = require('./shared');

let videoModule;

function getVideoModule(missingRuntimeMessage) {
  if (!videoModule) {
    try {
      videoModule = require('../video.js');
    } catch (error) {
      const message = String(error?.message || '');
      const missingPlaywrightRuntime = error?.code === 'MODULE_NOT_FOUND'
        && message.toLowerCase().includes('playwright');
      if (!missingPlaywrightRuntime) {
        throw error;
      }
      console.error(chalk.red(`❌ ${missingRuntimeMessage}`));
      console.error(chalk.gray('Fix: npm install playwright'));
      process.exit(2);
    }
  }
  return videoModule;
}

function resolveMediaCommandContext(program, targetPath, rawOptions) {
  const options = applyDiagramRcDefaults(
    rawOptions,
    getDiagramRcFromProgram(program),
    ['patterns', 'exclude', 'maxFiles', 'theme'],
    { theme: 'dark' }
  );
  const root = resolveRootPathOrExit(targetPath);
  const safeTheme = normalizeThemeOption(options.theme, 'dark');

  let safeOutput;
  try {
    safeOutput = validateOutputPath(options.output, root);
  } catch (error) {
    console.error(chalk.red('❌ Output path error:'), error.message);
    process.exit(2);
  }

  if (fs.existsSync(safeOutput) && !options.force) {
    console.error(chalk.red(`❌ Target file exists: ${safeOutput}`));
    console.error(chalk.gray('Fix: rerun with `--force` to overwrite.'));
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(safeOutput), { recursive: true, mode: 0o755 });

  return {
    options,
    root,
    safeTheme,
    safeOutput,
  };
}

async function buildMermaidForMedia(root, options) {
  const analysis = await analyze(root, options);
  return generate(analysis, options.type);
}

module.exports = {
  buildMermaidForMedia,
  getVideoModule,
  resolveMediaCommandContext,
};
