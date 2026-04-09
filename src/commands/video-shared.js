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

/**
 * Lazily requires and caches the project's video module.
 *
 * If requiring the module fails because the Playwright runtime is missing, logs the provided message
 * and a "Fix: npm install playwright" hint, then exits the process with code 2. Any other require
 * errors are rethrown.
 *
 * @param {string} missingRuntimeMessage - Message to display when Playwright is not installed.
 * @returns {*} The loaded video module.
 */
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

/**
 * Constructs and validates the command execution context for media-to-diagram operations.
 *
 * @param {Object} program - CLI program instance from which diagram RC may be read.
 * @param {string} targetPath - Path used to resolve the project root.
 * @param {Object} rawOptions - CLI options to merge with diagram RC defaults; keys considered: `patterns`, `exclude`, `maxFiles`, `theme` (default theme is `dark`).
 * @returns {{options: Object, root: string, safeTheme: string, safeOutput: string}} An object containing:
 *  - `options`: the merged and finalised options,
 *  - `root`: the resolved project root path,
 *  - `safeTheme`: the normalised theme value,
 *  - `safeOutput`: the validated output file path.
 */
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

/**
 * Generate Mermaid content from media files located under the given root.
 * @param {string} root - Filesystem path used as the analysis root.
 * @param {Object} options - Options that control analysis and generation. `options.type` selects the generation output type.
 * @returns {string} The generated Mermaid output.
 */
async function buildMermaidForMedia(root, options) {
  const analysis = await analyze(root, options);
  return generate(analysis, options.type);
}

module.exports = {
  buildMermaidForMedia,
  getVideoModule,
  resolveMediaCommandContext,
};
