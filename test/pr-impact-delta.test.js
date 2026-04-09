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
});
