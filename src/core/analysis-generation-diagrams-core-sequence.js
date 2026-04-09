const path = require('path');
const {
  escapeMermaid,
  mapSafeNames,
  byNameIndex,
  componentsByRole,
} = require('./analysis-generation-utils');
const { limitItems } = require('./analysis-generation-diagrams-limit');
const { sequenceNote } = require('./analysis-generation-diagrams-empty');

const ROLE_VERB_PRIORITY = [
  ['database', 'reads from'],
  ['auth', 'authenticates via'],
  ['events', 'emits to'],
  ['llm', 'calls LLM'],
  ['tool', 'invokes tool'],
];

function resolveSequenceVerb(roleTags) {
  const tags = Array.isArray(roleTags) ? roleTags : [];
  for (const [role, verb] of ROLE_VERB_PRIORITY) {
    if (tags.includes(role)) return verb;
  }
  return 'calls';
}

function generateSequence(data) {
  if (!data || !Array.isArray(data.components)) {
    return sequenceNote('No data available');
  }

  const MAX_PARTICIPANTS = 8;
  const byName = byNameIndex(data.components);
  const participantLookup = new Map();

  const entryNames = new Set(
    (data.entryPoints || []).map((ep) => path.basename(ep, path.extname(ep)))
  );
  let roots = data.components.filter((component) => entryNames.has(component.originalName));

  if (roots.length === 0) {
    roots = limitItems([
      ...componentsByRole(data.components, 'user'),
      ...data.components.filter((component) => component.type === 'service'),
    ], 2);
  }

  const visited = new Map();
  const queue = [];
  for (const root of roots) {
    if (root && !visited.has(root.name)) {
      visited.set(root.name, 0);
      queue.push({ comp: root, depth: 0 });
    }
  }
  while (queue.length > 0 && visited.size < MAX_PARTICIPANTS) {
    const { comp, depth } = queue.shift();
    for (const depName of comp.dependencies || []) {
      if (visited.has(depName)) continue;
      const dep = byName.get(depName);
      if (!dep) continue;
      visited.set(depName, depth + 1);
      queue.push({ comp: dep, depth: depth + 1 });
    }
  }

  const participants = limitItems([...visited.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => byName.get(name))
    .filter(Boolean), MAX_PARTICIPANTS);

  for (const participant of participants) {
    participantLookup.set(participant.name, participant);
  }

  if (participants.length === 0) {
    return sequenceNote('No services detected');
  }

  const safeMap = mapSafeNames(participants);
  const lines = ['sequenceDiagram'];

  const participantType = (component) => {
    const tags = component.roleTags || [];
    if (tags.includes('user')) return 'actor';
    if (tags.includes('database') || tags.includes('memory')) return 'database';
    return 'participant';
  };

  for (const participant of participants) {
    const safe = safeMap.get(participant);
    lines.push(`  ${participantType(participant)} ${safe} as ${escapeMermaid(participant.originalName)}`);
  }

  lines.push('');

  const emittedEdges = new Set();
  for (const caller of participants) {
    const callerSafe = safeMap.get(caller);
    for (const depName of caller.dependencies || []) {
      const callee = participantLookup.get(depName);
      if (!callee) continue;
      const calleeSafe = safeMap.get(callee);
      const key = `${callerSafe}->${calleeSafe}`;
      if (emittedEdges.has(key)) continue;
      emittedEdges.add(key);
      const verb = resolveSequenceVerb(callee.roleTags);
      lines.push(`  ${callerSafe}->>${calleeSafe}: ${verb}`);
      lines.push(`  ${calleeSafe}-->>${callerSafe}: response`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  generateSequence,
  resolveSequenceVerb,
};
