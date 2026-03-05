const { expect } = require('chai');
const {
  evaluateConfidence,
  buildConfidenceReport,
  shouldFailStrictConfidence,
} = require('../src/confidence/pipeline');
const { toArchitectureIR } = require('../src/ir/architecture-ir');
const { buildCacheKey } = require('../src/incremental/cache');

describe('confidence pipeline', () => {
  it('should fail confidence on required capability failures', () => {
    const evaluated = evaluateConfidence({
      capabilities: {
        checks: [
          { id: 'node_runtime', required: true, status: 'pass', message: 'ok' },
          { id: 'mermaid_cli', required: true, status: 'fail', message: 'missing' },
        ],
      },
      validation: { enabled: false, valid: true },
      fallback: { used: false, reasons: [] },
    });

    expect(evaluated.verdict).to.equal('fail');
    expect(evaluated.summary.requiredFailures).to.equal(1);
  });

  it('should warn confidence when fallback path is used', () => {
    const evaluated = evaluateConfidence({
      capabilities: {
        checks: [{ id: 'node_runtime', required: true, status: 'pass', message: 'ok' }],
      },
      validation: { enabled: true, valid: true },
      fallback: { used: true, reasons: ['mmdc_unavailable_or_failed'] },
    });

    expect(evaluated.verdict).to.equal('warn');
    expect(evaluated.summary.fallbackUsed).to.equal(true);
  });

  it('should signal strict failure when fallback is used', () => {
    const report = buildConfidenceReport({
      command: 'generate',
      rootPath: '/tmp/repo',
      capabilities: { checks: [{ id: 'node_runtime', required: true, status: 'pass', message: 'ok' }] },
      validation: { enabled: true, valid: true, errors: [] },
      fallback: { used: true, reasons: ['incremental_cache_miss'] },
    });

    expect(shouldFailStrictConfidence(report)).to.equal(true);
  });
});

describe('typed IR + incremental helpers', () => {
  it('should build versioned architecture IR payload', () => {
    const ir = toArchitectureIR({
      rootPath: '/repo',
      components: [
        {
          name: 'api',
          originalName: 'api',
          filePath: 'src/api.js',
          type: 'module',
          roleTags: ['user', 'auth'],
          dependencies: ['shared'],
        },
      ],
      languages: { javascript: 1 },
      entryPoints: ['src/api.js'],
    }, {
      analyzer: { name: 'default', version: '1.0.0' },
    });

    expect(ir.schemaVersion).to.equal('1.0');
    expect(ir.analyzer.name).to.equal('default');
    expect(ir.summary.componentCount).to.equal(1);
  });

  it('should produce stable cache keys for same command/options', () => {
    const keyA = buildCacheKey('analyze', { maxFiles: '100', analyzer: 'default' });
    const keyB = buildCacheKey('analyze', { maxFiles: '100', analyzer: 'default' });
    expect(keyA).to.equal(keyB);
  });
});
