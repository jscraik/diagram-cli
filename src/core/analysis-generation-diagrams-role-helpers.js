const {
  mapSafeNames,
  appendClassAssignment,
} = require('./analysis-generation-utils');
const { ROLE_COLOURS } = require('./analysis-generation-constants');

function safeNodeIds(components, safeNames) {
  if (!Array.isArray(components)) return [];
  return components.map((component) => safeNames.get(component)).filter(Boolean);
}

function emitClassStyle(lines, className, fill, color, nodeIds) {
  lines.push(`  classDef ${className} fill:${fill},color:${color}`);
  appendClassAssignment(lines, nodeIds, className);
}

function emitRoleClassStyle(lines, className, roleKey, nodeIds, roleColours = ROLE_COLOURS) {
  const palette = roleColours?.[roleKey] || roleColours?.general || { fill: '#374151', color: '#fff' };
  emitClassStyle(lines, className, palette.fill, palette.color, nodeIds);
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

function emitSubgraphSpecs(lines, specs, safeNames) {
  if (!Array.isArray(specs)) return [];

  const emitted = [];
  for (const spec of specs) {
    if (!spec) continue;
    const didEmit = emitSubgraph(lines, spec.id, spec.title, spec.components, spec.renderNode, safeNames);
    if (didEmit) emitted.push(spec);
  }
  return emitted;
}

module.exports = {
  safeNodeIds,
  emitClassStyle,
  emitRoleClassStyle,
  emitSeedNodesWithIngress,
  emitSubgraph,
  emitSubgraphSpecs,
};
