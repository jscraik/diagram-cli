const {
  mapSafeNames,
  appendClassAssignment,
} = require('./analysis-generation-utils');

function safeNodeIds(components, safeNames) {
  if (!Array.isArray(components)) return [];
  return components.map((component) => safeNames.get(component)).filter(Boolean);
}

function emitClassStyle(lines, className, fill, color, nodeIds) {
  lines.push(`  classDef ${className} fill:${fill},color:${color}`);
  appendClassAssignment(lines, nodeIds, className);
}

function emitSeedNodesWithIngress(lines, seeds, safeNames, options = {}) {
  const {
    nodeIds,
    renderNode,
    ingressFrom,
    edges,
  } = options;

  if (!Array.isArray(seeds)) return;
  for (const seed of seeds) {
    const safe = safeNames.get(seed);
    if (!safe) continue;

    if (Array.isArray(nodeIds)) nodeIds.push(safe);
    if (typeof renderNode === 'function') {
      lines.push(`  ${renderNode(seed, safe)}`);
    }

    if (!ingressFrom || !(edges instanceof Set)) continue;
    const key = `${ingressFrom}->${safe}`;
    if (edges.has(key)) continue;
    edges.add(key);
    lines.push(`  ${ingressFrom} --> ${safe}`);
  }
}

function emitSubgraph(lines, id, title, components, renderNode, safeNames) {
  if (!Array.isArray(components) || components.length === 0) return false;

  const names = safeNames || mapSafeNames(components);
  lines.push(`  subgraph ${id}["${title}"]`);
  for (const component of components) {
    const safe = names.get(component);
    if (!safe) continue;
    lines.push(`    ${renderNode(component, safe)}`);
  }
  lines.push('  end');
  return true;
}

module.exports = {
  safeNodeIds,
  emitClassStyle,
  emitSeedNodesWithIngress,
  emitSubgraph,
};
