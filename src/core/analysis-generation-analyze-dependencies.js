const {
  getImportPath,
  resolveInternalImport,
  findComponentByResolvedPath,
} = require('./analysis-generation-utils');

function linkDependencies(components, rootPath) {
  for (const comp of components) {
    comp.dependencies = [];
    for (const imp of comp.imports) {
      const importPath = getImportPath(imp);
      if (!importPath) continue;
      const resolved = resolveInternalImport(comp.filePath, importPath, rootPath);
      if (!resolved) continue;
      const dep = findComponentByResolvedPath(components, resolved);
      if (dep) comp.dependencies.push(dep.name);
    }
  }
}

module.exports = {
  linkDependencies,
};
