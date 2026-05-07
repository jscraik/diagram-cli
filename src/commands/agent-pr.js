const { addScanOptions, runScanCommand } = require('./scan');
const { buildScanEquivalent } = require('./agent');

/**
 * Register the CLI subcommand `agent-pr [path]` on the given Commander program.
 *
 * The command is configured with scan-related options, requires `--base <ref>` (prints an error
 * and exits the process with code `2` if omitted), and defaults `head` to `'HEAD'` when not provided.
 * When invoked it delegates execution to the project's scan workflow with metadata identifying the
 * command as `agent-pr`.
 *
 * @param {object} program - Commander-style program instance to register the subcommand on.
 */
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
