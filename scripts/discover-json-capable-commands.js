#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function normalizeCommandName(rawName) {
  return String(rawName || '').trim().replace(/\s+/g, '-');
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function discoverCommandModules() {
  const commandDir = path.join(repoRoot, 'src', 'commands');
  return fs.readdirSync(commandDir)
    .filter((entry) => entry.endsWith('.js'))
    .map((entry) => `src/commands/${entry}`);
}

/**
 * Extracts a command entry from a command module file if the command supports JSON output.
 *
 * Reads the module source at the given relative path, looks for the first `.command("...")` or `.command('...')`
 * declaration and, if the module indicates JSON-capable output (and does not explicitly ignore format), returns
 * an object describing the command. Returns `null` when no command is found or the module is not considered JSON-capable.
 *
 * @param {string} relativePath - Path to the module file relative to the repository root (e.g. "src/commands/foo.js").
 * @returns {{command: string, module: string} | null} An object with `command` (normalized first token of the command string)
 * and `module` (the provided `relativePath`), or `null` if no suitable JSON-capable command is discovered.
 */
function discoverFromCommandModule(relativePath) {
  const source = read(relativePath);
  const commandMatch = source.match(/\.command\((['"])(.*?)\1/);
  if (!commandMatch) return null;
  const supportsJson = source.includes('Output format (text, json)')
    || source.includes('addScanOptions(')
    || source.includes('Output format: console, json');
  const ignoresFormat = source.includes('Output format (ignored');
  if (!supportsJson || ignoresFormat) return null;
  return {
    command: normalizeCommandName(commandMatch[2].split(/\s+/)[0]),
    module: relativePath,
  };
}

function discoverJsonCapableCommands() {
  const commands = discoverCommandModules()
    .map(discoverFromCommandModule)
    .filter(Boolean);

  const workflowPrPath = 'src/workflow/pr-command.js';
  const workflowPrSource = exists(workflowPrPath) ? read(workflowPrPath) : '';
  if (
    /\.command\((['"])pr \[path\]\1/.test(workflowPrSource)
    && workflowPrSource.includes('Output format (text, json)')
  ) {
    commands.push({
      command: 'workflow-pr',
      cli: 'workflow pr',
      module: workflowPrPath,
    });
  }

  return commands.sort((a, b) => a.command.localeCompare(b.command));
}

if (require.main === module) {
  const payload = {
    schemaVersion: '1.0',
    commands: discoverJsonCapableCommands(),
  };
  console.log(JSON.stringify(payload, null, 2));
}

module.exports = {
  discoverJsonCapableCommands,
};
