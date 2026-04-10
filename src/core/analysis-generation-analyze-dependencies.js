const {
  getImportPath,
  resolveInternalImport,
  findComponentByResolvedPath,
} = require('./analysis-generation-utils');

/**
 * Populate each component's `dependencies` with the names of internal components it imports.
 *
 * Iterates over `components`, resets each component's `dependencies` to an empty array, resolves internal imports relative to `rootPath`, and appends the `name` of any component that matches a resolved import. Unresolved or external imports are ignored.
 *
 * @param {Array<Object>} components - Array of component objects; each should have `imports` (array) and `filePath` (string). This function sets `dependencies` on each component.
 * @param {string} rootPath - Project root path used when resolving internal import paths.
 */
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
