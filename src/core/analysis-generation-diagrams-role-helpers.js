const {
  mapSafeNames,
  appendClassAssignment,
} = require('./analysis-generation-utils');
const { ROLE_COLOURS } = require('./analysis-generation-constants');

/**
 * Convert a list of components into their corresponding safe node identifiers.
 *
 * @param {Array} components - Array of component keys to map; non-array inputs are treated as empty.
 * @param {Map} safeNames - Map from component key to safe node identifier.
 * @returns {Array<string>} An array of safe node IDs corresponding to entries in `components`; entries without a mapping are omitted.
 */
function safeNodeIds(components, safeNames) {
  if (!Array.isArray(components)) return [];
  return components.map((component) => safeNames.get(component)).filter(Boolean);
}

/**
 * Emit a Mermaid class definition and assign that class to the given nodes.
 * @param {string[]} lines - Mutable array of diagram lines to append to.
 * @param {string} className - Identifier for the class to define and assign.
 * @param {string} fill - Fill colour for the class (e.g. `#ffffff` or `transparent`).
 * @param {string} color - Text/stroke colour for the class.
 * @param {string[]|undefined} nodeIds - Optional list of safe node identifiers to assign to the class.
 */
function emitClassStyle(lines, className, fill, color, nodeIds) {
  lines.push(`  classDef ${className} fill:${fill},color:${color}`);
  appendClassAssignment(lines, nodeIds, className);
}

/**
 * Appends rendered seed nodes to the output lines and, optionally, records their safe IDs and emits unique ingress edges from a specified source.
 * @param {string[]} lines - Array of output lines to append to.
 * @param {Array} seeds - Seed identifiers to process.
 * @param {Map} safeNames - Map from seed identifier to its safe node id.
 * @param {Object} [options] - Optional behaviours.
 * @param {string[]} [options.nodeIds] - Array that will receive safe node ids for processed seeds.
 * @param {Function} [options.renderNode] - Function(seed, safeId) that returns a node markup string to append to lines.
 * @param {string} [options.ingressFrom] - Source node id for ingress edges; when falsy no ingress edges are emitted.
 * @param {Set} [options.edges] - Set used to deduplicate emitted ingress edges; a key `${ingressFrom}->${safe}` is added for each emitted edge.
 */
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

/**
 * Emit a Mermaid `subgraph` block into `lines` for the provided components.
 *
 * Adds a subgraph header with the given `id` and `title`, emits a line for each
 * component that has a corresponding safe name, and closes the subgraph.
 *
 * @param {string[]} lines - Array to which Mermaid lines are appended.
 * @param {string|number} id - Identifier for the subgraph.
 * @param {string} title - Display title for the subgraph.
 * @param {Array} components - List of components to include in the subgraph.
 * @param {function(any, string): string} renderNode - Function that returns the line for a component given the original component and its safe name.
 * @param {Map<any,string>} [safeNames] - Optional map of component -> safe node id; if omitted, safe names are derived from `components`.
 * @returns {boolean} `true` if a subgraph was emitted, `false` otherwise.
 */
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
