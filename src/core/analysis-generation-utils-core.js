const crypto = require('crypto');
const path = require('path');

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

function inferType(filePath, content) {
  const base = path.basename(filePath).toLowerCase();
  if (base.includes('service')) return 'service';
  if (base.includes('component') || base.endsWith('.tsx') || base.endsWith('.jsx')) return 'component';
  if (content.includes('class ') && content.includes('extends')) return 'class';
  if (content.includes('export default function') || content.includes('export function')) return 'function';
  if (content.includes('module.exports') || content.includes('export ')) return 'module';
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
  go: [
    /import\s+(?:\(\s*)?["']([^"']+)["']/g,
  ],
});

function resolveImportPatterns(lang) {
  if (lang === 'typescript' || lang === 'javascript') return IMPORT_PATTERNS.javascript;
  if (lang === 'python') return IMPORT_PATTERNS.python;
  if (lang === 'go') return IMPORT_PATTERNS.go;
  return [];
}

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

function buildLineStarts(content) {
  const starts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

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

function extractImports(content, lang) {
  return collectImportMatches(content, lang).map((match) => match.path);
}

function extractImportsWithPositions(content, lang) {
  const lineStarts = buildLineStarts(typeof content === 'string' ? content : '');
  return collectImportMatches(content, lang).map((match) => ({
    path: match.path,
    line: lineNumberForIndex(lineStarts, match.index),
  }));
}

function sanitize(name) {
  const base = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
  const hash = crypto.createHash('sha256').update(name).digest('hex').slice(0, 8);
  return `${base}_${hash}`;
}

function escapeMermaid(str) {
  if (!str) return '';
  return str.replace(/[\\"\[\]()#<>{}|]/g, '\\$&');
}

function normalizePath(inputPath) {
  return inputPath.replace(/\\/g, '/');
}

function toComparablePath(filePath) {
  return normalizePath(String(filePath || '')).replace(/^\.\//, '');
}

function getImportPath(importInfo) {
  if (typeof importInfo === 'string') return importInfo;
  if (importInfo && typeof importInfo.path === 'string') return importInfo.path;
  return null;
}

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
