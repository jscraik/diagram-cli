const chalk = require('chalk');
const path = require('path');
const { estimateTokensFromBytes } = require('../artifacts/artifact-budget');
const { findClosestMatch, formatSuggestion } = require('../utils/suggestions');
const { SUPPORTED_DIAGRAM_TYPES } = require('./analysis-generation-constants');
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

/**
 * Selects and executes the appropriate diagram generator for the requested diagram type.
 *
 * If `type` is not recognised, logs a warning (including a nearest-match suggestion when available)
 * and falls back to generating an architecture diagram.
 *
 * @param {any} data - Input data used by the selected generator to produce the diagram.
 * @param {string} type - Diagram type identifier (e.g. "architecture", "sequence", "database").
 * @param {string|undefined} [focus] - Optional focus/context passed to generators that support it.
 * @returns {string} Generated Mermaid diagram source.
 */
function generate(data, type, focus) {
  switch (type) {
    case 'architecture': return generateArchitecture(data, focus);
    case 'sequence': return generateSequence(data);
    case 'dependency': return generateDependency(data, focus);
    case 'class': return generateClass(data);
    case 'flow': return generateFlow(data);
    case 'database': return generateDatabase(data);
    case 'user': return generateUserInteractions(data);
    case 'events': return generateEvents(data);
    case 'auth': return generateAuth(data);
    case 'security': return generateSecurity(data);
    case 'agent': return generateAgent(data);
    case 'c4context': return generateC4Context(data);
    case 'rag': return generateRag(data);
    default: {
      const validTypes = [...SUPPORTED_DIAGRAM_TYPES];
      const suggestion = findClosestMatch(type, validTypes);
      console.warn(chalk.yellow(`⚠️  Unknown diagram type "${type}", using architecture`));
      if (suggestion) {
        console.warn(formatSuggestion(suggestion));
      }
      return generateArchitecture(data, focus);
    }
  }
}

/**
 * Detects whether Mermaid diagram content represents a placeholder or empty diagram.
 *
 * @param {string|null|undefined} mermaidCode - Mermaid diagram source to inspect; non-string or falsy values are treated as placeholder content.
 * @returns {boolean} `true` if the provided content is empty, not a string, or contains common placeholder notes (e.g. "no data available", "no components found"); `false` otherwise.
 */
function isPlaceholderDiagram(mermaidCode) {
  if (!mermaidCode || typeof mermaidCode !== 'string') return true;
  const compact = mermaidCode.toLowerCase();
  return compact.includes('note["no data available"]')
    || compact.includes('note["no components found')
    || compact.includes('no services detected')
    || compact.includes('note "no data available"')
    || compact.includes('note "no classes found"')
    || compact.includes('note["no database-focused components found"]')
    || compact.includes('note["no user-facing components found"]')
    || compact.includes('note["no event/channels components found"]')
    || compact.includes('note["no authentication components found"]')
    || compact.includes('note["no security-focused components found"]')
    || compact.includes('no architecture data')
    || compact.includes('no agent/llm components found')
    || compact.includes('no data available');
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
function toManifestEntry(type, filePath, mermaidCode, rootPath) {
  const lines = typeof mermaidCode === 'string' ? mermaidCode.split('\n') : [];
  const bytes = Buffer.byteLength(mermaidCode || '', 'utf8');
  return {
    type,
    file: path.basename(filePath),
    outputPath: rootPath ? path.relative(rootPath, filePath) : filePath,
    lines: lines.length,
    bytes,
    approxTokens: estimateTokensFromBytes(bytes),
    isPlaceholder: isPlaceholderDiagram(mermaidCode),
  };
}

module.exports = {
  generate,
  isPlaceholderDiagram,
  toManifestEntry,
};
