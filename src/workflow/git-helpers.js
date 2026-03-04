const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execFileSync } = require('child_process');
const micromatch = require('picomatch');
const {
  detectLanguage,
  inferType,
  extractImportsWithPositions,
  normalizePath,
  getImportPath,
  resolveInternalImport,
  findComponentByResolvedPath,
  inferRoleTags,
} = require('../core/analysis-generation');

/**
 * Validate git ref exists and is accessible
 * @param {string} ref - Git ref (SHA, branch, tag)
 * @param {string} root - Repository root path
 * @returns {string} Resolved SHA
 * @throws {Error} If ref is invalid or not found
 */
function validateGitRef(ref, root) {
  if (!ref || typeof ref !== 'string' || ref.trim() === '') {
    throw new Error('Git ref is required');
  }

  // Security: Check for shell injection attempts
  if (/[`$(){};|&<>]/.test(ref)) {
    throw new Error('Invalid characters in git ref');
  }

  try {
    // Use execFileSync for synchronous git operations with timeout
    const sha = execFileSync('git', ['rev-parse', '--verify', ref], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10000, // 10 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    }).trim();

    return sha;
  } catch (error) {
    if (error.killed) {
      throw new Error(`Git operation timed out resolving ref: ${ref}`);
    }
    throw new Error(`Git ref not found: ${ref}`);
  }
}

/**
 * Check if repository has shallow clone (missing base refs)
 * @param {string} root - Repository root path
 * @returns {boolean} True if shallow clone
 */
function isShallowClone(root) {
  try {
    const shallowFile = path.join(root, '.git', 'shallow');
    return fs.existsSync(shallowFile);
  } catch {
    return false;
  }
}

/**
 * Detect PR refs from environment (GitHub Actions)
 * @returns {{base: string|null, head: string|null}}
 */
function detectPrRefsFromEnv() {
  const env = process.env;

  // GitHub Actions PR context
  if (env.GITHUB_EVENT_NAME === 'pull_request') {
    try {
      const eventPath = env.GITHUB_EVENT_PATH;
      if (eventPath && fs.existsSync(eventPath)) {
        const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
        return {
          base: event.pull_request?.base?.sha || null,
          head: event.pull_request?.head?.sha || null
        };
      }
    } catch {
      // Fall through to defaults
    }
  }

  return { base: null, head: null };
}

/**
 * Run git command with timeout and error handling
 * @param {string[]} args - Git arguments
 * @param {string} root - Repository root path
 * @param {number} timeout - Timeout in milliseconds
 * @returns {string} stdout from git command
 * @throws {Error} If command fails or times out
 */
function runGitCommand(args, root, timeout = 30000) {
  try {
    const result = execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      windowsHide: true
    });
    return result;
  } catch (error) {
    if (error.killed) {
      throw new Error(`Git operation timed out after ${timeout}ms`);
    }
    const stderr = error.stderr || '';
    if (stderr.includes('bad revision') || stderr.includes('unknown revision')) {
      throw new Error('Git ref not found in repository');
    }
    if (stderr.includes('not a git repository')) {
      throw new Error(`Not a git repository: ${root}`);
    }
    throw new Error(`Git command failed: ${stderr || error.message}`);
  }
}

/**
 * Get changed files between two refs with rename detection
 * @param {string} baseSha - Base commit SHA
 * @param {string} headSha - Head commit SHA
 * @param {string} root - Repository root path
 * @returns {{changed: string[], renamed: {from: string, to: string}[], deleted: string[], added: string[]}}
 */
function getChangedFiles(baseSha, headSha, root) {
  // Use --name-status -M for rename detection (50% similarity threshold)
  // -M detects renames, -M80% would use 80% threshold
  const diffOutput = runGitCommand(
    ['diff', '--name-status', '-M', `${baseSha}`, `${headSha}`],
    root,
    60000 // 60 second timeout for large diffs
  );

  const changed = [];
  const renamed = [];
  const deleted = [];
  const added = [];

  for (const line of diffOutput.trim().split('\n')) {
    if (!line.trim()) continue;

    // Parse git diff --name-status -M output
    // Format: STATUS\told_path\tnew_path (for renames)
    // Format: STATUS\tpath (for other changes)
    const parts = line.split('\t');

    switch (parts[0]) {
      case 'A': // Added
        added.push(parts[1]);
        changed.push(parts[1]);
        break;
      case 'D': // Deleted
        deleted.push(parts[1]);
        break;
      case 'M': // Modified
        changed.push(parts[1]);
        break;
      case 'R100': // Renamed (100% similarity)
      case 'R099': // Renamed (99% similarity)
      case 'R098':
      case 'R097':
      case 'R096':
      case 'R095':
      case 'R094':
      case 'R093':
      case 'R092':
      case 'R091':
      case 'R090':
        // Rename detection: R###\told_path\tnew_path
        renamed.push({ from: parts[1], to: parts[2], similarity: parseInt(parts[0].slice(1), 10) });
        changed.push(parts[2]); // Track new path as changed
        break;
      case 'C100': // Copied (100% similarity)
      case 'C099':
      case 'C098':
      case 'C097':
      case 'C096':
      case 'C095':
      case 'C094':
      case 'C093':
      case 'C092':
      case 'C091':
      case 'C090':
        // Copy detection: C###\told_path\tnew_path
        added.push(parts[2]);
        changed.push(parts[2]);
        break;
      default:
        // Unknown status - treat as changed
        if (parts[1]) {
          changed.push(parts[1]);
        }
    }
  }

  // Sort all arrays for deterministic output
  return {
    changed: [...changed].sort(),
    renamed: renamed.sort((a, b) => a.from.localeCompare(b.from)),
    deleted: [...deleted].sort(),
    added: [...added].sort()
  };
}

/**
 * Read file content at a specific git ref
 * @param {string} ref - Git ref (SHA, branch, tag)
 * @param {string} filePath - Path to file relative to repo root
 * @param {string} root - Repository root path
 * @returns {string|null} File content or null if file doesn't exist at ref
 */
function readFileAtRef(ref, filePath, root) {
  // Security: Validate filePath doesn't contain shell injection
  if (/[`$(){};|&<>]/.test(filePath)) {
    throw new Error('Invalid characters in file path');
  }

  // Security: Prevent directory traversal
  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
    throw new Error('Directory traversal detected in file path');
  }

  try {
    const content = runGitCommand(
      ['show', `${ref}:${normalizedPath}`],
      root,
      10000 // 10 second timeout
    );
    return content;
  } catch (error) {
    // File doesn't exist at this ref
    if (error.message.includes('does not exist') || error.message.includes('bad revision')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get list of files at a specific git ref
 * @param {string} ref - Git ref (SHA, branch, tag)
 * @param {string} root - Repository root path
 * @param {object} options - Filter options
 * @returns {string[]} List of file paths at ref
 */
function listFilesAtRef(ref, root, options = {}) {
  const {
    patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go', '**/*.rs'],
    exclude = ['node_modules/**', '.git/**', 'dist/**', 'build/**']
  } = options;

  // Use git ls-tree to get all tracked files at ref
  const output = runGitCommand(
    ['ls-tree', '-r', '--name-only', ref],
    root,
    60000 // 60 second timeout for large repos
  );

  const allFiles = output.trim().split('\n').filter(f => f.trim());

  // Filter by patterns and exclusions using minimatch-style matching
  const includeMatchers = patterns.map(p => micromatch(p));
  const excludeMatchers = exclude.map(p => micromatch(p));

  const filteredFiles = allFiles.filter(filePath => {
    // Check exclusions first
    if (excludeMatchers.some(m => m(filePath))) {
      return false;
    }
    // Check inclusions
    return includeMatchers.some(m => m(filePath));
  });

  return filteredFiles.sort();
}

/**
 * Analyze codebase at a specific git ref (snapshot analysis)
 * @param {string} ref - Git ref (SHA, branch, tag)
 * @param {string} root - Repository root path
 * @param {object} options - Analysis options
 * @returns {Promise<object>} Analysis result
 */
async function analyzeAtRef(ref, root, options = {}) {
  const maxFiles = Math.min(Math.max(parseInt(options.maxFiles, 10) || 100, 1), 10000);

  // Get file list at ref
  const fileList = listFilesAtRef(ref, root, options).slice(0, maxFiles);

  const components = [];
  const languages = {};
  const directories = new Set();
  const entryPoints = [];
  const seenNames = new Set();

  for (const filePath of fileList) {
    try {
      // Read file content at ref
      const content = readFileAtRef(ref, filePath, root);
      if (content === null) continue;

      // Security: Check content size (10MB limit)
      if (content.length > 10 * 1024 * 1024) {
        continue;
      }

      const lang = detectLanguage(filePath);
      let rel = normalizePath(filePath);
      const dir = path.dirname(rel);
      if (dir === '.') {
        rel = `./${rel}`;
      }

      languages[lang] = (languages[lang] || 0) + 1;
      if (dir !== '.') directories.add(dir);

      // Entry point detection
      const entryPattern = /\/(index|main|app|server)\.(ts|js|tsx|jsx|mts|mjs|py|go|rs)$/i;
      if (entryPattern.test(rel)) {
        entryPoints.push(rel);
      }

      // Handle duplicate names
      let baseName = path.basename(filePath, path.extname(filePath));
      let uniqueName = baseName;
      let counter = 1;
      while (seenNames.has(uniqueName)) {
        uniqueName = `${baseName}_${counter}`;
        counter++;
      }
      seenNames.add(uniqueName);

      const imports = extractImportsWithPositions(content, lang);
      const type = inferType(filePath, content);

      components.push({
        name: uniqueName,
        originalName: baseName,
        filePath: rel,
        type,
        imports,
        roleTags: inferRoleTags(rel, baseName, content, imports, type),
        directory: dir,
      });
    } catch (e) {
      // Skip files that can't be read or parsed
      if (process.env.DEBUG) {
        console.error(chalk.gray(`Skipped ${filePath}: ${e.message}`));
      }
    }
  }

  // Resolve dependencies (same logic as analyze())
  for (const comp of components) {
    comp.dependencies = [];
    for (const imp of comp.imports) {
      const importPath = getImportPath(imp);
      if (!importPath) continue;
      const resolved = resolveInternalImport(comp.filePath, importPath, root);
      if (!resolved) continue;
      const dep = findComponentByResolvedPath(components, resolved);
      if (dep) comp.dependencies.push(dep.name);
    }
  }

  return {
    rootPath: root,
    ref,
    components,
    entryPoints,
    languages,
    directories: [...directories].sort()
  };
}

/**
 * Compute architecture diff between two analysis results
 * @param {object} base - Base analysis result
 * @param {object} head - Head analysis result
 * @returns {object} Diff result
 */
function computeArchitectureDiff(base, head) {
  const baseComponents = new Map(base.components.map(c => [c.filePath, c]));
  const headComponents = new Map(head.components.map(c => [c.filePath, c]));

  // Find added, removed, and changed components
  const added = [];
  const removed = [];
  const changed = [];

  for (const [filePath, comp] of headComponents) {
    if (!baseComponents.has(filePath)) {
      added.push({ filePath, name: comp.name, type: comp.type });
    } else {
      const baseComp = baseComponents.get(filePath);
      // Check if dependencies changed
      const baseDeps = new Set((baseComp.dependencies || []).map(d => d.filePath));
      const headDeps = new Set((comp.dependencies || []).map(d => d.filePath));

      const depsAdded = [...headDeps].filter(d => !baseDeps.has(d));
      const depsRemoved = [...baseDeps].filter(d => !headDeps.has(d));

      if (depsAdded.length > 0 || depsRemoved.length > 0) {
        changed.push({
          filePath,
          name: comp.name,
          type: comp.type,
          dependenciesAdded: depsAdded,
          dependenciesRemoved: depsRemoved
        });
      }
    }
  }

  for (const [filePath, comp] of baseComponents) {
    if (!headComponents.has(filePath)) {
      removed.push({ filePath, name: comp.name, type: comp.type });
    }
  }

  // Count edges
  const baseEdgeCount = base.components.reduce((sum, c) => sum + (c.dependencies || []).length, 0);
  const headEdgeCount = head.components.reduce((sum, c) => sum + (c.dependencies || []).length, 0);

  // Type distribution
  const baseTypes = {};
  const headTypes = {};
  for (const c of base.components) {
    baseTypes[c.type] = (baseTypes[c.type] || 0) + 1;
  }
  for (const c of head.components) {
    headTypes[c.type] = (headTypes[c.type] || 0) + 1;
  }

  // Language distribution
  const baseLangs = { ...base.languages };
  const headLangs = { ...head.languages };

  return {
    summary: {
      baseComponents: base.components.length,
      headComponents: head.components.length,
      componentDelta: head.components.length - base.components.length,
      baseEdges: baseEdgeCount,
      headEdges: headEdgeCount,
      edgeDelta: headEdgeCount - baseEdgeCount,
      addedCount: added.length,
      removedCount: removed.length,
      changedCount: changed.length
    },
    types: {
      base: baseTypes,
      head: headTypes
    },
    languages: {
      base: baseLangs,
      head: headLangs
    },
    components: {
      added: added.sort((a, b) => a.filePath.localeCompare(b.filePath)),
      removed: removed.sort((a, b) => a.filePath.localeCompare(b.filePath)),
      changed: changed.sort((a, b) => a.filePath.localeCompare(b.filePath))
    }
  };
}

/**
 * Format a delta value with +/- sign and color
 * @param {number} delta - Delta value
 * @returns {string} Formatted string
 */
function formatDelta(delta) {
  if (delta > 0) return chalk.green(`+${delta}`);
  if (delta < 0) return chalk.red(`${delta}`);
  return chalk.gray('0');
}

/**
 * Print architecture diff to console
 * @param {object} diff - Diff result from computeArchitectureDiff
 */
function printArchitectureDiff(diff) {
  const { summary, types, languages, components } = diff;

  // Summary section
  console.log(chalk.cyan('📊 Summary'));
  console.log(`   Components: ${summary.baseComponents} → ${summary.headComponents} (${formatDelta(summary.componentDelta)})`);
  console.log(`   Edges: ${summary.baseEdges} → ${summary.headEdges} (${formatDelta(summary.edgeDelta)})`);
  console.log('');

  // Type distribution
  console.log(chalk.cyan('📦 Component Types'));
  const allTypes = new Set([...Object.keys(types.base), ...Object.keys(types.head)]);
  for (const type of allTypes) {
    const baseCount = types.base[type] || 0;
    const headCount = types.head[type] || 0;
    const delta = headCount - baseCount;
    console.log(`   ${type}: ${baseCount} → ${headCount} (${formatDelta(delta)})`);
  }
  console.log('');

  // Language distribution
  console.log(chalk.cyan('💻 Languages'));
  const allLangs = new Set([...Object.keys(languages.base), ...Object.keys(languages.head)]);
  for (const lang of allLangs) {
    const baseCount = languages.base[lang] || 0;
    const headCount = languages.head[lang] || 0;
    const delta = headCount - baseCount;
    console.log(`   ${lang}: ${baseCount} → ${headCount} (${formatDelta(delta)})`);
  }
  console.log('');

  // Added components
  if (components.added.length > 0) {
    console.log(chalk.green(`➕ Added (${components.added.length})`));
    for (const c of components.added) {
      console.log(`   + ${c.filePath} (${c.type})`);
    }
    console.log('');
  }

  // Removed components
  if (components.removed.length > 0) {
    console.log(chalk.red(`➖ Removed (${components.removed.length})`));
    for (const c of components.removed) {
      console.log(`   - ${c.filePath} (${c.type})`);
    }
    console.log('');
  }

  // Changed components
  if (components.changed.length > 0) {
    console.log(chalk.yellow(`📝 Changed (${components.changed.length})`));
    for (const c of components.changed) {
      console.log(`   ~ ${c.filePath}`);
      if (c.dependenciesAdded.length > 0) {
        console.log(chalk.gray(`     +deps: ${c.dependenciesAdded.slice(0, 3).join(', ')}${c.dependenciesAdded.length > 3 ? '...' : ''}`));
      }
      if (c.dependenciesRemoved.length > 0) {
        console.log(chalk.gray(`     -deps: ${c.dependenciesRemoved.slice(0, 3).join(', ')}${c.dependenciesRemoved.length > 3 ? '...' : ''}`));
      }
    }
    console.log('');
  }

  // No changes
  if (components.added.length === 0 && components.removed.length === 0 && components.changed.length === 0) {
    console.log(chalk.gray('   No architectural changes detected'));
    console.log('');
  }
}

module.exports = {
  validateGitRef,
  isShallowClone,
  detectPrRefsFromEnv,
  runGitCommand,
  getChangedFiles,
  readFileAtRef,
  listFilesAtRef,
  analyzeAtRef,
  computeArchitectureDiff,
  printArchitectureDiff,
  formatDelta,
};
