const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');

describe('init command identity', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('generates Archscope-first CI and next-step guidance', () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'archscope-init-'));

    try {
      const result = spawnSync('node', ['src/diagram.js', 'init', workspace], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      expect(result.stdout).to.include('archscope init complete');
      expect(result.stdout).to.include('Run `archscope validate .`');
      expect(result.stdout).to.not.include('diagram init complete');
      expect(result.stdout).to.not.include('Run `diagram validate .`');

      const ciSample = fs.readFileSync(
        path.join(workspace, '.diagram', 'ci', 'github-actions-step.yml'),
        'utf8'
      );
      expect(ciSample).to.include('Sample GitHub Actions steps for Archscope');
      expect(ciSample).to.include('Install Archscope CLI');
      expect(ciSample).to.include('npm install --no-save @brainwav/diagram');
      expect(ciSample).to.include('npx --no-install archscope validate .');
      expect(ciSample).to.include('npx --no-install archscope generate-all . --output-dir .diagram --artifact-profile agent');
      expect(ciSample).to.include('npx --no-install archscope context .');
      expect(ciSample).to.not.include('npx --no-install diagram ');
      expect(ciSample).to.not.include('diagram-cli');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
