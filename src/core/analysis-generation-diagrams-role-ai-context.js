const path = require('path');
const {
  escapeMermaid,
  componentsByRole,
  mapSafeNames,
} = require('./analysis-generation-utils');
const { collectExternalImports } = require('./analysis-generation-role-tags');
const { graphNote, flowNote } = require('./analysis-generation-diagrams-empty');
const {
  emitRoleClassStyle,
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

/**
 * Determine the classification category for an external package identifier.
 *
 * @param {string} pkg - Package or import identifier to classify (may be falsy).
 * @returns {string} The matched category key from EXTERNAL_CATEGORY_RULES, or `'external'` when no rule matches.
 */
function classifyExternalPackage(pkg) {
  const candidate = String(pkg || '').toLowerCase();
  for (const rule of EXTERNAL_CATEGORY_RULES) {
    if (rule.pattern.test(candidate)) return rule.category;
  }
  return 'external';
}

/**
 * Builds a C4 Context Mermaid diagram for the project and its detected external systems.
 *
 * Iterates components' imports to classify and group external packages, emits a main
 * System node with a Developer person and "Uses" relationship, and adds one external
 * System_Ext node per detected category (listing up to three package names). If no
 * externals are found a placeholder External Systems node is emitted.
 *
 * @param {Object} data - Analysis payload.
 * @param {string} [data.rootPath] - Project root path used to derive the diagram title.
 * @param {Array<Object>} data.components - Component descriptors; each may include an `imports` array of package strings.
 * @returns {string} The Mermaid C4Context diagram markup. If `data` is missing or `components` is not an array, returns a short note indicating no data is available.
 */
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

/**
 * Build a Mermaid `flowchart LR` diagram describing a RAG (Retrieval-Augmented Generation) pipeline and any detected memory stores, LLM clients or agentic tools.
 *
 * The diagram always includes the canonical RAG nodes (User Query → Embedding → Vector Store → Retriever → LLM/Generator → Response). When components with roles `memory`, `llm` or `tool` are present they are rendered as subgraphs and connected with role-specific edges. If `data` is missing or `data.components` is not an array, a short "No data available" flowchart note is returned.
 *
 * @param {object} data - Analysis data containing detected components.
 * @param {Array<object>} data.components - Array of component descriptors used to detect memories, LLMs and tools; each component may include an `originalName` used for node labels.
 * @returns {string} Mermaid `flowchart LR` markup representing the RAG pipeline and any detected subgraphs, or a short note diagram when input data is absent or invalid.
 */
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

  emitRoleClassStyle(lines, 'memNode', 'memory', ['VecDB', 'Retriever']);
  emitRoleClassStyle(lines, 'llmNode', 'llm', ['LLMNode', 'Embed']);
  emitRoleClassStyle(lines, 'toolNode', 'tool', toolNodeIds);

  return lines.join('\n');
}

module.exports = {
  generateC4Context,
  generateRag,
  classifyExternalPackage,
};
