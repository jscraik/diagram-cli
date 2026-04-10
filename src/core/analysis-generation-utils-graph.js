const { sanitize } = require('./analysis-generation-utils-core');

/**
 * Determine whether a component declares the given role tag.
 * @param {Object} component - Component object which may contain a `roleTags` array.
 * @param {string} role - Role tag to check for presence.
 * @returns {boolean} `true` if `component.roleTags` is an array and includes `role`, `false` otherwise.
 */
function hasRole(component, role) {
  return (Array.isArray(component.roleTags) && component.roleTags.includes(role));
}

/**
 * Filter a list of components to those that have the specified role.
 * @param {Array} components - Array of component objects.
 * @param {string} role - Role name to match against each component's `roleTags`.
 * @returns {Array} Array of components that include the specified role.
 */
function componentsByRole(components, role) {
  if (!Array.isArray(components)) return [];
  return components.filter((component) => hasRole(component, role));
}

/**
 * Return a deduplicated array of truthy components preserving their original order.
 *
 * If `components` is not an array the function returns an empty array. Falsy values
 * (e.g. null, undefined, false, 0, '') are removed before deduplication.
 *
 * @param {Array} components - Array of component items to filter and deduplicate.
 * @returns {Array} An array of unique, truthy components in their original order.
 */
function uniqueComponents(components) {
  if (!Array.isArray(components)) return [];
  return [...new Set(components.filter(Boolean))];
}

/**
 * Merge components that match an ordered list of role specifications.
 *
 * For each entry in `roleSpecs` (a role string or an object `{ role, limit }`) the function
 * collects components whose `roleTags` include the specified role, appending matches in
 * spec order. If a spec provides an integer `limit` ≥ 0, only the first `limit` matches
 * for that spec are taken. The final result is deduplicated, preserving the first occurrence
 * of each component.
 *
 * @param {Array<object>} components - Array of component objects to search.
 * @param {Array<string|{role: string, limit?: number}>} roleSpecs - Ordered list of role specifications.
 * @returns {Array<object>} An array of unique components that match the given role specifications, in merged order.
 */
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

/**
 * Produce a map from component objects to unique, sanitized node identifiers.
 *
 * The base identifier is derived from sanitize(component.name || component.originalName || 'node').
 * If a base identifier is already used, a numeric suffix `_1`, `_2`, … is appended to produce a unique identifier.
 *
 * @param {Array<object>} components - Array of component objects to name.
 * @returns {Map<object,string>} Map that associates each input component object with its unique sanitized name.
 */
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

/**
 * Build an index that maps component names to their component objects.
 *
 * @param {Array} components - Array of component objects; non-arrays produce an empty Map. Components without a truthy `name` are ignored.
 * @returns {Map<string, Object>} Map whose keys are `component.name` and values are the corresponding component. Later components with the same name overwrite earlier entries.
 */
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

/**
 * Builds a reverse index from dependency name to components that depend on it.
 *
 * @param {Array<Object>} components - Array of component objects; each component should have a string `name` and an optional `dependencies` array of dependency names.
 * @returns {Map<string, Array<Object>>} A Map where each key is a dependency name and the value is an array of components that include that dependency. Returns an empty Map if `components` is not an array.
 */
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

/**
 * Selects a connected subgraph of components by expanding from seed components.
 *
 * Performs a breadth-style expansion from each seed over both forward `dependencies` and reverse dependency links, collecting components whose `name` is a string. Expansion stops when `maxDepth` layers have been traversed or when `maxNodes` components have been selected. Inputs that are not arrays or an empty `seedComponents` result in an empty array.
 *
 * @param {Array<Object>} components - Array of available components (each may have `name` and `dependencies`).
 * @param {Array<Object>} seedComponents - Array of seed components to start the expansion; seeds must have a truthy `name` to be included.
 * @param {number} [maxDepth=2] - Maximum number of expansion layers to traverse from the seeds.
 * @param {number} [maxNodes=35] - Maximum number of components to include; expansion stops once this limit is reached.
 * @returns {Array<Object>} Array of selected components (including seeds) in the order they were discovered.
 */
function collectConnectedComponents(components, seedComponents, maxDepth = 2, maxNodes = 35) {
  if (!Array.isArray(components)) return [];
  if (!Array.isArray(seedComponents) || seedComponents.length === 0) return [];

  const byName = byNameIndex(components);
  const reverseDependencies = buildReverseDependencyIndex(components);
  const selected = new Map();
  const queue = [];

  for (const seed of seedComponents) {
    if (seed && seed.name && !selected.has(seed.name)) {
      selected.set(seed.name, seed);
      queue.push(seed);
    }
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
        const dependency = byName.get(depName);
        if (dependency && !selected.has(depName)) {
          selected.set(depName, dependency);
          next.push(dependency);
        }
      }

      const reverse = reverseDependencies.get(current.name) || [];
      for (const candidate of reverse) {
        if (selected.has(candidate.name)) continue;
        selected.set(candidate.name, candidate);
        next.push(candidate);
      }

      for (const nextComponent of next) {
        if (selected.size >= maxNodes) break;
        queue.push(nextComponent);
      }
      if (selected.size >= maxNodes) break;
    }
    levelStart = levelEnd;
    depth += 1;
  }

  return [...selected.values()];
}

/**
 * Build diagram context for a role-based component graph.
 *
 * Produces a connected component list and supporting lookup maps used for diagram generation.
 *
 * @param {Object} data - Source data object containing components.
 * @param {Array<Object>} seeds - Seed components from which the graph expansion begins.
 * @param {number} [maxDepth=2] - Maximum traversal depth from each seed.
 * @param {number} [maxNodes=30] - Maximum number of components to include.
 * @returns {{connected: Array<Object>, byName: Map<string, Object>, safeNames: Map<Object, string>}}
 *          An object with:
 *          - `connected`: the selected components reachable from `seeds` within the specified limits.
 *          - `byName`: a Map from component name to component for members of `connected`.
 *          - `safeNames`: a Map from component object to a unique, sanitized node name.
 */
function buildRoleDiagramContext(data, seeds, maxDepth = 2, maxNodes = 30) {
  const connected = collectConnectedComponents(data.components, seeds, maxDepth, maxNodes);
  return {
    connected,
    byName: byNameIndex(connected),
    safeNames: mapSafeNames(connected),
  };
}

/**
 * Append directed dependency edges for a set of components to a lines array using safe node identifiers.
 *
 * Iterates each component's `dependencies` and, for each dependency that exists in `byName` and has a mapped safe name in `safeNames`, appends a Mermaid-style edge line to `lines`. Each edge is emitted at most once according to the `edges` set; if `edgeLabelFn` is provided and returns a truthy label for a component→dependency pair that label is included.
 *
 * @param {string[]} lines - Array to which edge lines will be appended.
 * @param {Object[]} sourceComponents - Components whose dependencies will be rendered; each component may have a `dependencies` array of names.
 * @param {Map<string, Object>} byName - Map from component name to component object for dependency lookup.
 * @param {Map<Object, string>} safeNames - Map from component object to its safe string identifier used in edge lines.
 * @param {Set<string>} edges - Set used to deduplicate emitted edges; edge keys are of the form `from->to`.
 * @param {(component: Object, dependency: Object) => string|null} [edgeLabelFn] - Optional function returning a label for an edge; return a truthy string to include a label, or a falsy value to omit it.
 */
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

      const label = typeof edgeLabelFn === 'function' ? edgeLabelFn(comp, dep) : null;
      if (label) {
        lines.push(`  ${from} -->|${label}| ${to}`);
      } else {
        lines.push(`  ${from} --> ${to}`);
      }
    }
  }
}

/**
 * Append a Mermaid class assignment line for the given nodes to the provided lines array.
 *
 * Filters out falsy and duplicate node IDs; if no valid IDs remain the lines array is not modified.
 * @param {string[]} lines - Array of diagram lines to append to.
 * @param {(string|number)[]} nodeIds - Node identifiers to assign the class to; falsy values are ignored.
 * @param {string} className - Class name to assign to the nodes.
 */
function appendClassAssignment(lines, nodeIds, className) {
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) return;
  const unique = [...new Set(nodeIds.filter(Boolean))];
  if (unique.length === 0) return;
  lines.push(`  class ${unique.join(',')} ${className}`);
}

/**
 * Infer whether a component likely performs read or write database operations from its metadata.
 * @param {Object} component - Component object whose `filePath`, `originalName` and `name` fields are inspected.
 * @returns {{ hasLookup: boolean, hasWrite: boolean }} `hasLookup` is `true` if read/query-related keywords are present; `hasWrite` is `true` if write/modify-related keywords are present, `false` otherwise.
 */
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
