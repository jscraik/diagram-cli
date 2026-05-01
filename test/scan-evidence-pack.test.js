const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');

function createWorkspace(prefix = 'archscope-scan-pack-') {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(workspace, 'src', 'services'), { recursive: true });
  fs.writeFileSync(
    path.join(workspace, 'src', 'index.js'),
    "const service = require('./services/service');\nservice.run();\n"
  );
  fs.writeFileSync(
    path.join(workspace, 'src', 'services', 'service.js'),
    'exports.run = () => "ok";\n'
  );
  return workspace;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function allArtifactPaths(manifest) {
  return [
    manifest.outputDirectory,
    manifest.primaryHumanArtifact,
    manifest.primaryAgentArtifact,
    ...manifest.artifactReadOrder,
    ...manifest.subordinateDirectories,
    ...manifest.artifacts.map((entry) => entry.path),
  ];
}

describe('scan evidence pack writers', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('writes the non-visual evidence pack for a minimal repo', () => {
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
      for (const fileName of [
        'manifest.json',
        'brief.md',
        'agent-context.json',
        'architecture.mmd',
        'report.html',
      ]) {
        expect(fs.existsSync(path.join(workspace, '.diagram', fileName)), fileName).to.equal(true);
      }

      const manifest = readJson(path.join(workspace, '.diagram', 'manifest.json'));
      const statuses = Object.fromEntries(manifest.artifacts.map((entry) => [entry.id, entry.status]));
      expect(statuses).to.include({
        manifest: 'written',
        brief: 'written',
        'agent-context': 'written',
        architecture: 'written',
        report: 'written',
      });
      expect(manifest.primaryHumanArtifact).to.equal('.diagram/report.html');
      expect(manifest.primaryAgentArtifact).to.equal('.diagram/agent-context.json');
      for (const artifactPath of allArtifactPaths(manifest)) {
        expect(path.isAbsolute(artifactPath), artifactPath).to.equal(false);
      }

      const brief = fs.readFileSync(path.join(workspace, '.diagram', 'brief.md'), 'utf8');
      expect(brief).to.include('# Archscope Evidence Brief');
      expect(brief).to.include('## Artifact Read Order');
      expect(brief).to.include('## Agent Handoff');
      expect(brief.trimEnd().split(/\r?\n/).length).to.be.lessThan(60);

      const agentContext = readJson(path.join(workspace, '.diagram', 'agent-context.json'));
      expect(agentContext.schemaVersion).to.equal('1.0');
      expect(agentContext.generatedBy).to.equal('archscope scan');
      expect(agentContext.mode).to.equal('repository');
      expect(agentContext.partial).to.equal(false);
      expect(agentContext.readOrder).to.deep.equal(manifest.artifactReadOrder);

      const report = fs.readFileSync(path.join(workspace, '.diagram', 'report.html'), 'utf8');
      expect(report).to.include('<h1>Archscope Evidence Report</h1>');
      expect(report).to.include('Architecture Components');
      expect(report).to.include('Agent Handoff');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
