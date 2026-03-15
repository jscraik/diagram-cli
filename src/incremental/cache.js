const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_SCHEMA_VERSION = '1.0';

function normalizeOptions(options = {}) {
  return {
    patterns: options.patterns || null,
    exclude: options.exclude || null,
    maxFiles: options.maxFiles || null,
    analyzer: options.analyzer || 'default',
  };
}

function buildCacheKey(command, options = {}) {
  const payload = {
    command,
    schemaVersion: CACHE_SCHEMA_VERSION,
    options: normalizeOptions(options),
  };
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16);
  return `${command}-${hash}`;
}

function resolveCacheDir(rootPath) {
  return process.env.DIAGRAM_CACHE_DIR
    ? path.resolve(process.env.DIAGRAM_CACHE_DIR)
    : path.join(rootPath, '.diagram', 'cache');
}

/**
 * Build a content signature for the set of files that were analyzed.
 * Uses file mtime + size — fast enough for hundreds of files, no content read required.
 *
 * @param {string[]} filePaths - Absolute or relative (to rootPath) file paths
 * @param {string} rootPath - Project root
 * @returns {string} SHA-256 hex digest of the sorted mtime+size tuples
 */
function buildContentSignature(filePaths, rootPath) {
  const entries = [];
  for (const fp of filePaths) {
    const abs = path.isAbsolute(fp) ? fp : path.join(rootPath, fp);
    try {
      const st = fs.statSync(abs);
      // Include mtime in ms and size; sorting ensures stable ordering
      entries.push(`${fp}:${st.mtimeMs}:${st.size}`);
    } catch {
      // File gone — treat as a change
      entries.push(`${fp}:MISSING`);
    }
  }
  entries.sort();
  return crypto.createHash('sha256').update(entries.join('\n')).digest('hex');
}

/**
 * Validate the stored content signature against current file state.
 * Returns true when the cache is still fresh.
 *
 * @param {string[]} storedFilePaths - Relative file paths stored in analysis.components
 * @param {string} storedSignature - Digest stored in the cache entry
 * @param {string} rootPath - Project root
 * @returns {boolean}
 */
function isCacheContentFresh(storedFilePaths, storedSignature, rootPath) {
  if (!storedSignature || !Array.isArray(storedFilePaths)) return false;
  const current = buildContentSignature(storedFilePaths, rootPath);
  return current === storedSignature;
}

function readCachedAnalysis(rootPath, key) {
  const cacheDir = resolveCacheDir(rootPath);
  const cachePath = path.join(cacheDir, `${key}.json`);
  if (!fs.existsSync(cachePath)) {
    return { hit: false, reason: 'cache_miss', data: null, cachePath };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (parsed.schemaVersion !== CACHE_SCHEMA_VERSION) {
      return { hit: false, reason: 'schema_mismatch', data: null, cachePath };
    }
    if (!parsed.analysis || !parsed.savedAt) {
      return { hit: false, reason: 'invalid_cache_payload', data: null, cachePath };
    }

    // Content-hash freshness check: verify that the files haven't changed
    // since this cache entry was written. This prevents stale diagrams after
    // source edits.
    const storedFilePaths = (parsed.analysis.components || []).map((c) => c.filePath);
    const storedSignature = parsed.contentSignature;

    if (storedSignature) {
      // Signature present — validate it
      if (!isCacheContentFresh(storedFilePaths, storedSignature, rootPath)) {
        return { hit: false, reason: 'content_changed', data: null, cachePath };
      }
    } else {
      // No signature means this is an old cache entry written before this
      // improvement — treat as a miss so it gets re-written with a signature.
      return { hit: false, reason: 'no_content_signature', data: null, cachePath };
    }

    return {
      hit: true,
      reason: 'cache_hit',
      data: parsed.analysis,
      cachePath,
      savedAt: parsed.savedAt,
    };
  } catch (error) {
    return { hit: false, reason: 'cache_parse_error', data: null, cachePath, error: error.message };
  }
}

function writeCachedAnalysis(rootPath, key, analysis) {
  const cacheDir = resolveCacheDir(rootPath);
  const cachePath = path.join(cacheDir, `${key}.json`);
  fs.mkdirSync(cacheDir, { recursive: true });

  // Build a content signature from the files that were analyzed so future
  // reads can detect source changes and avoid returning stale data.
  const filePaths = (analysis.components || []).map((c) => c.filePath);
  const contentSignature = buildContentSignature(filePaths, rootPath);

  fs.writeFileSync(
    cachePath,
    `${JSON.stringify({
      schemaVersion: CACHE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      contentSignature,
      analysis,
    }, null, 2)}\n`
  );
  return cachePath;
}

module.exports = {
  CACHE_SCHEMA_VERSION,
  buildCacheKey,
  buildContentSignature,
  isCacheContentFresh,
  readCachedAnalysis,
  writeCachedAnalysis,
  resolveCacheDir,
};
