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

/**
 * Convert a possibly comma-separated value into an array of trimmed, non-empty strings.
 *
 * If `list` is falsy the function returns an empty array. Non-string inputs are coerced to a string
 * before splitting on commas.
 *
 * @param {string|Array} list - A comma-separated string (or other value coerced to string). May be falsy.
 * @returns {string[]} An array of trimmed, non-empty strings derived from `list`.
 */
function splitList(list) {
  if (!list) return [];
  return String(list)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Determine whether a CLI option value was explicitly provided.
 * @param {*} value - The CLI option value to test.
 * @returns {boolean} `true` if `value` is neither `undefined`, `null` nor an empty string, `false` otherwise.
 */
function hasCliValue(value) {
  return !(value === undefined || value === null || value === '');
}

/**
 * Derives an exclude pattern string from a diagramrc configuration object.
 *
 * @param {Object} diagramRc - The parsed diagramrc configuration, may be undefined.
 * @returns {string|null} `diagramRc.exclude` if present; otherwise a comma-joined string of trimmed `diagramRc.ignore` entries when that array is non-empty; otherwise `null`.
 */
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

/**
 * Apply diagram RC and command defaults to a CLI options object for the requested fields.
 *
 * Merges provided `options` with defaults (module `DEFAULTS` overridden by `commandDefaults`),
 * filling missing values for any of the specified `fields` from `diagramRc` where available.
 *
 * @param {Object} options - CLI options provided by the user; values are preserved when present.
 * @param {Object} diagramRc - Parsed diagram configuration (e.g. from a diagramrc file).
 * @param {string[]} [fields=['patterns','exclude','maxFiles','theme']] - Which option keys to populate from defaults.
 * @param {Object} [commandDefaults={}] - Overrides applied on top of the module `DEFAULTS`.
 * @returns {Object} The resolved options object with defaults applied for the requested fields.
 */
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

/**
 * Resolve a target path to an absolute project root directory; exits the process with code 2 on failure.
 *
 * @param {string|undefined} targetPath - Path to resolve; when falsy, the current working directory ('.') is used.
 * @returns {string} The resolved absolute directory path.
 * @throws Will exit the process with code 2 after printing an error if the path does not exist or is not a directory.
 */
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

/**
 * Validate and canonicalise an output path so it safely resides within a project root.
 *
 * Ensures `outputPath` is a non-empty string without null bytes, resolves it relative to
 * the real path of `rootPath`, canonicalises through the nearest existing ancestor to
 * tolerate non-existent segments, and rejects directory traversal that would place the
 * resolved path outside the project root.
 *
 * @param {string} outputPath - The output path provided by the user (absolute or relative).
 * @param {string} rootPath - The project root path used as the base for relative resolution.
 * @returns {string} The canonical resolved output directory path.
 * @throws {Error} When `outputPath` is missing or empty.
 * @throws {Error} When `outputPath` contains null bytes.
 * @throws {Error} When `rootPath` cannot be resolved to an existing project directory.
 * @throws {Error} When the resolved path would traverse outside the project root.
 */
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

/**
 * Retrieve the diagram configuration object from a CLI program context.
 *
 * @param {object} program - The parsed CLI program object that may contain `diagramContext`.
 * @returns {object} The `diagramRc` object found at `program.diagramContext.diagramRc`, or an empty object if not present.
 */
function getDiagramRcFromProgram(program) {
  return program?.diagramContext?.diagramRc || {};
}

/**
 * Attempts to open the given URL in the user's default browser and detach the launcher.
 *
 * Logs a yellow warning message if the browser could not be opened.
 *
 * @param {string} url - The URL to open.
 */
function openPreviewUrl(url) {
  const { cmd, args } = getOpenCommand(url, process.platform);
  const handleOpenError = (error) => {
    console.error(chalk.yellow('⚠️  Failed to open browser:'), error.message);
  };

  try {
    const child = spawn(cmd, args, {
      stdio: 'ignore',
      detached: true,
      windowsHide: true,
    });
    child.on('error', handleOpenError);
    if (child && typeof child.unref === 'function') {
      child.unref();
    }
  } catch (error) {
    handleOpenError(error);
  }
}

/**
 * Invoke the Mermaid CLI via available `npx` command candidates, optionally permitting automatic install.
 *
 * Attempts each `npx` candidate for the current platform until one successfully executes the provided arguments.
 *
 * @param {string[]} args - Arguments to pass to the Mermaid CLI.
 * @param {Object} [options] - Call options.
 * @param {boolean} [options.allowAutoInstall=false] - When true, prepends `-y` to allow `npx` to automatically install missing packages.
 * @throws {Error} If all candidate `npx` executions fail, rethrows the last execution error; if no `npx` candidate exists, throws `Error('npx command not found')`.
 */
function runMermaidCli(args, options = {}) {
  const mermaidArgs = options.allowAutoInstall ? ['-y', ...args] : args;
  const candidates = getNpxCommandCandidates(process.platform);
  let lastError = null;
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, mermaidArgs, { stdio: 'pipe', windowsHide: true });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  throw new Error('npx command not found');
}

/**
 * Generate a Mermaid Live editor "pako" URL encoding the given diagram source.
 *
 * If the diagram is too large to encode or compression/encoding fails, the result will indicate the diagram is large.
 * @param {string} mermaidCode - Mermaid diagram source to encode.
 * @returns {{url: string|null, large: boolean}} An object with `url` set to the Mermaid Live edit URL when encoding succeeds, otherwise `null`; `large` is `true` when the diagram is too large or encoding failed, otherwise `false`.
 */
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

/**
 * Compute the Levenshtein edit distance between two strings.
 * @param {string} a - The source string.
 * @param {string} b - The target string.
 * @returns {number} The minimum number of single-character insertions, deletions or substitutions required to transform `a` into `b`.
 */
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

/**
 * Selects the closest string from a list using Levenshtein distance.
 *
 * @param {string|any} input - Value to match; coerced to a lowercase string for comparison.
 * @param {Array<string>} options - Candidate strings to compare against; returns `null` if not an array or empty.
 * @returns {string|null} The closest matching option, or `null` if no candidate is within a threshold of max(2, floor(input.length / 3)).
 */
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

/**
 * Format a suggestion message for display.
 * @param {string} suggestion - The suggested alternative text to show.
 * @returns {string} The suggestion line prefixed with three spaces and `Did you mean:`, styled in grey.
 */
function formatSuggestion(suggestion) {
  return chalk.gray(`   Did you mean: ${suggestion}`);
}

/**
 * Normalize a theme name to one of the permitted themes, using a fallback when the input is missing or unrecognised.
 * @param {string|undefined|null} theme - Candidate theme name; may be undefined or null.
 * @param {string} [fallback='default'] - Theme to use when `theme` is missing or not allowed.
 * @returns {string} The allowed theme name (lowercased) if `theme` is permitted, otherwise the `fallback`.
 */
function normalizeThemeOption(theme, fallback = 'default') {
  const normalized = String(theme || fallback).toLowerCase();
  return ALLOWED_THEMES.includes(normalized) ? normalized : fallback;
}

/**
 * Run the project analysis and optionally use or update an incremental cache.
 *
 * Executes the named analyzer for a project root, attempts to read a cached
 * analysis when incremental mode is requested (disabled in CI), and writes an
 * updated cache after a full analysis when applicable.
 *
 * @param {string} rootPath - Absolute path to the project root to analyse.
 * @param {object} options - Analyzer and pipeline options (e.g. `analyzer`, `incremental`).
 * @param {string} commandName - Name of the invoking command used to build the cache key.
 * @returns {{ analysis: object, analyzer: { name: string, version?: string }, incremental: { requested: boolean, used: boolean, reason: string } }}
 *   `analysis`: The analysis result produced by the analyzer.
 *   `analyzer`: Metadata about the analyzer used; when returned from cache this is read from `_meta.analyzer` or set to `{ name: <analyzerName>, version: 'unknown' }`.
 *   `incremental`: Metadata about incremental caching:
 *     - `requested`: whether incremental mode was requested via `options`.
 *     - `used`: whether a cached analysis was returned.
 *     - `reason`: human-readable reason for the incremental outcome (for example `not_requested`, `incremental_disabled_in_ci`, a cache miss reason, or the cached reason when used).
 */
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

/**
 * Write an architecture intermediate representation (IR) derived from analysis to disk when requested.
 *
 * @param {string} rootPath - Project root directory where the IR will be written.
 * @param {Object} analysis - Analyzer output used to produce the architecture IR.
 * @param {Object} analyzer - Analyzer metadata included in the IR conversion (e.g. name, version).
 * @param {boolean} shouldWrite - If falsy, writing is skipped.
 * @returns {?*} The result of `writeArchitectureIR` when the IR is written, or `null` if writing was skipped.
 */
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
  getDiagramRcFromProgram,
  maybeWriteArchitectureIR,
  normalizeThemeOption,
  openPreviewUrl,
  resolveRootPathOrExit,
  runAnalysisPipeline,
  runMermaidCli,
  splitList,
  validateOutputPath,
};
