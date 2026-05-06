const { addScanOptions, runScanCommand } = require('./scan');

function shellToken(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, "'\\''")}'`;
}

function addOptionArg(args, flag, value, defaultValue = undefined) {
  if (value === undefined || value === null || String(value).trim() === '') return;
  if (defaultValue !== undefined && String(value) === String(defaultValue)) return;
  args.push(flag, shellToken(value));
}

function buildScanEquivalent(command, targetPath, options) {
  const args = ['archscope', 'scan', shellToken(targetPath || '.')];
  addOptionArg(args, '--output-dir', options.outputDir, '.diagram');
  addOptionArg(args, '--patterns', options.patterns);
  addOptionArg(args, '--exclude', options.exclude);
  addOptionArg(args, '--max-files', options.maxFiles);
  addOptionArg(args, '--analyzer', options.analyzer, 'default');
  if (command === 'agent-pr') {
    addOptionArg(args, '--base', options.base);
    addOptionArg(args, '--head', options.head || 'HEAD');
  }
  addOptionArg(args, '--format', options.format, 'text');
  if (options.deterministic) args.push('--deterministic');
  if (options.quiet) args.push('--quiet');
  return args.join(' ');
}

function registerAgentCommand(program) {
  addScanOptions(program
    .command('agent [path]')
    .description('Generate architecture evidence for an AI coding agent'))
    .action(async (targetPath, rawOptions) => {
      await runScanCommand(program, targetPath, rawOptions, {
        commandName: 'agent',
        delegatedCommand: 'scan',
        scanEquivalent: buildScanEquivalent('agent', targetPath, rawOptions),
      });
    });
}

module.exports = {
  buildScanEquivalent,
  registerAgentCommand,
};
