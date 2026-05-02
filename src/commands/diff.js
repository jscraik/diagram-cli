const chalk = require('chalk');
const { spawnSync } = require('child_process');
const {
  analyzeAtRef,
  computeArchitectureDiff,
  printArchitectureDiff,
} = require('../workflow/git-helpers');
const {
  applyDiagramRcDefaults,
  getDiagramRcFromProgram,
  resolveRootPathOrExit,
  splitList,
} = require('./shared');
const { buildMachineEnvelope } = require('./output');

/**
 * Register the `diff <base> <head>` CLI command to compare architecture diagrams between two git refs.
 *
 * The command validates both git refs, analyses repository snapshots at each ref, computes an architectural diff,
 * and emits results either as a human-readable text summary or as a JSON machine envelope.
 *
 * Behaviour highlights:
 * - Accepts options for output format (`text` or `json`), verbosity, quiet mode, file patterns/exclusions,
 *   maximum files to analyse and deterministic machine output.
 * - Exits with code 2 and prints an error when a git ref is invalid or when analysis fails.
 * - When `--format json` is used, prints a structured envelope containing `baseRef`, `headRef` and the `diff`.
 * - When `--format text` is used, prints a textual diff and optional next-step guidance unless `--quiet` is set.
 *
 * @param {object} program - The CLI program object (e.g. commander) to which the command will be attached.
 */
function registerDiffCommand(program) {
  program
    .command('diff <base> <head>')
    .description('Compare architecture diagrams between two git refs')
    .option('-f, --format <type>', 'Output format (text, json)', 'text')
    .option('-q, --quiet', 'Suppress non-essential logging', false)
    .option('-m, --max-files <n>', 'Max files to analyze per ref')
    .option('-p, --patterns <list>', 'File patterns to include (comma-separated)')
    .option('-e, --exclude <list>', 'Paths to exclude (comma-separated)')
    .option('--deterministic', 'Use deterministic machine output', false)
    .option('--verbose', 'Show detailed output')
    .action(async (baseRef, headRef, rawOptions) => {
      const options = applyDiagramRcDefaults(rawOptions, getDiagramRcFromProgram(program), ['patterns', 'exclude', 'maxFiles']);
      const root = resolveRootPathOrExit('.');
      const verbose = options.verbose || false;

      const baseCheck = spawnSync('git', ['rev-parse', '--verify', baseRef], {
        cwd: root,
        stdio: ['ignore', 'ignore', 'ignore'],
        encoding: 'utf-8',
      });
      if (baseCheck.status !== 0) {
        console.error(chalk.red('❌ Invalid base ref:'), baseRef);
        process.exit(2);
      }

      const headCheck = spawnSync('git', ['rev-parse', '--verify', headRef], {
        cwd: root,
        stdio: ['ignore', 'ignore', 'ignore'],
        encoding: 'utf-8',
      });
      if (headCheck.status !== 0) {
        console.error(chalk.red('❌ Invalid head ref:'), headRef);
        process.exit(2);
      }

      const formatStr = String(options.format || 'text').toLowerCase().trim();
      const allowedFormats = new Set(['text', 'json']);
      if (!allowedFormats.has(formatStr)) {
        console.error(chalk.red('❌ Invalid format:'), options.format);
        console.error(chalk.gray('Fix: use --format text or --format json.'));
        process.exit(2);
      }
      const isJson = formatStr === 'json';
      if (!isJson && !options.quiet) {
        console.error(chalk.blue('\n🔍 Architecture Diff'));
        console.error(chalk.gray(`   Base: ${baseRef}`));
        console.error(chalk.gray(`   Head: ${headRef}`));
        console.error('');
      }

      const analysisOptions = {
        maxFiles: parseInt(options.maxFiles, 10) || 100,
        patterns: Array.isArray(options.patterns) ? options.patterns : splitList(options.patterns),
        exclude: Array.isArray(options.exclude) ? options.exclude : splitList(options.exclude),
        deterministic: Boolean(options.deterministic),
      };

      let baseAnalysis;
      let headAnalysis;
      try {
        baseAnalysis = await analyzeAtRef(baseRef, root, analysisOptions);
        if (verbose && !isJson) {
          console.error(chalk.gray(`   Base components: ${baseAnalysis.components.length}`));
        }

        headAnalysis = await analyzeAtRef(headRef, root, analysisOptions);
        if (verbose && !isJson) {
          console.error(chalk.gray(`   Head components: ${headAnalysis.components.length}`));
        }
      } catch (error) {
        console.error(chalk.red('❌ Analysis error:'), error.message);
        process.exit(2);
      }

      const diff = computeArchitectureDiff(baseAnalysis, headAnalysis);
      if (isJson) {
        const payload = buildMachineEnvelope({
          schemaVersion: '1.0',
          command: 'diff',
          rootPath: root,
          deterministic: Boolean(options.deterministic),
          data: {
            baseRef,
            headRef,
            diff,
          },
          agentSummary: {
            changedComponents: Array.isArray(diff?.components?.changed) ? diff.components.changed.length : 0,
            riskReasons: [],
            suggestedReviewerChecks: [
              'Verify added/removed components are expected for this ref comparison.',
              'Inspect dependency edge changes for accidental coupling.',
            ],
          },
        });
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      printArchitectureDiff(diff, baseRef, headRef);
      if (!options.quiet) {
        console.log(chalk.cyan('\nNext steps:'));
        console.log('  1) Run `archscope workflow pr . --base <base> --head <head>` for risk scoring.');
        console.log('  2) Use `archscope explain <component> .` to inspect local dependency neighborhoods.');
      }
    });
}

module.exports = {
  registerDiffCommand,
};
