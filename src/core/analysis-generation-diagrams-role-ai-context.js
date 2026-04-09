const path = require('path');
const { ROLE_COLOURS } = require('./analysis-generation-constants');
const {
  escapeMermaid,
  componentsByRole,
  mapSafeNames,
} = require('./analysis-generation-utils');
const { collectExternalImports } = require('./analysis-generation-role-tags');
const { graphNote, flowNote } = require('./analysis-generation-diagrams-empty');

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

  if (memories.length > 0) {
    lines.push('  subgraph DetectedMemory["Detected memory stores"]');
    const safeM = mapSafeNames(memories);
    for (const memory of memories) {
      const safe = safeM.get(memory);
      if (safe) lines.push(`    ${safe}[("${escapeMermaid(memory.originalName)}")]`);
    }
    lines.push('  end');
    lines.push('  VecDB -. "implemented by" .-> DetectedMemory');
  }

  if (llms.length > 0) {
    lines.push('  subgraph DetectedLLM["Detected LLM clients"]');
    const safeL = mapSafeNames(llms);
    for (const llm of llms) {
      const safe = safeL.get(llm);
      if (safe) lines.push(`    ${safe}["${escapeMermaid(llm.originalName)}"]`);
    }
    lines.push('  end');
    lines.push('  LLMNode -. "implemented by" .-> DetectedLLM');
  }

  if (tools.length > 0) {
    lines.push('  subgraph DetectedTools["Agentic tool calls"]');
    const safeT = mapSafeNames(tools);
    for (const tool of tools) {
      const safe = safeT.get(tool);
      if (safe) lines.push(`    ${safe}["🔧 ${escapeMermaid(tool.originalName)}"]`);
    }
    lines.push('  end');
    lines.push('  LLMNode -->|tool use| DetectedTools');
    lines.push('  DetectedTools -->|result| LLMNode');
  }

  lines.push(`  classDef memNode  fill:${ROLE_COLOURS.memory.fill},color:${ROLE_COLOURS.memory.color}`);
  lines.push(`  classDef llmNode  fill:${ROLE_COLOURS.llm.fill},color:${ROLE_COLOURS.llm.color}`);
  lines.push(`  classDef toolNode fill:${ROLE_COLOURS.tool.fill},color:${ROLE_COLOURS.tool.color}`);
  lines.push('  class VecDB,Retriever memNode');
  lines.push('  class LLMNode,Embed llmNode');

  return lines.join('\n');
}

module.exports = {
  generateC4Context,
  generateRag,
};
