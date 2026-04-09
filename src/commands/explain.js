const chalk = require('chalk');
const {
  applyDiagramRcDefaults,
  resolveRootPathOrExit,
  runAnalysisPipeline,
} = require('./shared');
const { buildMachineEnvelope } = require('./output');

function sanitizeNodeId(name, registry) {
  const base = String(name).replace(/[^a-zA-Z0-9_]/g, '_');
  if (!registry) {
    return base;
  }
  const seen = registry.get(base) || 0;
  registry.set(base, seen + 1);
  return seen === 0 ? base : `${base}_${seen}`;
}

function findComponent(components, query) {
  const normalizedQuery = String(query || '').toLowerCase().trim();
  if (!normalizedQuery) {
    return null;
  }
  return components.find((component) =>
    component.name.toLowerCase() === normalizedQuery
    || component.originalName.toLowerCase() === normalizedQuery
    || component.filePath.toLowerCase() === normalizedQuery
  ) || components.find((component) =>
    component.name.toLowerCase().includes(normalizedQuery)
    || component.originalName.toLowerCase().includes(normalizedQuery)
    || component.filePath.toLowerCase().includes(normalizedQuery)
  ) || null;
}

function buildNeighborhood(components, target, maxDepth) {
  const byName = new Map(components.map((component) => [component.name, component]));
  const selected = new Set([target.name]);
  const queue = [{ name: target.name, depth: 0 }];

  // Precompute reverse-dependency index
  const reverseDeps = new Map();
  for (const component of components) {
    for (const depName of component.dependencies || []) {
      if (!reverseDeps.has(depName)) {
        reverseDeps.set(depName, []);
      }
      reverseDeps.get(depName).push(component.name);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.depth >= maxDepth) continue;
    const component = byName.get(current.name);
    if (!component) continue;

    for (const depName of component.dependencies || []) {
      if (!selected.has(depName)) {
        selected.add(depName);
        queue.push({ name: depName, depth: current.depth + 1 });
      }
    }

    const dependents = reverseDeps.get(component.name) || [];
    for (const dependentName of dependents) {
      if (!selected.has(dependentName)) {
        selected.add(dependentName);
        queue.push({ name: dependentName, depth: current.depth + 1 });
      }
    }
  }

  const neighborhood = components.filter((component) => selected.has(component.name));
  const incoming = components
    .filter((component) => (component.dependencies || []).includes(target.name))
    .map((component) => component.name)
    .sort();
  const outgoing = [...(target.dependencies || [])].sort();
  return { neighborhood, incoming, outgoing };
}

function buildNeighborhoodDiagram(neighborhood, targetName) {
  const byName = new Map(neighborhood.map((component) => [component.name, component]));
  const idRegistry = new Map();
  const idByName = new Map();
  const lines = ['graph TD'];
  const classTarget = [];
  const classNeighbor = [];

  for (const component of neighborhood) {
    const id = sanitizeNodeId(component.name, idRegistry);
    idByName.set(component.name, id);
    lines.push(`  ${id}["${component.originalName}"]`);
    if (component.name === targetName) {
      classTarget.push(id);
    } else {
      classNeighbor.push(id);
    }
  }

  for (const component of neighborhood) {
    const from = idByName.get(component.name);
    for (const depName of component.dependencies || []) {
      if (!byName.has(depName)) continue;
      const to = idByName.get(depName);
      lines.push(`  ${from} --> ${to}`);
    }
  }

  if (classTarget.length > 0) {
    lines.push('  classDef target fill:#1f2937,color:#fff,stroke:#111827,stroke-width:2px;');
    lines.push(`  class ${classTarget.join(',')} target;`);
  }
  if (classNeighbor.length > 0) {
    lines.push('  classDef neighbor fill:#dbeafe,color:#1e3a8a,stroke:#3b82f6,stroke-width:1px;');
    lines.push(`  class ${classNeighbor.join(',')} neighbor;`);
  }
  return lines.join('\n');
}

function registerExplainCommand(program) {
  program
    .command('explain <component> [path]')
    .description('Explain a component dependency neighborhood with text + Mermaid')
    .option('--depth <n>', 'Neighborhood depth', '2')
    .option('-m, --max-files <n>', 'Max files to analyze')
    .option('-p, --patterns <list>', 'File patterns (comma-separated)')
    .option('-e, --exclude <list>', 'Exclude patterns')
    .option('--analyzer <name>', 'Analyzer plugin to use', 'default')
    .option('-f, --format <type>', 'Output format (text, json)', 'text')
    .option('--deterministic', 'Use deterministic machine output', false)
    .option('-q, --quiet', 'Suppress non-essential logging', false)
    .action(async (componentQuery, targetPath, rawOptions) => {
      const options = applyDiagramRcDefaults(rawOptions, program._diagramRc, ['patterns', 'exclude', 'maxFiles']);
      const root = resolveRootPathOrExit(targetPath);
      const formatStr = (options.format || 'text').toLowerCase();
      const isJson = formatStr === 'json';
      const depth = Math.max(1, parseInt(options.depth, 10) || 2);

      const pipeline = await runAnalysisPipeline(root, options, 'explain');
      const components = pipeline.analysis.components || [];
      const target = findComponent(components, componentQuery);
      if (!target) {
        console.error(chalk.red(`❌ Component "${componentQuery}" not found.`));
        console.error(chalk.gray('Fix: run `diagram analyze .` and choose a component name from the output list.'));
        process.exit(2);
      }

      const { neighborhood, incoming, outgoing } = buildNeighborhood(components, target, depth);
      const mermaid = buildNeighborhoodDiagram(neighborhood, target.name);

      if (isJson) {
        const payload = buildMachineEnvelope({
          schemaVersion: '1.0',
          command: 'explain',
          rootPath: root,
          deterministic: Boolean(options.deterministic),
          data: {
            target: {
              name: target.name,
              originalName: target.originalName,
              filePath: target.filePath,
              roleTags: target.roleTags || [],
              type: target.type,
            },
            incoming,
            outgoing,
            neighborhood: neighborhood
              .map((component) => ({
                name: component.name,
                originalName: component.originalName,
                filePath: component.filePath,
                roleTags: component.roleTags || [],
                type: component.type,
              }))
              .sort((a, b) => a.filePath.localeCompare(b.filePath)),
            mermaid,
          },
          agentSummary: {
            changedComponents: neighborhood.length,
            riskReasons: [],
            suggestedReviewerChecks: [
              'Inspect incoming dependencies for unintended coupling.',
              'Confirm outgoing dependencies reflect intended layer direction.',
            ],
          },
        });
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      if (!options.quiet) {
        console.log(chalk.green('\n🔎 Component Explanation'));
        console.log(`  Target: ${target.originalName} (${target.filePath})`);
        console.log(`  Depth: ${depth}`);
        console.log(`  Incoming: ${incoming.length}`);
        console.log(`  Outgoing: ${outgoing.length}`);
        console.log(`  Neighborhood size: ${neighborhood.length}`);

        console.log(chalk.yellow('\nIncoming dependencies:'));
        if (incoming.length === 0) {
          console.log('  - none');
        } else {
          incoming.forEach((item) => console.log(`  - ${item}`));
        }

        console.log(chalk.yellow('\nOutgoing dependencies:'));
        if (outgoing.length === 0) {
          console.log('  - none');
        } else {
          outgoing.forEach((item) => console.log(`  - ${item}`));
        }

        console.log(chalk.green('\n📐 Mermaid neighborhood:\n'));
        console.log('```mermaid');
        console.log(mermaid);
        console.log('```');
        console.log(chalk.cyan('\nNext steps:'));
        console.log('  1) Run `diagram validate .` if this component crosses protected boundaries.');
        console.log('  2) Run `diagram workflow pr` to estimate blast-radius risk for current changes.');
      }
    });
}

module.exports = {
  registerExplainCommand,
};
