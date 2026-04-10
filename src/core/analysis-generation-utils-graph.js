const { sanitize } = require('./analysis-generation-utils-core');

function hasRole(component, role) {
  return (Array.isArray(component.roleTags) && component.roleTags.includes(role));
}

function componentsByRole(components, role) {
  if (!Array.isArray(components)) return [];
  return components.filter((component) => hasRole(component, role));
}

function uniqueComponents(components) {
  if (!Array.isArray(components)) return [];
  return [...new Set(components.filter(Boolean))];
}

function mergeRoleComponents(components, roleSpecs) {
  if (!Array.isArray(components) || !Array.isArray(roleSpecs)) return [];

  const merged = [];
  for (const spec of roleSpecs) {
    const role = (typeof spec === 'string') ? spec : spec?.role;
    if (!role) continue;

    const matches = componentsByRole(components, role);
    if (typeof spec === 'object' && Number.isInteger(spec.limit) && spec.limit >= 0) {
      merged.push(...matches.slice(0, spec.limit));
    } else {
      merged.push(...matches);
    }
  }

  return uniqueComponents(merged);
}

function mapSafeNames(components) {
  const map = new Map();
  const used = new Set();

  for (const component of components) {
    const rawName = sanitize(component.name || component.originalName || 'node');
    if (!used.has(rawName)) {
      map.set(component, rawName);
      used.add(rawName);
      continue;
    }

    let i = 1;
    let candidate = `${rawName}_${i}`;
    while (used.has(candidate)) {
      i += 1;
      candidate = `${rawName}_${i}`;
    }
    map.set(component, candidate);
    used.add(candidate);
  }

  return map;
}

function byNameIndex(components) {
  const map = new Map();
  if (!Array.isArray(components)) return map;
  for (const component of components) {
    if (component && component.name) {
      map.set(component.name, component);
    }
  }
  return map;
}

function buildReverseDependencyIndex(components) {
  const map = new Map();
  if (!Array.isArray(components)) return map;

  for (const component of components) {
    if (!component || typeof component.name !== 'string') continue;
    const deps = Array.isArray(component.dependencies) ? component.dependencies : [];
    for (const depName of deps) {
      if (!map.has(depName)) map.set(depName, []);
      map.get(depName).push(component);
    }
  }

  return map;
}

function collectConnectedComponents(components, seedComponents, maxDepth = 2, maxNodes = 35) {
  if (!Array.isArray(components)) return [];
  if (!Array.isArray(seedComponents) || seedComponents.length === 0) return [];

  const byName = byNameIndex(components);
  const reverseDependencies = buildReverseDependencyIndex(components);
  const selected = new Map();
  const queue = [];
  const addSelected = (candidate) => {
    if (!candidate || typeof candidate.name !== 'string') return false;
    if (selected.has(candidate.name)) return false;
    if (selected.size >= maxNodes) return false;
    selected.set(candidate.name, candidate);
    return true;
  };

  for (const seed of seedComponents) {
    if (addSelected(seed)) {
      queue.push(seed);
    }
    if (selected.size >= maxNodes) break;
  }

  let depth = 0;
  let levelStart = 0;
  const visited = new Set();
  while (levelStart < queue.length && depth < maxDepth) {
    const levelEnd = queue.length;
    for (let i = levelStart; i < levelEnd; i++) {
      const current = queue[i];
      if (!current || typeof current.name !== 'string') continue;
      const depthKey = `${current.name}:${depth}`;
      if (visited.has(depthKey)) continue;
      visited.add(depthKey);

      const next = [];
      for (const depName of current.dependencies || []) {
        if (selected.size >= maxNodes) break;
        const dependency = byName.get(depName);
        if (addSelected(dependency)) {
          next.push(dependency);
        }
      }

      const reverse = reverseDependencies.get(current.name) || [];
      for (const candidate of reverse) {
        if (selected.size >= maxNodes) break;
        if (addSelected(candidate)) next.push(candidate);
      }

      const remaining = maxNodes - selected.size;
      if (remaining <= 0) break;
      for (const nextComponent of next.slice(0, remaining)) {
        queue.push(nextComponent);
      }
      if (selected.size >= maxNodes) break;
    }
    levelStart = levelEnd;
    depth += 1;
  }

  return [...selected.values()];
}

function buildRoleDiagramContext(data, seeds, maxDepth = 2, maxNodes = 30) {
  const connected = collectConnectedComponents(data.components, seeds, maxDepth, maxNodes);
  return {
    connected,
    byName: byNameIndex(connected),
    safeNames: mapSafeNames(connected),
  };
}

function appendDependencyEdges(lines, sourceComponents, byName, safeNames, edges, edgeLabelFn) {
  for (const comp of sourceComponents) {
    const from = safeNames.get(comp);
    if (!from) continue;
    for (const depName of comp.dependencies || []) {
      const dep = byName.get(depName);
      if (!dep) continue;
      const to = safeNames.get(dep);
      if (!to) continue;
      const key = `${from}->${to}`;
      if (edges.has(key)) continue;
      edges.add(key);

      const edgeSpec = typeof edgeLabelFn === 'function' ? edgeLabelFn(comp, dep) : null;
      if (typeof edgeSpec === 'string' && edgeSpec.trim() !== '') {
        const trimmed = edgeSpec.trim();
        if (trimmed.includes('-->')) {
          lines.push(trimmed.startsWith('  ') ? trimmed : `  ${trimmed}`);
        } else {
          lines.push(`  ${from} -->|${trimmed}| ${to}`);
        }
      } else {
        lines.push(`  ${from} --> ${to}`);
      }
    }
  }
}

function appendClassAssignment(lines, nodeIds, className) {
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) return;
  const unique = [...new Set(nodeIds.filter(Boolean))];
  if (unique.length === 0) return;
  lines.push(`  class ${unique.join(',')} ${className}`);
}

function inferDbIntent(component) {
  const source = `${component.filePath || ''} ${component.originalName || ''} ${component.name || ''}`.toLowerCase();
  const hasLookup = /(read|find|query|select|get|lookup|exists|fetch)/.test(source);
  const hasWrite = /(create|insert|update|upsert|save|delete|remove|write|transaction)/.test(source);
  return { hasLookup, hasWrite };
}

module.exports = {
  hasRole,
  componentsByRole,
  uniqueComponents,
  mergeRoleComponents,
  mapSafeNames,
  byNameIndex,
  buildReverseDependencyIndex,
  collectConnectedComponents,
  buildRoleDiagramContext,
  appendDependencyEdges,
  appendClassAssignment,
  inferDbIntent,
};
