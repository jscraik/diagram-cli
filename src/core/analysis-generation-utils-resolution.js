const path = require('path');
const { normalizePath, toComparablePath } = require('./analysis-generation-utils-core');

const IMPORT_RESOLUTION_SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.cts',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.jsx',
  '/index.mjs',
  '/index.mts',
  '/index.cts'
];

/**
 * Resolve a relative import from a source file to a comparable POSIX-style path or null when it cannot be resolved.
 *
 * When `rootPath` is provided, the result is returned relative to that root; if the resolved target would be outside
 * `rootPath` the function returns `null`.
 *
 * @param {string} fromFilePath - Path of the file containing the import.
 * @param {string} importPath - The import specifier; must be a relative path (start with `.`).
 * @param {string} [rootPath] - Optional root directory to constrain and relativise resolution.
 * @returns {string|null} The comparable resolved path (POSIX-style), or `null` for invalid inputs, non-relative imports,
 *                        or when the target cannot be resolved within `rootPath`. 
 */
function resolveInternalImport(fromFilePath, importPath, rootPath) {
  if (typeof fromFilePath !== 'string' || typeof importPath !== 'string') {
    return null;
  }
  if (!importPath.startsWith('.')) {
    return null;
  }

  const fromDir = path.dirname(fromFilePath);

  if (rootPath) {
    const absoluteTarget = path.resolve(rootPath, fromDir, importPath);
    const relativeToRoot = toComparablePath(path.relative(rootPath, absoluteTarget));
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      return null;
    }
    return relativeToRoot;
  }

  const posixFromDir = normalizePath(fromDir);
  const posixImport = normalizePath(importPath);
  return toComparablePath(path.posix.normalize(path.posix.join(posixFromDir, posixImport)));
}

/**
 * Locate a component whose `filePath` matches a resolved import path after applying known resolution suffixes.
 *
 * @param {Iterable<Object>} components - Iterable of component objects that contain a `filePath` property.
 * @param {string} resolvedPath - The resolved import path to match against component file paths.
 * @returns {Object|undefined} The first component whose `filePath`, when normalised for comparison, matches the resolved path with any recognised resolution suffix; `undefined` if no match is found.
 */
function findComponentByResolvedPath(components, resolvedPath) {
  const comparablePath = toComparablePath(resolvedPath);
  const candidates = new Set(
    IMPORT_RESOLUTION_SUFFIXES.map((suffix) => toComparablePath(comparablePath + suffix))
  );
  return components.find((component) => candidates.has(toComparablePath(component.filePath)));
}

module.exports = {
  resolveInternalImport,
  findComponentByResolvedPath,
};
