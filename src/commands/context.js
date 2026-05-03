const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const chalk = require('chalk');
const { resolveRootPathOrExit } = require('./shared');
const { buildMachineEnvelope } = require('./output');

/**
 * Register the `context [path]` CLI subcommand that refreshes AI-focused context pack artifacts under `.diagram/context`.
 *
 * The command accepts flags `--force`, `--dry-run`, `--check`, `--quiet`, `--format <type>` (text|json, default `text`) and
 * `--deterministic`. In `text` mode it streams script output and prints a success or failure message; in `json` mode
 * it emits a structured machine envelope containing execution results and parsed `.diagram/context/diagram-context.meta.json`.
 *
 * The process exits with the executed script's status code on completion. If the refresh script is missing it exits
 * with code `2`; on other failures it exits with the script's exit code or `1` as a fallback.
 *
 * @param {import('commander').Command} program - Commander program instance to register the command on.
 */
function registerContextCommand(program) {
  program
    .command('context [path]')
    .description('Refresh AI-focused context pack artifacts under .diagram/context')
    .option('--force', 'Force refresh even during cooldown', false)
    .option('--dry-run', 'Preview actions without generating files', false)
    .option('--check', 'Fail if context artifacts are stale without rewriting files', false)
    .option('--quiet', 'Suppress script logs', false)
    .option('--format <type>', 'Output format (text, json)', 'text')
    .option('--deterministic', 'Use deterministic machine output', false)
    .action((targetPath, options) => {
      const root = resolveRootPathOrExit(targetPath);
      const scriptPath = path.join(root, 'scripts', 'refresh-diagram-context.sh');
      if (!fs.existsSync(scriptPath)) {
        console.error(chalk.red('❌ Missing script:'), scriptPath);
        console.error(chalk.gray('Fix: ensure repository scripts are intact and rerun.'));
        process.exit(2);
      }

      const args = [];
      if (options.force) args.push('--force');
      if (options.dryRun) args.push('--dry-run');
      if (options.check) args.push('--check');
      if (options.quiet) args.push('--quiet');

      const run = spawnSync('bash', [scriptPath, ...args], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const stdout = run.stdout || '';
      const stderr = run.stderr || '';
      const formatStr = (options.format || 'text').toLowerCase();
      const metaPath = path.join(root, '.diagram', 'context', 'diagram-context.meta.json');
      let contextMeta = null;
      if (fs.existsSync(metaPath)) {
        try {
          contextMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch (_error) {
          // Keep null on parse failures.
        }
      }

      if (formatStr === 'json') {
        const payload = buildMachineEnvelope({
          schemaVersion: '1.0',
          command: 'context',
          rootPath: root,
          deterministic: Boolean(options.deterministic),
          status: run.status === 0 ? 'success' : 'failure',
          data: {
            exitCode: run.status,
            stdout,
            stderr,
            contextMeta,
          },
          errors: run.status === 0 ? [] : [{ message: stderr || `context refresh failed with code ${run.status}` }],
          agentSummary: {
            changedComponents: 0,
            riskReasons: run.status === 0 ? [] : ['context_refresh_failed'],
            suggestedReviewerChecks: [
              'Verify `.diagram/context/diagram-context.md` is refreshed in CI artifacts.',
              'Review omitted types in context metadata when compaction is applied.',
            ],
          },
        });
        console.log(JSON.stringify(payload, null, 2));
        process.exit(run.status || 0);
      }

      if (stdout.trim()) process.stdout.write(stdout);
      if (stderr.trim()) process.stderr.write(stderr);
      if (run.status !== 0) {
        console.error(chalk.red(`❌ Context refresh failed with code ${run.status}`));
        process.exit(run.status || 1);
      }
      console.log(chalk.green('✅ Context pack refreshed.'));
      console.log(chalk.cyan('\nNext steps:'));
      console.log('  1) Attach `.diagram/context/diagram-context.md` to AI review workflows.');
      console.log('  2) Run `archscope generate-all . --artifact-profile agent` if source graph changed significantly.');
    });
}

module.exports = {
  registerContextCommand,
};
