const { expect } = require('chai');
const manifest = require('../.diagram/contracts/machine-command-coverage.json');
const { discoverJsonCapableCommands } = require('../scripts/discover-json-capable-commands');
const { validateManifest } = require('../scripts/validate-machine-contracts');

describe('machine command coverage manifest', () => {
  it('matches independently discovered JSON-capable commands', () => {
    const discovered = discoverJsonCapableCommands().map((entry) => entry.command).sort();
    const listed = manifest.commands.map((entry) => entry.command).sort();
    expect(listed).to.deep.equal(discovered);
  });

  it('passes manifest conformance validation', () => {
    const report = validateManifest(manifest);
    expect(report.status).to.equal('pass');
    expect(report.commands).to.deep.equal(manifest.commands.map((entry) => entry.command).sort());
  });

  it('requires every covered command to declare schema and deterministic support', () => {
    for (const entry of manifest.commands) {
      expect(entry.schemaVersion, entry.command).to.equal('1.0');
      expect(entry.deterministic, entry.command).to.equal(true);
    }
  });
});
