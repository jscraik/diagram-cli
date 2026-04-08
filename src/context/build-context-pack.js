const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  AGENT_DIAGRAM_PRIORITY,
  estimateTokensFromBytes,
  sortByPriority,
} = require('../artifacts/artifact-budget');

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function trimToMaxLines(content, maxLines) {
  const lines = String(content || '').trimEnd().split(/\r?\n/);
  if (lines.length <= maxLines) {
    return { text: lines.join('\n'), truncated: false, omittedLines: 0 };
  }
  const kept = lines.slice(0, maxLines);
  return {
    text: kept.join('\n'),
    truncated: true,
    omittedLines: lines.length - maxLines,
  };
}

function buildOmittedSection(omittedTypes, compact = false) {
  if (!Array.isArray(omittedTypes) || omittedTypes.length === 0) {
    return '';
  }

  if (compact) {
    return [
      '## Omitted Diagrams',
      '',
      `Omitted from embedding due to budget/profile constraints: ${omittedTypes.length} diagram(s).`,
      '',
    ].join('\n');
  }

  return [
    '## Omitted Diagrams',
    '',
    `Omitted from embedding due to budget/profile constraints: ${omittedTypes.join(', ')}`,
    'Use `.diagram/*.mmd` files directly for full-fidelity diagram content.',
    '',
  ].join('\n');
}

function buildHeaderText({
  sortedDiagrams,
  contextMaxBytes,
  contextMaxEmbeddedDiagrams,
  contextMaxLinesPerDiagram,
}) {
  const staticPrefix = [
    '# Diagram Context Pack',
    '',
    'Machine-oriented context for agents. This pack is intentionally compact and token-budgeted.',
    '',
    `Context byte budget: ${contextMaxBytes}`,
    `Max embedded diagrams: ${contextMaxEmbeddedDiagrams}`,
    `Max lines per embedded diagram: ${contextMaxLinesPerDiagram}`,
    '',
    '## Diagram Index',
    '',
    '| Type | File | Bytes | Lines | Placeholder | Approx Tokens |',
    '| --- | --- | ---: | ---: | --- | ---: |',
  ];
  const staticSuffix = ['', '## Embedded Mermaid (Budgeted)', '', ''];
  const indexRows = [];

  const buildCandidate = (rows, summaryLine = '') => {
    const summary = summaryLine ? ['', summaryLine] : [];
    return `${staticPrefix.concat(rows, summary, staticSuffix).join('\n')}`;
  };

  for (const entry of sortedDiagrams) {
    const row = `| ${entry.type} | ${entry.file} | ${entry.bytes} | ${entry.lines} | ${entry.isPlaceholder ? 'yes' : 'no'} | ${estimateTokensFromBytes(entry.bytes || 0)} |`;
    const candidateWithRow = buildCandidate(indexRows.concat(row));
    if (Buffer.byteLength(candidateWithRow, 'utf8') > contextMaxBytes) {
      break;
    }
    indexRows.push(row);
  }

  const compacted = indexRows.length < sortedDiagrams.length;
  const compactSummary = compacted
    ? `Diagram index compacted to ${indexRows.length}/${sortedDiagrams.length} row(s) to fit budget.`
    : '';
  const candidate = buildCandidate(indexRows, compactSummary);
  if (Buffer.byteLength(candidate, 'utf8') <= contextMaxBytes) {
    return {
      text: candidate,
      indexRowsIncluded: indexRows.length,
      headerCompacted: compacted,
    };
  }

  const minimal = [
    '# Diagram Context Pack',
    '',
    `Compact header due to strict budget (${contextMaxBytes} bytes).`,
    `Diagrams available: ${sortedDiagrams.length}`,
    `Max embedded diagrams: ${contextMaxEmbeddedDiagrams}`,
    `Max lines per embedded diagram: ${contextMaxLinesPerDiagram}`,
    '',
    '## Embedded Mermaid (Budgeted)',
    '',
  ].join('\n');
  if (Buffer.byteLength(minimal, 'utf8') > contextMaxBytes) {
    throw new Error(`Context byte budget (${contextMaxBytes}) is too small for header.`);
  }
  return {
    text: minimal,
    indexRowsIncluded: 0,
    headerCompacted: true,
  };
}

function buildContextPack({
  rootDir,
  tmpDir,
  contextMaxBytes = 12000,
  contextMaxLinesPerDiagram = 140,
  contextMaxEmbeddedDiagrams = 3,
  contextPath,
  contextMetaPath,
}) {
  if (!rootDir || !tmpDir || !contextPath) {
    throw new Error('buildContextPack requires rootDir, tmpDir, and contextPath');
  }

  const diagramsDir = join(tmpDir, 'diagrams');
  const manifestPath = join(diagramsDir, 'manifest.json');
  const nowIso = new Date().toISOString();

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const diagramEntries = Array.isArray(manifest.diagrams) ? manifest.diagrams : [];
  const sortedDiagrams = sortByPriority(diagramEntries, AGENT_DIAGRAM_PRIORITY);

  const header = buildHeaderText({
    sortedDiagrams,
    contextMaxBytes,
    contextMaxEmbeddedDiagrams,
    contextMaxLinesPerDiagram,
  });
  const headerText = header.text;
  let contextText = headerText;
  let embeddedCount = 0;
  const omittedTypes = [];
  const includedSections = [];

  for (let index = 0; index < sortedDiagrams.length; index += 1) {
    const entry = sortedDiagrams[index];
    if (embeddedCount >= contextMaxEmbeddedDiagrams) {
      omittedTypes.push(entry.type);
      continue;
    }
    const diagramPath = join(diagramsDir, entry.file);
    const rawContent = readFileSync(diagramPath, 'utf8');
    const rawBytes = Buffer.byteLength(rawContent || '', 'utf8');
    const { text: trimmedContent, truncated, omittedLines } = trimToMaxLines(
      rawContent,
      contextMaxLinesPerDiagram
    );

    const section = [
      `### ${entry.type}`,
      '',
      `Path: \`.diagram/${entry.file}\``,
      `Approx tokens (full): ${estimateTokensFromBytes(rawBytes)}`,
      ...(truncated ? [`Note: truncated to ${contextMaxLinesPerDiagram} lines (${omittedLines} lines omitted).`] : []),
      '',
      '```mermaid',
      trimmedContent,
      '```',
      '',
    ].join('\n');

    const next = contextText + section;
    if (Buffer.byteLength(next, 'utf8') > contextMaxBytes) {
      omittedTypes.push(entry.type);
      continue;
    }

    const remainingTypes = sortedDiagrams
      .slice(index + 1)
      .map((remaining) => remaining.type);
    const reservedOmittedSection = buildOmittedSection(
      omittedTypes.concat(remainingTypes)
    );
    if (Buffer.byteLength(next + reservedOmittedSection, 'utf8') > contextMaxBytes) {
      omittedTypes.push(entry.type);
      continue;
    }

    contextText = next;
    embeddedCount += 1;
    includedSections.push({ type: entry.type, section });
  }

  let omittedSection = buildOmittedSection(omittedTypes);
  while (
    Buffer.byteLength(contextText + omittedSection, 'utf8') > contextMaxBytes
    && includedSections.length > 0
  ) {
    const removed = includedSections.pop();
    embeddedCount = Math.max(embeddedCount - 1, 0);
    omittedTypes.push(removed.type);
    contextText = headerText + includedSections.map((entry) => entry.section).join('');
    omittedSection = buildOmittedSection(omittedTypes);
  }

  if (
    Buffer.byteLength(contextText + omittedSection, 'utf8') > contextMaxBytes
    && omittedTypes.length > 0
  ) {
    omittedSection = buildOmittedSection(omittedTypes, true);
  }

  if (Buffer.byteLength(contextText + omittedSection, 'utf8') > contextMaxBytes) {
    omittedSection = '';
  }

  contextText += omittedSection;
  const result = {
    generatedAt: nowIso,
    rootPath: rootDir,
    embeddedCount,
    omittedTypes,
    bytes: Buffer.byteLength(contextText, 'utf8'),
    headerCompacted: header.headerCompacted,
    indexRowsIncluded: header.indexRowsIncluded,
  };
  writeFileSync(contextPath, contextText);
  if (contextMetaPath) {
    writeFileSync(contextMetaPath, `${JSON.stringify(result, null, 2)}\n`);
  }
  return result;
}

function runFromEnv() {
  const rootDir = process.env.ROOT_DIR;
  const tmpDir = process.env.TMP_DIR;
  const contextPath = process.env.CONTEXT_OUTPUT_PATH;
  const contextMetaPath = process.env.CONTEXT_META_OUTPUT_PATH;
  const contextMaxBytes = parsePositiveInt(process.env.CONTEXT_MAX_BYTES || '12000', 12000);
  const contextMaxLinesPerDiagram = parsePositiveInt(
    process.env.CONTEXT_MAX_LINES_PER_DIAGRAM || '140',
    140
  );
  const contextMaxEmbeddedDiagrams = parsePositiveInt(
    process.env.CONTEXT_MAX_EMBEDDED_DIAGRAMS || '3',
    3
  );

  buildContextPack({
    rootDir,
    tmpDir,
    contextPath,
    contextMetaPath,
    contextMaxBytes,
    contextMaxLinesPerDiagram,
    contextMaxEmbeddedDiagrams,
  });
}

if (require.main === module) {
  try {
    runFromEnv();
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(1);
  }
}

module.exports = {
  buildContextPack,
};
