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

function buildContextPack({
  rootDir,
  tmpDir,
  contextMaxBytes = 12000,
  contextMaxLinesPerDiagram = 140,
  contextMaxEmbeddedDiagrams = 3,
  contextPath,
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

  const headerLines = [
    '# Diagram Context Pack',
    '',
    'Machine-oriented context for agents. This pack is intentionally compact and token-budgeted.',
    '',
    `Generated: ${nowIso}`,
    `Root: ${rootDir}`,
    `Context byte budget: ${contextMaxBytes}`,
    `Max embedded diagrams: ${contextMaxEmbeddedDiagrams}`,
    `Max lines per embedded diagram: ${contextMaxLinesPerDiagram}`,
    '',
    '## Diagram Index',
    '',
    '| Type | File | Bytes | Lines | Placeholder | Approx Tokens |',
    '| --- | --- | ---: | ---: | --- | ---: |',
  ];

  for (const entry of sortedDiagrams) {
    headerLines.push(
      `| ${entry.type} | ${entry.file} | ${entry.bytes} | ${entry.lines} | ${entry.isPlaceholder ? 'yes' : 'no'} | ${estimateTokensFromBytes(entry.bytes || 0)} |`
    );
  }

  headerLines.push('');
  headerLines.push('## Embedded Mermaid (Budgeted)');
  headerLines.push('');

  let contextText = `${headerLines.join('\n')}\n`;
  let embeddedCount = 0;
  const omittedTypes = [];

  for (const entry of sortedDiagrams) {
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
    contextText = next;
    embeddedCount += 1;
  }

  if (omittedTypes.length > 0) {
    contextText += [
      '## Omitted Diagrams',
      '',
      `Omitted from embedding due to budget/profile constraints: ${omittedTypes.join(', ')}`,
      'Use `.diagram/*.mmd` files directly for full-fidelity diagram content.',
      '',
    ].join('\n');
  }

  writeFileSync(contextPath, contextText);
  return {
    embeddedCount,
    omittedTypes,
    bytes: Buffer.byteLength(contextText, 'utf8'),
  };
}

function runFromEnv() {
  const rootDir = process.env.ROOT_DIR;
  const tmpDir = process.env.TMP_DIR;
  const contextPath = process.env.CONTEXT_OUTPUT_PATH;
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
