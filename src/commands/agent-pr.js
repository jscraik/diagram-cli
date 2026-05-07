const { addScanOptions, runScanCommand } = require('./scan');
const { buildScanEquivalent } = require('./agent');

/**
 * Register the CLI subcommand `agent-pr [path]` on the provided program.
 *
 * The command is configured with scan-related options, requires the `--base <ref>` option
 * (exits the process with code `2` if missing), defaults `head` to `'HEAD'` when not provided,
 * and delegates execution to the scanning workflow via `runScanCommand` using a
 * `scanEquivalent` for the `agent-pr` context.
 *
 * @param {object} program - Commander-style program instance on which to register the command.
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
