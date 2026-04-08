const { expect } = require('chai');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { normalizeDiagramManifest } = require('../src/context/normalize-diagram-manifest');
const { buildContextPack } = require('../src/context/build-context-pack');
const { estimateTokensFromBytes } = require('../src/artifacts/artifact-budget');

function withTempDiagrams(prefix, run) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const diagramsDir = path.join(tmpRoot, 'diagrams');
  fs.mkdirSync(diagramsDir, { recursive: true });
  try {
    return run({ tmpRoot, diagramsDir });
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

describe('context pack helpers', () => {
  it('normalizes diagrams and preserves compaction metadata in manifest', () => {
    withTempDiagrams('diagram-context-normalize-', ({ tmpRoot, diagramsDir }) => {
      const manifestPath = path.join(diagramsDir, 'manifest.json');

      fs.writeFileSync(path.join(diagramsDir, 'architecture.mmd'), [
        'graph TD',
        '  subgraph A["Core"]',
        '    N1["User Service"]',
        '  end',
        '',
      ].join('\n'));
      fs.writeFileSync(path.join(diagramsDir, 'dependency.mmd'), [
        'graph LR',
        '  A["External"] --> N1',
        '',
      ].join('\n'));
      fs.writeFileSync(path.join(diagramsDir, 'flow.mmd'), 'flowchart TD\n  A --> B');
      fs.writeFileSync(manifestPath, JSON.stringify({
        generatedAt: '2026-01-01T00:00:00.000Z',
        rootPath: '/tmp/example',
        diagramDir: '.diagram',
        compaction: {
          profile: 'agent',
          applied: true,
        },
        diagrams: [],
      }));

      const manifest = normalizeDiagramManifest({
        rootDir: '/tmp/example',
        tmpDir: tmpRoot,
        manifestPath,
      });

      expect(manifest.compaction).to.deep.equal({
        profile: 'agent',
        applied: true,
      });
      expect(manifest.diagrams.map((entry) => entry.file)).to.deep.equal([
        'architecture.mmd',
        'dependency.mmd',
        'flow.mmd',
      ]);
      const flowText = fs.readFileSync(path.join(diagramsDir, 'flow.mmd'), 'utf8');
      expect(flowText.endsWith('\n')).to.equal(true);
    });
  });

  it('builds a budgeted context pack with omitted section when constraints are tight', () => {
    withTempDiagrams('diagram-context-build-', ({ tmpRoot, diagramsDir }) => {
      fs.writeFileSync(path.join(diagramsDir, 'architecture.mmd'), `graph TD\n${'A --> B\n'.repeat(40)}`);
      fs.writeFileSync(path.join(diagramsDir, 'dependency.mmd'), `graph LR\n${'X --> Y\n'.repeat(30)}`);
      fs.writeFileSync(path.join(diagramsDir, 'database.mmd'), `flowchart TD\n${'DB --> Row\n'.repeat(20)}`);
      fs.writeFileSync(path.join(diagramsDir, 'manifest.json'), JSON.stringify({
        generatedAt: '2026-01-01T00:00:00.000Z',
        rootPath: '/tmp/example',
        diagramDir: '.diagram',
        diagrams: [
          { type: 'architecture', file: 'architecture.mmd', bytes: 1000, lines: 41, isPlaceholder: false },
          { type: 'dependency', file: 'dependency.mmd', bytes: 900, lines: 31, isPlaceholder: false },
          { type: 'database', file: 'database.mmd', bytes: 700, lines: 21, isPlaceholder: false },
        ],
      }));

      const outputPath = path.join(tmpRoot, 'diagram-context.md');
      const result = buildContextPack({
        rootDir: '/tmp/example',
        tmpDir: tmpRoot,
        contextPath: outputPath,
        contextMaxBytes: 1400,
        contextMaxLinesPerDiagram: 12,
        contextMaxEmbeddedDiagrams: 2,
      });

      const contextText = fs.readFileSync(outputPath, 'utf8');
      expect(result.embeddedCount).to.be.at.most(2);
      expect(Buffer.byteLength(contextText, 'utf8')).to.be.at.most(1400);
      expect(contextText).to.include('## Omitted Diagrams');
      expect(contextText).to.include('Machine-oriented context for agents');
      expect(contextText).to.include('Note: truncated to 12 lines');
    });
  });

  it('compacts the header/index when the context budget is tight', () => {
    withTempDiagrams('diagram-context-header-budget-', ({ tmpRoot, diagramsDir }) => {
      const diagrams = [];
      for (let i = 0; i < 12; i += 1) {
        const type = `diagram-${i}`;
        const file = `${type}.mmd`;
        fs.writeFileSync(path.join(diagramsDir, file), `graph TD\nA${i} --> B${i}\n`);
        diagrams.push({
          type,
          file,
          bytes: 24,
          lines: 2,
          isPlaceholder: false,
        });
      }

      fs.writeFileSync(path.join(diagramsDir, 'manifest.json'), JSON.stringify({
        generatedAt: '2026-01-01T00:00:00.000Z',
        rootPath: '/tmp/example',
        diagramDir: '.diagram',
        diagrams,
      }));

      const outputPath = path.join(tmpRoot, 'diagram-context.md');
      const result = buildContextPack({
        rootDir: '/tmp/example',
        tmpDir: tmpRoot,
        contextPath: outputPath,
        contextMaxBytes: 420,
        contextMaxLinesPerDiagram: 10,
        contextMaxEmbeddedDiagrams: 2,
      });

      const contextText = fs.readFileSync(outputPath, 'utf8');
      expect(Buffer.byteLength(contextText, 'utf8')).to.be.at.most(420);
      expect(result.headerCompacted).to.equal(true);
      expect(result.indexRowsIncluded).to.be.at.least(0);
    });
  });

  it('throws when context budget is too small for even a minimal header', () => {
    withTempDiagrams('diagram-context-header-too-small-', ({ tmpRoot, diagramsDir }) => {
      fs.writeFileSync(path.join(diagramsDir, 'architecture.mmd'), 'graph TD\nA --> B\n');
      fs.writeFileSync(path.join(diagramsDir, 'manifest.json'), JSON.stringify({
        generatedAt: '2026-01-01T00:00:00.000Z',
        rootPath: '/tmp/example',
        diagramDir: '.diagram',
        diagrams: [
          { type: 'architecture', file: 'architecture.mmd', bytes: 16, lines: 2, isPlaceholder: false },
        ],
      }));

      const outputPath = path.join(tmpRoot, 'diagram-context.md');
      expect(() => buildContextPack({
        rootDir: '/tmp/example',
        tmpDir: tmpRoot,
        contextPath: outputPath,
        contextMaxBytes: 40,
        contextMaxLinesPerDiagram: 10,
        contextMaxEmbeddedDiagrams: 1,
      })).to.throw('Context byte budget (40) is too small for header.');
    });
  });

  it('fails closed when architecture parsing produces no canonical nodes', () => {
    withTempDiagrams('diagram-context-normalize-fail-closed-', ({ tmpRoot, diagramsDir }) => {
      const manifestPath = path.join(diagramsDir, 'manifest.json');
      const architecturePath = path.join(diagramsDir, 'architecture.mmd');
      const dependencyPath = path.join(diagramsDir, 'dependency.mmd');
      const architectureInput = 'graph TD\n  A --> B\n';
      const dependencyInput = 'graph LR\n  X["External"] --> A\n';
      fs.writeFileSync(architecturePath, architectureInput);
      fs.writeFileSync(dependencyPath, dependencyInput);
      fs.writeFileSync(manifestPath, JSON.stringify({
        generatedAt: '2026-01-01T00:00:00.000Z',
        rootPath: '/tmp/example',
        diagramDir: '.diagram',
        diagrams: [],
      }));

      expect(() => normalizeDiagramManifest({
        rootDir: '/tmp/example',
        tmpDir: tmpRoot,
        manifestPath,
      })).to.throw('Failed to normalize architecture.mmd: parsed structure was empty.');

      expect(fs.readFileSync(architecturePath, 'utf8')).to.equal(architectureInput);
      expect(fs.readFileSync(dependencyPath, 'utf8')).to.equal(dependencyInput);
    });
  });

  it('preserves existing per-diagram metadata while recomputing derived values', () => {
    withTempDiagrams('diagram-context-normalize-merge-', ({ tmpRoot, diagramsDir }) => {
      const manifestPath = path.join(diagramsDir, 'manifest.json');
      const flowPath = path.join(diagramsDir, 'flow.mmd');
      fs.writeFileSync(flowPath, 'flowchart TD\n  A --> B\n');
      fs.writeFileSync(manifestPath, JSON.stringify({
        generatedAt: '2026-01-01T00:00:00.000Z',
        rootPath: '/tmp/example',
        diagramDir: '.diagram',
        compaction: {
          profile: 'agent',
          applied: true,
        },
        diagrams: [
          {
            type: 'flow',
            file: 'flow.mmd',
            compacted: true,
            sourceBytes: 2048,
            bytesSaved: 1900,
            approxTokens: 1,
            bytes: 1,
            lines: 1,
          },
        ],
      }));

      const manifest = normalizeDiagramManifest({
        rootDir: '/tmp/example',
        tmpDir: tmpRoot,
        manifestPath,
      });
      const flowEntry = manifest.diagrams.find((entry) => entry.file === 'flow.mmd');
      expect(flowEntry).to.exist;
      expect(flowEntry.compacted).to.equal(true);
      expect(flowEntry.bytesSaved).to.equal(1900);
      expect(flowEntry.sourceBytes).to.equal(2048);
      expect(flowEntry.approxTokens).to.equal(estimateTokensFromBytes(2048));
      expect(flowEntry.bytes).to.equal(Buffer.byteLength(fs.readFileSync(flowPath, 'utf8')));
      expect(flowEntry.lines).to.equal(fs.readFileSync(flowPath, 'utf8').split(/\r?\n/).length);
    });
  });
});
