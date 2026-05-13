const { extractErdModel } = require('../schema/erd-extractor');
const { evaluateErdConfidence } = require('../schema/erd-confidence');
const { renderErdMermaid } = require('../schema/erd-model');

function commentLine(text) {
  return `  %% ${String(text || '').replace(/\r?\n/g, ' ').trim()}`;
}

function insertErdComments(mermaid, comments) {
  const lines = String(mermaid || 'erDiagram').split(/\r?\n/);
  const [header, ...rest] = lines;
  return [
    header || 'erDiagram',
    ...comments.filter(Boolean).map(commentLine),
    ...rest,
  ].join('\n');
}

function normalizeSourceFilesByKind(extraction) {
  const byKind = extraction?.sourceFilesByKind && typeof extraction.sourceFilesByKind === 'object'
    ? extraction.sourceFilesByKind
    : {};
  const precedence = Array.isArray(extraction?.sourcePrecedence) ? extraction.sourcePrecedence : [];
  const orderedKinds = [
    ...precedence,
    ...Object.keys(byKind).filter((kind) => !precedence.includes(kind)).sort(),
  ];

  return orderedKinds.reduce((normalized, kind) => {
    const files = Array.isArray(byKind[kind])
      ? [...new Set(byKind[kind].filter(Boolean))].sort()
      : [];
    if (files.length > 0) {
      normalized[kind] = files;
    }
    return normalized;
  }, {});
}

function summarizeSourceKinds(sourceKinds) {
  if (sourceKinds.length === 0) return 'none';
  if (sourceKinds.length === 1) return sourceKinds[0];
  return 'mixed';
}

function classifyAvailability(extraction, confidence, sourceKinds) {
  if (extraction?.terminalClass === 'failed_no_schema') {
    return {
      availability: 'unavailable',
      availabilityReason: 'no_supported_schema_sources',
    };
  }
  if (extraction?.terminalClass === 'failed_parse') {
    return {
      availability: 'unavailable',
      availabilityReason: 'no_extractable_entities',
    };
  }
  if (sourceKinds.length === 0) {
    return {
      availability: 'unavailable',
      availabilityReason: 'no_supported_schema_sources',
    };
  }
  if (confidence?.outcome === 'fail_confidence') {
    return {
      availability: 'unavailable',
      availabilityReason: 'confidence_below_publishable_threshold',
    };
  }
  if (confidence?.outcome === 'publishable_with_marker') {
    return {
      availability: 'degraded',
      availabilityReason: 'low_confidence_extraction',
    };
  }
  return {
    availability: 'useful',
    availabilityReason: 'completed_with_explicit_entities',
  };
}

function buildErdMetadata(extraction, confidence) {
  const sourceFilesByKind = normalizeSourceFilesByKind(extraction);
  const sourceKinds = Object.keys(sourceFilesByKind);
  const { availability, availabilityReason } = classifyAvailability(
    extraction,
    confidence,
    sourceKinds
  );

  return {
    purpose: 'schema_entity_relationships',
    consumers: ['human', 'agent', 'ci'],
    source: 'schema_extraction',
    extractionInvoked: Boolean(extraction?.extractionInvoked),
    terminalClass: extraction?.terminalClass || 'unknown',
    schemaSources: Array.isArray(extraction?.sourceFiles) ? extraction.sourceFiles : [],
    sourcePrecedence: Array.isArray(extraction?.sourcePrecedence) ? extraction.sourcePrecedence : [],
    sourceKinds,
    sourceKindSummary: summarizeSourceKinds(sourceKinds),
    sourceFilesByKind,
    availability,
    availabilityReason,
    compactEligible: !confidence.shouldFail,
    confidence,
  };
}

function generateErdArtifact(data) {
  const extraction = extractErdModel({
    rootPath: data?.rootPath,
    ignore: Array.isArray(data?.exclude) ? data.exclude : [],
  });
  const confidence = evaluateErdConfidence(extraction.model);
  const mermaid = renderErdMermaid(extraction.model, {
    lowConfidenceMarker: confidence.markerRequired,
    inferenceShare: confidence.counts?.inferenceShare,
  });
  const comments = [
    `erd extraction: ${extraction.terminalClass}`,
    extraction.sourceFiles.length > 0
      ? `schema sources: ${extraction.sourceFiles.join(', ')}`
      : 'schema sources: none',
    ...((extraction.diagnostics || []).slice(0, 3)),
  ];

  return {
    mermaid: insertErdComments(mermaid, comments),
    metadata: buildErdMetadata(extraction, confidence),
  };
}

module.exports = {
  generateErdArtifact,
};
