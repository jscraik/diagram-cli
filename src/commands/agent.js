const { addScanOptions, runScanCommand } = require('./scan');

/**
 * Convert a value to a shell-safe token suitable for inclusion in a command string.
 *
 * The value is first converted to a string. If the string contains only ASCII
 * alphanumeric characters and the characters _ . / : = @ + -, it is returned
 * unchanged; otherwise it is returned wrapped in single quotes and any
 * embedded single quotes are escaped so the result is safe for POSIX shells.
 *
 * @param {*} value - The value to convert to a shell-safe token.
 * @returns {string} The shell-safe token.
 */
function shellToken(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, "'\\''")}'`;
}

/**
 * Append a flag and its shell-escaped value to an argument array unless the value is empty or matches a supplied default.
 *
 * If `value` is `undefined`, `null` or trims to an empty string, nothing is appended. If `defaultValue` is provided and
 * `String(value) === String(defaultValue)`, nothing is appended. Otherwise the function pushes `flag` and the result of
 * `shellToken(value)` onto `args`.
 *
 * @param {string[]} args - The target array of command-line arguments to which the flag and value will be appended.
 * @param {string} flag - The command-line flag (e.g. '--output-dir') to append before the value.
 * @param {*} value - The value to append; it will be converted to a string and shell-escaped.
 * @param {*} [defaultValue] - Optional default value; if provided and equal to `value` when stringified, the flag is not appended.
 */
function addOptionArg(args, flag, value, defaultValue = undefined) {
  if (value === undefined || value === null || String(value).trim() === '') return;
  if (defaultValue !== undefined && String(value) === String(defaultValue)) return;
  args.push(flag, shellToken(value));
}

/**
 * Build a shell command string that invokes an equivalent `archscope scan` for the given target and options.
 *
 * @param {string} command - The calling command name; influences which scan options are included (e.g. `'agent-pr'` enables `--base`/`--head`).
 * @param {string|undefined} targetPath - Filesystem path to scan; uses `.` when omitted.
 * @param {Object} options - Scan options that are translated into CLI flags.
 * @param {string} [options.outputDir] - Directory for scan output; suppressed if equal to the tool's default.
 * @param {string|string[]} [options.patterns] - File glob patterns to include.
 * @param {string|string[]} [options.exclude] - File or directory patterns to exclude.
 * @param {number} [options.maxFiles] - Limit on files to process.
 * @param {string} [options.analyzer] - Analyzer to use; suppressed if equal to the tool's default.
 * @param {string} [options.base] - Base reference (used when `command` is `'agent-pr'`).
 * @param {string} [options.head] - Head reference (used when `command` is `'agent-pr'`); defaults to `HEAD` when not provided.
 * @param {string} [options.format] - Output format; suppressed if equal to the tool's default.
 * @param {boolean} [options.deterministic] - Include `--deterministic` flag when truthy.
 * @param {boolean} [options.quiet] - Include `--quiet` flag when truthy.
 * @returns {string} The assembled shell-safe `archscope scan` command string.
 */
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

/**
 * Register the `agent` CLI subcommand that generates architecture evidence for an AI coding agent.
 *
 * The command accepts an optional path and delegates execution to the existing scan flow,
 * using a scan-equivalent command string constructed from the provided options.
 *
 * @param {import('commander').Command} program - The CLI program instance to attach the subcommand to.
 */
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
