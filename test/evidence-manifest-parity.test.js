const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');

function createWorkspace(prefix = 'archscope-manifest-parity-') {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'src', 'index.js'), 'module.exports = { ok: true };\n');
  return workspace;
}

describe('evidence manifest parity', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('preserves generate-all manifest semantics through the shared writer', () => {
    const workspace = createWorkspace();
    const outputDir = path.join(workspace, '.diagram');
    try {
      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'generate-all',
        workspace,
        '--output-dir',
        outputDir,
        '--artifact-profile',
        'agent',
        '--format',
        'json',
        '--quiet',
        '--deterministic',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      const payload = JSON.parse(result.stdout.trim());
      const manifest = payload.data.manifest;
      const manifestFromDisk = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'manifest.json'), 'utf8')
      );

      expect(manifestFromDisk).to.deep.equal(manifest);
      expect(manifest.generatedAt).to.equal('1970-01-01T00:00:00.000Z');
      expect(manifest.schemaVersion).to.equal('1.0');
      expect(manifest.rootPath).to.equal(workspace);
      expect(manifest.diagramDir).to.equal('.diagram');
      expect(manifest.compaction.profile).to.equal('agent');
      expect(manifest.diagrams.map((entry) => entry.type)).to.deep.equal(
        [...manifest.diagrams.map((entry) => entry.type)].sort()
      );
      expect(manifest.diagrams.find((entry) => entry.type === 'architecture')).to.exist;
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
