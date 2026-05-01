#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const packageJson = require('../package.json');
const { loadDiagramRc } = require('./config/diagramrc');
const { registerAnalyzeCommand } = require('./commands/analyze');
const { registerGenerateCommand } = require('./commands/generate');
const { registerGenerateAllCommand } = require('./commands/generate-all');
const { registerScanCommand } = require('./commands/scan');
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

const CANONICAL_COMMAND_NAME = 'archscope';
const COMPATIBILITY_COMMAND_NAME = 'diagram';
const COMPATIBILITY_NOTICE =
  `Compatibility notice: '${COMPATIBILITY_COMMAND_NAME}' remains supported during migration. Use '${CANONICAL_COMMAND_NAME}' for canonical usage.`;

const program = new Command();

program
  .name(CANONICAL_COMMAND_NAME)
  .description('Inspect architecture, governance, and diagram workflows from code')
  .version(packageJson.version);

registerAnalyzeCommand(program);
registerGenerateCommand(program);
registerGenerateAllCommand(program);
registerScanCommand(program);
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
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} init [path]`) + chalk.gray('            - Scaffold .architecture.yml, .diagramrc, and CI sample step'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} doctor [path]`) + chalk.gray('          - Check local tooling and environment health'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} analyze [path]`) + chalk.gray('         - Analyze codebase structure'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} scan [path]`) + chalk.gray('            - Initialize architecture evidence pack manifest'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} generate [path]`) + chalk.gray('        - Generate one diagram type'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} generate-all [path]`) + chalk.gray('    - Generate all diagram types'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} changed [path]`) + chalk.gray('         - Analyze only git-changed files'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} context [path]`) + chalk.gray('         - Refresh AI context pack artifacts'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} explain <component> [path]`) + chalk.gray(' - Explain a local dependency neighborhood'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} validate [path]`) + chalk.gray('        - Validate architecture against .architecture.yml'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} workflow pr [path]`) + chalk.gray('     - Compute PR blast-radius and risk score'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} diff <base> <head>`) + chalk.gray('     - Compare architecture snapshots'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} generate-video [path]`) + chalk.gray('  - Generate animated video output'));
  console.error(chalk.cyan(`  ${CANONICAL_COMMAND_NAME} generate-animated [path]`) + chalk.gray(' - Generate animated SVG output\n'));
  console.error(chalk.white(`Use ${chalk.cyan(`${CANONICAL_COMMAND_NAME} --help`)} for full option details.`));
  console.error(chalk.white(`Use ${chalk.cyan('--format json')} instead of ${chalk.cyan('--json')} for machine output.`));
  process.exit(1);
});

function getInvocationName(argv, env = process.env) {
  const candidates = [
    argv[1],
    env._,
    env.npm_lifecycle_script,
    argv[0],
  ];
  for (const candidate of candidates) {
    const name = path.basename(String(candidate || '').trim());
    if (name && name !== 'node' && name !== 'diagram.js') {
      return name;
    }
  }
  return path.basename(argv[1] || '');
}

function isCompatibilityInvocation(argv, env = process.env) {
  return getInvocationName(argv, env) === COMPATIBILITY_COMMAND_NAME;
}

function emitCompatibilityInvocationNotice(argv, env = process.env) {
  if (isCompatibilityInvocation(argv, env)) {
    console.error(chalk.yellow(COMPATIBILITY_NOTICE));
  }
}

/**
 * Determine which top-level subcommand name is active from a CLI argument list.
 *
 * Scans the provided `argv` (typically `process.argv`) and returns the first token
 * that represents a top-level command — i.e. the first non-flag token that is not
 * the value for an option that expects a value. Returns `null` if no such token is found.
 *
 * @param {string[]} argv - The complete argument vector (e.g. `process.argv`).
 * @returns {string|null} The active top-level subcommand name, or `null` if none is present.
 */
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

/**
 * Rewrite deprecated flags and command aliases in a CLI argument vector to their current canonical forms.
 *
 * Logs short deprecation notes to stderr for any rewritten tokens and returns a new argv array with replacements applied.
 *
 * @param {string[]} argv - The original process-style argument array (e.g. process.argv).
 * @returns {string[]} The rewritten argument array with deprecated flags and command aliases replaced.
 */
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
  program.diagramContext = { diagramRc };
  const resolvedArgs = resolveAliasArgs(process.argv);
  emitCompatibilityInvocationNotice(process.argv);
  program.parse(resolvedArgs);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CANONICAL_COMMAND_NAME,
    COMPATIBILITY_COMMAND_NAME,
    COMPATIBILITY_NOTICE,
    generateHtmlExplainer,
    getInvocationName,
    groupChangePaths,
    buildRiskNarrative,
    buildSummaryMeta,
    escapeHtml,
    isCompatibilityInvocation,
  };
}
