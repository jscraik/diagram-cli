const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const chalk = require('chalk');
const { spawn, execFileSync } = require('child_process');
const { getOpenCommand, getNpxCommandCandidates } = require('../utils/commands');
const { runAnalyzer } = require('../analyzers');
const {
  buildCacheKey,
  readCachedAnalysis,
  writeCachedAnalysis,
} = require('../incremental/cache');
const { toArchitectureIR, writeArchitectureIR } = require('../ir/architecture-ir');

const ALLOWED_THEMES = ['default', 'dark', 'forest', 'neutral', 'light'];

const DEFAULTS = Object.freeze({
  patterns: '**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.go,**/*.rs',
  exclude: 'node_modules/**,.git/**,dist/**',
  maxFiles: '100',
  theme: 'default',
});

function splitList(list) {
  if (!list) return [];
  return String(list)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasCliValue(value) {
  return !(value === undefined || value === null || value === '');
}

function resolveDiagramRcExclude(diagramRc) {
  if (diagramRc?.exclude) {
    return diagramRc.exclude;
  }
  if (Array.isArray(diagramRc?.ignore) && diagramRc.ignore.length > 0) {
    return diagramRc.ignore
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(',');
  }
  return null;
}

function applyDiagramRcDefaults(
  options,
  diagramRc,
  fields = ['patterns', 'exclude', 'maxFiles', 'theme'],
  commandDefaults = {}
) {
  const resolved = { ...(options || {}) };
  const defaults = { ...DEFAULTS, ...(commandDefaults || {}) };

  if (fields.includes('patterns') && !hasCliValue(resolved.patterns)) {
    resolved.patterns = diagramRc?.patterns || defaults.patterns;
  }

  if (fields.includes('exclude')) {
    if (!hasCliValue(resolved.exclude)) {
      resolved.exclude = resolveDiagramRcExclude(diagramRc) || defaults.exclude;
    }
  }

  if (fields.includes('maxFiles') && !hasCliValue(resolved.maxFiles)) {
    const rcMaxFiles = diagramRc?.maxFiles;
    resolved.maxFiles = rcMaxFiles !== undefined ? String(rcMaxFiles) : String(defaults.maxFiles);
  }

  if (fields.includes('theme') && !hasCliValue(resolved.theme)) {
    resolved.theme = diagramRc?.theme || defaults.theme;
  }

  return resolved;
}

function resolveRootPathOrExit(targetPath) {
  const root = path.resolve(targetPath || '.');
  try {
    const stats = fs.statSync(root);
    if (!stats.isDirectory()) {
      console.error(chalk.red('❌ Path error:'), `Target is not a directory: ${root}`);
      process.exit(2);
    }
  } catch (_error) {
    console.error(chalk.red('❌ Path error:'), `Target directory not found: ${root}`);
    process.exit(2);
  }
  return root;
}

function validateOutputPath(outputPath, rootPath) {
  if (typeof outputPath !== 'string' || outputPath.trim() === '') {
    throw new Error('Invalid path: output path is required');
  }

  if (outputPath.includes('\0')) {
    throw new Error('Invalid path: null bytes detected');
  }

  let realRoot;
  try {
    realRoot = fs.realpathSync(rootPath);
  } catch (_error) {
    throw new Error(`Invalid project path: ${rootPath}`);
  }

  const resolved = path.isAbsolute(outputPath)
    ? path.resolve(outputPath)
    : path.resolve(realRoot, outputPath);

  const resolveViaExistingAncestor = (targetPath) => {
    const pending = [];
    let probe = targetPath;

    while (!fs.existsSync(probe)) {
      pending.unshift(path.basename(probe));
      const parent = path.dirname(probe);
      if (parent === probe) {
        break;
      }
      probe = parent;
    }

    const canonicalBase = fs.realpathSync(probe);
    return path.join(canonicalBase, ...pending);
  };

  const canonicalResolved = resolveViaExistingAncestor(resolved);
  const relative = path.relative(realRoot, canonicalResolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Invalid path: directory traversal detected in "${outputPath}"`);
  }

  return canonicalResolved;
}

function openPreviewUrl(url) {
  const { cmd, args } = getOpenCommand(url, process.platform);
  try {
    const child = spawn(cmd, args, {
      stdio: 'ignore',
      detached: true,
      windowsHide: true,
    });
    child.on('error', (err) => {
      console.error(chalk.yellow('⚠️  Failed to open browser:'), err.message);
    });
    child.unref();
  } catch (err) {
    console.error(chalk.yellow('⚠️  Failed to open browser:'), err.message);
  }
}

function runMermaidCli(args) {
  const candidates = getNpxCommandCandidates(process.platform);
  let lastError = null;
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, args, { stdio: 'pipe', windowsHide: true });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  throw new Error('npx command not found');
}

function createMermaidUrl(mermaidCode) {
  if (mermaidCode.length > 5000) return { url: null, large: true };

  try {
    const payload = JSON.stringify({ code: mermaidCode });
    const compressed = zlib.deflateSync(payload);
    const encoded = compressed
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const url = `https://mermaid.live/edit#pako:${encoded}`;
    if (url.length > 8000) return { url: null, large: true };
    return { url, large: false };
  } catch (_error) {
    return { url: null, large: true };
  }
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function findClosestMatch(input, options) {
  if (!input || !Array.isArray(options) || options.length === 0) return null;

  const normalizedInput = String(input).toLowerCase();
  const scored = options
    .map((option) => ({ option, score: levenshtein(normalizedInput, String(option).toLowerCase()) }))
    .sort((a, b) => a.score - b.score);

  if (!scored.length) return null;
  const best = scored[0];
  return best.score <= Math.max(2, Math.floor(normalizedInput.length / 3)) ? best.option : null;
}

function formatSuggestion(suggestion) {
  return chalk.gray(`   Did you mean: ${suggestion}`);
}

function normalizeThemeOption(theme, fallback = 'default') {
  const normalized = String(theme || fallback).toLowerCase();
  return ALLOWED_THEMES.includes(normalized) ? normalized : fallback;
}

async function runAnalysisPipeline(rootPath, options, commandName) {
  const analyzerName = options.analyzer || 'default';
  const incrementalRequested = Boolean(options.incremental);
  const cacheKey = incrementalRequested && !process.env.CI
    ? buildCacheKey(commandName, { ...options, analyzer: analyzerName })
    : null;
  const incrementalState = {
    requested: incrementalRequested,
    used: false,
    reason: 'not_requested',
  };

  if (incrementalRequested && process.env.CI) {
    incrementalState.reason = 'incremental_disabled_in_ci';
  } else if (incrementalRequested) {
    const cached = readCachedAnalysis(rootPath, cacheKey);
    if (cached.hit) {
      incrementalState.used = true;
      incrementalState.reason = cached.reason;
      return {
        analysis: cached.data,
        analyzer: cached.data?._meta?.analyzer || { name: analyzerName, version: 'unknown' },
        incremental: incrementalState,
      };
    }
    incrementalState.reason = cached.reason;
  }

  const { analyzer, analysis } = await runAnalyzer(analyzerName, rootPath, options);

  if (cacheKey) {
    writeCachedAnalysis(rootPath, cacheKey, {
      ...analysis,
      _meta: {
        ...(analysis._meta || {}),
        analyzer,
      },
    });
  }

  return { analysis, analyzer, incremental: incrementalState };
}

function maybeWriteArchitectureIR(rootPath, analysis, analyzer, shouldWrite) {
  if (!shouldWrite) return null;
  const ir = toArchitectureIR(analysis, { rootPath, analyzer });
  return writeArchitectureIR(rootPath, ir);
}

module.exports = {
  ALLOWED_THEMES,
  DEFAULTS,
  applyDiagramRcDefaults,
  createMermaidUrl,
  findClosestMatch,
  formatSuggestion,
  maybeWriteArchitectureIR,
  normalizeThemeOption,
  openPreviewUrl,
  resolveRootPathOrExit,
  runAnalysisPipeline,
  runMermaidCli,
  splitList,
  validateOutputPath,
};
