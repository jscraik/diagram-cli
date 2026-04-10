const crypto = require('crypto');
const path = require('path');

/**
 * Identify the programming language from a file path's extension.
 * @param {string} filePath - The file path whose extension will be inspected.
 * @returns {string} The language label (for example `'typescript'`, `'javascript'`, `'python'`) or `'unknown'` if the extension is not recognised.
 */
function detectLanguage(filePath) {
  if (typeof filePath !== 'string') return 'unknown';
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.mts': 'typescript', '.cts': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript',
    '.mjs': 'javascript', '.cjs': 'javascript',
    '.py': 'python', '.go': 'go', '.rs': 'rust',
    '.java': 'java', '.rb': 'ruby', '.php': 'php',
  };
  return map[ext] || 'unknown';
}

/**
 * Infer a coarse file type from the file name and file content using simple heuristics.
 *
 * Uses the file basename to prioritise `service` and `component` classifications, and
 * inspects `content` for indicative tokens to identify `class`, `function` or `module`.
 * Falls back to `file` when no heuristic matches.
 *
 * @param {string} filePath - File path used for basename-based heuristics.
 * @param {string} content - File content used for token-based heuristics.
 * @returns {string} One of: `'service'`, `'component'`, `'class'`, `'function'`, `'module'`, or `'file'`.
 */
function inferType(filePath, content) {
  const base = typeof filePath === 'string' ? path.basename(filePath).toLowerCase() : '';
  const text = typeof content === 'string' ? content : '';
  if (base.includes('service')) return 'service';
  if (base.includes('component') || base.endsWith('.tsx') || base.endsWith('.jsx')) return 'component';
  if (text.includes('class ') && text.includes('extends')) return 'class';
  if (text.includes('export default function') || text.includes('export function')) return 'function';
  if (text.includes('module.exports') || text.includes('export ')) return 'module';
  return 'file';
}

const IMPORT_PATTERNS = Object.freeze({
  javascript: [
    /import\s+(?:(?:\{[^}]*?\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/g,
    /require\s*\(\s*["']([^"']+)["']\s*\)/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
  ],
  python: [
    /^\s*from\s+([\w.]+)/gm,
    /^\s*import\s+([\w.]+)/gm,
  ],
});

/**
 * Return the list of import-matching regular expressions for a given language.
 * @param {string} lang - Language identifier; supported values: `'typescript'`, `'javascript'`, `'python'`, `'go'`.
 * @returns {RegExp[]} An array of regular expression patterns used to find import statements for the specified language, or an empty array if the language is not recognised.
 */
function resolveImportPatterns(lang) {
  if (lang === 'typescript' || lang === 'javascript') return IMPORT_PATTERNS.javascript;
  if (lang === 'python') return IMPORT_PATTERNS.python;
  return [];
}

/**
 * Find import specifiers in source text for a given language.
 *
 * @param {string} content - Source file content to scan for import statements.
 * @param {string} [lang] - Language key used to select import patterns (e.g. "javascript", "python", "go").
 * @returns {Array<{path: string, index: number, order: number}>} An array of match records for each import specifier.
 * Each record contains:
 *   - `path`: the captured import path string,
 *   - `index`: character index in `content` where the match starts,
 *   - `order`: traversal order to preserve precedence when multiple patterns match at the same index.
 */
function collectImportMatches(content, lang) {
  if (typeof content !== 'string' || content.length === 0) return [];

  const matches = [];
  let order = 0;
  for (const pattern of resolveImportPatterns(lang)) {
    for (const match of content.matchAll(pattern)) {
      const importPath = match[1];
      if (!importPath) continue;
      matches.push({
        path: importPath,
        index: typeof match.index === 'number' ? match.index : 0,
        order,
      });
      order += 1;
    }
  }

  matches.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return a.order - b.order;
  });
  return matches;
}

/**
 * Build an array of character indices for the start of each line in the given content.
 * @param {string} content - The text content to analyse.
 * @returns {number[]} An array of zero-based character indices marking the start of each line; the first element is 0.
 */
function buildLineStarts(content) {
  const starts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

/**
 * Determine the 1-based line number containing the given character index.
 *
 * @param {number[]} lineStarts - Sorted array of zero-based character indices for the start of each line (first element should be 0).
 * @param {number} index - Character index to locate; non-finite or negative values are treated as 0.
 * @returns {number} The 1-based line number in which `index` falls. Returns `1` if `lineStarts` is not a valid non-empty array.
 */
function lineNumberForIndex(lineStarts, index) {
  if (!Array.isArray(lineStarts) || lineStarts.length === 0) return 1;
  const boundedIndex = Math.max(0, Number.isFinite(index) ? index : 0);

  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= boundedIndex) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return high + 1;
}

/**
 * Extracts import specifiers from source content for a given language.
 *
 * @param {string} content - The file contents to scan for import statements.
 * @param {string} lang - Language identifier (e.g. 'javascript', 'python', 'go') used to select parsing patterns.
 * @returns {string[]} An array of import paths found in the content; an empty array if none are found or the input is invalid.
 */
function extractImports(content, lang) {
  if (lang === 'go') {
    return extractGoImportsWithPositions(content).map((match) => match.path);
  }
  return collectImportMatches(content, lang).map((match) => match.path);
}

/**
 * Parse source text for import statements for the given language and return each import path with its 1-based line number.
 *
 * @param {string} content - Source text to search for imports.
 * @param {string} [lang] - Language hint used to select import patterns (e.g. 'javascript', 'python', 'go').
 * @returns {{path: string, line: number}[]} An array of objects containing the import `path` and its 1-based `line` number.
 */
function extractImportsWithPositions(content, lang) {
  if (lang === 'go') {
    return extractGoImportsWithPositions(content);
  }
  const lineStarts = buildLineStarts(typeof content === 'string' ? content : '');
  return collectImportMatches(content, lang).map((match) => ({
    path: match.path,
    line: lineNumberForIndex(lineStarts, match.index),
  }));
}

/**
 * Create a filesystem- and identifier-safe name from an arbitrary string.
 *
 * Produces a base identifier by replacing non-alphanumeric/underscore characters with `_`
 * and prefixing an underscore if the name starts with a digit, then appends an
 * 8-character hexadecimal hash derived from the original input to ensure stability and reduce collisions.
 *
 * @param {string} name - The original name to sanitise.
 * @returns {string} The sanitised identifier with an appended 8-character hex hash.
 */
function sanitize(name) {
  const base = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
  const hash = crypto.createHash('sha256').update(name).digest('hex').slice(0, 8);
  return `${base}_${hash}`;
}

/**
 * Escape characters that interfere with Mermaid diagrams by prefixing them with backslashes.
 *
 * @param {string} str - The input string to escape.
 * @returns {string} The input with any of the characters \ " [ ] ( ) # < > { } | prefixed by a backslash; returns an empty string for falsy input.
 */
function escapeMermaid(str) {
  if (!str) return '';
  return str.replace(/[\\"\[\]()#<>{}|]/g, '\\$&');
}

/**
 * Normalise path separators by converting Windows backslashes to forward slashes.
 * @param {string} inputPath - Path string that may contain backslashes.
 * @returns {string} The path with all backslashes replaced by forward slashes.
 */
function normalizePath(inputPath) {
  return inputPath.replace(/\\/g, '/');
}

/**
 * Normalises a file path to a comparable form by converting backslashes to forward slashes and removing a leading "./".
 * @param {string} filePath - The input path; falsy values are treated as an empty string.
 * @returns {string} The normalised path using forward slashes with any leading "./" removed.
 */
function toComparablePath(filePath) {
  return normalizePath(String(filePath || '')).replace(/^\.\//, '');
}

/**
 * Extracts a module specifier string from an import descriptor.
 *
 * @param {string|{path?: string}|null|undefined} importInfo - A module import descriptor: either a string specifier or an object with a `path` string property.
 * @returns {string|null} The import path when available, or `null` if no valid path is present.
 */
function getImportPath(importInfo) {
  if (typeof importInfo === 'string') return importInfo;
  if (importInfo && typeof importInfo.path === 'string') return importInfo.path;
  return null;
}

/**
 * Extracts the top-level package name from a module import specifier.
 *
 * @param {string} importPath - Module specifier (e.g. "react", "lodash/get", "@scope/pkg/sub").
 * @returns {string|null} The package name — for scoped packages returns the scope and package (e.g. "@scope/pkg"), for unscoped returns the leading segment before a slash (e.g. "lodash"); `null` if `importPath` is not a non-empty string.
 */
function getExternalPackageName(importPath) {
  if (typeof importPath !== 'string') return null;
  if (!importPath) return null;
  if (importPath.startsWith('@')) {
    const [scope, pkg] = importPath.split('/');
    return scope && pkg ? `${scope}/${pkg}` : scope || null;
  }
  return importPath.split('/')[0] || null;
}

module.exports = {
  detectLanguage,
  inferType,
  extractImports,
  extractImportsWithPositions,
  sanitize,
  escapeMermaid,
  normalizePath,
  toComparablePath,
  getImportPath,
  getExternalPackageName,
};