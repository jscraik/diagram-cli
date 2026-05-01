const { spawnSync } = require('child_process');
const path = require('path');
const { expect } = require('chai');

describe('json capability discovery', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('emits stable discovery output for JSON-capable commands', () => {
    const result = spawnSync('node', ['scripts/discover-json-capable-commands.js'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(result.status, result.stderr).to.equal(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.schemaVersion).to.equal('1.0');
    expect(payload.commands.map((entry) => entry.command)).to.deep.equal([
      'analyze',
      'changed',
      'context',
      'diff',
      'doctor',
      'explain',
      'generate',
      'generate-all',
      'validate',
      'workflow-pr',
    ]);
  });

  it('passes through the validator script when manifest coverage matches discovery', () => {
    const result = spawnSync('node', ['scripts/validate-machine-contracts.js'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(result.status, result.stderr).to.equal(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).to.equal('pass');
    expect(payload.commandCount).to.equal(10);
  });
});
