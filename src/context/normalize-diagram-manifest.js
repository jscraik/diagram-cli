const { createHash } = require('node:crypto');
const { readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

function ensureTrailingNewline(content) {
  return content.endsWith('\n') ? content : `${content}\n`;
}

function stableId(prefix, value) {
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || prefix;
  const digest = createHash('sha1').update(String(value)).digest('hex').slice(0, 8);
  return `${prefix}_${slug}_${digest}`;
}

function parseArchitecture(content) {
  const lines = String(content || '').trimEnd().split(/\r?\n/);
  const subgraphs = [];
  let currentSubgraph = null;

  for (const line of lines) {
    const subgraphMatch = line.match(/^  subgraph (\S+)\["(.+)"\]$/);
    if (subgraphMatch) {
      currentSubgraph = {
        rawId: subgraphMatch[1],
        label: subgraphMatch[2],
        nodes: [],
      };
      subgraphs.push(currentSubgraph);
      continue;
    }

    if (line === '  end') {
      currentSubgraph = null;
      continue;
    }

    const nodeMatch = line.match(/^    (\S+)\["(.+)"\]$/);
    if (nodeMatch && currentSubgraph) {
      currentSubgraph.nodes.push({
        rawId: nodeMatch[1],
        label: nodeMatch[2],
      });
    }
  }

  return subgraphs;
}

function buildArchitecture(subgraphs) {
  const nodeMap = new Map();
  const lines = ['graph TD'];
  const sortedSubgraphs = [...subgraphs].sort((left, right) =>
    left.label.localeCompare(right.label)
  );

  for (const subgraph of sortedSubgraphs) {
    const subgraphId = stableId('sg', subgraph.label);
    lines.push(`  subgraph ${subgraphId}["${subgraph.label}"]`);
    const sortedNodes = [...subgraph.nodes].sort((left, right) =>
      left.label.localeCompare(right.label)
    );
    for (const node of sortedNodes) {
      const nodeId = stableId('node', `${subgraph.label}/${node.label}`);
      nodeMap.set(node.rawId, { canonicalId: nodeId, label: node.label });
      lines.push(`    ${nodeId}["${node.label}"]`);
    }
    lines.push('  end');
  }

  return {
    content: ensureTrailingNewline(lines.join('\n')),
    nodeMap,
  };
}

function buildDependency(content, nodeMap) {
  const lines = String(content || '').trimEnd().split(/\r?\n/);
  if (lines.length === 0) {
    return ensureTrailingNewline(String(content || ''));
  }

  const externalNodeMap = new Map();
  const dependencyEdges = [];
  const styleEntries = [];

  for (const line of lines.slice(1)) {
    const edgeMatch = line.match(/^  (\S+)\["(.+)"\] --> (\S+)$/);
    if (edgeMatch) {
      const [, rawSourceId, sourceLabel, rawTargetId] = edgeMatch;
      const target = nodeMap.get(rawTargetId) ?? {
        canonicalId: stableId('node', rawTargetId),
        label: rawTargetId,
      };
      const sourceCanonicalId =
        externalNodeMap.get(rawSourceId) ?? stableId('ext', sourceLabel);
      externalNodeMap.set(rawSourceId, sourceCanonicalId);
      dependencyEdges.push({
        line: `  ${sourceCanonicalId}["${sourceLabel}"] --> ${target.canonicalId}`,
        sortKey: `${sourceLabel}::${target.label}`,
      });
      continue;
    }

    const styleMatch = line.match(/^  style (\S+) (.+)$/);
    if (!styleMatch) continue;
    const [, rawNodeId, styleSpec] = styleMatch;
    const canonicalId = externalNodeMap.get(rawNodeId);
    if (!canonicalId) continue;
    styleEntries.push({
      line: `  style ${canonicalId} ${styleSpec}`,
      sortKey: canonicalId,
    });
  }

  return ensureTrailingNewline([
    'graph LR',
    ...dependencyEdges
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
      .map((entry) => entry.line),
    ...styleEntries
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
      .map((entry) => entry.line),
  ].join('\n'));
}

function isPlaceholderDiagram(content) {
  const text = String(content || '');
  return /placeholder/i.test(text)
    || /not enough/i.test(text)
    || /limited to/i.test(text);
}

function normalizeDiagramManifest({ rootDir, tmpDir, manifestPath }) {
  if (!rootDir || !tmpDir || !manifestPath) {
    throw new Error('normalizeDiagramManifest requires rootDir, tmpDir, and manifestPath');
  }

  const diagramsDir = join(tmpDir, 'diagrams');
  let sourceManifest = {};
  try {
    sourceManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (_error) {
    sourceManifest = {};
  }

  const diagramFiles = readdirSync(diagramsDir).filter((entry) => entry.endsWith('.mmd'));
  const architecturePath = join(diagramsDir, 'architecture.mmd');
  const dependencyPath = join(diagramsDir, 'dependency.mmd');

  if (diagramFiles.includes('architecture.mmd')) {
    const architectureContent = readFileSync(architecturePath, 'utf8');
    const { content: canonicalArchitecture, nodeMap } = buildArchitecture(
      parseArchitecture(architectureContent)
    );
    writeFileSync(architecturePath, canonicalArchitecture);

    if (diagramFiles.includes('dependency.mmd')) {
      const dependencyContent = readFileSync(dependencyPath, 'utf8');
      writeFileSync(dependencyPath, buildDependency(dependencyContent, nodeMap));
    }
  }

  for (const file of diagramFiles) {
    if (file === 'architecture.mmd' || file === 'dependency.mmd') {
      continue;
    }
    const filePath = join(diagramsDir, file);
    writeFileSync(filePath, ensureTrailingNewline(readFileSync(filePath, 'utf8').trimEnd()));
  }

  const diagrams = readdirSync(diagramsDir)
    .filter((file) => file.endsWith('.mmd'))
    .sort()
    .map((file) => {
      const content = readFileSync(join(diagramsDir, file), 'utf8');
      return {
        type: file.replace(/\.mmd$/, ''),
        file,
        outputPath: `.diagram/${file}`,
        lines: content.split(/\r?\n/).length,
        bytes: Buffer.byteLength(content),
        isPlaceholder: isPlaceholderDiagram(content),
      };
    });

  const manifest = {
    generatedAt: new Date().toISOString(),
    rootPath: rootDir,
    diagramDir: '.diagram',
    ...(sourceManifest && typeof sourceManifest.compaction === 'object'
      ? { compaction: sourceManifest.compaction }
      : {}),
    diagrams,
  };

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function runFromEnv() {
  const rootDir = process.env.ROOT_DIR;
  const tmpDir = process.env.TMP_DIR;
  const manifestPath = process.env.MANIFEST_PATH;
  normalizeDiagramManifest({ rootDir, tmpDir, manifestPath });
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
  normalizeDiagramManifest,
};
