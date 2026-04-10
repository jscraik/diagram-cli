const {
  normalizePath,
  escapeMermaid,
  sanitize,
  getImportPath,
  resolveInternalImport,
  findComponentByResolvedPath,
  getExternalPackageName,
} = require('./analysis-generation-utils');
const { graphNote, noteNode } = require('./analysis-generation-diagrams-empty');

/**
 * Generate a Mermaid LR dependency graph showing component-to-component and external-package imports.
 *
 * Produces a `graph LR` string with edges from importing components to the components or external packages they import. External packages are rendered as distinct nodes and styled with an orange fill and white text. If `focus` is provided the graph is limited to components whose file path equals or is nested under the normalized focus path.
 *
 * @param {Object} data - Analysis data containing components and a rootPath used to resolve internal imports. Expected shape: `{ components: Array, rootPath?: string }`.
 * @param {string} [focus] - Optional file or directory path to restrict the graph to a subtree; the path is normalised before matching.
 * @returns {string} A Mermaid `graph LR` diagram as a string. If `data` is missing or `data.components` is not an array, the returned diagram is a left-to-right note stating "No data available". If no components match `focus`, the diagram contains a "No components found" note.
function generateDependency(data, focus) {
  if (!data || !Array.isArray(data.components)) {
    return graphNote('No data available', 'LR');
  }

  const lines = ['graph LR'];
  const focusNorm = focus ? normalizePath(focus) : null;
  const comps = focusNorm ? data.components.filter((component) => {
    const normalizedPath = normalizePath(component.filePath || '');
    return normalizedPath === focusNorm || normalizedPath.startsWith(`${focusNorm}/`);
  }) : data.components;

  if (comps.length === 0) {
    lines.push(noteNode('No components found'));
    return lines.join('\n');
  }

  const external = new Set();
  for (const component of comps) {
    const imports = Array.isArray(component.imports) ? component.imports : [];
    for (const importInfo of imports) {
      const importPath = getImportPath(importInfo);
      if (!importPath) continue;
      if (!importPath.startsWith('.')) {
        const pkg = getExternalPackageName(importPath);
        if (pkg) {
          external.add(pkg);
          lines.push(`  ${sanitize(pkg)}["${escapeMermaid(pkg)}"] --> ${sanitize(component.name)}`);
        }
      } else {
        const basePath = resolveInternalImport(component.filePath, importPath, data.rootPath);
        if (!basePath) continue;
        const resolved = findComponentByResolvedPath(comps, basePath);
        if (resolved) lines.push(`  ${sanitize(component.name)} --> ${sanitize(resolved.name)}`);
      }
    }
  }

  for (const packageName of external) {
    lines.push(`  style ${sanitize(packageName)} fill:#f59e0b,color:#fff`);
  }

  return lines.join('\n');
}

module.exports = {
  generateDependency,
};
