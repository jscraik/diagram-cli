const { normalizePath } = require('./analysis-generation-utils');
const { ROLE_PATTERNS, SENSITIVE_RISK_TAGS } = require('./analysis-generation-role-tags-constants');
const { textHasToken } = require('./analysis-generation-role-tags-match');
const { collectExternalImports } = require('./analysis-generation-role-tags-imports');

/**
 * Infer role and risk tags for a file from its path, original name, content and external imports.
 *
 * @param {string} filePath - File path used for structural matching.
 * @param {string} originalName - Original file name used for structural matching.
 * @param {string} fileContent - Full file content used for token matching.
 * @param {Array} importEntries - Import records used to collect external import identifiers.
 * @param {string} type - If equal to `'service'`, the `'service'` tag will be added.
 * @returns {string[]} Array of inferred tags. Includes `'service'` when `type === 'service'`; if no tags match, returns `['general']`.
 */
function inferRoleTags(filePath, originalName, fileContent, importEntries, type) {
  const content = (fileContent || '').toLowerCase();
  const pathText = normalizePath(filePath || '').toLowerCase();
  const nameText = (originalName || '').toLowerCase();
  const externalImports = collectExternalImports(importEntries).join(' ').toLowerCase();
  const structuralCombined = `${pathText} ${nameText} ${externalImports}`;
  const fullCombined = `${structuralCombined} ${content}`;

  const tags = new Set();

  for (const [tag, tokens] of Object.entries(ROLE_PATTERNS)) {
    const searchTarget = SENSITIVE_RISK_TAGS.has(tag) ? structuralCombined : fullCombined;
    for (const token of tokens) {
      if (textHasToken(searchTarget, token)) {
        tags.add(tag);
        break;
      }
    }
  }

  if (type === 'service') {
    tags.add('service');
  }

  if (tags.size === 0) {
    tags.add('general');
  }

  return [...tags];
}

module.exports = {
  inferRoleTags,
};
