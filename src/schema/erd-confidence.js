function roundTo(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function evaluateErdConfidence(model) {
  const entities = Array.isArray(model?.entities) ? model.entities : [];
  const relationships = Array.isArray(model?.relationships) ? model.relationships : [];

  const entityCount = entities.length;
  const explicitEntityCount = entities.filter((entity) => entity.source === 'explicit').length;
  const relationshipCount = relationships.length;
  const inferredRelationshipCount = relationships.filter(
    (relationship) => relationship.provenance === 'inferred'
  ).length;
  const explicitRelationshipCount = relationships.filter(
    (relationship) => relationship.provenance === 'explicit'
  ).length;

  const inferenceShare = relationshipCount > 0
    ? inferredRelationshipCount / relationshipCount
    : 0;

  let outcome = 'publishable';
  if (
    entityCount === 0
    || explicitEntityCount === 0
    || (relationshipCount > 0 && inferenceShare > 0.8)
  ) {
    outcome = 'fail_confidence';
  } else if (
    relationshipCount > 0
    && inferenceShare > 0.5
    && inferenceShare <= 0.8
  ) {
    outcome = 'publishable_with_marker';
  }

  return {
    outcome,
    shouldFail: outcome === 'fail_confidence',
    markerRequired: outcome === 'publishable_with_marker',
    counts: {
      entityCount,
      explicitEntityCount,
      relationshipCount,
      explicitRelationshipCount,
      inferredRelationshipCount,
      inferenceShare: roundTo(inferenceShare, 4),
    },
  };
}

module.exports = {
  evaluateErdConfidence,
};
