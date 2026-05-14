const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');

function createWorkspace(prefix = 'archscope-scan-manifest-') {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'src', 'index.js'), 'module.exports = { ok: true };\n');
  return workspace;
}

function assertNoAbsoluteArtifactPaths(manifest) {
  const paths = [
    manifest.outputDirectory,
    manifest.primaryHumanArtifact,
    manifest.primaryAgentArtifact,
    ...manifest.artifactReadOrder,
    ...manifest.subordinateDirectories,
    ...manifest.artifacts.map((entry) => entry.path),
  ];
  for (const artifactPath of paths) {
    expect(path.isAbsolute(artifactPath), artifactPath).to.equal(false);
  }
}

describe('scan evidence manifest', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('writes manifest.json with non-visual artifact statuses', () => {
    const workspace = createWorkspace();
    try {
      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'scan',
        workspace,
        '--deterministic',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      const manifestPath = path.join(workspace, '.diagram', 'manifest.json');
      expect(fs.existsSync(manifestPath)).to.equal(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      expect(manifest.schemaVersion).to.equal('1.0');
      expect(manifest.command).to.equal('scan');
      expect(manifest.generatedAt).to.equal('1970-01-01T00:00:00.000Z');
      expect(manifest.deterministic).to.equal(true);
      expect(manifest.artifactReadOrder).to.deep.equal([
        '.diagram/manifest.json',
        '.diagram/brief.md',
        '.diagram/agent-context.json',
      ]);
      expect(manifest.primaryHumanArtifact).to.equal('.diagram/report.html');
      expect(manifest.primaryAgentArtifact).to.equal('.diagram/agent-context.json');

      const byId = new Map(manifest.artifacts.map((entry) => [entry.id, entry]));
      expect(byId.get('manifest').status).to.equal('written');
      expect(byId.get('brief').status).to.equal('written');
      expect(byId.get('agent-context').status).to.equal('written');
      expect(byId.get('architecture').status).to.equal('written');
      expect(byId.get('report').status).to.equal('written');
      expect(byId.get('report')).to.not.have.property('reason');
      expect(manifest.warnings).to.deep.equal([]);
      assertNoAbsoluteArtifactPaths(manifest);
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('emits deterministic parser-safe machine output with outcome', () => {
    const workspace = createWorkspace();
    try {
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

      expect(result.status, result.stderr).to.equal(0);
      const payload = JSON.parse(result.stdout.trim());
      expect(payload.schemaVersion).to.equal('1.0');
      expect(payload.command).to.equal('scan');
      expect(payload.status).to.equal('success');
      expect(payload.meta).to.not.have.property('generatedAt');
      expect(payload.data.outcome).to.equal('success');
      expect(payload.data.manifestPath).to.equal('.diagram/manifest.json');
      expect(payload.data.briefPath).to.equal('.diagram/brief.md');
      expect(payload.data.agentContextPath).to.equal('.diagram/agent-context.json');
      expect(payload.data.diagramPath).to.equal('.diagram/architecture.mmd');
      expect(payload.data.reportPath).to.equal('.diagram/report.html');
      expect(payload.data.partial).to.equal(false);
      expect(payload.data.artifacts.map((entry) => entry.id)).to.include.members([
        'manifest',
        'brief',
        'agent-context',
        'architecture',
        'report',
      ]);
      expect(payload.data.evidencePack.primaryHumanArtifact).to.equal('.diagram/report.html');
      expect(payload.data.evidencePack.generatedAt).to.equal('1970-01-01T00:00:00.000Z');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('runs agent as a scan-delegating machine-output wrapper', () => {
    const workspace = createWorkspace();
    try {
      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'agent',
        workspace,
        '--format',
        'json',
        '--deterministic',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      const payload = JSON.parse(result.stdout.trim());
      expect(payload.command).to.equal('agent');
      expect(payload.data.delegatedCommand).to.equal('scan');
      expect(payload.data.scanEquivalent).to.equal(
        `archscope scan ${workspace} --exclude 'node_modules,dist,coverage,artifacts,.git,.diagram' `
        + '--format json --deterministic'
      );
      expect(payload.data.outcome).to.equal('success');
      expect(payload.data.manifestPath).to.equal('.diagram/manifest.json');
      expect(payload.data.agentContextPath).to.equal('.diagram/agent-context.json');
      expect(payload.data.evidencePack.command).to.equal('scan');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('keeps agent scan-equivalent metadata aligned with scan options', () => {
    const workspace = createWorkspace('archscope scan manifest ');
    try {
      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'agent',
        workspace,
        '--output-dir',
        'artifacts/scan',
        '--patterns',
        'src/**/*.js',
        '--exclude',
        'src/generated/**',
        '--max-files',
        '42',
        '--format',
        'json',
        '--deterministic',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      const payload = JSON.parse(result.stdout.trim());
      expect(payload.data.scanEquivalent).to.equal(
        `archscope scan '${workspace}' --output-dir artifacts/scan `
        + "--patterns 'src/**/*.js' --exclude 'src/generated/**' --max-files 42 "
        + '--format json --deterministic'
      );
      expect(payload.data.manifestPath).to.equal('artifacts/scan/manifest.json');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('includes .diagramrc scan scope in agent scan-equivalent metadata', () => {
    const workspace = createWorkspace('archscope scan manifest ');
    try {
      fs.writeFileSync(path.join(workspace, '.diagramrc'), JSON.stringify({
        patterns: 'src/**/*.js',
        exclude: 'src/generated/**',
        maxFiles: 42,
      }));

      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'agent',
        workspace,
        '--format',
        'json',
        '--deterministic',
      ], {
        cwd: workspace,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      const payload = JSON.parse(result.stdout.trim());
      expect(payload.data.scanEquivalent).to.equal(
        `archscope scan '${workspace}' --patterns 'src/**/*.js' `
        + "--exclude 'src/generated/**' --max-files 42 --format json --deterministic"
      );
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('indexes artifacts relative to a custom output directory', () => {
    const workspace = createWorkspace();
    try {
      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'scan',
        workspace,
        '--output-dir',
        '.',
        '--deterministic',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      const manifestPath = path.join(workspace, 'manifest.json');
      expect(fs.existsSync(manifestPath)).to.equal(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifest.outputDirectory).to.equal('.');
      expect(manifest.artifactReadOrder).to.deep.equal([
        'manifest.json',
        'brief.md',
        'agent-context.json',
      ]);
      expect(manifest.primaryHumanArtifact).to.equal('report.html');
      expect(manifest.primaryAgentArtifact).to.equal('agent-context.json');
      assertNoAbsoluteArtifactPaths(manifest);
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
