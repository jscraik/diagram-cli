const chalk = require('chalk');
const {
  buildMermaidForMedia,
  getVideoModule,
  resolveMediaCommandContext,
} = require('./video-shared');

/**
 * Register the CLI subcommand `generate-video [path]` for producing an animated video from a diagram.
 *
 * The command accepts options for diagram type, output file, overwrite, verbosity, duration, FPS,
 * dimensions, theme and analysis file patterns. When executed it resolves and validates the command
 * context, builds a Mermaid representation of the diagram, loads the video generator (requires
 * Playwright) and writes the resulting video to the specified output path using parsed numeric
 * options for duration, fps, width and height.
 *
 * @param {import('commander').Command} program - Commander program instance to register the subcommand on.
 */
function registerGenerateVideoCommand(program) {
  program
    .command('generate-video [path]')
    .description('Generate an animated video of the diagram')
    .option('-t, --type <type>', 'Diagram type', 'architecture')
    .option('-o, --output <file>', 'Output file (.mp4, .webm, .mov)', 'diagram.mp4')
    .option('--force', 'Overwrite output file if it exists', false)
    .option('-q, --quiet', 'Suppress non-essential logging', false)
    .option('-d, --duration <sec>', 'Video duration in seconds', '5')
    .option('-f, --fps <n>', 'Frames per second', '30')
    .option('--width <n>', 'Video width', '1280')
    .option('--height <n>', 'Video height', '720')
    .option('--theme <theme>', 'Theme: default, dark, forest, neutral, light')
    .option('-m, --max-files <n>', 'Max files to analyze')
    .option('-p, --patterns <list>', 'File patterns (comma-separated)')
    .option('-e, --exclude <list>', 'Exclude patterns')
    .option('--format <type>', 'Output format (ignored for video)', 'text')
    .action(async (targetPath, rawOptions) => {
      const { options, root, safeTheme, safeOutput } = resolveMediaCommandContext(
        program,
        targetPath,
        rawOptions
      );

      if (!options.quiet) console.error(chalk.blue('🎬 Generating video for'), root);
      const mermaid = await buildMermaidForMedia(root, options);
      const { generateVideo } = getVideoModule('Video generation requires Playwright.');

      await generateVideo(mermaid, safeOutput, {
        duration: parseInt(options.duration, 10) || 5,
        fps: parseInt(options.fps, 10) || 30,
        width: parseInt(options.width, 10) || 1280,
        height: parseInt(options.height, 10) || 720,
        theme: safeTheme,
      });

      if (!options.quiet) {
        console.log(chalk.cyan('\nNext steps:'));
        console.log('  1) Run `diagram doctor .` if rendering quality/tooling is unstable in CI.');
        console.log('  2) Commit generated media only when required by your release workflow.');
      }
    });
}

module.exports = {
  registerGenerateVideoCommand,
};
