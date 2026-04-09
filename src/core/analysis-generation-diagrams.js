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
