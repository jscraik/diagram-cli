const { expect } = require('chai');
const {
  resolveArtifactProfile,
  applyArtifactBudget,
} = require('../src/artifacts/artifact-budget');

function makeDiagram(type, bodyLineCount = 2) {
  const lines = ['graph TD'];
  for (let i = 0; i < bodyLineCount; i += 1) {
    lines.push(`N${i}["${type}-${i}"] --> N${i + 1}["${type}-${i + 1}"]`);
  }
  return {
    type,
    mermaid: `${lines.join('\n')}\n`,
  };
}

describe('artifact budget', () => {
  it('keeps all diagrams unchanged in full profile', () => {
    const diagrams = [
      makeDiagram('flow', 4),
      makeDiagram('architecture', 4),
      makeDiagram('rag', 4),
    ];

    const profile = resolveArtifactProfile('full');
    const result = applyArtifactBudget(diagrams, profile);

    expect(result.applied).to.equal(false);
    expect(result.omitted).to.have.length(0);
    expect(result.included).to.have.length(3);
    expect(result.included.map((entry) => entry.type)).to.deep.equal([
      'architecture',
      'flow',
      'rag',
    ]);
    expect(result.summary.bytesSaved).to.equal(0);
  });

  it('truncates and omits diagrams in agent profile when limits are exceeded', () => {
    const diagrams = [
      makeDiagram('architecture', 40),
      makeDiagram('dependency', 20),
      makeDiagram('database', 20),
      makeDiagram('security', 20),
    ];

    const profile = resolveArtifactProfile('agent', {
      maxBytesPerDiagram: 350,
      maxBytesTotal: 700,
      maxDiagrams: 2,
    });
    const result = applyArtifactBudget(diagrams, profile);

    expect(result.applied).to.equal(true);
    expect(result.included).to.have.length(2);
    expect(result.included.map((entry) => entry.type)).to.deep.equal([
      'architecture',
      'dependency',
    ]);
    expect(result.included[0].truncated).to.equal(true);
    expect(result.included[0].mermaid).to.include('%% compacted: truncated');
    expect(result.omitted.map((entry) => entry.type)).to.deep.equal(['database', 'security']);
    expect(result.summary.bytesSaved).to.be.greaterThan(0);
  });

  it('rejects unknown artifact profiles', () => {
    expect(() => resolveArtifactProfile('unknown')).to.throw('Invalid artifact profile');
  });

  it('exposes stable defaults for ultra-compact profile', () => {
    const profile = resolveArtifactProfile('ultra-compact');
    expect(profile.name).to.equal('ultra-compact');
    expect(profile.maxBytesTotal).to.equal(9000);
    expect(profile.maxBytesPerDiagram).to.equal(3000);
    expect(profile.maxDiagrams).to.equal(3);
  });
});
