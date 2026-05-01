const chalk = require('chalk');
const crypto = require('crypto');
const path = require('path');
const { estimateTokensFromBytes } = require('../artifacts/artifact-budget');
const { findClosestMatch, formatSuggestion } = require('../utils/suggestions');
const { SUPPORTED_DIAGRAM_TYPES } = require('./analysis-generation-constants');
const { generateErdArtifact } = require('./analysis-generation-diagrams-erd');
const {
  generateArchitecture,
  generateSequence,
  generateDependency,
  generateClass,
  generateFlow,
} = require('./analysis-generation-diagrams-core');
const {
  generateDatabase,
  generateUserInteractions,
  generateEvents,
  generateAuth,
  generateSecurity,
  generateAgent,
  generateC4Context,
  generateRag,
} = require('./analysis-generation-diagrams-role');

const DIAGRAM_PURPOSES = Object.freeze({
  architecture: 'component_hierarchy',
  sequence: 'service_interaction_flow',
  dependency: 'import_dependency_graph',
  class: 'class_relationships',
  flow: 'process_data_flow',
  database: 'persistence_code_paths',
  erd: 'schema_entity_relationships',
  user: 'user_entrypaths',
  events: 'event_architecture_paths',
  auth: 'authentication_authorization_flow',
  security: 'security_boundary_trust_paths',
  agent: 'multi_agent_orchestration_paths',
  c4context: 'system_context_map',
  rag: 'retrieval_augmented_generation_flow',
});

function defaultDiagramMetadata(type) {
  return {
    purpose: DIAGRAM_PURPOSES[type] || 'architecture_diagram',
    consumers: ['human', 'agent'],
    source: type === 'erd' ? 'schema_extraction' : 'static_analysis',
  };
}

function buildDiagramArtifact(type, mermaid, metadata = {}) {
  return {
    mermaid,
    metadata: {
      ...defaultDiagramMetadata(type),
      ...metadata,
    },
  };
}

/**
 * Selects and executes the appropriate diagram generator for the requested diagram type.
 *
 * If `type` is not recognised, logs a warning (including a nearest-match suggestion when available)
 * and falls back to generating an architecture diagram.
 *
 * @param {any} data - Input data used by the selected generator to produce the diagram.
 * @param {string} type - Diagram type identifier (e.g. "architecture", "sequence", "database").
 * @param {string|undefined} [focus] - Optional focus/context passed to generators that support it.
 * @returns {{mermaid: string, metadata: Object}} Generated Mermaid diagram source and artifact metadata.
 */
function generateDiagramArtifact(data, type, focus) {
  switch (type) {
    case 'architecture': return buildDiagramArtifact(type, generateArchitecture(data, focus));
    case 'sequence': return buildDiagramArtifact(type, generateSequence(data));
    case 'dependency': return buildDiagramArtifact(type, generateDependency(data, focus));
    case 'class': return buildDiagramArtifact(type, generateClass(data));
    case 'flow': return buildDiagramArtifact(type, generateFlow(data));
    case 'database': return buildDiagramArtifact(type, generateDatabase(data));
    case 'erd': return generateErdArtifact(data);
    case 'user': return buildDiagramArtifact(type, generateUserInteractions(data));
    case 'events': return buildDiagramArtifact(type, generateEvents(data));
    case 'auth': return buildDiagramArtifact(type, generateAuth(data));
    case 'security': return buildDiagramArtifact(type, generateSecurity(data));
    case 'agent': return buildDiagramArtifact(type, generateAgent(data));
    case 'c4context': return buildDiagramArtifact(type, generateC4Context(data));
    case 'rag': return buildDiagramArtifact(type, generateRag(data));
    default: {
      const validTypes = [...SUPPORTED_DIAGRAM_TYPES];
      const suggestion = findClosestMatch(type, validTypes);
      console.warn(chalk.yellow(`⚠️  Unknown diagram type "${type}", using architecture`));
      if (suggestion) {
        console.warn(formatSuggestion(suggestion));
      }
      return buildDiagramArtifact('architecture', generateArchitecture(data, focus));
    }
  }
}

function generate(data, type, focus) {
  return generateDiagramArtifact(data, type, focus).mermaid;
}

/**
 * Common placeholder note texts used to detect empty diagrams.
 */
const PLACEHOLDER_NOTE_TEXTS = [
  'note["no data available"]',
  'note["no components found',
  'no services detected',
  'note "no data available"',
  'note "no classes found"',
  'note["no database-focused components found"]',
  'no supported schema sources found',
  'schema sources: none',
  'note["no user-facing components found"]',
  'note["no event/channels components found"]',
  'note["no authentication components found"]',
  'note["no security-focused components found"]',
  'no agent/llm components found',
  'no data available',
];

/**
 * Detects whether Mermaid diagram content represents a placeholder or empty diagram.
 *
 * @param {string|null|undefined} mermaidCode - Mermaid diagram source to inspect; non-string or falsy values are treated as placeholder content.
 * @returns {boolean} `true` if the provided content is empty, not a string, or contains common placeholder notes (e.g. "no data available", "no components found"); `false` otherwise.
 */
function isPlaceholderDiagram(mermaidCode) {
  if (!mermaidCode || typeof mermaidCode !== 'string') return true;
  const compact = mermaidCode.toLowerCase();
  return PLACEHOLDER_NOTE_TEXTS.some(noteText => compact.includes(noteText));
}

/**
 * Create a manifest entry describing a generated Mermaid diagram file.
 *
 * @param {string} type - Diagram type identifier.
 * @param {string} filePath - Absolute or relative path to the generated file.
 * @param {string|any} mermaidCode - Mermaid source for the diagram; may be non-string.
 * @param {string} [rootPath] - Optional root path used to compute a relative outputPath.
 * @returns {{type: string, file: string, outputPath: string, lines: number, bytes: number, approxTokens: number, isPlaceholder: boolean}} An object containing:
 *  - `type`: the diagram type,
 *  - `file`: basename of `filePath`,
 *  - `outputPath`: `filePath` relative to `rootPath` when provided, otherwise `filePath` as given,
 *  - `lines`: number of lines in `mermaidCode`,
 *  - `bytes`: UTF-8 byte size of `mermaidCode`,
 *  - `approxTokens`: token estimate derived from `bytes`,
 *  - `isPlaceholder`: `true` if `mermaidCode` is considered a placeholder/empty diagram, `false` otherwise.
 */
function toManifestEntry(type, filePath, mermaidCode, rootPath, metadata = {}) {
  const lines = typeof mermaidCode === 'string' ? mermaidCode.split('\n') : [];
  const bytes = Buffer.byteLength(mermaidCode || '', 'utf8');
  const defaults = defaultDiagramMetadata(type);
  const sourceHash = crypto
    .createHash('sha256')
    .update(String(mermaidCode || ''))
    .digest('hex');
  return {
    type,
    file: path.basename(filePath),
    outputPath: rootPath ? path.relative(rootPath, filePath) : filePath,
    purpose: metadata.purpose || defaults.purpose,
    consumers: Array.isArray(metadata.consumers) ? metadata.consumers : defaults.consumers,
    source: metadata.source || defaults.source,
    commitPolicy: 'generated_artifact',
    sourceHash,
    lines: lines.length,
    bytes,
    approxTokens: estimateTokensFromBytes(bytes),
    isPlaceholder: isPlaceholderDiagram(mermaidCode),
    ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

module.exports = {
  generate,
  generateDiagramArtifact,
  isPlaceholderDiagram,
  toManifestEntry,
};
