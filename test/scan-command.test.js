const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');

function createWorkspace(prefix = 'archscope-scan-command-') {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'src', 'index.js'), 'module.exports = { ok: true };\n');
  return workspace;
}

describe('scan command', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('is listed in help with P0 options', () => {
    const result = spawnSync('node', ['src/diagram.js', 'scan', '--help'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(result.status, result.stderr).to.equal(0);
    expect(result.stdout).to.include('Usage: archscope scan [options] [path]');
    expect(result.stdout).to.include('--output-dir <dir>');
    expect(result.stdout).to.include('--format <type>');
    expect(result.stdout).to.include('--deterministic');
    expect(result.stdout).to.include('--base <ref>');
    expect(result.stdout).to.include('--head <ref>');
  });

  it('prints a concise next-step summary in text mode', () => {
    const workspace = createWorkspace();
    try {
      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'scan',
        workspace,
        '--quiet',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      expect(result.stdout).to.include('Manifest: .diagram/manifest.json');
      expect(result.stdout).to.include('Human artifact: .diagram/report.html');
      expect(result.stdout).to.include('Agent artifact: .diagram/agent-context.json');
      expect(result.stdout).to.include('Next action:');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
