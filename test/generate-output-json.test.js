const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');

describe('generate command machine output', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const outputPath = path.join(repoRoot, '.diagram', 'test-generate-output-json.mmd');

  afterEach(() => {
    fs.rmSync(outputPath, { force: true });
  });

  function runGenerateAllFixture(fixtureName) {
    const fixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'erd', fixtureName);
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

    const failureOutput = `stdout: ${result.stdout}\nstderr: ${result.stderr}`;
    expect(result.status, failureOutput).to.equal(0);
    const payload = JSON.parse(result.stdout.trim());
    const erdEntry = payload.data.manifest.diagrams.find((entry) => entry.type === 'erd');
    return { erdEntry, outputDir, payload };
  }

  function createDegradedErdWorkspace() {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-cli-erd-degraded-'));
    fs.mkdirSync(path.join(workspace, 'sql'), { recursive: true });
    fs.writeFileSync(path.join(workspace, 'sql', '001_init.sql'), [
      'CREATE TABLE users (',
      '  id text PRIMARY KEY',
      ');',
      '',
      'CREATE TABLE posts (',
      '  id text PRIMARY KEY,',
      '  user_id text REFERENCES users(id)',
      ');',
      '',
      'CREATE TABLE reviewers (',
      '  id text PRIMARY KEY',
      ');',
      '',
      'CREATE TABLE comments (',
      '  id text PRIMARY KEY,',
      '  post_id text,',
      '  reviewer_id text',
      ');',
      '',
    ].join('\n'));
    return workspace;
  }

  function runGenerateAllWorkspace(workspace) {
    const outputDir = path.join(workspace, '.diagram-test-output');
    const result = spawnSync(
      'node',
      [
        'src/diagram.js',
        'generate-all',
        workspace,
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

    const failureOutput = `stdout: ${result.stdout}\nstderr: ${result.stderr}`;
    expect(result.status, failureOutput).to.equal(0);
    const payload = JSON.parse(result.stdout.trim());
    const erdEntry = payload.data.manifest.diagrams.find((entry) => entry.type === 'erd');
    return { erdEntry, outputDir, payload };
  }

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
      expect(erdEntry.metadata.sourceKinds).to.deep.equal(['prisma']);
      expect(erdEntry.metadata.sourceKindSummary).to.equal('prisma');
      expect(erdEntry.metadata.sourceFilesByKind).to.deep.equal({
        prisma: ['prisma/schema.prisma'],
      });
      expect(erdEntry.metadata.availability).to.equal('useful');
      expect(erdEntry.metadata.availabilityReason).to.equal('completed_with_explicit_entities');
      expect(fs.existsSync(path.join(outputDir, 'erd.mmd'))).to.equal(true);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('marks JSON Schema ERD manifest metadata as useful and source-kind truthful', () => {
    const { erdEntry, outputDir } = runGenerateAllFixture('contract-schema-json');

    try {
      expect(erdEntry).to.exist;
      expect(erdEntry.isPlaceholder).to.equal(false);
      expect(erdEntry.metadata.schemaSources).to.deep.equal(['manifest.schema.json']);
      expect(erdEntry.metadata.sourceKinds).to.deep.equal(['json-schema']);
      expect(erdEntry.metadata.sourceKindSummary).to.equal('json-schema');
      expect(erdEntry.metadata.sourceFilesByKind).to.deep.equal({
        'json-schema': ['manifest.schema.json'],
      });
      expect(erdEntry.metadata.availability).to.equal('useful');
      expect(erdEntry.metadata.availabilityReason).to.equal('completed_with_explicit_entities');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('marks no-source ERD manifest metadata as unavailable', () => {
    const { erdEntry, outputDir } = runGenerateAllFixture('no-schema');

    try {
      expect(erdEntry).to.exist;
      expect(erdEntry.isPlaceholder).to.equal(true);
      expect(erdEntry.metadata.schemaSources).to.deep.equal([]);
      expect(erdEntry.metadata.sourceKinds).to.deep.equal([]);
      expect(erdEntry.metadata.sourceKindSummary).to.equal('none');
      expect(erdEntry.metadata.sourceFilesByKind).to.deep.equal({});
      expect(erdEntry.metadata.availability).to.equal('unavailable');
      expect(erdEntry.metadata.availabilityReason).to.equal('no_supported_schema_sources');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('marks low-confidence extracted ERD manifest metadata as degraded', () => {
    const workspace = createDegradedErdWorkspace();

    try {
      const { erdEntry } = runGenerateAllWorkspace(workspace);

      expect(erdEntry).to.exist;
      expect(erdEntry.metadata.confidence.outcome).to.equal('publishable_with_marker');
      expect(erdEntry.metadata.sourceKinds).to.deep.equal(['sql']);
      expect(erdEntry.metadata.sourceKindSummary).to.equal('sql');
      expect(erdEntry.metadata.sourceFilesByKind).to.deep.equal({
        sql: ['sql/001_init.sql'],
      });
      expect(erdEntry.metadata.availability).to.equal('degraded');
      expect(erdEntry.metadata.availabilityReason).to.equal('low_confidence_extraction');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
