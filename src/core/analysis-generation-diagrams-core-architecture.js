const path = require('path');
const { ROLE_ARCH_ICON } = require('./analysis-generation-constants');
const {
  normalizePath,
  escapeMermaid,
  sanitize,
  mapSafeNames,
  byNameIndex,
} = require('./analysis-generation-utils');
const { graphNote, architectureNote } = require('./analysis-generation-diagrams-empty');

/**
 * Build a Mermaid "architecture-beta" diagram for the provided components, optionally restricted to a focus path.
 *
 * The diagram groups components by directory, assigns an icon based on role tags or type, marks entry points with a star,
 * and draws dependency edges between components. If `data` is missing or malformed, or if no components match `focus`,
 * a text note is returned instead of the diagram.
 *
 * @param {Object} data - Input data object containing architecture information.
 * @param {Array<Object>} data.components - List of component objects to include in the diagram.
 * @param {Array<string>} [data.entryPoints] - Optional list of entry-point file paths used to mark entry nodes.
 * @param {string} [focus] - Optional path or name to filter components; normalised before matching.
 * @returns {string} The complete Mermaid diagram as a newline-joined string, or a note message when no data/components are available.
 */
function generateArchitecture(data, focus) {
  if (!data || !Array.isArray(data.components)) {
    return architectureNote('No data available');
  }

  const focusNorm = focus ? normalizePath(focus) : null;
  const comps = focusNorm
    ? data.components.filter((component) => {
        const fp = normalizePath(component.filePath || '');
        return fp === focusNorm || fp.startsWith(`${focusNorm}/`) || component.name === focusNorm;
      })
    : data.components;

  if (comps.length === 0) {
    return graphNote(`No components found${focus ? ` for focus: ${escapeMermaid(focus)}` : ''}`);
  }

  const iconFor = (component) => {
    const tags = Array.isArray(component.roleTags) ? component.roleTags : [];
    const priority = ['llm', 'agent', 'tool', 'memory', 'database', 'auth', 'user', 'events'];
    for (const tag of priority) {
      if (tags.includes(tag) && ROLE_ARCH_ICON[tag]) return ROLE_ARCH_ICON[tag];
    }
    return component.type === 'service' ? 'server' : 'disk';
  };

  const entryNames = new Set(
    (data.entryPoints || []).map((ep) => path.basename(ep, path.extname(ep)))
  );

  const byDir = new Map();
  for (const component of comps) {
    const dir = component.directory || 'root';
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(component);
  }

  const lines = ['architecture-beta'];
  const safeNames = mapSafeNames(comps);
  const seenGroupIds = new Set();

  for (const [dir, items] of byDir) {
    if (items.length === 0) continue;
    const groupId = sanitize(dir === 'root' ? 'root_group' : dir);
    if (seenGroupIds.has(groupId)) continue;
    seenGroupIds.add(groupId);
    const displayDir = dir === 'root' ? 'Root' : escapeMermaid(dir);
    lines.push(`  group ${groupId}(cloud)[${displayDir}]`);
    for (const component of items) {
      const safe = safeNames.get(component);
      if (!safe) continue;
      const icon = iconFor(component);
      const label = `${escapeMermaid(component.originalName)}${entryNames.has(component.originalName) ? ' ⭐' : ''}`;
      lines.push(`    service ${safe}(${icon})[${label}] in ${groupId}`);
    }
  }

  const edges = new Set();
  const byName = byNameIndex(comps);
  for (const component of comps) {
    const from = safeNames.get(component);
    if (!from) continue;
    for (const depName of component.dependencies || []) {
      const dep = byName.get(depName);
      if (!dep) continue;
      const to = safeNames.get(dep);
      if (!to || to === from) continue;
      const key = `${from}->${to}`;
      if (edges.has(key)) continue;
      edges.add(key);
      lines.push(`  ${from}:B --> T:${to}`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  generateArchitecture,
};
