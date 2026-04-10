const path = require('path');
const { ROLE_COLOURS } = require('./analysis-generation-constants');
const {
  escapeMermaid,
  componentsByRole,
  mapSafeNames,
} = require('./analysis-generation-utils');
const { collectExternalImports } = require('./analysis-generation-role-tags');
const { graphNote, flowNote } = require('./analysis-generation-diagrams-empty');
const {
  emitClassStyle,
  emitSubgraph,
} = require('./analysis-generation-diagrams-role-helpers');

const EXTERNAL_CATEGORY_RULES = Object.freeze([
  { category: 'payment', pattern: /stripe|pay|billing|invoice/ },
  { category: 'email', pattern: /sendgrid|mail|email|smtp|postmark/ },
  { category: 'database', pattern: /postgres|pg|mysql|sqlite|mongo|redis|dynamo|prisma|typeorm|sequelize/ },
  { category: 'ai', pattern: /openai|anthropic|gemini|ollama|hugging/ },
  { category: 'vcs', pattern: /github|gitlab|bitbucket|octokit/ },
  { category: 'messaging', pattern: /slack|discord|teams|twilio/ },
  { category: 'cloud', pattern: /s3|gcs|azure|cloudflare|vercel|supabase/ },
]);

const CATEGORY_LABELS = Object.freeze({
  payment: 'Payment Provider',
  email: 'Email Service',
  database: 'Database',
  ai: 'AI / LLM Provider',
  vcs: 'Version Control',
  messaging: 'Messaging Service',
  cloud: 'Cloud Provider',
  external: 'External Service',
});

function classifyExternalPackage(pkg) {
  const candidate = String(pkg || '').toLowerCase();
  for (const rule of EXTERNAL_CATEGORY_RULES) {
    if (rule.pattern.test(candidate)) return rule.category;
  }
  return 'external';
}

function generateC4Context(data) {
  if (!data || !Array.isArray(data.components)) {
    return graphNote('No data available');
  }

  const projectName = path.basename(data.rootPath || 'System').replace(/[-_]/g, ' ');
  const lines = ['C4Context', `  title "System Context — ${escapeMermaid(projectName)}"`];

  lines.push(`  System(mainSystem, "${escapeMermaid(projectName)}", "The system being documented")`);
  lines.push('  Person(developer, "Developer / User", "Uses the system")');
  lines.push('  Rel(developer, mainSystem, "Uses")');

  const externalByRole = new Map();
  for (const component of data.components) {
    for (const pkg of collectExternalImports(component.imports || [])) {
      const category = classifyExternalPackage(pkg);
      if (!externalByRole.has(category)) externalByRole.set(category, new Set());
      externalByRole.get(category).add(pkg);
    }
  }

  let extIdx = 0;
  for (const [category, packages] of externalByRole) {
    const label = CATEGORY_LABELS[category] || 'External System';
    const extId = `ext_${extIdx++}`;
    const pkgList = [...packages].slice(0, 3).join(', ');
    lines.push(`  System_Ext(${extId}, "${label}", "${escapeMermaid(pkgList)}")`);
    lines.push(`  Rel(mainSystem, ${extId}, "uses")`);
  }

  if (externalByRole.size === 0) {
    lines.push('  System_Ext(noExt, "External Systems", "None detected")');
  }

  return lines.join('\n');
}

function generateRag(data) {
  if (!data || !Array.isArray(data.components)) {
    return flowNote('No data available', 'LR');
  }

  const memories = componentsByRole(data.components, 'memory');
  const llms = componentsByRole(data.components, 'llm');
  const tools = componentsByRole(data.components, 'tool');
  const toolNodeIds = [];

  const lines = ['flowchart LR'];
  lines.push('  UserQ(["👤 User Query"])');
  lines.push('  Embed["📐 Embedding Model"]');
  lines.push('  VecDB[("📚 Vector Store")]');
  lines.push('  Retriever["🔍 Retriever"]');
  lines.push('  LLMNode["🧠 LLM / Generator"]');
  lines.push('  Output(["✅ Response"])');

  lines.push('  UserQ -->|query| Embed');
  lines.push('  Embed -->|vector| VecDB');
  lines.push('  VecDB -->|top-k chunks| Retriever');
  lines.push('  Retriever -->|context + query| LLMNode');
  lines.push('  LLMNode -->|generated answer| Output');

  const detectedSpecs = [
    {
      id: 'DetectedMemory',
      title: 'Detected memory stores',
      components: memories,
      renderNode: (memory, safe) => `${safe}[("${escapeMermaid(memory.originalName)}")]`,
      extraEdges: ['  VecDB -. "implemented by" .-> DetectedMemory'],
    },
    {
      id: 'DetectedLLM',
      title: 'Detected LLM clients',
      components: llms,
      renderNode: (llm, safe) => `${safe}["${escapeMermaid(llm.originalName)}"]`,
      extraEdges: ['  LLMNode -. "implemented by" .-> DetectedLLM'],
    },
    {
      id: 'DetectedTools',
      title: 'Agentic tool calls',
      components: tools,
      renderNode: (tool, safe) => `${safe}["🔧 ${escapeMermaid(tool.originalName)}"]`,
      extraEdges: [
        '  LLMNode -->|tool use| DetectedTools',
        '  DetectedTools -->|result| LLMNode',
      ],
    },
  ];

  for (const spec of detectedSpecs) {
    const scopedSafeNames = new Map(
      [...mapSafeNames(spec.components)].map(([component, safe]) => [component, `det_${spec.id.toLowerCase()}_${safe}`])
    );
    if (!emitSubgraph(lines, spec.id, spec.title, spec.components, spec.renderNode, scopedSafeNames)) continue;
    if (spec.id === 'DetectedTools') {
      for (const component of spec.components) {
        const safe = scopedSafeNames.get(component);
        if (safe) toolNodeIds.push(safe);
      }
    }
    for (const edge of spec.extraEdges) {
      lines.push(edge);
    }
  }

  emitClassStyle(lines, 'memNode', ROLE_COLOURS.memory.fill, ROLE_COLOURS.memory.color, ['VecDB', 'Retriever']);
  emitClassStyle(lines, 'llmNode', ROLE_COLOURS.llm.fill, ROLE_COLOURS.llm.color, ['LLMNode', 'Embed']);
  emitClassStyle(lines, 'toolNode', ROLE_COLOURS.tool.fill, ROLE_COLOURS.tool.color, toolNodeIds);

  return lines.join('\n');
}

module.exports = {
  generateC4Context,
  generateRag,
  classifyExternalPackage,
};
