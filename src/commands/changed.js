const chalk = require('chalk');
const { generate } = require('../core/analysis-generation');
const { validateGitRef, getChangedFiles, runGitCommand } = require('../workflow/git-helpers');
const {
  applyDiagramRcDefaults,
  getDiagramRcFromProgram,
  resolveRootPathOrExit,
  runAnalysisPipeline,
} = require('./shared');
const { buildMachineEnvelope } = require('./output');

function listWorkingTreeChangedFiles(root) {
  let tracked = [];
  try {
    tracked = runGitCommand(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'], root)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    // Repos with no commits will fail on HEAD reference
    if (error.message && (error.message.includes('HEAD') || error.message.includes('bad revision'))) {
      tracked = [];
    } else {
      throw error;
    }
  }
  const staged = runGitCommand(['diff', '--cached', '--name-only', '--diff-filter=ACMR'], root)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const untracked = runGitCommand(['ls-files', '--others', '--exclude-standard'], root)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return [...new Set([...tracked, ...staged, ...untracked])].sort();
}

function registerChangedCommand(program) {
  program
    .command('changed [path]')
    .description('Analyze only git-changed files')
    .option('--base <ref>', 'Base git ref')
    .option('--head <ref>', 'Head git ref', 'HEAD')
    .option('-m, --max-files <n>', 'Max files to analyze')
    .option('-p, --patterns <list>', 'File patterns (comma-separated)')
    .option('-e, --exclude <list>', 'Exclude patterns')
    .option('--analyzer <name>', 'Analyzer plugin to use', 'default')
    .option('--type <diagramType>', 'Optional diagram type preview (e.g. architecture, dependency)')
    .option('--format <type>', 'Output format (text, json)', 'text')
    .option('--deterministic', 'Use deterministic machine output', false)
    .option('-q, --quiet', 'Suppress non-essential logging', false)
    .action(async (targetPath, rawOptions) => {
      const options = applyDiagramRcDefaults(rawOptions, getDiagramRcFromProgram(program), ['patterns', 'exclude', 'maxFiles']);
      const root = resolveRootPathOrExit(targetPath);
      const formatStr = (options.format || 'text').toLowerCase();
      const isJson = formatStr === 'json';

      let changedFiles = [];
      if (options.base) {
        const baseSha = validateGitRef(options.base, root);
        const headSha = validateGitRef(options.head || 'HEAD', root);
        const delta = getChangedFiles(baseSha, headSha, root);
        changedFiles = [
          ...(delta.changed || []),
          ...(delta.added || []),
          ...((delta.renamed || []).map((entry) => entry?.to).filter(Boolean)),
        ];
      } else {
        changedFiles = listWorkingTreeChangedFiles(root);
      }

      const includeFiles = [...new Set(changedFiles.filter((filePath) => filePath && !filePath.endsWith('/')))];
      if (includeFiles.length === 0) {
        if (isJson) {
          const payload = buildMachineEnvelope({
            schemaVersion: '1.0',
            command: 'changed',
            rootPath: root,
            deterministic: Boolean(options.deterministic),
            data: {
              changedFiles: [],
              analysis: null,
              diagram: null,
            },
            agentSummary: {
              changedComponents: 0,
              riskReasons: [],
              suggestedReviewerChecks: ['No changed files detected.'],
            },
          });
          console.log(JSON.stringify(payload, null, 2));
          return;
        }
        console.log(chalk.green('✅ No changed files detected.'));
        console.log(chalk.cyan('\nNext steps:'));
        console.log('  1) Continue with `diagram validate .` for full rule coverage.');
        console.log('  2) Re-run `diagram changed .` after new branch edits.');
        return;
      }

      if (!options.quiet) {
        console.error(chalk.blue('Analyzing changed files only:'), includeFiles.length);
      }

      const pipeline = await runAnalysisPipeline(root, {
        ...options,
        includeFiles,
      }, 'changed');
      const analysis = pipeline.analysis;
      const diagram = options.type ? generate(analysis, options.type) : null;

      if (isJson) {
        const payload = buildMachineEnvelope({
          schemaVersion: '1.0',
          command: 'changed',
          rootPath: root,
          deterministic: Boolean(options.deterministic),
          data: {
            changedFiles: includeFiles,
            analyzer: pipeline.analyzer,
            incremental: pipeline.incremental,
            analysis,
            diagramType: options.type || null,
            diagram,
          },
          agentSummary: {
            changedComponents: analysis.components?.length || 0,
            riskReasons: [],
            suggestedReviewerChecks: [
              'Review changed-file coupling for unexpected cross-layer imports.',
              'Use `diagram workflow pr` for blast-radius scoring before merge.',
            ],
          },
        });
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      const components = analysis.components || [];
      const languages = analysis.languages || {};
      console.log(chalk.green('\n📊 Changed-file Analysis'));
      console.log(`  Changed files: ${includeFiles.length}`);
      console.log(`  Modeled components: ${components.length}`);
      console.log(`  Languages: ${Object.entries(languages).map(([key, value]) => `${key}(${value})`).join(', ') || 'none'}`);
      console.log(chalk.yellow('\nChanged files:'));
      includeFiles.slice(0, 20).forEach((filePath) => console.log(`  - ${filePath}`));
      if (includeFiles.length > 20) {
        console.log(chalk.gray(`  ... and ${includeFiles.length - 20} more`));
      }

      if (diagram) {
        console.log(chalk.green(`\n📐 ${options.type} diagram for changed scope:\n`));
        console.log('```mermaid');
        console.log(diagram);
        console.log('```');
      }

      console.log(chalk.cyan('\nNext steps:'));
      console.log('  1) Run `diagram workflow pr . --base origin/main --head HEAD` for risk scoring.');
      console.log('  2) Run `diagram validate .` if changed scope touched architecture boundaries.');
    });
}

module.exports = {
  registerChangedCommand,
};
