#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');
const { loadDiagramRc } = require('./config/diagramrc');
const { registerAnalyzeCommand } = require('./commands/analyze');
const { registerGenerateCommand } = require('./commands/generate');
const { registerGenerateAllCommand } = require('./commands/generate-all');
const { registerValidateCommand } = require('./commands/validate');
const { registerDiffCommand } = require('./commands/diff');
const { registerGenerateVideoCommand } = require('./commands/generate-video');
const { registerGenerateAnimatedCommand } = require('./commands/generate-animated');
const { registerDoctorCommand } = require('./commands/doctor');
const { registerChangedCommand } = require('./commands/changed');
const { registerContextCommand } = require('./commands/context');
const { registerExplainCommand } = require('./commands/explain');
const { registerInitCommand } = require('./commands/init');
const { registerWorkflowPrCommand } = require('./commands/workflow-pr');
const {
  escapeHtml,
  groupChangePaths,
  buildRiskNarrative,
  buildSummaryMeta,
  generateHtmlExplainer,
} = require('./workflow/pr-impact');

const program = new Command();

program
  .name('diagram')
  .description('Generate architecture diagrams from code')
  .version(packageJson.version);

registerAnalyzeCommand(program);
registerGenerateCommand(program);
registerGenerateAllCommand(program);
registerValidateCommand(program);
registerDiffCommand(program);
registerGenerateVideoCommand(program);
registerGenerateAnimatedCommand(program);
registerDoctorCommand(program);
registerChangedCommand(program);
registerContextCommand(program);
registerExplainCommand(program);
registerInitCommand(program);
registerWorkflowPrCommand(program);

program.on('command:*', function (operands) {
  console.error(chalk.red(`\n🤖 AI Agent Error: Unknown command '${operands[0]}'\n`));
  console.error(chalk.white('Use the canonical command set:\n'));
  console.error(chalk.cyan('  diagram init [path]') + chalk.gray('            - Scaffold .architecture.yml, .diagramrc, and CI sample step'));
  console.error(chalk.cyan('  diagram doctor [path]') + chalk.gray('          - Check local tooling and environment health'));
  console.error(chalk.cyan('  diagram analyze [path]') + chalk.gray('         - Analyze codebase structure'));
  console.error(chalk.cyan('  diagram generate [path]') + chalk.gray('        - Generate one diagram type'));
  console.error(chalk.cyan('  diagram generate-all [path]') + chalk.gray('    - Generate all diagram types'));
  console.error(chalk.cyan('  diagram changed [path]') + chalk.gray('         - Analyze only git-changed files'));
  console.error(chalk.cyan('  diagram context [path]') + chalk.gray('         - Refresh AI context pack artifacts'));
  console.error(chalk.cyan('  diagram explain <component> [path]') + chalk.gray(' - Explain a local dependency neighborhood'));
  console.error(chalk.cyan('  diagram validate [path]') + chalk.gray('        - Validate architecture against .architecture.yml'));
  console.error(chalk.cyan('  diagram workflow pr [path]') + chalk.gray('     - Compute PR blast-radius and risk score'));
  console.error(chalk.cyan('  diagram diff <base> <head>') + chalk.gray('     - Compare architecture snapshots'));
  console.error(chalk.cyan('  diagram generate-video [path]') + chalk.gray('  - Generate animated video output'));
  console.error(chalk.cyan('  diagram generate-animated [path]') + chalk.gray(' - Generate animated SVG output\n'));
  console.error(chalk.white(`Use ${chalk.cyan('diagram --help')} for full option details.`));
  console.error(chalk.white(`Use ${chalk.cyan('--format json')} instead of ${chalk.cyan('--json')} for machine output.`));
  process.exit(1);
});

function findActiveCommand(argv) {
  const flagsWithValue = new Set();
  const stack = [program];
  while (stack.length > 0) {
    const command = stack.pop();
    for (const option of command.options || []) {
      const expectsValue = Boolean(option.required || option.optional || option.variadic);
      if (!expectsValue) continue;
      if (option.short) flagsWithValue.add(option.short);
      if (option.long) flagsWithValue.add(option.long);
    }
    for (const subcommand of command.commands || []) {
      stack.push(subcommand);
    }
  }

  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (current.startsWith('-')) continue;
    const prev = argv[i - 1];
    if (!flagsWithValue.has(prev)) {
      return current;
    }
  }
  return null;
}

function resolveAliasArgs(argv) {
  const resolvedArgs = [];
  let commandFound = false;
  const activeCommand = findActiveCommand(argv);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--json' || arg === '-j') {
      console.error(chalk.yellow(`🤖 Note for AI Agent: '${arg}' is deprecated. Using '--format json' automatically.`));
      resolvedArgs.push('--format', 'json');
      continue;
    }

    if (arg === '-o' && activeCommand === 'generate-all') {
      console.error(chalk.yellow(`🤖 Note for AI Agent: '-o' for generate-all is now '-O'. Continuing with '-O'.`));
      resolvedArgs.push('-O');
      continue;
    }

    if (!commandFound && i >= 2 && arg === activeCommand) {
      if (arg === 'test') {
        console.error(chalk.yellow(`🤖 Note for AI Agent: 'test' was renamed to 'validate'. Continuing execution...`));
        resolvedArgs.push('validate');
        commandFound = true;
        continue;
      }
      if (arg === 'all') {
        console.error(chalk.yellow(`🤖 Note for AI Agent: 'all' was renamed to 'generate-all'. Continuing execution...`));
        resolvedArgs.push('generate-all');
        commandFound = true;
        continue;
      }
      if (arg === 'video') {
        console.error(chalk.yellow(`🤖 Note for AI Agent: 'video' was renamed to 'generate-video'. Continuing execution...`));
        resolvedArgs.push('generate-video');
        commandFound = true;
        continue;
      }
      if (arg === 'animate') {
        console.error(chalk.yellow(`🤖 Note for AI Agent: 'animate' was renamed to 'generate-animated'. Continuing execution...`));
        resolvedArgs.push('generate-animated');
        commandFound = true;
        continue;
      }
      commandFound = true;
    }

    resolvedArgs.push(arg);
  }

  return resolvedArgs;
}

if (require.main === module) {
  const diagramRc = loadDiagramRc(process.cwd());
  program._diagramRc = diagramRc;
  const resolvedArgs = resolveAliasArgs(process.argv);
  program.parse(resolvedArgs);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateHtmlExplainer,
    groupChangePaths,
    buildRiskNarrative,
    buildSummaryMeta,
    escapeHtml,
  };
}