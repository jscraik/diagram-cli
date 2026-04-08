const { expect } = require('chai');
const { evaluateErdConfidence } = require('../src/schema/erd-confidence');

function evaluateShare({ inferred, explicit }) {
  const relationships = [
    ...Array.from({ length: explicit }, () => ({ fromEntity: 'SESSION', toEntity: 'USER', provenance: 'explicit' })),
    ...Array.from({ length: inferred }, () => ({ fromEntity: 'SESSION', toEntity: 'USER', provenance: 'inferred' })),
  ];
  return evaluateErdConfidence({ entities: [{ name: 'USER', source: 'explicit' }], relationships });
}

describe('erd confidence policy', () => {
  it('classifies publishable when explicit entities exist and inference share is low', () => {
    const evaluated = evaluateErdConfidence({
      entities: [{ name: 'USER', source: 'explicit' }, { name: 'SESSION', source: 'explicit' }],
      relationships: [{ fromEntity: 'SESSION', toEntity: 'USER', provenance: 'explicit' }],
    });
    expect(evaluated.outcome).to.equal('publishable');
    expect(evaluated.shouldFail).to.equal(false);
    expect(evaluated.counts.inferenceShare).to.equal(0);
  });

  it('handles boundary thresholds at 0.5, 0.8, and >0.8 inference share', () => {
    const cases = [
      { inferred: 1, explicit: 1, outcome: 'publishable', markerRequired: false, inferenceShare: 0.5 },
      { inferred: 4, explicit: 1, outcome: 'publishable_with_marker', markerRequired: true, inferenceShare: 0.8 },
      { inferred: 5, explicit: 1, outcome: 'fail_confidence', markerRequired: false, inferenceShare: 0.8333 },
    ];
    for (const expected of cases) {
      const evaluated = evaluateShare(expected);
      expect(evaluated.outcome).to.equal(expected.outcome);
      expect(evaluated.markerRequired).to.equal(expected.markerRequired);
      expect(evaluated.counts.inferenceShare).to.equal(expected.inferenceShare);
    }
  });

  it('classifies publishable_with_marker when inferred relationships dominate but stay <= 0.8', () => {
    const evaluated = evaluateErdConfidence({
      entities: [{ name: 'USER', source: 'explicit' }, { name: 'SESSION', source: 'explicit' }, { name: 'COMMENT', source: 'explicit' }],
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
    const evaluated = evaluateErdConfidence({ entities: [], relationships: [] });
    expect(evaluated.outcome).to.equal('fail_confidence');
    expect(evaluated.shouldFail).to.equal(true);
    expect(evaluated.markerRequired).to.equal(false);
    expect(evaluated.counts).to.deep.equal({
      entityCount: 0,
      explicitEntityCount: 0,
      relationshipCount: 0,
      explicitRelationshipCount: 0,
      inferredRelationshipCount: 0,
      inferenceShare: 0,
    });
  });
});
