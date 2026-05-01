const { expect } = require('chai');
const {
  generate,
  SUPPORTED_DIAGRAM_TYPES,
} = require('../src/core/analysis-generation');

describe('analysis generation dispatcher', () => {
  const emptyAnalysis = {
    rootPath: '/tmp/project',
    components: [],
    entryPoints: [],
    languages: {},
    directories: [],
  };

  it('routes every supported diagram type to the expected grammar', () => {
    const expectedPrefixes = {
      architecture: 'graph TD',
      sequence: 'sequenceDiagram',
      dependency: 'graph LR',
      class: 'classDiagram',
      flow: 'flowchart TD',
      database: 'flowchart TD',
      erd: 'erDiagram',
      user: 'flowchart LR',
      events: 'flowchart TD',
      auth: 'flowchart TD',
      security: 'flowchart TD',
      agent: 'flowchart TD',
      c4context: 'C4Context',
      rag: 'flowchart LR',
    };

    expect(SUPPORTED_DIAGRAM_TYPES).to.have.lengthOf(Object.keys(expectedPrefixes).length);

    for (const type of SUPPORTED_DIAGRAM_TYPES) {
      const output = generate(emptyAnalysis, type);
      expect(output, `type=${type}`).to.be.a('string');
      expect(output, `type=${type}`).to.match(new RegExp(`^${expectedPrefixes[type]}`));
    }
  });

  it('falls back to architecture when type is unknown', () => {
    const output = generate(emptyAnalysis, 'architechture');
    expect(output).to.be.a('string');
    expect(output).to.match(/^graph TD/);
    expect(output).to.include('No components found');
  });
});
