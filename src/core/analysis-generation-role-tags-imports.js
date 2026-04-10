const {
  getImportPath,
  getExternalPackageName,
} = require('./analysis-generation-utils');

/**
 * Collects unique external package names referenced by an array of import entries.
 *
 * @param {Array} importEntries - Array of import entry objects or descriptors; entries that produce no import path or a relative path (starting with ".") are ignored.
 * @returns {string[]} Unique external package names found in importEntries.
 */
function collectExternalImports(importEntries) {
  const packages = new Set();
  if (!Array.isArray(importEntries)) return [];

  for (const entry of importEntries) {
    const importPath = getImportPath(entry);
    if (!importPath || importPath.startsWith('.')) {
      continue;
    }
    const externalPackage = getExternalPackageName(importPath);
    if (externalPackage) {
      packages.add(externalPackage);
    }
  }

  return [...packages];
}

module.exports = {
  collectExternalImports,
};
