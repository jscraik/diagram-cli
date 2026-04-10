const {
  escapeMermaid,
  componentsByRole,
  mergeRoleComponents,
  mapSafeNames,
  byNameIndex,
  appendDependencyEdges,
} = require('./analysis-generation-utils');
const { flowNote, noteNode } = require('./analysis-generation-diagrams-empty');
const {
  safeNodeIds,
  emitRoleClassStyle,
  emitSubgraphSpecs,
} = require('./analysis-generation-diagrams-role-helpers');

/**
 * Build a Mermaid flowchart string visualising agents, tools, memories and LLMs as layered subgraphs with dependency edges and per-role styling.
 *
 * @param {Object} data - Input container.
 * @param {Array} data.components - Array of component descriptors (roles like `agent`, `tool`, `memory`, `llm`, etc.) used to populate layers and edges.
 * @returns {string} A Mermaid `flowchart TD` diagram string. If `data` is missing or contains no relevant components, the diagram contains a note indicating no data is available.
function generateAgent(data) {
  if (!data || !Array.isArray(data.components)) {
    return flowNote('No data available');
  }

  const lines = ['flowchart TD'];

  const agents = componentsByRole(data.components, 'agent');
  const tools = componentsByRole(data.components, 'tool');
  const memories = componentsByRole(data.components, 'memory');
  const llms = componentsByRole(data.components, 'llm');

  const all = mergeRoleComponents(data.components, [
    'agent',
    'tool',
    'memory',
    'llm',
    { role: 'user', limit: 2 },
  ]);
  if (all.length === 0) {
    lines.push(noteNode('No agent/LLM components found — add agent, tool, memory, or llm patterns'));
    return lines.join('\n');
  }

  const safeNames = mapSafeNames(all);
  const byName = byNameIndex(all);

  const layerSpecs = [
    {
      id: 'Orchestration',
      title: '🎯 Orchestration Layer',
      components: agents,
      renderNode: (component, safe) => `${safe}["🤖 ${escapeMermaid(component.originalName)}"]`,
    },
    {
      id: 'LLMLayer',
      title: '🧠 LLM / Model Layer',
      components: llms,
      renderNode: (component, safe) => `${safe}["💡 ${escapeMermaid(component.originalName)}"]`,
    },
    {
      id: 'ToolLayer',
      title: '🔧 Tool Layer',
      components: tools,
      renderNode: (component, safe) => `${safe}["🔧 ${escapeMermaid(component.originalName)}"]`,
    },
    {
      id: 'MemoryLayer',
      title: '📚 Memory / Vector Layer',
      components: memories,
      renderNode: (component, safe) => `${safe}[("📚 ${escapeMermaid(component.originalName)}")]`,
    },
  ];
  emitSubgraphSpecs(lines, layerSpecs, safeNames);

  const edges = new Set();
  appendDependencyEdges(lines, all, byName, safeNames, edges, (_caller, callee) => {
    const tags = callee.roleTags || [];
    if (tags.includes('tool')) return 'invokes';
    if (tags.includes('memory')) return 'retrieves from';
    if (tags.includes('llm')) return 'calls LLM';
    if (tags.includes('agent')) return 'delegates to';
    return 'uses';
  });

  const classSpecs = [
    { className: 'agentNode', roleKey: 'agent', components: agents },
    { className: 'llmNode', roleKey: 'llm', components: llms },
    { className: 'toolNode', roleKey: 'tool', components: tools },
    { className: 'memNode', roleKey: 'memory', components: memories },
  ];
  for (const spec of classSpecs) {
    emitRoleClassStyle(lines, spec.className, spec.roleKey, safeNodeIds(spec.components, safeNames));
  }

  return lines.join('\n');
}

module.exports = {
  generateAgent,
};
