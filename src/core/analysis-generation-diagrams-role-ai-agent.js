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

  emitSubgraph(
    lines,
    'Orchestration',
    '🎯 Orchestration Layer',
    agents,
    (component, safe) => `${safe}["🤖 ${escapeMermaid(component.originalName)}"]`,
    safeNames
  );
  emitSubgraph(
    lines,
    'LLMLayer',
    '🧠 LLM / Model Layer',
    llms,
    (component, safe) => `${safe}["💡 ${escapeMermaid(component.originalName)}"]`,
    safeNames
  );
  emitSubgraph(
    lines,
    'ToolLayer',
    '🔧 Tool Layer',
    tools,
    (component, safe) => `${safe}["🔧 ${escapeMermaid(component.originalName)}"]`,
    safeNames
  );
  emitSubgraph(
    lines,
    'MemoryLayer',
    '📚 Memory / Vector Layer',
    memories,
    (component, safe) => `${safe}[("📚 ${escapeMermaid(component.originalName)}")]`,
    safeNames
  );

  const edges = new Set();
  appendDependencyEdges(lines, all, byName, safeNames, edges, (_caller, callee) => {
    const tags = callee.roleTags || [];
    if (tags.includes('tool')) return 'invokes';
    if (tags.includes('memory')) return 'retrieves from';
    if (tags.includes('llm')) return 'calls LLM';
    if (tags.includes('agent')) return 'delegates to';
    return 'uses';
  });

  emitClassStyle(lines, 'agentNode', ROLE_COLOURS.agent.fill, ROLE_COLOURS.agent.color, safeNodeIds(agents, safeNames));
  emitClassStyle(lines, 'llmNode', ROLE_COLOURS.llm.fill, ROLE_COLOURS.llm.color, safeNodeIds(llms, safeNames));
  emitClassStyle(lines, 'toolNode', ROLE_COLOURS.tool.fill, ROLE_COLOURS.tool.color, safeNodeIds(tools, safeNames));
  emitClassStyle(lines, 'memNode', ROLE_COLOURS.memory.fill, ROLE_COLOURS.memory.color, safeNodeIds(memories, safeNames));

  return lines.join('\n');
}

module.exports = {
  generateAgent,
};
