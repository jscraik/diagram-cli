const {
  detectLanguage,
  inferType,
  extractImports,
  extractImportsWithPositions,
  sanitize,
  escapeMermaid,
  normalizePath,
  getImportPath,
  resolveInternalImport,
  findComponentByResolvedPath,
  getExternalPackageName,
} = require('./analysis-generation-utils');
const { inferRoleTags } = require('./analysis-generation-role-tags');
const { SUPPORTED_DIAGRAM_TYPES, ROLE_COLOURS } = require('./analysis-generation-constants');
const { analyze } = require('./analysis-generation-analyze');
const { generate, isPlaceholderDiagram, toManifestEntry } = require('./analysis-generation-diagrams');

module.exports = {
  detectLanguage,
  inferType,
  extractImports,
  extractImportsWithPositions,
  sanitize,
  escapeMermaid,
  normalizePath,
  getImportPath,
  resolveInternalImport,
  findComponentByResolvedPath,
  getExternalPackageName,
  inferRoleTags,
  SUPPORTED_DIAGRAM_TYPES,
  ROLE_COLOURS,
  analyze,
  generate,
  isPlaceholderDiagram,
  toManifestEntry,
};
