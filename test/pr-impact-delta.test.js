const { expect } = require('chai');
const {
  computeDelta,
  computeBlastRadiusFromDelta,
} = require('../src/workflow/pr-impact');

describe('pr-impact dependency normalization', () => {
  it('does not report false dependency churn when dependency objects are semantically unchanged', () => {
    const baseAnalysis = {
      components: [
        {
          filePath: 'src/a.js',
          name: 'a',
          type: 'module',
          roleTags: ['user'],
          dependencies: [{ name: 'b', filePath: 'src/b.js' }],
        },
      ],
    };
    const headAnalysis = {
      components: [
        {
          filePath: 'src/a.js',
          name: 'a',
          type: 'module',
          roleTags: ['user'],
          dependencies: [{ name: 'b', filePath: 'src/b.js' }],
        },
      ],
    };
    const changedFiles = {
      changed: ['src/a.js'],
      renamed: [],
      deleted: [],
      added: [],
    };

    const delta = computeDelta(baseAnalysis, headAnalysis, changedFiles);
    expect(delta.changedComponents).to.have.length(0);
    expect(delta.dependencyEdgeDelta.count).to.equal(0);
  });

  it('traverses blast radius when dependencies are object-shaped', () => {
    const delta = {
      changedComponents: [{ name: 'serviceA' }],
      addedFiles: [],
    };
    const headAnalysis = {
      components: [
        { name: 'serviceA', dependencies: [] },
        { name: 'serviceB', dependencies: [{ name: 'serviceA', filePath: 'src/serviceA.js' }] },
      ],
    };

    const blastRadius = computeBlastRadiusFromDelta(delta, headAnalysis, 2, 20);
    expect(blastRadius.impactedComponents).to.deep.equal(['serviceB']);
  });

  it('normalizes mixed string and object dependency representations to one canonical id', () => {
    const baseAnalysis = {
      components: [
        {
          filePath: 'src/serviceA.js',
          name: 'serviceA',
          dependencies: ['serviceB'],
        },
        {
          filePath: 'src/serviceB.js',
          name: 'serviceB',
          dependencies: [],
        },
      ],
    };
    const headAnalysis = {
      components: [
        {
          filePath: 'src/serviceA.js',
          name: 'serviceA',
          dependencies: [{ name: 'serviceB', filePath: 'src/serviceB.js' }],
        },
        {
          filePath: 'src/serviceB.js',
          name: 'serviceB',
          dependencies: [],
        },
      ],
    };
    const changedFiles = {
      changed: ['src/serviceA.js'],
      renamed: [],
      deleted: [],
      added: [],
    };

    const delta = computeDelta(baseAnalysis, headAnalysis, changedFiles);
    expect(delta.changedComponents).to.have.length(0);
    expect(delta.dependencyEdgeDelta).to.deep.equal({
      added: [],
      removed: [],
      count: 0,
    });
  });

  it('keeps unresolved external dependencies stable across mixed forms', () => {
    const baseAnalysis = {
      components: [
        {
          filePath: 'src/serviceA.js',
          name: 'serviceA',
          dependencies: ['external-package'],
        },
      ],
    };
    const headAnalysis = {
      components: [
        {
          filePath: 'src/serviceA.js',
          name: 'serviceA',
          dependencies: [{ name: 'external-package' }],
        },
      ],
    };
    const changedFiles = {
      changed: ['src/serviceA.js'],
      renamed: [],
      deleted: [],
      added: [],
    };

    const delta = computeDelta(baseAnalysis, headAnalysis, changedFiles);
    expect(delta.changedComponents).to.have.length(0);
    expect(delta.dependencyEdgeDelta).to.deep.equal({
      added: [],
      removed: [],
      count: 0,
    });
  });
});
