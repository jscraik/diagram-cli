const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');

function createWorkspace() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'archscope-scan-error-'));
  fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'src', 'index.js'), 'module.exports = 1;\n');
  return workspace;
}

describe('scan error categories', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('records partial output with a stable writer error category', () => {
    const workspace = createWorkspace();
    try {
      fs.mkdirSync(path.join(workspace, '.diagram', 'agent-context.json'), { recursive: true });
      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'scan',
        workspace,
        '--format',
        'json',
        '--deterministic',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stdout).to.equal(1);
      const payload = JSON.parse(result.stdout.trim());
      expect(payload.status).to.equal('partial');
      expect(payload.data.outcome).to.equal('partial');
      expect(payload.errors[0].artifact).to.equal('agent-context');
      expect(payload.errors[0].category).to.equal('artifact_write_failed');
      expect(payload.errors[0].message).to.be.a('string').and.not.equal('');

      const manifest = JSON.parse(fs.readFileSync(
        path.join(workspace, '.diagram', 'manifest.json'),
        'utf8'
      ));
      const agentEntry = manifest.artifacts.find((entry) => entry.id === 'agent-context');
      expect(agentEntry.status).to.equal('failed');
      expect(agentEntry.errorCategory).to.equal('artifact_write_failed');
      expect(fs.existsSync(path.join(workspace, '.diagram', 'brief.md'))).to.equal(true);
      expect(fs.existsSync(path.join(workspace, '.diagram', 'architecture.mmd'))).to.equal(true);
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('does not point agents at a manifest when manifest writing fails', () => {
    const workspace = createWorkspace();
    try {
      fs.mkdirSync(path.join(workspace, '.diagram', 'manifest.json'), { recursive: true });
      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'scan',
        workspace,
        '--format',
        'json',
        '--deterministic',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stdout).to.equal(1);
      const payload = JSON.parse(result.stdout.trim());
      expect(payload.status).to.equal('partial');
      expect(payload.data.outcome).to.equal('partial');
      expect(payload.data.manifestPath).to.equal(null);
      expect(payload.agentSummary.suggestedReviewerChecks).to.include(
        'Inspect scan errors before consuming evidence artifacts.'
      );
      expect(payload.errors[0].artifact).to.equal('manifest');
      expect(payload.errors[0].category).to.equal('artifact_write_failed');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('prints remediation guidance instead of manifest read guidance when manifest writing fails', () => {
    const workspace = createWorkspace();
    try {
      fs.mkdirSync(path.join(workspace, '.diagram', 'manifest.json'), { recursive: true });
      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'scan',
        workspace,
        '--quiet',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(1);
      expect(result.stdout).to.include('Pack status: partial');
      expect(result.stdout).to.include('Manifest: not written');
      expect(result.stdout).to.include(
        'Manifest was not written; inspect the reported errors before consuming evidence artifacts.'
      );
      expect(result.stdout).to.not.include('Read .diagram/manifest.json');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
