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
  fs.writeFileSync(
    cachePath,
    `${JSON.stringify({
      schemaVersion: CACHE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      analysis,
    }, null, 2)}\n`
  );
  return cachePath;
}

module.exports = {
  CACHE_SCHEMA_VERSION,
  buildCacheKey,
  readCachedAnalysis,
  writeCachedAnalysis,
  resolveCacheDir,
};
