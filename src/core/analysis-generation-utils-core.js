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

function extractGoImportsWithPositions(content) {
  if (typeof content !== 'string' || content.length === 0) return [];

  const imports = [];
  const lines = content.split(/\r?\n/);
  let inImportBlock = false;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!inImportBlock) {
      if (/^import\s*\(\s*$/.test(trimmed)) {
        inImportBlock = true;
        continue;
      }

      const single = trimmed.match(/^import\s+(?:[._A-Za-z][A-Za-z0-9_]*\s+)?["']([^"']+)["']/);
      if (single) {
        imports.push({ path: single[1], line: i + 1 });
      }
      continue;
    }

    if (/^\)/.test(trimmed)) {
      inImportBlock = false;
      continue;
    }
    if (trimmed === '' || trimmed.startsWith('//')) continue;

    const withoutComment = rawLine.replace(/\/\/.*$/, '').trim();
    const block = withoutComment.match(/^(?:[._A-Za-z][A-Za-z0-9_]*\s+)?["']([^"']+)["']/);
    if (block) {
      imports.push({ path: block[1], line: i + 1 });
    }
  }

  return imports;
}

function resolveImportPatterns(lang) {
  if (lang === 'typescript' || lang === 'javascript') return IMPORT_PATTERNS.javascript;
  if (lang === 'python') return IMPORT_PATTERNS.python;
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
  if (lang === 'go') {
    return extractGoImportsWithPositions(content).map((match) => match.path);
  }
  return collectImportMatches(content, lang).map((match) => match.path);
}

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
