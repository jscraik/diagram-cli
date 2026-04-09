const path = require('path');
const { ROLE_COLOURS } = require('./analysis-generation-constants');
const {
  escapeMermaid,
  componentsByRole,
} = require('./analysis-generation-utils');
const { collectExternalImports } = require('./analysis-generation-role-tags');
const { graphNote, flowNote } = require('./analysis-generation-diagrams-empty');
const {
  emitClassStyle,
  emitSubgraph,
} = require('./analysis-generation-diagrams-role-helpers');

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
      const pkgLower = pkg.toLowerCase();
      let category = 'external';
      if (/stripe|pay|billing|invoice/.test(pkgLower)) category = 'payment';
      else if (/sendgrid|mail|email|smtp|postmark/.test(pkgLower)) category = 'email';
      else if (/postgres|mysql|sqlite|mongo|redis|dynamo|prisma|typeorm|sequelize/.test(pkgLower)) category = 'database';
      else if (/openai|anthropic|gemini|ollama|hugging/.test(pkgLower)) category = 'ai';
      else if (/github|gitlab|bitbucket|octokit/.test(pkgLower)) category = 'vcs';
      else if (/slack|discord|teams|twilio/.test(pkgLower)) category = 'messaging';
      else if (/s3|gcs|azure|cloudflare|vercel|supabase/.test(pkgLower)) category = 'cloud';
      if (!externalByRole.has(category)) externalByRole.set(category, new Set());
      externalByRole.get(category).add(pkg);
    }
  }

  const CATEGORY_LABELS = {
    payment: 'Payment Provider',
    email: 'Email Service',
    database: 'Database',
    ai: 'AI / LLM Provider',
    vcs: 'Version Control',
    messaging: 'Messaging Service',
    cloud: 'Cloud Provider',
    external: 'External Service',
  };

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
    if (!emitSubgraph(lines, spec.id, spec.title, spec.components, spec.renderNode)) continue;
    for (const edge of spec.extraEdges) {
      lines.push(edge);
    }
  }

  emitClassStyle(lines, 'memNode', ROLE_COLOURS.memory.fill, ROLE_COLOURS.memory.color, ['VecDB', 'Retriever']);
  emitClassStyle(lines, 'llmNode', ROLE_COLOURS.llm.fill, ROLE_COLOURS.llm.color, ['LLMNode', 'Embed']);
  emitClassStyle(lines, 'toolNode', ROLE_COLOURS.tool.fill, ROLE_COLOURS.tool.color, []);

  return lines.join('\n');
}

module.exports = {
  generateC4Context,
  generateRag,
};
