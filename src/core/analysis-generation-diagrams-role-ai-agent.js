const { ROLE_COLOURS } = require('./analysis-generation-constants');
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
  emitClassStyle,
  emitSubgraph,
} = require('./analysis-generation-diagrams-role-helpers');

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
  for (const spec of layerSpecs) {
    emitSubgraph(lines, spec.id, spec.title, spec.components, spec.renderNode, safeNames);
  }

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
    { className: 'agentNode', colourKey: 'agent', components: agents },
    { className: 'llmNode', colourKey: 'llm', components: llms },
    { className: 'toolNode', colourKey: 'tool', components: tools },
    { className: 'memNode', colourKey: 'memory', components: memories },
  ];
  for (const spec of classSpecs) {
    const roleColour = ROLE_COLOURS[spec.colourKey];
    emitClassStyle(
      lines,
      spec.className,
      roleColour.fill,
      roleColour.color,
      safeNodeIds(spec.components, safeNames)
    );
  }

  return lines.join('\n');
}

module.exports = {
  generateAgent,
};
