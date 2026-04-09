const chalk = require('chalk');
const {
  applyDiagramRcDefaults,
  getDiagramRcFromProgram,
  maybeWriteArchitectureIR,
  resolveRootPathOrExit,
  runAnalysisPipeline,
} = require('./shared');
const { buildMachineEnvelope } = require('./output');

/**
 * Register the `analyze [path]` CLI subcommand on the provided commander program.
 *
 * The subcommand analyzes a codebase root, runs the analysis pipeline, and emits
 * either a human-readable summary or a machine-friendly JSON envelope. It also
 * supports options for file patterns, exclusions, max files, analyzer selection,
 * emitting a typed architecture IR, incremental analysis, output format,
 * deterministic output and quiet mode.
 *
 * @param {import('commander').Command} program - Commander program instance to attach the subcommand to.
 */
function registerAnalyzeCommand(program) {
  program
    .command('analyze [path]')
    .description('Analyze codebase structure')
    .option('-p, --patterns <list>', 'File patterns (comma-separated)')
    .option('-e, --exclude <list>', 'Exclude patterns')
    .option('-m, --max-files <n>', 'Max files to analyze')
    .option('--analyzer <name>', 'Analyzer plugin to use', 'default')
    .option('--emit-ir', 'Write typed architecture IR artifact', false)
    .option('--incremental', 'Use incremental cache when available', false)
    .option('-f, --format <type>', 'Output format (text, json)', 'text')
    .option('--deterministic', 'Use deterministic machine output', false)
    .option('-q, --quiet', 'Suppress non-essential logging', false)
    .action(async (targetPath, rawOptions) => {
      const options = applyDiagramRcDefaults(rawOptions, getDiagramRcFromProgram(program), ['patterns', 'exclude', 'maxFiles']);
      const root = resolveRootPathOrExit(targetPath);
      const formatStr = String(options.format || 'text').toLowerCase().trim();
      const allowedFormats = new Set(['text', 'json']);
      if (!allowedFormats.has(formatStr)) {
        console.error(chalk.red('❌ Invalid format:'), options.format);
        console.error(chalk.gray('Fix: use --format text or --format json.'));
        process.exit(2);
      }
      const isJson = formatStr === 'json';
      if (!options.quiet) {
        console.error(chalk.blue('Analyzing'), root);
      }

      const pipeline = await runAnalysisPipeline(root, options, 'analyze');
      const data = pipeline.analysis;
      const irPath = options.emitIr
        ? maybeWriteArchitectureIR(root, data, pipeline.analyzer, true)
        : null;

      if (isJson) {
        const payload = buildMachineEnvelope({
          schemaVersion: '1.0',
          command: 'analyze',
          rootPath: root,
          deterministic: Boolean(options.deterministic),
          data: {
            analysis: data,
            analyzer: pipeline.analyzer,
            incremental: pipeline.incremental,
            artifacts: {
              architectureIrPath: irPath || null,
            },
          },
          agentSummary: {
            componentCount: data.components?.length || 0,
            entryPoints: data.entryPoints || [],
            dominantLanguages: Object.entries(data.languages || {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([language]) => language),
            suggestedReviewerChecks: [
              'Inspect top dependency hubs for unwanted coupling.',
              'Confirm entry points align with intended service boundaries.',
            ],
          },
        });
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      if (irPath && !options.quiet) {
        console.error(chalk.gray('  IR:'), irPath);
      }

      const components = data.components || [];
      const languages = data.languages || {};
      const entryPoints = data.entryPoints || [];
      console.log(chalk.green('\n📊 Summary'));
      console.log(`  Files: ${components.length}`);
      console.log(`  Languages: ${Object.entries(languages).map(([k, v]) => `${k}(${v})`).join(', ') || 'none'}`);
      console.log(`  Entry points: ${entryPoints.join(', ') || 'none'}`);
      console.log(`\n${chalk.yellow('Components:')}`);
      components.slice(0, 15).forEach((component) => {
        const deps = component.dependencies.length > 0
          ? ` → ${component.dependencies.slice(0, 3).join(', ')}`
          : '';
        console.log(`  ${component.originalName} (${component.type})${deps}`);
      });
      if (components.length > 15) {
        console.log(chalk.gray(`  ... and ${components.length - 15} more`));
      }
      if (pipeline.incremental.requested) {
        const message = pipeline.incremental.used
          ? `cache hit (${pipeline.incremental.reason})`
          : `fallback full scan (${pipeline.incremental.reason})`;
        console.log(chalk.gray(`  Incremental: ${message}`));
      }

      if (!options.quiet) {
        console.log(chalk.cyan('\nNext steps:'));
        console.log('  1) Run `diagram generate . --type architecture` to visualize structure.');
        console.log('  2) Run `diagram validate .` to enforce architecture policy.');
      }
    });
}

module.exports = {
  registerAnalyzeCommand,
};
