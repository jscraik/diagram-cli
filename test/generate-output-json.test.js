const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');

describe('generate command machine output', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const outputPath = path.join(repoRoot, '.diagram', 'test-generate-output-json.mmd');

  afterEach(() => {
    fs.rmSync(outputPath, { force: true });
  });

  it('emits JSON envelope when --output and --format json are both set', () => {
    const result = spawnSync(
      'node',
      [
        'src/diagram.js',
        'generate',
        '.',
        '--type',
        'architecture',
        '--output',
        outputPath,
        '--format',
        'json',
        '--quiet',
        '--deterministic',
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      }
    );

    const failureOutput = `stdout: ${result.stdout}\nstderr: ${result.stderr}`;
    expect(result.status, failureOutput).to.equal(0);
    const payload = JSON.parse(result.stdout.trim());
    expect(payload.command).to.equal('generate');
    expect(payload.data.artifacts.outputPath).to.equal(outputPath);
    expect(fs.existsSync(outputPath)).to.equal(true);
  });
});
