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
  emitSubgraph,
};
