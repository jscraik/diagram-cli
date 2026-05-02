const chalk = require('chalk');
const {
  buildMermaidForMedia,
  getVideoModule,
  resolveMediaCommandContext,
} = require('./video-shared');

/**
 * Register the `generate-animated` CLI command on the provided program.
 *
 * The command generates an animated SVG from media files under a target path, accepting options
 * for diagram type, output file, theme, include/exclude patterns and analysis limits; it resolves
 * the command context, builds Mermaid content and writes the animated SVG.
 */
function registerGenerateAnimatedCommand(program) {
  program
    .command('generate-animated [path]')
    .description('Generate animated SVG with CSS animations')
    .option('-t, --type <type>', 'Diagram type', 'architecture')
    .option('-o, --output <file>', 'Output file', 'diagram-animated.svg')
    .option('--force', 'Overwrite output file if it exists', false)
    .option('-q, --quiet', 'Suppress non-essential logging', false)
    .option('--theme <theme>', 'Theme: default, dark, forest, neutral, light')
    .option('-m, --max-files <n>', 'Max files to analyze')
    .option('-p, --patterns <list>', 'File patterns (comma-separated)')
    .option('-e, --exclude <list>', 'Exclude patterns')
    .option('--format <type>', 'Output format (ignored for animated)', 'text')
    .action(async (targetPath, rawOptions) => {
      const { options, root, safeTheme, safeOutput } = resolveMediaCommandContext(
        program,
        targetPath,
        rawOptions
      );

      if (!options.quiet) console.error(chalk.blue('✨ Generating animated SVG for'), root);
      const mermaid = await buildMermaidForMedia(root, options);
      const { generateAnimatedSVG } = getVideoModule('Animated output requires Playwright.');
      await generateAnimatedSVG(mermaid, safeOutput, { theme: safeTheme });

      if (!options.quiet) {
        console.log(chalk.cyan('\nNext steps:'));
        console.log('  1) Run `archscope generate-video` when you need MP4/WebM output.');
        console.log('  2) Use `archscope doctor .` if Mermaid or Playwright toolchain checks fail.');
      }
    });
}

module.exports = {
  registerGenerateAnimatedCommand,
};
