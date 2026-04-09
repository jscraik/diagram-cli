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
