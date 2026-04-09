const { expect } = require('chai');
const { applyDiagramRcDefaults } = require('../src/commands/shared');

describe('diagramrc default precedence', () => {
  it('applies .diagramrc values when CLI flags are omitted', () => {
    const resolved = applyDiagramRcDefaults(
      {},
      {
        patterns: '**/*.rb',
        exclude: 'vendor/**',
        maxFiles: 42,
        theme: 'dark',
      },
      ['patterns', 'exclude', 'maxFiles', 'theme']
    );

    expect(resolved.patterns).to.equal('**/*.rb');
    expect(resolved.maxFiles).to.equal('42');
    expect(resolved.theme).to.equal('dark');
    expect(resolved.exclude).to.include('vendor/**');
  });

  it('prefers CLI flags over .diagramrc values', () => {
    const resolved = applyDiagramRcDefaults(
      {
        patterns: '**/*.go',
        exclude: 'generated/**',
        maxFiles: '7',
        theme: 'light',
      },
      {
        patterns: '**/*.rb',
        exclude: 'vendor/**',
        maxFiles: 42,
        theme: 'dark',
      },
      ['patterns', 'exclude', 'maxFiles', 'theme']
    );

    expect(resolved.patterns).to.equal('**/*.go');
    expect(resolved.maxFiles).to.equal('7');
    expect(resolved.theme).to.equal('light');
    expect(resolved.exclude).to.equal('generated/**');
  });

  it('falls back to legacy ignore array when exclude is not present', () => {
    const resolved = applyDiagramRcDefaults(
      {},
      {
        ignore: ['vendor/**', 'coverage/**'],
      },
      ['exclude']
    );
    expect(resolved.exclude).to.equal('vendor/**,coverage/**');
  });
});
