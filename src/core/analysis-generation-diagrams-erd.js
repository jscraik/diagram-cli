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

function buildErdMetadata(extraction, confidence) {
  return {
    purpose: 'schema_entity_relationships',
    consumers: ['human', 'agent', 'ci'],
    source: 'schema_extraction',
    extractionInvoked: Boolean(extraction?.extractionInvoked),
    terminalClass: extraction?.terminalClass || 'unknown',
    schemaSources: Array.isArray(extraction?.sourceFiles) ? extraction.sourceFiles : [],
    sourcePrecedence: Array.isArray(extraction?.sourcePrecedence) ? extraction.sourcePrecedence : [],
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
