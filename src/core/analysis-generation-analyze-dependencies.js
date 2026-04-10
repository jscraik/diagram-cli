const {
  getImportPath,
  resolveInternalImport,
  findComponentByResolvedPath,
} = require('./analysis-generation-utils');

function linkDependencies(components, rootPath) {
  for (const comp of components) {
    const deps = new Set();
    const imports = Array.isArray(comp.imports) ? comp.imports : [];
    for (const imp of imports) {
      const importPath = getImportPath(imp);
      if (!importPath) continue;
      const resolved = resolveInternalImport(comp.filePath, importPath, rootPath);
      if (!resolved) continue;
      const dep = findComponentByResolvedPath(components, resolved);
      if (dep && dep.name) deps.add(dep.name);
    }
    comp.dependencies = [...deps];
  }
}

module.exports = {
  linkDependencies,
};
