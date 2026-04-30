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
    expect(payload.schemaVersion).to.equal('1.0');
    expect(payload.command).to.equal('generate');
    expect(payload.data.artifacts.outputPath).to.equal(outputPath);
    expect(fs.existsSync(outputPath)).to.equal(true);
  });

  it('emits validation JSON inside the canonical envelope on stdout', () => {
    const result = spawnSync(
      'node',
      [
        'src/diagram.js',
        'validate',
        '.',
        '--format',
        'json',
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
    expect(payload.schemaVersion).to.equal('1.0');
    expect(payload.command).to.equal('validate');
    expect(payload.data.validation.summary.exitCode).to.equal(0);
  });

  it('generates ERD machine output from schema sources', () => {
    const fixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'erd', 'explicit-schema');
    const result = spawnSync(
      'node',
      [
        'src/diagram.js',
        'generate',
        fixtureRoot,
        '--type',
        'erd',
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
    expect(payload.schemaVersion).to.equal('1.0');
    expect(payload.command).to.equal('generate');
    expect(payload.data.diagramType).to.equal('erd');
    expect(payload.data.mermaid).to.match(/^erDiagram/);
    expect(payload.data.mermaid).to.include('TICKET');
    expect(payload.data.mermaid).to.include('USER');
  });

  it('includes ERD artifact metadata in generate-all manifests', () => {
    const fixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'erd', 'explicit-schema');
    const outputDir = path.join(fixtureRoot, '.diagram-test-output');
    const result = spawnSync(
      'node',
      [
        'src/diagram.js',
        'generate-all',
        fixtureRoot,
        '--output-dir',
        outputDir,
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

    try {
      const failureOutput = `stdout: ${result.stdout}\nstderr: ${result.stderr}`;
      expect(result.status, failureOutput).to.equal(0);
      const payload = JSON.parse(result.stdout.trim());
      const erdEntry = payload.data.manifest.diagrams.find((entry) => entry.type === 'erd');
      expect(erdEntry).to.exist;
      expect(erdEntry.file).to.equal('erd.mmd');
      expect(erdEntry.purpose).to.equal('schema_entity_relationships');
      expect(erdEntry.source).to.equal('schema_extraction');
      expect(erdEntry.sourceHash).to.have.length(64);
      expect(erdEntry.metadata.terminalClass).to.equal('completed');
      expect(erdEntry.metadata.confidence.outcome).to.equal('publishable');
      expect(erdEntry.metadata.schemaSources).to.deep.equal(['prisma/schema.prisma']);
      expect(fs.existsSync(path.join(outputDir, 'erd.mmd'))).to.equal(true);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
