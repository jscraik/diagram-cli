const { expect } = require('chai');
const {
  generateSequence,
  resolveSequenceVerb,
} = require('../src/core/analysis-generation-diagrams-core-sequence');

describe('analysis generation core sequence', () => {
  it('maps role tags to expected interaction verbs', () => {
    expect(resolveSequenceVerb(['database'])).to.equal('queries');
    expect(resolveSequenceVerb(['database', 'writes'])).to.equal('writes to');
    expect(resolveSequenceVerb(['auth'])).to.equal('authenticates via');
    expect(resolveSequenceVerb(['events'])).to.equal('emits to');
    expect(resolveSequenceVerb(['llm'])).to.equal('calls LLM');
    expect(resolveSequenceVerb(['tool'])).to.equal('invokes tool');
    expect(resolveSequenceVerb(['misc'])).to.equal('calls');
  });

  it('resolves verb precedence when multiple tags are present', () => {
    // ROLE_VERB_PRIORITY order: database, auth, events, llm, tool
    expect(resolveSequenceVerb(['llm', 'tool'])).to.equal('calls LLM');
    expect(resolveSequenceVerb(['tool', 'llm'])).to.equal('calls LLM');
    expect(resolveSequenceVerb(['auth', 'database'])).to.equal('queries');
    expect(resolveSequenceVerb(['database', 'auth'])).to.equal('queries');
    expect(resolveSequenceVerb(['events', 'llm', 'tool'])).to.equal('emits to');
    expect(resolveSequenceVerb(['tool', 'events'])).to.equal('emits to');
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

    expect(output).to.include(': queries');
    expect(output).to.include(': authenticates via');
    expect(output).to.include(': emits to');
    expect(output).to.include(': calls LLM');
    expect(output).to.include(': invokes tool');
  });
});