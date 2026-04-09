const { ROLE_COLOURS } = require('./analysis-generation-constants');
const {
  escapeMermaid,
  componentsByRole,
  mergeRoleComponents,
  mapSafeNames,
  byNameIndex,
  appendDependencyEdges,
  appendClassAssignment,
} = require('./analysis-generation-utils');
const { flowNote, noteNode } = require('./analysis-generation-diagrams-empty');

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

  if (agents.length > 0) {
    lines.push('  subgraph Orchestration["🎯 Orchestration Layer"]');
    for (const component of agents) {
      const safe = safeNames.get(component);
      if (safe) lines.push(`    ${safe}["🤖 ${escapeMermaid(component.originalName)}"]`);
    }
    lines.push('  end');
  }

  if (llms.length > 0) {
    lines.push('  subgraph LLMLayer["🧠 LLM / Model Layer"]');
    for (const component of llms) {
      const safe = safeNames.get(component);
      if (safe) lines.push(`    ${safe}["💡 ${escapeMermaid(component.originalName)}"]`);
    }
    lines.push('  end');
  }

  if (tools.length > 0) {
    lines.push('  subgraph ToolLayer["🔧 Tool Layer"]');
    for (const component of tools) {
      const safe = safeNames.get(component);
      if (safe) lines.push(`    ${safe}["🔧 ${escapeMermaid(component.originalName)}"]`);
    }
    lines.push('  end');
  }

  if (memories.length > 0) {
    lines.push('  subgraph MemoryLayer["📚 Memory / Vector Layer"]');
    for (const component of memories) {
      const safe = safeNames.get(component);
      if (safe) lines.push(`    ${safe}[("📚 ${escapeMermaid(component.originalName)}")]`);
    }
    lines.push('  end');
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

  lines.push(`  classDef agentNode fill:${ROLE_COLOURS.agent.fill},color:${ROLE_COLOURS.agent.color}`);
  lines.push(`  classDef llmNode   fill:${ROLE_COLOURS.llm.fill},color:${ROLE_COLOURS.llm.color}`);
  lines.push(`  classDef toolNode  fill:${ROLE_COLOURS.tool.fill},color:${ROLE_COLOURS.tool.color}`);
  lines.push(`  classDef memNode   fill:${ROLE_COLOURS.memory.fill},color:${ROLE_COLOURS.memory.color}`);

  appendClassAssignment(lines, agents.map((component) => safeNames.get(component)).filter(Boolean), 'agentNode');
  appendClassAssignment(lines, llms.map((component) => safeNames.get(component)).filter(Boolean), 'llmNode');
  appendClassAssignment(lines, tools.map((component) => safeNames.get(component)).filter(Boolean), 'toolNode');
  appendClassAssignment(lines, memories.map((component) => safeNames.get(component)).filter(Boolean), 'memNode');

  return lines.join('\n');
}

module.exports = {
  generateAgent,
};
