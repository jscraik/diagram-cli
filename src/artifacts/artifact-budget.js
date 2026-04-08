const AGENT_DIAGRAM_PRIORITY = Object.freeze([
  'architecture',
  'dependency',
  'database',
  'security',
  'auth',
  'events',
  'user',
  'flow',
  'class',
  'sequence',
  'agent',
  'c4context',
  'rag',
]);
const BYTES_PER_TOKEN_ESTIMATE = 4;

const BASE_ARTIFACT_PROFILES = Object.freeze({
  full: Object.freeze({
    name: 'full',
    maxBytesTotal: null,
    maxBytesPerDiagram: null,
    maxDiagrams: null,
    priorityOrder: AGENT_DIAGRAM_PRIORITY,
  }),
  agent: Object.freeze({
    name: 'agent',
    maxBytesTotal: 12000,
    maxBytesPerDiagram: 4000,
    maxDiagrams: 4,
    priorityOrder: AGENT_DIAGRAM_PRIORITY,
  }),
  'ultra-compact': Object.freeze({
    name: 'ultra-compact',
    maxBytesTotal: 9000,
    maxBytesPerDiagram: 3000,
    maxDiagrams: 3,
    priorityOrder: AGENT_DIAGRAM_PRIORITY,
  }),
});

function toPositiveInt(value) {
  if (value === null || value === undefined) return null;
  if (value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function byteLength(text) {
  return Buffer.byteLength(String(text || ''), 'utf8');
}

function estimateTokensFromBytes(byteCount) {
  const normalized = Number.isFinite(byteCount) ? byteCount : 0;
  return Math.ceil(normalized / BYTES_PER_TOKEN_ESTIMATE);
}

function resolveArtifactProfile(profileName = 'full', overrides = {}) {
  const normalizedName = String(profileName || 'full').toLowerCase();
  const base = BASE_ARTIFACT_PROFILES[normalizedName];
  if (!base) {
    const supported = Object.keys(BASE_ARTIFACT_PROFILES).join(', ');
    throw new Error(`Invalid artifact profile "${profileName}". Supported profiles: ${supported}`);
  }

  return {
    ...base,
    maxBytesTotal: toPositiveInt(overrides.maxBytesTotal) ?? base.maxBytesTotal,
    maxBytesPerDiagram: toPositiveInt(overrides.maxBytesPerDiagram) ?? base.maxBytesPerDiagram,
    maxDiagrams: toPositiveInt(overrides.maxDiagrams) ?? base.maxDiagrams,
    priorityOrder: Array.isArray(base.priorityOrder) ? [...base.priorityOrder] : [],
  };
}

function sortByPriority(diagrams, priorityOrder) {
  const rank = new Map((priorityOrder || []).map((type, index) => [type, index]));
  return [...(Array.isArray(diagrams) ? diagrams : [])].sort((left, right) => {
    const leftRank = rank.has(left.type) ? rank.get(left.type) : Number.MAX_SAFE_INTEGER;
    const rightRank = rank.has(right.type) ? rank.get(right.type) : Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return String(left.type || '').localeCompare(String(right.type || ''));
  });
}

function truncateMermaidByBytes(mermaid, maxBytes) {
  const content = String(mermaid || '');
  const originalBytes = byteLength(content);
  if (!maxBytes || originalBytes <= maxBytes) {
    return {
      content,
      bytes: originalBytes,
      originalBytes,
      truncated: false,
      omittedLines: 0,
    };
  }

  const sourceLines = content.split(/\r?\n/);
  const marker = `%% compacted: truncated to ${maxBytes} bytes from ${originalBytes} bytes`;
  const suffix = '%% compacted: tail omitted';
  const header = `${marker}\n`;
  const footer = `\n${suffix}\n`;
  const maxBodyBytes = maxBytes - byteLength(header) - byteLength(footer);
  if (maxBodyBytes <= 0) {
    const minimal = `${marker}\n${suffix}\n`;
    return {
      content: minimal,
      bytes: byteLength(minimal),
      originalBytes,
      truncated: true,
      omittedLines: sourceLines.length,
    };
  }

  const keptLines = [];
  let bodyBytes = 0;
  for (const line of sourceLines) {
    const candidate = keptLines.length > 0 ? `\n${line}` : line;
    const candidateBytes = byteLength(candidate);
    if (bodyBytes + candidateBytes > maxBodyBytes) {
      break;
    }
    keptLines.push(line);
    bodyBytes += candidateBytes;
  }

  const compacted = `${header}${keptLines.join('\n')}${footer}`;
  return {
    content: compacted,
    bytes: byteLength(compacted),
    originalBytes,
    truncated: true,
    omittedLines: Math.max(sourceLines.length - keptLines.length, 0),
  };
}

function applyArtifactBudget(diagrams, profile) {
  const sorted = sortByPriority(diagrams, profile.priorityOrder);
  const included = [];
  const omitted = [];
  let writtenBytes = 0;
  let originalBytes = 0;

  for (const diagram of sorted) {
    const source = String(diagram.mermaid || '');
    const sourceBytes = byteLength(source);
    originalBytes += sourceBytes;

    if (profile.maxDiagrams && included.length >= profile.maxDiagrams) {
      omitted.push({
        type: diagram.type,
        reason: 'max_diagrams',
        originalBytes: sourceBytes,
      });
      continue;
    }

    const compacted = truncateMermaidByBytes(source, profile.maxBytesPerDiagram);

    if (profile.maxBytesTotal && writtenBytes + compacted.bytes > profile.maxBytesTotal) {
      omitted.push({
        type: diagram.type,
        reason: 'max_total_bytes',
        originalBytes: sourceBytes,
      });
      continue;
    }

    included.push({
      type: diagram.type,
      mermaid: compacted.content,
      bytes: compacted.bytes,
      originalBytes: compacted.originalBytes,
      truncated: compacted.truncated,
      omittedLines: compacted.omittedLines,
      bytesSaved: Math.max(compacted.originalBytes - compacted.bytes, 0),
    });
    writtenBytes += compacted.bytes;
  }

  const truncatedTypes = included
    .filter((entry) => entry.truncated)
    .map((entry) => entry.type);
  const bytesSaved = Math.max(originalBytes - writtenBytes, 0);

  return {
    included,
    omitted,
    truncatedTypes,
    applied: omitted.length > 0 || truncatedTypes.length > 0,
    summary: {
      generatedCount: sorted.length,
      includedCount: included.length,
      omittedCount: omitted.length,
      originalBytes,
      writtenBytes,
      bytesSaved,
    },
  };
}

module.exports = {
  AGENT_DIAGRAM_PRIORITY,
  estimateTokensFromBytes,
  resolveArtifactProfile,
  applyArtifactBudget,
  sortByPriority,
};
