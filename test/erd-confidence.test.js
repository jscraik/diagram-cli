const { expect } = require('chai');
const { evaluateErdConfidence } = require('../src/schema/erd-confidence');

describe('erd confidence policy', () => {
  it('classifies publishable when explicit entities exist and inference share is low', () => {
    const evaluated = evaluateErdConfidence({
      entities: [
        { name: 'USER', source: 'explicit' },
        { name: 'SESSION', source: 'explicit' },
      ],
      relationships: [
        { fromEntity: 'SESSION', toEntity: 'USER', provenance: 'explicit' },
      ],
    });

    expect(evaluated.outcome).to.equal('publishable');
    expect(evaluated.shouldFail).to.equal(false);
    expect(evaluated.counts.inferenceShare).to.equal(0);
  });

  it('classifies publishable_with_marker when inferred relationships dominate but stay <= 0.8', () => {
    const evaluated = evaluateErdConfidence({
      entities: [
        { name: 'USER', source: 'explicit' },
        { name: 'SESSION', source: 'explicit' },
        { name: 'COMMENT', source: 'explicit' },
      ],
      relationships: [
        { fromEntity: 'SESSION', toEntity: 'USER', provenance: 'explicit' },
        { fromEntity: 'COMMENT', toEntity: 'USER', provenance: 'inferred' },
        { fromEntity: 'COMMENT', toEntity: 'SESSION', provenance: 'inferred' },
      ],
    });

    expect(evaluated.outcome).to.equal('publishable_with_marker');
    expect(evaluated.markerRequired).to.equal(true);
    expect(evaluated.counts.inferenceShare).to.equal(0.6667);
  });

  it('classifies fail_confidence when no explicit entities are available', () => {
    const evaluated = evaluateErdConfidence({
      entities: [],
      relationships: [],
    });

    expect(evaluated.outcome).to.equal('fail_confidence');
    expect(evaluated.shouldFail).to.equal(true);
  });
});
