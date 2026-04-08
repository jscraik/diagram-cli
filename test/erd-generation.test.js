const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');
const {
  SUPPORTED_DIAGRAM_TYPES,
  generate,
  generateErdArtifact,
} = require('../src/core/analysis-generation');

const CLI_PATH = path.join(__dirname, '..', 'src', 'diagram.js');

function fixturePath(name) {
  return path.join(__dirname, 'fixtures', 'erd', name);
}

function runCli(args, cwd) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function prepareWorkspaceFromFixture(name) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `diagram-erd-${name}-`));
  fs.cpSync(fixturePath(name), workspace, { recursive: true });
  return workspace;
}

describe('erd generation integration', () => {
  it('includes erd in supported diagram types', () => {
    expect(SUPPORTED_DIAGRAM_TYPES).to.include('erd');
  });

  it('keeps existing database placeholder behavior unchanged', () => {
    const database = generate({ components: [] }, 'database');
    expect(database).to.equal('flowchart TD\n  Note["No database-focused components found"]');
  });

  it('emits publishable ERD output from explicit schema evidence', () => {
    const artifact = generateErdArtifact({ rootPath: fixturePath('explicit-schema') });

    expect(artifact.meta.outcome).to.equal('publishable');
    expect(artifact.meta.terminalClass).to.equal('completed');
    expect(artifact.meta.provenanceCounts.explicit).to.be.greaterThan(0);
    expect(artifact.mermaid).to.include('erDiagram');
    expect(artifact.mermaid).to.include('TICKET');
    expect(artifact.mermaid).to.include('explicit');
  });

  it('emits marker output when inferred relationship share is in warning band', () => {
    const artifact = generateErdArtifact({ rootPath: fixturePath('marker-heavy') });

    expect(artifact.meta.outcome).to.equal('publishable_with_marker');
    expect(artifact.meta.markerRequired).to.equal(true);
    expect(artifact.meta.shouldFail).to.equal(false);
    expect(artifact.mermaid).to.include('%% low-confidence');
  });

  it('fails generate-all without success manifest when ERD confidence is hard-fail', () => {
    const workspace = prepareWorkspaceFromFixture('no-schema');
    const outDir = path.join(workspace, 'out');
    const run = runCli(['generate-all', '.', '-O', 'out'], workspace);

    expect(run.status).to.equal(1);
    expect(fs.existsSync(path.join(outDir, 'manifest.json'))).to.equal(false);
  });

  it('removes stale manifest and diagram files when ERD hard-fail occurs', () => {
    const workspace = prepareWorkspaceFromFixture('explicit-schema');
    const outDir = path.join(workspace, 'out');
    const success = runCli(['generate-all', '.', '-O', 'out'], workspace);

    expect(success.status).to.equal(0);
    expect(fs.existsSync(path.join(outDir, 'manifest.json'))).to.equal(true);
    expect(fs.existsSync(path.join(outDir, 'architecture.mmd'))).to.equal(true);

    fs.rmSync(path.join(workspace, 'prisma'), { recursive: true, force: true });
    fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
    fs.writeFileSync(path.join(workspace, 'src', 'index.js'), 'module.exports = () => "ok";\n');

    const failure = runCli(['generate-all', '.', '-O', 'out'], workspace);

    expect(failure.status).to.equal(1);
    expect(fs.existsSync(path.join(outDir, 'manifest.json'))).to.equal(false);
    expect(fs.existsSync(path.join(outDir, 'architecture.mmd'))).to.equal(false);
  });

  it('writes ERD observability metadata into generate-all manifest on success', () => {
    const workspace = prepareWorkspaceFromFixture('explicit-schema');
    const outDir = path.join(workspace, 'out');
    const run = runCli(['generate-all', '.', '-O', 'out'], workspace);
    const manifestPath = path.join(outDir, 'manifest.json');

    expect(run.status).to.equal(0);
    expect(fs.existsSync(manifestPath)).to.equal(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const erdEntry = manifest.diagrams.find((entry) => entry.type === 'erd');
    expect(erdEntry).to.exist;
    expect(erdEntry.metadata).to.have.property('erd');
    expect(erdEntry.metadata.erd.terminalClass).to.equal('completed');
    expect(erdEntry.metadata.erd.provenanceCounts).to.have.property('explicit');
    expect(erdEntry.metadata.erd.provenanceCounts).to.have.property('inferred');
  });
});
