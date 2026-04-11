const ROLE_COLOURS = Object.freeze({
  llm: { fill: '#6d28d9', color: '#fff' },
  agent: { fill: '#7c3aed', color: '#fff' },
  tool: { fill: '#1d4ed8', color: '#fff' },
  memory: { fill: '#065f46', color: '#fff' },
  database: { fill: '#0e7490', color: '#fff' },
  auth: { fill: '#9d174d', color: '#fff' },
  security: { fill: '#991b1b', color: '#fff' },
  user: { fill: '#15803d', color: '#fff' },
  events: { fill: '#b45309', color: '#fff' },
  integrations: { fill: '#0369a1', color: '#fff' },
  service: { fill: '#374151', color: '#fff' },
  general: { fill: '#374151', color: '#fff' },
});
Object.values(ROLE_COLOURS).forEach((entry) => Object.freeze(entry));

const ROLE_ARCH_ICON = Object.freeze({
  llm: 'cloud',
  agent: 'server',
  tool: 'disk',
  memory: 'database',
  database: 'database',
  auth: 'server',
  security: 'server',
  user: 'internet',
  events: 'server',
  integrations: 'cloud',
  service: 'server',
  general: 'server',
});

const SUPPORTED_DIAGRAM_TYPES = Object.freeze([
  'architecture',
  'sequence',
  'dependency',
  'class',
  'flow',
  'database',
  'user',
  'events',
  'auth',
  'security',
  'agent',
  'c4context',
  'rag',
]);

module.exports = {
  ROLE_COLOURS,
  ROLE_ARCH_ICON,
  SUPPORTED_DIAGRAM_TYPES,
};
