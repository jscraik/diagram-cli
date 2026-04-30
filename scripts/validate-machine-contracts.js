#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { discoverJsonCapableCommands } = require('./discover-json-capable-commands');

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, '.diagram', 'contracts', 'machine-command-coverage.json');

function fail(message) {
  console.error(`machine-contract validation failed: ${message}`);
  process.exit(1);
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail(`could not read ${path.relative(repoRoot, manifestPath)}: ${error.message}`);
  }
}

function byCommand(entries) {
  return new Map(entries.map((entry) => [entry.command, entry]));
}

function validateManifest(manifest) {
  if (manifest.schemaVersion !== '1.0') {
    fail('manifest schemaVersion must be 1.0');
  }
  if (!Array.isArray(manifest.commands) || manifest.commands.length === 0) {
    fail('manifest commands must be a non-empty array');
  }

  const discovered = discoverJsonCapableCommands();
  const manifestByCommand = byCommand(manifest.commands);
  const discoveredByCommand = byCommand(discovered);

  for (const command of discoveredByCommand.keys()) {
    if (!manifestByCommand.has(command)) {
      fail(`manifest missing discovered JSON-capable command: ${command}`);
    }
  }

  for (const command of manifestByCommand.keys()) {
    if (!discoveredByCommand.has(command)) {
      fail(`manifest lists command without discovered JSON capability: ${command}`);
    }
  }

  for (const entry of manifest.commands) {
    if (entry.schemaVersion !== '1.0') {
      fail(`${entry.command} must declare schemaVersion 1.0`);
    }
    if (entry.deterministic !== true) {
      fail(`${entry.command} must declare deterministic support`);
    }
    const discoveredEntry = discoveredByCommand.get(entry.command);
    if (entry.module !== discoveredEntry.module) {
      fail(`${entry.command} module mismatch: manifest=${entry.module} discovered=${discoveredEntry.module}`);
    }
    if (discoveredEntry.cli && entry.cli !== discoveredEntry.cli) {
      fail(`${entry.command} cli mismatch: manifest=${entry.cli} discovered=${discoveredEntry.cli}`);
    }
  }

  return {
    schemaVersion: '1.0',
    status: 'pass',
    commandCount: manifest.commands.length,
    commands: manifest.commands.map((entry) => entry.command).sort(),
  };
}

if (require.main === module) {
  const report = validateManifest(readManifest());
  console.log(JSON.stringify(report, null, 2));
}

module.exports = {
  validateManifest,
};
