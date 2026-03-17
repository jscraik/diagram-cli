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
  if (process.env.DIAGRAM_CACHE_DIR) {
    const resolved = path.resolve(process.env.DIAGRAM_CACHE_DIR);
    // Security: ensure the override stays inside the project root
    const rel = path.relative(rootPath, resolved);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(
        `DIAGRAM_CACHE_DIR must be inside the project root.\n` +
        `  Root:     ${rootPath}\n` +
        `  Resolved: ${resolved}`
      );
    }
    return resolved;
  }
  return path.join(rootPath, '.diagram', 'cache');
}

/**
 * Build a directory-mtime signature from the parent directories of all analyzed
 * files. Adding or deleting any file inside a tracked directory changes that
 * directory's mtime, causing a cache miss on the next read.
 *
 * This is cheaper than re-globbing and doesn't require passing options into the
 * read path. It correctly detects file additions and deletions.
 *
 * @param {string[]} filePaths - Relative file paths from analysis.components
 * @param {string} rootPath - Project root (used to resolve relative paths)
 * @returns {string} SHA-256 hex digest of sorted dir:mtime:nlink entries
 */
function buildDirectoryMtimeSignature(filePaths, rootPath) {
  // Collect unique parent directories, always including the root itself
  const dirs = new Set([rootPath]);
  for (const fp of filePaths) {
    const abs = path.isAbsolute(fp) ? fp : path.join(rootPath, fp);
    dirs.add(path.dirname(abs));
  }

  const entries = [];
  for (const dir of dirs) {
    try {
      const st = fs.statSync(dir);
      // nlink tracks the number of directory entries; mtimeMs tracks last change
      entries.push(`${dir}:${st.mtimeMs}:${st.nlink}`);
    } catch {
      // Directory gone — treat as a change
      entries.push(`${dir}:MISSING`);
    }
  }
  entries.sort();
  return crypto.createHash('sha256').update(entries.join('\n')).digest('hex');
}

/**
 * Build a content signature for the set of files that were analyzed.
 * Uses file mtime + size — fast enough for hundreds of files, no content read required.
 * Detects modifications to existing files; pair with buildFileListSignature to
 * also detect additions and deletions.
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

    const storedFilePaths = (parsed.analysis.components || []).map((c) => c.filePath);

    // Step 1: Directory-mtime check — detects file additions and deletions.
    // At write time we snapshot each parent directory's mtime+nlink. Any new
    // or deleted file changes its parent directory, so this hash will differ.
    const storedDirSig = parsed.directoryMtimeSignature;
    if (!storedDirSig) {
      // Old cache entry — force a refresh to pick up the new signature.
      return { hit: false, reason: 'no_directory_mtime_signature', data: null, cachePath };
    }
    const currentDirSig = buildDirectoryMtimeSignature(storedFilePaths, rootPath);
    if (currentDirSig !== storedDirSig) {
      return { hit: false, reason: 'directory_changed', data: null, cachePath };
    }

    // Step 2: Content check — detects modifications to existing files.
    const storedSignature = parsed.contentSignature;
    if (storedSignature) {
      if (!isCacheContentFresh(storedFilePaths, storedSignature, rootPath)) {
        return { hit: false, reason: 'content_changed', data: null, cachePath };
      }
    } else {
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

  const filePaths = (analysis.components || []).map((c) => c.filePath);
  // directoryMtimeSignature: detects new/deleted files by watching parent dir mtimes.
  const directoryMtimeSignature = buildDirectoryMtimeSignature(filePaths, rootPath);
  // contentSignature: detects modifications to the existing file set.
  const contentSignature = buildContentSignature(filePaths, rootPath);

  fs.writeFileSync(
    cachePath,
    `${JSON.stringify({
      schemaVersion: CACHE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      directoryMtimeSignature,
      contentSignature,
      analysis,
    }, null, 2)}\n`
  );
  return cachePath;
}

module.exports = {
  CACHE_SCHEMA_VERSION,
  buildCacheKey,
  buildDirectoryMtimeSignature,
  buildContentSignature,
  isCacheContentFresh,
  readCachedAnalysis,
  writeCachedAnalysis,
  resolveCacheDir,
};
