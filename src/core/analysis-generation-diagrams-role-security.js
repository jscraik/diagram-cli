const {
  escapeMermaid,
  sanitize,
  componentsByRole,
  mergeRoleComponents,
  buildRoleDiagramContext,
  appendDependencyEdges,
} = require('./analysis-generation-utils');
const { collectExternalImports } = require('./analysis-generation-role-tags');
const { flowNote, noteNode } = require('./analysis-generation-diagrams-empty');
const {
  emitClassStyle,
  emitSeedNodesWithIngress,
} = require('./analysis-generation-diagrams-role-helpers');

/**
 * Build a Mermaid flowchart showing authentication-related components and their dependencies.
 *
 * @param {Object} data - Analysis data containing a `components` array; each component may include role, imports and identifying fields used to render nodes.
 * @returns {string} The Mermaid `flowchart TD` source representing authentication components, their ingress boundary, dependency edges and external provider nodes; when input is missing or contains no components this returns a small note diagram indicating no data or no authentication components.
 */
function generateAuth(data) {
  if (!data || !Array.isArray(data.components)) {
    return flowNote('No data available');
  }

  const lines = ['flowchart TD'];
  const seeds = componentsByRole(data.components, 'auth');
  if (seeds.length === 0) {
    lines.push(noteNode('No authentication components found'));
    return lines.join('\n');
  }

  const { connected, byName, safeNames } = buildRoleDiagramContext(data, seeds, 2, 24);
  const edges = new Set();
  const authNodeIds = [];

  lines.push('  Request["Authentication request"]');
  lines.push('  Boundary{"Auth Boundary"}');
  lines.push('  Request --> Boundary');

  emitSeedNodesWithIngress(lines, seeds, safeNames, {
    nodeIds: authNodeIds,
    renderNode: (seed, safe) => `${safe}["${escapeMermaid(seed.originalName)}"]`,
    ingressFrom: 'Boundary',
    edges,
  });

  appendDependencyEdges(lines, connected, byName, safeNames, edges);

  const providerNodeByPackage = new Map();
  const providerEdges = new Set();
  const externalImportsBySeed = new Map();
  for (const seed of seeds) {
    const externalImports = collectExternalImports(seed.imports || []);
    externalImportsBySeed.set(seed, externalImports);
    for (const pkg of externalImports) {
      if (!providerNodeByPackage.has(pkg)) {
        providerNodeByPackage.set(pkg, `ext_${sanitize(pkg)}`);
      }
    }
  }
  for (const [provider, providerNode] of providerNodeByPackage) {
    lines.push(`  ${providerNode}[("${escapeMermaid(provider)}")]`);
  }
  for (const seed of seeds) {
    const seedNode = safeNames.get(seed);
    if (!seedNode) continue;
    for (const pkg of externalImportsBySeed.get(seed) || []) {
      const providerNode = providerNodeByPackage.get(pkg);
      if (!providerNode) continue;
      const edgeKey = `${seedNode}->${providerNode}`;
      if (providerEdges.has(edgeKey)) continue;
      providerEdges.add(edgeKey);
      lines.push(`  ${seedNode} --> ${providerNode}`);
    }
  }

  emitClassStyle(lines, 'authNode', '#7c3aed', '#fff', authNodeIds);
  return lines.join('\n');
}

/**
 * Generate a Mermaid flowchart showing security-related components and their dependencies.
 *
 * Builds a `flowchart TD` diagram with an "Untrusted input" ingress node, nodes for components
 * with roles `security`, `auth` and `integrations`, dependency edges between them, and class
 * styling for security nodes.
 *
 * @param {Object} data - Analysis input containing a `components` array of component objects.
 * @returns {string} The Mermaid `flowchart TD` source. If `data` is missing or malformed, the
 * returned diagram contains a "No data available" note; if no matching components are found,
 * the diagram contains a "No security-focused components found" note.
 */
function generateSecurity(data) {
  if (!data || !Array.isArray(data.components)) {
    return flowNote('No data available');
  }

  const lines = ['flowchart TD'];
  const seeds = mergeRoleComponents(data.components, ['security', 'auth', 'integrations']);

  if (seeds.length === 0) {
    lines.push(noteNode('No security-focused components found'));
    return lines.join('\n');
  }

  const { connected, byName, safeNames } = buildRoleDiagramContext(data, seeds, 2, 40);
  const edges = new Set();
  const securityNodeIds = [];

  lines.push('  Untrusted["Untrusted input"]');
  emitSeedNodesWithIngress(lines, seeds, safeNames, {
    nodeIds: securityNodeIds,
    renderNode: (seed, safe) => `${safe}["${escapeMermaid(seed.originalName)}"]`,
    ingressFrom: 'Untrusted',
    edges,
  });

  appendDependencyEdges(lines, connected, byName, safeNames, edges);

  emitClassStyle(lines, 'securityNode', '#dc2626', '#fff', securityNodeIds);
  return lines.join('\n');
}

module.exports = {
  generateAuth,
  generateSecurity,
};
