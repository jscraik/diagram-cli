const {
  escapeMermaid,
  componentsByRole,
  buildRoleDiagramContext,
  appendDependencyEdges,
  inferDbIntent,
} = require('./analysis-generation-utils');
const { flowNote, noteNode } = require('./analysis-generation-diagrams-empty');
const {
  emitClassStyle,
  emitSeedNodesWithIngress,
} = require('./analysis-generation-diagrams-role-helpers');

/**
 * Builds a Mermaid flowchart (top-down) representing database-focused components and their implied control flow.
 *
 * @param {Object} data - Source object containing a `components` array of component records; components with role `"database"` will be rendered.
 * @returns {string} The Mermaid `flowchart TD` diagram as a single string. If `data` is missing or `data.components` is not an array, returns a "No data available" note string; if no database components are present, returns a role-specific note string.
 */
function generateDatabase(data) {
  if (!data || !Array.isArray(data.components)) {
    return flowNote('No data available');
  }

  const lines = ['flowchart TD'];
  const seeds = componentsByRole(data.components, 'database');
  if (seeds.length === 0) {
    lines.push(noteNode('No database-focused components found'));
    return lines.join('\n');
  }

  const { byName, safeNames } = buildRoleDiagramContext(data, seeds, 2, 28);

  lines.push('  UserRequest["User request"]');
  lines.push('  Decision{Record exists?}');

  const addedEdges = new Set();
  const dbNodeIds = [];

  for (const seed of seeds) {
    const safe = safeNames.get(seed);
    if (!safe) continue;

    dbNodeIds.push(safe);
    lines.push(`  ${safe}["${escapeMermaid(seed.originalName)}"]`);
    lines.push(`  UserRequest --> ${safe}`);

    const intent = inferDbIntent(seed);
    if (intent.hasLookup) {
      const lookup = `${safe}_lookup`;
      const create = `${safe}_create`;
      const update = `${safe}_update`;
      lines.push(`  ${safe} --> ${lookup}["lookup query"]`);
      lines.push(`  ${lookup} --> Decision`);
      lines.push(`  Decision -->|found| ${update}["update or modify"]`);
      lines.push(`  Decision -->|not found| ${create}["insert/create"]`);
      lines.push(`  ${update} --> ${safe}_result["result"]`);
      lines.push(`  ${create} --> ${safe}_result["result"]`);
    } else if (intent.hasWrite) {
      const write = `${safe}_write`;
      lines.push(`  ${safe} --> ${write}["write/update"]`);
      lines.push(`  ${write} --> ${safe}_result["result"]`);
    } else {
      const result = `${safe}_result`;
      lines.push(`  ${safe} --> ${result}["result"]`);
    }
  }

  appendDependencyEdges(lines, seeds, byName, safeNames, addedEdges);

  emitClassStyle(lines, 'dbNode', '#0ea5e9', '#fff', dbNodeIds);
  emitClassStyle(lines, 'decisionNode', '#0284c7', '#fff', []);
  lines.push('  class Decision decisionNode');
  return lines.join('\n');
}

/**
 * Builds a left-to-right Mermaid flowchart representing user-facing components and their dependency connections.
 *
 * @param {Object} data - Analysis input containing a `components` array; components are filtered by role `'user'`.
 * @returns {string} A Mermaid `flowchart LR` diagram as a string (may contain a note node when no data or no user-facing components are present).
 */
function generateUserInteractions(data) {
  if (!data || !Array.isArray(data.components)) {
    return flowNote('No data available', 'LR');
  }

  const lines = ['flowchart LR'];
  const seeds = componentsByRole(data.components, 'user');
  if (seeds.length === 0) {
    lines.push(noteNode('No user-facing components found'));
    return lines.join('\n');
  }

  const { connected, byName, safeNames } = buildRoleDiagramContext(data, seeds, 1, 30);
  const edges = new Set();
  const userNodeIds = [];

  lines.push('  User(("User"))');
  emitSeedNodesWithIngress(lines, seeds, safeNames, {
    nodeIds: userNodeIds,
    renderNode: (seed, safe) => `${safe}["${escapeMermaid(seed.originalName)}"]`,
    ingressFrom: 'User',
    edges,
  });

  appendDependencyEdges(lines, connected, byName, safeNames, edges);

  emitClassStyle(lines, 'userNode', '#16a34a', '#fff', userNodeIds);
  return lines.join('\n');
}

/**
 * Generate a Mermaid TD flowchart representing event channels/queues and which components emit or consume them.
 *
 * Builds a diagram that places event channel components inside a "Channels" subgraph and marks seed components as event sources (emitters) while others are rendered as consumers; also appends dependency edges between components. If `data` is missing or `data.components` is not an array, returns a compact "No data available" flow note; if no event-role components are found, returns a diagram containing a "No event/channels components found" note.
 *
 * @param {Object} data - Input model containing a `components` array describing system components.
 * @returns {string} The complete Mermaid flowchart (TD) as a string.
 */
function generateEvents(data) {
  if (!data || !Array.isArray(data.components)) {
    return flowNote('No data available');
  }

  const lines = ['flowchart TD'];
  const seeds = componentsByRole(data.components, 'events');
  if (seeds.length === 0) {
    lines.push(noteNode('No event/channels components found'));
    return lines.join('\n');
  }

  const { connected, byName, safeNames } = buildRoleDiagramContext(data, seeds, 2, 30);
  const edges = new Set();
  const eventNodeIds = [];
  const eventSeedNames = new Set(seeds.map((seed) => seed.name));

  lines.push('  subgraph Channels["Event channels / queues"]');
  for (const component of connected) {
    const safe = safeNames.get(component);
    if (!safe) continue;
    const isEventSource = eventSeedNames.has(component.name);
    if (isEventSource) {
      eventNodeIds.push(safe);
      lines.push(`    ${safe}{{"${escapeMermaid(component.originalName)}"}}`);
    } else {
      lines.push(`    ${safe}["${escapeMermaid(component.originalName)}"]`);
    }
  }
  lines.push('  end');

  appendDependencyEdges(
    lines,
    connected,
    byName,
    safeNames,
    edges,
    (component) => (eventSeedNames.has(component.name) ? 'emit' : 'consume')
  );

  emitClassStyle(lines, 'eventNode', '#db2777', '#fff', eventNodeIds);
  return lines.join('\n');
}

module.exports = {
  generateDatabase,
  generateUserInteractions,
  generateEvents,
};
