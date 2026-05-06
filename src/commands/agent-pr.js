const { addScanOptions, runScanCommand } = require('./scan');
const { buildScanEquivalent } = require('./agent');

function registerAgentPrCommand(program) {
  addScanOptions(program
    .command('agent-pr [path]')
    .description('Generate PR architecture evidence for an AI coding agent'))
    .action(async (targetPath, rawOptions) => {
      if (!rawOptions.base) {
        console.error('agent-pr requires --base <ref>.');
        process.exit(2);
      }
      const options = {
        ...rawOptions,
        head: rawOptions.head || 'HEAD',
      };
      await runScanCommand(program, targetPath, options, {
        commandName: 'agent-pr',
        delegatedCommand: 'scan',
        scanEquivalent: buildScanEquivalent('agent-pr', targetPath, options),
      });
    });
}

module.exports = {
  registerAgentPrCommand,
};
