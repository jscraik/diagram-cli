const { expect } = require('chai');
const {
  generateSequence,
  resolveSequenceVerb,
} = require('../src/core/analysis-generation-diagrams-core-sequence');

describe('analysis generation core sequence', () => {
  it('maps role tags to expected interaction verbs', () => {
    expect(resolveSequenceVerb(['database'])).to.equal('reads from');
    expect(resolveSequenceVerb(['auth'])).to.equal('authenticates via');
    expect(resolveSequenceVerb(['events'])).to.equal('emits to');
    expect(resolveSequenceVerb(['llm'])).to.equal('calls LLM');
    expect(resolveSequenceVerb(['tool'])).to.equal('invokes tool');
    expect(resolveSequenceVerb(['misc'])).to.equal('calls');
  });

  it('emits role-specific verbs in generated sequence output', () => {
    const data = {
      entryPoints: [],
      components: [
        {
          name: 'ui',
          originalName: 'ui',
          type: 'service',
          roleTags: ['user'],
          dependencies: ['db', 'authSvc', 'queue', 'llmClient', 'tooling', 'coreSvc'],
        },
        { name: 'db', originalName: 'db', type: 'service', roleTags: ['database'], dependencies: [] },
        { name: 'authSvc', originalName: 'authSvc', type: 'service', roleTags: ['auth'], dependencies: [] },
        { name: 'queue', originalName: 'queue', type: 'service', roleTags: ['events'], dependencies: [] },
        { name: 'llmClient', originalName: 'llmClient', type: 'service', roleTags: ['llm'], dependencies: [] },
        { name: 'tooling', originalName: 'tooling', type: 'service', roleTags: ['tool'], dependencies: [] },
        { name: 'coreSvc', originalName: 'coreSvc', type: 'service', roleTags: [], dependencies: [] },
      ],
    };

    const output = generateSequence(data);

    expect(output).to.include(': reads from');
    expect(output).to.include(': authenticates via');
    expect(output).to.include(': emits to');
    expect(output).to.include(': calls LLM');
    expect(output).to.include(': invokes tool');
    expect(output).to.include(': calls');
  });
});
