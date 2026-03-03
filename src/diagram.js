#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk');
const { spawn, execFileSync } = require('child_process');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const { getOpenCommand, getNpxCommandCandidates } = require('./utils/commands');

// Read version from package.json
const packageJson = require('../package.json');

// Video generation (lazy loaded)
let videoModule;
function getVideoModule() {
  if (!videoModule) {
    try {
      videoModule = require('./video.js');
    } catch (e) {
      console.error(chalk.red('❌ Video generation requires Playwright. Install with: npm install playwright'));
      process.exit(1);
    }
  }
  return videoModule;
}

const program = new Command();

// Utility functions
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

function extractImports(content, lang) {
  const imports = [];
  if (lang === 'typescript' || lang === 'javascript') {
    // ES6 imports with timeout protection against ReDoS
    const es6Regex = /import\s+(?:(?:\{[^}]*?\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/g;
    const es6 = [...content.matchAll(es6Regex)];
    es6.forEach(m => imports.push(m[1]));
    // CommonJS requires
    const cjs = [...content.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g)];
    cjs.forEach(m => imports.push(m[1]));
    // Dynamic imports
    const dynamic = [...content.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)];
    dynamic.forEach(m => imports.push(m[1]));
  } else if (lang === 'python') {
    const py = [...content.matchAll(/(?:from|import)\s+([\w.]+)/g)];
    py.forEach(m => imports.push(m[1]));
  } else if (lang === 'go') {
    const go = [...content.matchAll(/import\s+(?:\(\s*)?["']([^"']+)["']/g)];
    go.forEach(m => imports.push(m[1]));
  }
  return imports;
}

/**
 * Extract imports with line number information
 * @param {string} content - File content
 * @param {string} lang - Language
 * @returns {Array<{path: string, line: number}>}
 */
function extractImportsWithPositions(content, lang) {
  const imports = [];
  const lines = content.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    if (lang === 'typescript' || lang === 'javascript') {
      // ES6 imports
      const es6 = line.match(/import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/);
      if (es6) {
        imports.push({ path: es6[1], line: lineNum });
        continue;
      }
      
      // CommonJS requires
      const cjs = line.match(/require\s*\(\s*["']([^"']+)["']\s*\)/);
      if (cjs) {
        imports.push({ path: cjs[1], line: lineNum });
        continue;
      }
      
      // Dynamic imports
      const dynamic = line.match(/import\s*\(\s*["']([^"']+)["']\s*\)/);
      if (dynamic) {
        imports.push({ path: dynamic[1], line: lineNum });
      }
    } else if (lang === 'python') {
      const py = line.match(/(?:from|import)\s+([\w.]+)/);
      if (py) {
        imports.push({ path: py[1], line: lineNum });
      }
    } else if (lang === 'go') {
      const go = line.match(/import\s+(?:\(\s*)?["']([^"']+)["']/);
      if (go) {
        imports.push({ path: go[1], line: lineNum });
      }
    }
  }
  
  return imports;
}

function sanitize(name) {
  // Ensure unique, valid mermaid ID
  const base = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
  // Add hash suffix to prevent collisions (using SHA-256)
  const hash = crypto.createHash('sha256').update(name).digest('hex').slice(0, 8);
  return `${base}_${hash}`;
}

function escapeMermaid(str) {
  if (!str) return '';
  return str
    .replace(/"/g, '\\"')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/#/g, '\\#')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\|/g, '\\|');
}

function normalizePath(inputPath) {
  // Always use forward slashes for consistency
  return inputPath.replace(/\\/g, '/');
}

const IMPORT_RESOLUTION_SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.cts',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.jsx',
  '/index.mjs',
  '/index.mts',
  '/index.cts'
];

function toComparablePath(p) {
  return normalizePath(String(p || '')).replace(/^\.\//, '');
}

function getImportPath(importInfo) {
  if (typeof importInfo === 'string') return importInfo;
  if (importInfo && typeof importInfo.path === 'string') return importInfo.path;
  return null;
}

function resolveInternalImport(fromFilePath, importPath, rootPath) {
  if (typeof fromFilePath !== 'string' || typeof importPath !== 'string') {
    return null;
  }
  if (!importPath.startsWith('.')) {
    return null;
  }

  const fromDir = path.dirname(fromFilePath);

  // In analysis mode we can enforce root boundaries with absolute paths
  if (rootPath) {
    const absoluteTarget = path.resolve(rootPath, fromDir, importPath);
    const relativeToRoot = toComparablePath(path.relative(rootPath, absoluteTarget));
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      return null;
    }
    return relativeToRoot;
  }

  // Fallback for precomputed data without root path
  const posixFromDir = normalizePath(fromDir);
  const posixImport = normalizePath(importPath);
  return toComparablePath(path.posix.normalize(path.posix.join(posixFromDir, posixImport)));
}

function findComponentByResolvedPath(components, resolvedPath) {
  const comparablePath = toComparablePath(resolvedPath);
  const candidates = new Set(
    IMPORT_RESOLUTION_SUFFIXES.map(suffix => toComparablePath(comparablePath + suffix))
  );
  return components.find(c => candidates.has(toComparablePath(c.filePath)));
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

const ROLE_PATTERNS = {
  user: [
    'route', 'routes', 'controller', 'controllers', 'handler', 'handlers',
    'api', 'middleware', 'page', 'pages', 'ui', 'frontend', 'web', 'client', 'request'
  ],
  auth: [
    'auth', 'authentication', 'authorization', 'session', 'signin', 'login',
    'signup', 'token', 'jwt', 'oauth', 'sso', 'passport', 'identity', 'acl',
    'guard', 'permission', 'password', 'mfa', 'security'
  ],
  database: [
    'db', 'database', 'data', 'datastore', 'repository', 'repo', 'model',
    'schema', 'migration', 'query', 'querybuilder', 'prisma', 'typeorm',
    'sequelize', 'mongoose', 'knex', 'drizzle', 'redis', 'postgres', 'mysql',
    'sqlite', 'mongo', 'dynamodb', 'd1'
  ],
  events: [
    'event', 'events', 'queue', 'worker', 'cron', 'scheduler', 'webhook',
    'pubsub', 'bus', 'publish', 'subscriber', 'consumer', 'producer',
    'listener', 'trigger'
  ],
  integrations: [
    'integration', 'webhook', 'gateway', 'stripe', 'pay', 'sendgrid', 'twilio',
    'sentry', 'github', 'slack', 'analytics', 'mail', 'smtp', 'storage'
  ],
  security: [
    'security', 'threat', 'attack', 'rate', 'encrypt', 'decrypt', 'signature',
    'hash', 'verify', 'csrf', 'xss', 'audit', 'compliance', 'policy', 'vault',
    'kms', 'secret', 'key'
  ],
};

const SUPPORTED_DIAGRAM_TYPES = Object.freeze([
  'architecture',
  'sequence',
  'dependency',
  'class',
  'flow',
  'database',
  'user',
  'events',
  'auth',
  'security',
]);

function textHasToken(text, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[\\/._-])${escaped}([\\/._-]|$)`, 'i');
  return re.test(text);
}

function collectExternalImports(importEntries) {
  const packages = new Set();
  if (!Array.isArray(importEntries)) return [];

  for (const entry of importEntries) {
    const importPath = getImportPath(entry);
    if (!importPath || importPath.startsWith('.')) {
      continue;
    }
    const externalPackage = getExternalPackageName(importPath);
    if (externalPackage) {
      packages.add(externalPackage);
    }
  }

  return [...packages];
}

function inferRoleTags(filePath, originalName, fileContent, importEntries, type) {
  const content = (fileContent || '').toLowerCase();
  const pathText = normalizePath(filePath || '').toLowerCase();
  const nameText = (originalName || '').toLowerCase();
  const externalImports = collectExternalImports(importEntries).join(' ').toLowerCase();
  const combined = `${pathText} ${nameText} ${content} ${externalImports}`;

  const tags = new Set();

  for (const [tag, tokens] of Object.entries(ROLE_PATTERNS)) {
    for (const token of tokens) {
      if (textHasToken(combined, token)) {
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

function hasRole(component, role) {
  return (Array.isArray(component.roleTags) && component.roleTags.includes(role));
}

function componentsByRole(components, role) {
  if (!Array.isArray(components)) return [];
  return components.filter((component) => hasRole(component, role));
}

function mapSafeNames(components) {
  const map = new Map();
  const used = new Set();

  for (const component of components) {
    const rawName = sanitize(component.name || component.originalName || 'node');
    if (!used.has(rawName)) {
      map.set(component, rawName);
      used.add(rawName);
      continue;
    }

    let i = 1;
    let candidate = `${rawName}_${i}`;
    while (used.has(candidate)) {
      i += 1;
      candidate = `${rawName}_${i}`;
    }
    map.set(component, candidate);
    used.add(candidate);
  }

  return map;
}

function byNameIndex(components) {
  const map = new Map();
  if (!Array.isArray(components)) return map;
  for (const component of components) {
    if (component && component.name) {
      map.set(component.name, component);
    }
  }
  return map;
}

function collectConnectedComponents(components, seedComponents, maxDepth = 2, maxNodes = 35) {
  if (!Array.isArray(components)) return [];
  if (!Array.isArray(seedComponents) || seedComponents.length === 0) return [];

  const byName = byNameIndex(components);
  const selected = new Map();
  const queue = [];

  for (const seed of seedComponents) {
    if (seed && seed.name && !selected.has(seed.name)) {
      selected.set(seed.name, seed);
      queue.push(seed);
    }
  }

  let depth = 0;
  const visited = new Set();
  while (queue.length > 0 && depth < maxDepth) {
    const levelSize = queue.length;
    for (let i = 0; i < levelSize; i++) {
      const current = queue.shift();
      if (!current || typeof current.name !== 'string') continue;
      const depthKey = `${current.name}:${depth}`;
      if (visited.has(depthKey)) continue;
      visited.add(depthKey);

      const next = [];
      for (const depName of current.dependencies || []) {
        const dependency = byName.get(depName);
        if (dependency && !selected.has(depName)) {
          selected.set(depName, dependency);
          next.push(dependency);
        }
      }

      for (const candidate of components) {
        if (selected.has(candidate.name)) continue;
        const reverseDependencies = Array.isArray(candidate.dependencies) ? candidate.dependencies : [];
        if (reverseDependencies.includes(current.name)) {
          selected.set(candidate.name, candidate);
          next.push(candidate);
        }
      }

      for (const n of next) {
        if (selected.size >= maxNodes) break;
        queue.push(n);
      }
      if (selected.size >= maxNodes) break;
    }
    depth += 1;
  }

  return [...selected.values()];
}

function buildRoleDiagramContext(data, seeds, maxDepth = 2, maxNodes = 30) {
  const connected = collectConnectedComponents(data.components, seeds, maxDepth, maxNodes);
  return {
    connected,
    byName: byNameIndex(connected),
    safeNames: mapSafeNames(connected),
  };
}

function appendDependencyEdges(lines, sourceComponents, byName, safeNames, edges, edgeLabelFn) {
  for (const comp of sourceComponents) {
    const from = safeNames.get(comp);
    if (!from) continue;
    for (const depName of comp.dependencies || []) {
      const dep = byName.get(depName);
      if (!dep) continue;
      const to = safeNames.get(dep);
      if (!to) continue;
      const key = `${from}->${to}`;
      if (edges.has(key)) continue;
      edges.add(key);

      const label = typeof edgeLabelFn === 'function' ? edgeLabelFn(comp, dep) : null;
      if (label) {
        lines.push(`  ${from} -->|${label}| ${to}`);
      } else {
        lines.push(`  ${from} --> ${to}`);
      }
    }
  }
}

function appendClassAssignment(lines, nodeIds, className) {
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) return;
  const unique = [...new Set(nodeIds.filter(Boolean))];
  if (unique.length === 0) return;
  lines.push(`  class ${unique.join(',')} ${className}`);
}

function inferDbIntent(component) {
  const source = `${component.filePath || ''} ${component.originalName || ''} ${component.name || ''}`.toLowerCase();
  const hasLookup = /(read|find|query|select|get|lookup|exists|fetch)/.test(source);
  const hasWrite = /(create|insert|update|upsert|save|delete|remove|write|transaction)/.test(source);
  return { hasLookup, hasWrite };
}

// Analysis
async function analyze(rootPath, options) {
  // Validate maxFiles with strict parsing
  let maxFiles = parseInt(options.maxFiles, 10);
  if (isNaN(maxFiles) || maxFiles < 1 || maxFiles > 10000) {
    maxFiles = 100;
  }
  // Extra safety: ensure within safe bounds
  maxFiles = Math.min(Math.max(maxFiles, 1), 10000);
  
  // Validate patterns type
  let patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go', '**/*.rs'];
  if (options.patterns) {
    if (typeof options.patterns !== 'string') {
      throw new TypeError('patterns must be a string');
    }
    patterns = options.patterns.split(',');
  }
  
  let exclude = ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.test.*', '*.spec.*'];
  if (options.exclude) {
    if (typeof options.exclude !== 'string') {
      throw new TypeError('exclude must be a string');
    }
    exclude = options.exclude.split(',');
  }

  const files = [];
  for (const pattern of patterns) {
    if (!pattern || pattern.trim() === '') continue;
    try {
      const matches = await glob(pattern.trim(), { cwd: rootPath, absolute: true, ignore: exclude });
      files.push(...matches);
    } catch (e) {
      console.warn(chalk.yellow(`⚠️  Invalid pattern: ${pattern}`));
    }
  }

  const uniqueFiles = [...new Set(files)].slice(0, maxFiles);
  const components = [];
  const languages = {};
  const directories = new Set();
  const entryPoints = [];
  const seenNames = new Set();

  for (const filePath of uniqueFiles) {
    try {
      // Security: Check file size before reading
      const stats = fs.statSync(filePath);
      if (stats.size > 10 * 1024 * 1024) { // 10MB limit
        console.warn(chalk.yellow(`⚠️  Skipping large file: ${path.basename(filePath)} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`));
        continue;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const lang = detectLanguage(filePath);
      let rel = normalizePath(path.relative(rootPath, filePath));
      const dir = path.dirname(rel);
      if (dir === '.') {
        rel = './' + rel;
      }

      languages[lang] = (languages[lang] || 0) + 1;
      if (dir !== '.') directories.add(dir);
      
      // Support more entry point patterns (with escaped regex)
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
      if (process.env.DEBUG) {
        // Sanitize path to avoid info disclosure - show only basename
        const safePath = path.basename(filePath);
        console.error(chalk.gray(`Skipped ${safePath}: ${e.message}`));
      }
    }
  }

  // Resolve dependencies
  for (const comp of components) {
    comp.dependencies = [];
    for (const imp of comp.imports) {
      const importPath = getImportPath(imp);
      if (!importPath) continue;
      const resolved = resolveInternalImport(comp.filePath, importPath, rootPath);
      if (!resolved) continue;
      const dep = findComponentByResolvedPath(components, resolved);
      if (dep) comp.dependencies.push(dep.name);
    }
  }

  return { rootPath, components, entryPoints, languages, directories: [...directories].sort() };
}

// Diagram generators
function generateArchitecture(data, focus) {
  if (!data || !Array.isArray(data.components)) {
    return 'graph TD\n  Note["No data available"]';
  }
  
  const lines = ['graph TD'];
  const focusNorm = focus ? normalizePath(focus) : null;
  // Use exact path matching for focus
  const comps = focusNorm 
    ? data.components.filter(c => {
        const normalizedFilePath = normalizePath(c.filePath || '');
        const normalizedName = c.name || '';
        // Check if focus is at path boundary
        return normalizedFilePath === focusNorm || 
               normalizedFilePath.startsWith(focusNorm + '/') ||
               normalizedName === focusNorm;
      }) 
    : data.components;
  
  if (comps.length === 0) {
    lines.push('  Note["No components found' + (focus ? ' for focus: ' + escapeMermaid(focus) : '') + '"]');
    return lines.join('\n');
  }
  
  const byDir = new Map();
  for (const c of comps) {
    const dir = c.directory || 'root';
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(c);
  }

  for (const [dir, items] of byDir) {
    if (items.length === 0) continue;
    lines.push(`  subgraph ${sanitize(dir)}["${escapeMermaid(dir)}"]`);
    for (const c of items) {
      const shape = c.type === 'service' ? '[[' : '[';
      const end = c.type === 'service' ? ']]' : ']';
      lines.push(`    ${sanitize(c.name)}${shape}"${escapeMermaid(c.originalName)}"${end}`);
    }
    lines.push('  end');
  }

  for (const c of comps) {
    for (const d of c.dependencies) {
      if (comps.find(x => x.name === d)) {
        lines.push(`  ${sanitize(c.name)} --> ${sanitize(d)}`);
      }
    }
  }

  // Track styled nodes to avoid duplicates
  const styledNodes = new Set();
  for (const ep of data.entryPoints) {
    const epName = path.basename(ep, path.extname(ep));
    const comp = comps.find(c => c.originalName === epName);
    if (comp && !styledNodes.has(comp.name)) {
      lines.push(`  style ${sanitize(comp.name)} fill:#4f46e5,color:#fff`);
      styledNodes.add(comp.name);
    }
  }

  return lines.join('\n');
}

function generateSequence(data) {
  if (!data || !Array.isArray(data.components)) {
    return 'sequenceDiagram\n  Note over User,App: No data available';
  }
  
  const lines = ['sequenceDiagram'];
  // Use configurable limit with warning
  const MAX_SERVICES = 6;
  const services = data.components.filter(c => c.type === 'service' || c.name === 'index').slice(0, MAX_SERVICES);
  if (data.components.length > MAX_SERVICES) {
    console.warn(chalk.yellow(`⚠️  Sequence diagram limited to ${MAX_SERVICES} services`));
  }
  
  if (services.length === 0) {
    lines.push('  Note over User,App: No services detected');
    return lines.join('\n');
  }

  // Track used sanitized names to prevent collisions
  const usedNames = new Map();
  const getSafeName = (service) => {
    const base = sanitize(service.name);
    if (!usedNames.has(base)) {
      usedNames.set(base, service.name);
      return base;
    }
    // Collision - append number
    let i = 1;
    let newName = `${base}_${i}`;
    while (usedNames.has(newName)) {
      i++;
      newName = `${base}_${i}`;
    }
    usedNames.set(newName, service.name);
    return newName;
  };

  const safeNames = services.map(getSafeName);
  
  for (let i = 0; i < services.length; i++) {
    lines.push(`  participant ${safeNames[i]} as ${escapeMermaid(services[i].originalName)}`);
  }
  
  for (let i = 0; i < services.length - 1; i++) {
    lines.push(`  ${safeNames[i]}->>${safeNames[i+1]}: calls`);
  }
  return lines.join('\n');
}

function generateDependency(data, focus) {
  if (!data || !Array.isArray(data.components)) {
    return 'graph LR\n  Note["No data available"]';
  }
  
  const lines = ['graph LR'];
  const focusNorm = focus ? normalizePath(focus) : null;
  const comps = focusNorm ? data.components.filter(c => {
    const normalizedPath = normalizePath(c.filePath || '');
    return normalizedPath === focusNorm || normalizedPath.startsWith(focusNorm + '/');
  }) : data.components;
  
  if (comps.length === 0) {
    lines.push('  Note["No components found"]');
    return lines.join('\n');
  }
  
  const external = new Set();

  for (const c of comps) {
    const imports = Array.isArray(c.imports) ? c.imports : [];
    for (const importInfo of imports) {
      const importPath = getImportPath(importInfo);
      if (!importPath) continue;
      if (!importPath.startsWith('.')) {
        const pkg = getExternalPackageName(importPath);
        if (pkg) {
          external.add(pkg);
          lines.push(`  ${sanitize(pkg)}["${escapeMermaid(pkg)}"] --> ${sanitize(c.name)}`);
        }
      } else {
        const basePath = resolveInternalImport(c.filePath, importPath, data.rootPath);
        if (!basePath) continue;
        const resolved = findComponentByResolvedPath(comps, basePath);
        if (resolved) lines.push(`  ${sanitize(c.name)} --> ${sanitize(resolved.name)}`);
      }
    }
  }

  for (const e of external) {
    lines.push(`  style ${sanitize(e)} fill:#f59e0b,color:#fff`);
  }
  return lines.join('\n');
}

function generateClass(data) {
  if (!data || !Array.isArray(data.components)) {
    return 'classDiagram\n  note "No data available"';
  }
  
  const lines = ['classDiagram'];
  const MAX_CLASSES = 20;
  const classes = data.components.filter(c => c.type === 'class' || c.type === 'component').slice(0, MAX_CLASSES);
  if (data.components.length > MAX_CLASSES) {
    console.warn(chalk.yellow(`⚠️  Class diagram limited to ${MAX_CLASSES} classes`));
  }
  
  if (classes.length === 0) {
    lines.push('  note "No classes found"');
    return lines.join('\n');
  }
  
  for (const c of classes) {
    lines.push(`  class ${sanitize(c.name)} {`);
    lines.push(`    +${escapeMermaid(c.filePath)}`);
    lines.push('  }');
  }
  
  for (const c of classes) {
    const deps = (c.dependencies || []).slice(0, 3);
    for (const d of deps) {
      if (classes.find(x => x.name === d)) {
        lines.push(`  ${sanitize(c.name)} --> ${sanitize(d)}`);
      }
    }
  }
  return lines.join('\n');
}

function generateFlow(data) {
  if (!data || !Array.isArray(data.components)) {
    return 'flowchart TD\n  Start(["Start"])\n  End(["End"])\n  Start --> End';
  }
  
  const lines = ['flowchart TD'];
  lines.push('  Start(["Start"])');
  const MAX_COMPONENTS = 8;
  const comps = data.components.slice(0, MAX_COMPONENTS);
  if (data.components.length > MAX_COMPONENTS) {
    console.warn(chalk.yellow(`⚠️  Flow diagram limited to ${MAX_COMPONENTS} components`));
  }
  
  if (comps.length === 0) {
    lines.push('  End(["End"])');
    lines.push('  Start --> End');
    return lines.join('\n');
  }
  
  let prev = 'Start';
  for (const c of comps) {
    const safeName = sanitize(c.name);
    lines.push(`  ${safeName}["${escapeMermaid(c.originalName)}"]`);
    lines.push(`  ${prev} --> ${safeName}`);
    prev = safeName;
  }
  lines.push('  End(["End"])');
  lines.push(`  ${prev} --> End`);
  return lines.join('\n');
}

function generateDatabase(data) {
  if (!data || !Array.isArray(data.components)) {
    return 'flowchart TD\n  Note["No data available"]';
  }

  const lines = ['flowchart TD'];
  const seeds = componentsByRole(data.components, 'database');
  if (seeds.length === 0) {
    lines.push('  Note["No database-focused components found"]');
    return lines.join('\n');
  }

  const { byName, safeNames } = buildRoleDiagramContext(data, seeds, 2, 28);

  lines.push('  UserRequest["User request"]');
  lines.push('  Decision{Record exists?}');

  const addedEdges = new Set();
  const dbNodeIds = [];

  for (const seed of seeds) {
    const safe = safeNames.get(seed);
    if (!safe) continue;

    dbNodeIds.push(safe);
    lines.push(`  ${safe}["${escapeMermaid(seed.originalName)}"]`);
    lines.push(`  UserRequest --> ${safe}`);

    const intent = inferDbIntent(seed);
    if (intent.hasLookup) {
      const lookup = `${safe}_lookup`;
      const create = `${safe}_create`;
      const update = `${safe}_update`;
      lines.push(`  ${safe} --> ${lookup}["lookup query"]`);
      lines.push(`  ${lookup} --> Decision`);
      lines.push(`  Decision -->|found| ${update}["update or modify"]`);
      lines.push(`  Decision -->|not found| ${create}["insert/create"]`);
      lines.push(`  ${update} --> ${safe}_result["result"]`);
      lines.push(`  ${create} --> ${safe}_result["result"]`);
    } else if (intent.hasWrite) {
      const write = `${safe}_write`;
      lines.push(`  ${safe} --> ${write}["write/update"]`);
      lines.push(`  ${write} --> ${safe}_result["result"]`);
    } else {
      const result = `${safe}_result`;
      lines.push(`  ${safe} --> ${result}["result"]`);
    }
  }

  appendDependencyEdges(lines, seeds, byName, safeNames, addedEdges);

  lines.push('  classDef dbNode fill:#0ea5e9,color:#fff');
  lines.push('  classDef decisionNode fill:#0284c7,color:#fff');
  appendClassAssignment(lines, dbNodeIds, 'dbNode');
  lines.push('  class Decision decisionNode');
  return lines.join('\n');
}

function generateUserInteractions(data) {
  if (!data || !Array.isArray(data.components)) {
    return 'flowchart LR\n  Note["No data available"]';
  }

  const lines = ['flowchart LR'];
  const seeds = componentsByRole(data.components, 'user');
  if (seeds.length === 0) {
    lines.push('  Note["No user-facing components found"]');
    return lines.join('\n');
  }

  const { connected, byName, safeNames } = buildRoleDiagramContext(data, seeds, 1, 30);
  const edges = new Set();
  const userNodeIds = [];

  lines.push('  User(("User"))');
  for (const seed of seeds) {
    const safe = safeNames.get(seed);
    if (!safe) continue;
    userNodeIds.push(safe);
    lines.push(`  ${safe}["${escapeMermaid(seed.originalName)}"]`);
    lines.push(`  User --> ${safe}`);
  }

  appendDependencyEdges(lines, connected, byName, safeNames, edges);

  lines.push('  classDef userNode fill:#16a34a,color:#fff');
  appendClassAssignment(lines, userNodeIds, 'userNode');
  return lines.join('\n');
}

function generateEvents(data) {
  if (!data || !Array.isArray(data.components)) {
    return 'flowchart TD\n  Note["No data available"]';
  }

  const lines = ['flowchart TD'];
  const seeds = componentsByRole(data.components, 'events');
  if (seeds.length === 0) {
    lines.push('  Note["No event/channels components found"]');
    return lines.join('\n');
  }

  const { connected, byName, safeNames } = buildRoleDiagramContext(data, seeds, 2, 30);
  const edges = new Set();
  const eventNodeIds = [];

  lines.push('  subgraph Channels["Event channels / queues"]');
  for (const component of connected) {
    const safe = safeNames.get(component);
    if (!safe) continue;
    const isEventSource = seeds.includes(component);
    if (isEventSource) {
      eventNodeIds.push(safe);
      lines.push(`    ${safe}{{"${escapeMermaid(component.originalName)}"}}`);
    } else {
      lines.push(`    ${safe}["${escapeMermaid(component.originalName)}"]`);
    }
  }
  lines.push('  end');

  appendDependencyEdges(
    lines,
    connected,
    byName,
    safeNames,
    edges,
    (comp) => (seeds.includes(comp) ? 'emit' : 'consume')
  );

  lines.push('  classDef eventNode fill:#db2777,color:#fff');
  appendClassAssignment(lines, eventNodeIds, 'eventNode');
  return lines.join('\n');
}

function generateAuth(data) {
  if (!data || !Array.isArray(data.components)) {
    return 'flowchart TD\n  Note["No data available"]';
  }

  const lines = ['flowchart TD'];
  const seeds = componentsByRole(data.components, 'auth');
  if (seeds.length === 0) {
    lines.push('  Note["No authentication components found"]');
    return lines.join('\n');
  }

  const { connected, byName, safeNames } = buildRoleDiagramContext(data, seeds, 2, 24);
  const edges = new Set();
  const authNodeIds = [];

  lines.push('  Request["Authentication request"]');
  lines.push('  Boundary{"Auth Boundary"}');
  lines.push('  Request --> Boundary');

  for (const seed of seeds) {
    const safe = safeNames.get(seed);
    if (!safe) continue;
    authNodeIds.push(safe);
    lines.push(`  ${safe}["${escapeMermaid(seed.originalName)}"]`);
    const key = `Boundary->${safe}`;
    if (!edges.has(key)) {
      edges.add(key);
      lines.push(`  Boundary --> ${safe}`);
    }
  }

  appendDependencyEdges(lines, connected, byName, safeNames, edges);

  const providerSet = new Set();
  for (const seed of seeds) {
    for (const pkg of collectExternalImports(seed.imports || [])) {
      providerSet.add(pkg);
    }
  }
  for (const provider of providerSet) {
    const providerNode = sanitize(provider);
    lines.push(`  ${providerNode}[("${escapeMermaid(provider)}")]`);
  }

  lines.push('  classDef authNode fill:#7c3aed,color:#fff');
  appendClassAssignment(lines, authNodeIds, 'authNode');
  return lines.join('\n');
}

function generateSecurity(data) {
  if (!data || !Array.isArray(data.components)) {
    return 'flowchart TD\n  Note["No data available"]';
  }

  const lines = ['flowchart TD'];
  const seeds = [
    ...componentsByRole(data.components, 'security'),
    ...componentsByRole(data.components, 'auth'),
    ...componentsByRole(data.components, 'integrations'),
  ].filter((value, index, arr) => arr.indexOf(value) === index);

  if (seeds.length === 0) {
    lines.push('  Note["No security-focused components found"]');
    return lines.join('\n');
  }

  const { connected, byName, safeNames } = buildRoleDiagramContext(data, seeds, 2, 40);
  const edges = new Set();
  const securityNodeIds = [];

  lines.push('  Untrusted["Untrusted input"]');
  for (const seed of seeds) {
    const safe = safeNames.get(seed);
    if (!safe) continue;
    securityNodeIds.push(safe);
    lines.push(`  ${safe}["${escapeMermaid(seed.originalName)}"]`);
    const key = `Untrusted->${safe}`;
    if (!edges.has(key)) {
      edges.add(key);
      lines.push(`  Untrusted --> ${safe}`);
    }
  }

  appendDependencyEdges(lines, connected, byName, safeNames, edges);

  lines.push('  classDef securityNode fill:#dc2626,color:#fff');
  appendClassAssignment(lines, securityNodeIds, 'securityNode');
  return lines.join('\n');
}

function generate(data, type, focus) {
  switch (type) {
    case 'architecture': return generateArchitecture(data, focus);
    case 'sequence': return generateSequence(data);
    case 'dependency': return generateDependency(data, focus);
    case 'class': return generateClass(data);
    case 'flow': return generateFlow(data);
    case 'database': return generateDatabase(data);
    case 'user': return generateUserInteractions(data);
    case 'events': return generateEvents(data);
    case 'auth': return generateAuth(data);
    case 'security': return generateSecurity(data);
    default: {
      const validTypes = ['architecture', 'sequence', 'dependency', 'class', 'flow', 'database', 'user', 'events', 'auth', 'security'];
      const suggestion = findClosestMatch(type, validTypes);
      console.warn(chalk.yellow(`⚠️  Unknown diagram type "${type}", using architecture`));
      if (suggestion) {
        console.warn(formatSuggestion(suggestion));
      }
      return generateArchitecture(data, focus);
    }
  }
}

function isPlaceholderDiagram(mermaidCode) {
  if (!mermaidCode || typeof mermaidCode !== 'string') return true;
  const compact = mermaidCode.toLowerCase();
  return compact.includes('note["no data available"]')
    || compact.includes('note["no components found')
    || compact.includes('no services detected')
    || compact.includes('note "no data available"')
    || compact.includes('note "no classes found"')
    || compact.includes('note["no database-focused components found"]')
    || compact.includes('note["no user-facing components found"]')
    || compact.includes('note["no event/channels components found"]')
    || compact.includes('note["no authentication components found"]')
    || compact.includes('note["no security-focused components found"]')
    || compact.includes('no architecture data');
}

function toManifestEntry(type, filePath, mermaidCode, rootPath) {
  const lines = typeof mermaidCode === 'string' ? mermaidCode.split('\n') : [];
  return {
    type,
    file: path.basename(filePath),
    outputPath: rootPath ? path.relative(rootPath, filePath) : filePath,
    lines: lines.length,
    bytes: Buffer.byteLength(mermaidCode || '', 'utf8'),
    isPlaceholder: isPlaceholderDiagram(mermaidCode),
  };
}

function parseCommaSeparatedList(value) {
  if (!value || typeof value !== 'string') return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function buildManifestSummary(manifest) {
  if (!manifest || !Array.isArray(manifest.diagrams)) {
    return null;
  }

  const diagrams = manifest.diagrams
    .map((diagram) => ({
      ...diagram,
      isPlaceholder: Boolean(diagram.isPlaceholder),
    }))
    .filter((entry) => entry && typeof entry.type === 'string' && entry.file);

  const missing = SUPPORTED_DIAGRAM_TYPES.filter(
    (type) => !diagrams.some((diagram) => diagram.type === type)
  );
  const placeholderTypes = diagrams.filter((diagram) => diagram.isPlaceholder).map((diagram) => diagram.type);

  return {
    generatedAt: manifest.generatedAt || new Date().toISOString(),
    rootPath: manifest.rootPath,
    diagramDir: manifest.diagramDir,
    totalDiagrams: diagrams.length,
    placeholders: placeholderTypes.length,
    placeholderTypes,
    missingTypes: missing,
    diagrams,
  };
}

// URL shortening for large diagrams
function createMermaidUrl(mermaidCode) {
  // If diagram is very large, provide text file instead
  if (mermaidCode.length > 5000) {
    return { url: null, large: true };
  }
  
  try {
    const payload = JSON.stringify({ code: mermaidCode });
    const compressed = zlib.deflateSync(payload);
    const encoded = compressed
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const url = `https://mermaid.live/edit#pako:${encoded}`;
    
    // Check if URL is too long for browser
    if (url.length > 8000) {
      return { url: null, large: true };
    }
    return { url, large: false };
  } catch (e) {
    return { url: null, large: true };
  }
}

// Validate output path to prevent directory traversal
function validateOutputPath(outputPath, rootPath) {
  if (typeof outputPath !== 'string' || outputPath.trim() === '') {
    throw new Error('Invalid path: output path is required');
  }

  // Security: Check for null bytes
  if (outputPath.includes('\0')) {
    throw new Error('Invalid path: null bytes detected');
  }
  
  // Resolve symlinks to prevent symlink attacks
  let realRoot;
  try {
    realRoot = fs.realpathSync(rootPath);
  } catch (e) {
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

function resolveRootPathOrExit(targetPath) {
  const root = path.resolve(targetPath || '.');
  try {
    const stats = fs.statSync(root);
    if (!stats.isDirectory()) {
      console.error(chalk.red('❌ Path error:'), `Target is not a directory: ${root}`);
      process.exit(2);
    }
  } catch (error) {
    console.error(chalk.red('❌ Path error:'), `Target directory not found: ${root}`);
    process.exit(2);
  }
  return root;
}

function openPreviewUrl(url) {
  const { cmd, args } = getOpenCommand(url, process.platform);
  try {
    const child = spawn(cmd, args, {
      stdio: 'ignore',
      detached: true,
      windowsHide: true
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
  if (lastError) {
    throw lastError;
  }
  throw new Error('npx command not found');
}

const ALLOWED_THEMES = ['default', 'dark', 'forest', 'neutral', 'light'];

function normalizeThemeOption(theme, fallback = 'default') {
  const normalized = String(theme || fallback).toLowerCase();
  return ALLOWED_THEMES.includes(normalized) ? normalized : fallback;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Distance
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Find the closest matching string from a list
 * @param {string} input - User input
 * @param {string[]} options - Valid options
 * @param {number} maxDistance - Maximum distance to consider (default: 3)
 * @returns {string|null} Best match or null if none close enough
 */
function findClosestMatch(input, options, maxDistance = 3) {
  const inputLower = input.toLowerCase();
  let bestMatch = null;
  let bestDistance = maxDistance + 1;

  for (const option of options) {
    const distance = levenshteinDistance(inputLower, option.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = option;
    }
  }

  return bestDistance <= maxDistance ? bestMatch : null;
}

/**
 * Format a suggestion message
 * @param {string} suggestion - The suggested value
 * @returns {string} Formatted suggestion
 */
function formatSuggestion(suggestion) {
  return chalk.cyan(`Did you mean: ${suggestion}?`);
}

function validateExistingPathInRoot(targetPath, rootPath, label = 'path') {
  const realRoot = fs.realpathSync(rootPath);
  const realTarget = fs.realpathSync(targetPath);
  const relative = path.relative(realRoot, realTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Invalid ${label}: path escapes project root`);
  }
  return realTarget;
}

// Commands
program
  .name('diagram')
  .description('Generate architecture diagrams from code')
  .version(packageJson.version);

program
  .command('analyze [path]')
  .description('Analyze codebase structure')
  .option('-p, --patterns <list>', 'File patterns (comma-separated)', '**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.go,**/*.rs')
  .option('-e, --exclude <list>', 'Exclude patterns', 'node_modules/**,.git/**,dist/**')
  .option('-m, --max-files <n>', 'Max files to analyze', '100')
  .option('-j, --json', 'Output as JSON')
  .action(async (targetPath, options) => {
    const root = resolveRootPathOrExit(targetPath);
    if (!options.json) {
      console.log(chalk.blue('Analyzing'), root);
    }
    
    const data = await analyze(root, options);
    
    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(chalk.green('\n📊 Summary'));
      console.log(`  Files: ${data.components.length}`);
      console.log(`  Languages: ${Object.entries(data.languages).map(([k,v]) => `${k}(${v})`).join(', ') || 'none'}`);
      console.log(`  Entry points: ${data.entryPoints.join(', ') || 'none'}`);
      console.log(`\n${chalk.yellow('Components:')}`);
      data.components.slice(0, 15).forEach(c => {
        const deps = c.dependencies.length > 0 ? ` → ${c.dependencies.slice(0, 3).join(', ')}` : '';
        console.log(`  ${c.originalName} (${c.type})${deps}`);
      });
      if (data.components.length > 15) {
        console.log(chalk.gray(`  ... and ${data.components.length - 15} more`));
      }
    }
  });

program
  .command('generate [path]')
  .description('Generate a diagram')
  .option('-t, --type <type>', 'Diagram type: architecture, sequence, dependency, class, flow, database, user, events, auth, security', 'architecture')
  .option('-f, --focus <module>', 'Focus on specific module')
  .option('-o, --output <file>', 'Output file (SVG/PNG)')
  .option('-m, --max-files <n>', 'Max files to analyze', '100')
  .option('--theme <theme>', 'Theme: default, dark, forest, neutral, light', 'default')
  .option('--open', 'Open in browser')
  .action(async (targetPath, options) => {
    const root = resolveRootPathOrExit(targetPath);
    const requestedTheme = String(options.theme || 'default').toLowerCase();
    const safeTheme = normalizeThemeOption(options.theme, 'default');
    if (requestedTheme !== safeTheme) {
      const suggestion = findClosestMatch(options.theme, ALLOWED_THEMES);
      console.warn(chalk.yellow(`⚠️  Unknown theme "${options.theme}", using "${safeTheme}"`));
      if (suggestion) {
        console.warn(formatSuggestion(suggestion));
      }
    }
    console.log(chalk.blue('Generating'), options.type, 'diagram for', root);
    
    const data = await analyze(root, options);
    const mermaid = generate(data, options.type, options.focus);
    
    console.log(chalk.green('\n📐 Mermaid Diagram:\n'));
    console.log('```mermaid');
    console.log(mermaid);
    console.log('```\n');
    
    // Preview URL
    const { url, large } = createMermaidUrl(mermaid);
    
    if (large || !url) {
      console.log(chalk.yellow('⚠️  Diagram is too large for preview URL.'));
      console.log(chalk.cyan('💾 Save to file:'), 'diagram generate . --output diagram.svg');
    } else {
      console.log(chalk.cyan('🔗 Preview:'), url);
    }
    
    // Save to file if requested
    if (options.output) {
      // Validate output path for security
      let safeOutput;
      try {
        safeOutput = validateOutputPath(options.output, root);
      } catch (err) {
        console.error(chalk.red('❌ Output path error:'), err.message);
        process.exit(2);
      }
      
      // Ensure output directory exists
      const outputDir = path.dirname(safeOutput);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true, mode: 0o755 });
      }
      
      const ext = path.extname(options.output).toLowerCase();
      if (ext === '.md' || ext === '.mmd') {
        fs.writeFileSync(safeOutput, mermaid);
        console.log(chalk.green('✅ Saved to'), options.output);
      } else {
        // Try to render
        let tempFile = null;
        try {
          // Use crypto for secure random filename
          const randomId = crypto.randomBytes(16).toString('hex');
          tempFile = path.join(os.tmpdir(), `diagram-${Date.now()}-${randomId}.mmd`);
          fs.writeFileSync(tempFile, `%%{init: {'theme': '${safeTheme}'}}%%\n${mermaid}`);
          runMermaidCli(['-y', '@mermaid-js/mermaid-cli', 'mmdc', '-i', tempFile, '-o', safeOutput, '-b', 'transparent']);
          fs.unlinkSync(tempFile);
          console.log(chalk.green('✅ Rendered to'), options.output);
        } catch (e) {
          if (tempFile && fs.existsSync(tempFile)) {
            try { fs.unlinkSync(tempFile); } catch (e2) {}
          }
          console.error(chalk.red('❌ Could not render output file. Install mermaid-cli: npm i -g @mermaid-js/mermaid-cli'));
          if (process.env.DEBUG) console.error(chalk.gray(e.message));
          process.exit(2);
        }
      }
    }
    
    if (options.open && url) {
      // Security: Validate URL protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.error(chalk.red('❌ Invalid URL protocol'));
      } else {
        openPreviewUrl(url);
      }
    }
  });

program
  .command('all [path]')
  .description('Generate all diagram types')
  .option('-o, --output-dir <dir>', 'Output directory', './diagrams')
  .option('-p, --patterns <list>', 'File patterns', '**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.go,**/*.rs')
  .option('-e, --exclude <list>', 'Exclude patterns', 'node_modules/**,.git/**,dist/**')
  .option('-m, --max-files <n>', 'Max files to analyze', '100')
  .action(async (targetPath, options) => {
    const root = resolveRootPathOrExit(targetPath);
    let outDir;
    try {
      outDir = validateOutputPath(options.outputDir, root);
    } catch (err) {
      console.error(chalk.red('❌ Output path error:'), err.message);
      process.exit(2);
    }
    
    console.log(chalk.blue('Analyzing'), root);
    const data = await analyze(root, options);
    
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    const types = [...SUPPORTED_DIAGRAM_TYPES];
    const manifest = {
      generatedAt: new Date().toISOString(),
      rootPath: root,
      diagramDir: path.relative(root, outDir) || '.',
      diagrams: [],
    };
    
    for (const type of types) {
      const mermaid = generate(data, type);
      const file = path.join(outDir, `${type}.mmd`);
      fs.writeFileSync(file, mermaid);
      manifest.diagrams.push(toManifestEntry(type, file, mermaid, root));
      console.log(chalk.green('✅'), type, '→', file);
    }

    const manifestPath = path.join(outDir, 'manifest.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(chalk.green('✅ manifest'), '→', manifestPath);
    
    console.log(chalk.cyan('\n🔗 Preview all at: https://mermaid.live'));
  });

program
  .command('manifest [path]')
  .description('Summarize manifest.json from a diagram output directory')
  .option('-d, --manifest-dir <dir>', 'Directory containing manifest.json', '.diagram')
  .option('-o, --output <file>', 'Write summary JSON to a file')
  .option('--require-types <list>', 'Require all listed diagram types, comma-separated')
  .option(
    '--fail-on-placeholder',
    'Fail if any required diagram was a placeholder (or any placeholder if no required types are set)'
  )
  .action(async (targetPath, options) => {
    const root = resolveRootPathOrExit(targetPath);
    const manifestDir = path.join(root, options.manifestDir || '.diagram');
    const manifestPath = path.join(manifestDir, 'manifest.json');

    let safeManifestPath;
    try {
      safeManifestPath = validateExistingPathInRoot(manifestPath, root, 'manifest path');
    } catch (err) {
      console.error(chalk.red('❌ Manifest error:'), err.message);
      process.exit(2);
    }

    let manifestRaw;
    try {
      manifestRaw = fs.readFileSync(safeManifestPath, 'utf8');
    } catch (err) {
      console.error(chalk.red('❌ Manifest read failed:'), err.message);
      process.exit(2);
    }

    let parsedManifest;
    try {
      parsedManifest = JSON.parse(manifestRaw);
    } catch (err) {
      console.error(chalk.red('❌ Manifest parse failed:'), err.message);
      process.exit(2);
    }

    const summary = buildManifestSummary(parsedManifest);
    if (!summary) {
      console.error(chalk.red('❌ Invalid manifest format'));
      process.exit(2);
    }

    const required = parseCommaSeparatedList(options.requireTypes);
    const missingRequired = required.filter((type) => !summary.diagrams.some((d) => d.type === type));
    summary.required = {
      requested: required,
      missing: missingRequired,
    };

    if (required.length > 0 && missingRequired.length > 0) {
      console.error(chalk.red(`❌ Manifest missing required diagram types: ${missingRequired.join(', ')}`));
      process.exit(2);
    }

    const placeholderTypesToCheck = required.length > 0
      ? summary.placeholderTypes.filter((type) => required.includes(type))
      : summary.placeholderTypes;

    if (options.failOnPlaceholder && placeholderTypesToCheck.length > 0) {
      console.error(
        chalk.yellow(
          `⚠️  Manifest includes ${placeholderTypesToCheck.length} required placeholder diagram(s): ${placeholderTypesToCheck.join(', ')}`
        )
      );
      process.exit(2);
    }

    if (options.output) {
      let safeOutput;
      try {
        safeOutput = validateOutputPath(options.output, root);
      } catch (err) {
        console.error(chalk.red('❌ Output path error:'), err.message);
        process.exit(2);
      }

      const outputDir = path.dirname(safeOutput);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true, mode: 0o755 });
      }

      fs.writeFileSync(safeOutput, `${JSON.stringify(summary, null, 2)}\n`);
      console.log(chalk.green('✅ manifest summary'), '→', safeOutput);
      return;
    }

    console.log(chalk.blue('\n📘 Manifest summary for'), safeManifestPath);
    console.log(`  Total: ${summary.totalDiagrams}`);
    console.log(`  Placeholder: ${summary.placeholders}`);
    if (summary.missingTypes.length > 0) {
      console.log(chalk.yellow(`  Missing expected (all supported): ${summary.missingTypes.join(', ')}`));
    }
    if (summary.placeholderTypes.length > 0) {
      console.log(chalk.yellow(`  Placeholder types: ${summary.placeholderTypes.join(', ')}`));
    }
    console.log('');
    for (const entry of summary.diagrams) {
      const status = entry.isPlaceholder ? chalk.yellow('placeholder') : chalk.green('ok');
      console.log(`  ${status} ${entry.type} -> ${entry.file}`);
    }
  });

program
  .command('video [path]')
  .description('Generate an animated video of the diagram')
  .option('-t, --type <type>', 'Diagram type', 'architecture')
  .option('-o, --output <file>', 'Output file (.mp4, .webm, .mov)', 'diagram.mp4')
  .option('-d, --duration <sec>', 'Video duration in seconds', '5')
  .option('-f, --fps <n>', 'Frames per second', '30')
  .option('--width <n>', 'Video width', '1280')
  .option('--height <n>', 'Video height', '720')
  .option('--theme <theme>', 'Theme: default, dark, forest, neutral, light', 'dark')
  .option('-m, --max-files <n>', 'Max files to analyze', '100')
  .action(async (targetPath, options) => {
    const root = resolveRootPathOrExit(targetPath);
    const safeTheme = normalizeThemeOption(options.theme, 'dark');
    
    // Validate output path
    let safeOutput;
    try {
      safeOutput = validateOutputPath(options.output, root);
    } catch (err) {
      console.error(chalk.red('❌ Output path error:'), err.message);
      process.exit(2);
    }

    const outputDir = path.dirname(safeOutput);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true, mode: 0o755 });
    }
    
    console.log(chalk.blue('🎬 Generating video for'), root);
    
    const data = await analyze(root, options);
    const mermaid = generate(data, options.type);
    
    const { generateVideo } = getVideoModule();
    
    await generateVideo(mermaid, safeOutput, {
      duration: parseInt(options.duration) || 5,
      fps: parseInt(options.fps) || 30,
      width: parseInt(options.width) || 1280,
      height: parseInt(options.height) || 720,
      theme: safeTheme
    });
  });

program
  .command('animate [path]')
  .description('Generate animated SVG with CSS animations')
  .option('-t, --type <type>', 'Diagram type', 'architecture')
  .option('-o, --output <file>', 'Output file', 'diagram-animated.svg')
  .option('--theme <theme>', 'Theme: default, dark, forest, neutral, light', 'dark')
  .option('-m, --max-files <n>', 'Max files to analyze', '100')
  .action(async (targetPath, options) => {
    const root = resolveRootPathOrExit(targetPath);
    const safeTheme = normalizeThemeOption(options.theme, 'dark');
    
    // Validate output path
    let safeOutput;
    try {
      safeOutput = validateOutputPath(options.output, root);
    } catch (err) {
      console.error(chalk.red('❌ Output path error:'), err.message);
      process.exit(2);
    }

    const outputDir = path.dirname(safeOutput);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true, mode: 0o755 });
    }
    
    console.log(chalk.blue('✨ Generating animated SVG for'), root);
    
    const data = await analyze(root, options);
    const mermaid = generate(data, options.type);
    
    const { generateAnimatedSVG } = getVideoModule();
    
    await generateAnimatedSVG(mermaid, safeOutput, {
      theme: safeTheme
    });
  });

program
  .command('test [path]')
  .description('Validate architecture against .architecture.yml rules')
  .option('-c, --config <file>', 'Config file path', '.architecture.yml')
  .option('-f, --format <format>', 'Output format: console, json, junit', 'console')
  .option('-o, --output <file>', 'Output file (for json/junit formats)')
  .option('-p, --patterns <list>', 'File patterns', '**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.go,**/*.rs')
  .option('-e, --exclude <list>', 'Exclude patterns', 'node_modules/**,.git/**,dist/**')
  .option('-m, --max-files <n>', 'Max files to analyze', '100')
  .option('--dry-run', 'Preview file matching without validation', false)
  .option('--verbose', 'Show detailed output', false)
  .option('--init', 'Generate starter configuration file', false)
  .option('--force', 'Overwrite existing configuration with --init', false)
  .option('--save-baseline', 'Save current violation counts as baseline', false)
  .action(async (targetPath, options) => {
    const { RulesEngine } = require('./rules');
    const { ComponentGraph } = require('./graph');
    const { RuleFactory } = require('./rules/factory');
    const { formatResults } = require('./formatters/index');
    const { validateConfig, getDefaultConfig } = require('./schema/rules-schema');
    const YAML = require('yaml');
    
    const root = resolveRootPathOrExit(targetPath);
    const engine = new RulesEngine();
    const startTime = Date.now();
    const outputsMachineFormat =
      !options.output && (options.format === 'json' || options.format === 'junit');
    const quietMachineOutput = outputsMachineFormat && !options.verbose;
    
    // Init mode - generate starter config
    if (options.init) {
      const configPath = path.join(root, '.architecture.yml');
      
      if (fs.existsSync(configPath) && !options.force) {
        console.error(chalk.yellow('⚠️  Configuration already exists:'), configPath);
        console.log(chalk.gray('   Use --force to overwrite'));
        process.exit(2);
      }
      
      const defaultConfig = getDefaultConfig();
      const yaml = YAML.stringify(defaultConfig, { 
        indent: 2,
        lineWidth: 0 
      });
      
      fs.writeFileSync(configPath, yaml);
      console.log(chalk.green('✅ Created configuration:'), configPath);
      console.log(chalk.gray('\nEdit the file to define your architecture rules, then run:'));
      console.log(chalk.cyan('  diagram test'));
      process.exit(0);
    }
    
    // Find or use specified config
    let configPath = options.config;
    if (!path.isAbsolute(configPath)) {
      configPath = path.join(root, configPath);
    }
    
    // Validate config path is within project root (security check)
    const relativeConfigPath = path.relative(root, configPath);
    if (relativeConfigPath.startsWith('..') || path.isAbsolute(relativeConfigPath)) {
      console.error(chalk.red('❌ Invalid config path: directory traversal detected'));
      process.exit(2);
    }
    
    if (!fs.existsSync(configPath)) {
      // Try to find config in root
      const found = engine.findConfig(root);
      if (!found) {
        console.error(chalk.red('❌ No .architecture.yml found. Run: diagram test --init'));
        process.exit(2);
      }
      configPath = found;
    }
    
    // Load config
    let config;
    try {
      config = engine.loadConfig(configPath);
    } catch (error) {
      console.error(chalk.red('❌ Config error:'), error.message);
      process.exit(2);
    }
    
    // Validate config against schema
    const validation = validateConfig(config);
    if (!validation.valid) {
      console.error(chalk.red('❌ Schema validation failed:'));
      for (const err of validation.errors) {
        console.error(chalk.red(`   • ${err.path}: ${err.message}`));
      }
      process.exit(2);
    }
    
    // Analyze codebase
    if (!quietMachineOutput) {
      console.log(chalk.blue('🔍 Analyzing'), root);
    }
    const data = await analyze(root, options);
    const graph = new ComponentGraph(data);
    
    // Create rules
    let rules;
    try {
      rules = RuleFactory.createRules(config);
    } catch (error) {
      console.error(chalk.red('❌ Rule error:'), error.message);
      process.exit(2);
    }
    
    // Dry run mode - just show file matching
    if (options.dryRun) {
      const preview = engine.previewMatches(rules, graph);
      console.log(chalk.cyan('\n📋 Dry Run - File Matching Preview\n'));
      for (const rule of preview.rules) {
        console.log(chalk.bold(rule.name));
        console.log('  Layer:', chalk.gray(Array.isArray(rule.layer) ? rule.layer.join(', ') : rule.layer));
        console.log('  Matched files:', rule.matchedFiles.length);
        if (options.verbose) {
          for (const file of rule.matchedFiles) {
            console.log('    -', file);
          }
        }
        console.log();
      }
      process.exit(0);
    }
    
    // Run validation
    if (!quietMachineOutput) {
      console.log(chalk.blue('🧪 Validating'), rules.length, 'rules...\n');
    }
    const results = engine.validate(rules, graph);

    // Apply baseline logic
    const baselineInfo = applyBaseline(results, config, options.saveBaseline, configPath, root, quietMachineOutput);

    // Validate output path if specified
    let safeOutput = options.output;
    if (safeOutput) {
      try {
        safeOutput = validateOutputPath(safeOutput, root);
      } catch (err) {
        console.error(chalk.red('❌ Output path error:'), err.message);
        process.exit(2);
      }
    }
    
    // Output results
    const exitCode = formatResults(results, options.format, { 
      output: safeOutput,
      verbose: options.verbose 
    }, startTime);
    
    process.exit(exitCode);
  });

// ============================================================================
// Workflow Commands
// ============================================================================

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
      throw new Error(`Git ref not found in repository`);
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
        renamed.push({ from: parts[1], to: parts[2], similarity: parseInt(parts[0].slice(1)) });
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
  const { patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go', '**/*.rs'],
          exclude = ['node_modules/**', '.git/**', 'dist/**', 'build/**'] } = options;

  // Use git ls-tree to get all tracked files at ref
  const output = runGitCommand(
    ['ls-tree', '-r', '--name-only', ref],
    root,
    60000 // 60 second timeout for large repos
  );

  const allFiles = output.trim().split('\n').filter(f => f.trim());

  // Filter by patterns and exclusions using minimatch-style matching
  const micromatch = require('picomatch');
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
        rel = './' + rel;
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
 * Apply baseline logic to validation results
 * @param {object} results - Validation results from engine.validate()
 * @param {object} config - Parsed config object
 * @param {boolean} saveBaseline - Whether to save current counts as baseline
 * @param {string} configPath - Path to config file
 * @param {string} root - Repository root path
 * @param {boolean} quiet - Suppress output
 * @returns {object} Baseline info { updated: boolean, counts: object }
 */
function applyBaseline(results, config, saveBaseline, configPath, root, quiet = false) {
  const YAML = require('yaml');
  const baselineCounts = {};
  let configModified = false;

  for (const rule of results.rules || []) {
    const configRule = config.rules?.find(r => r.name === rule.name);
    const violationCount = rule.violations?.length || 0;
    const baseline = configRule?.baseline;

    // Store count for potential saving
    baselineCounts[rule.name] = violationCount;

    if (baseline !== undefined) {
      rule.baseline = baseline;

      if (violationCount <= baseline) {
        // Within baseline - pass with warning
        rule.status = 'passed';
        if (violationCount > 0) {
          rule.baselineWarning = `Baseline allows ${baseline} violation(s), found ${violationCount}`;
        }
      } else {
        // Exceeded baseline
        rule.baselineExceeded = violationCount - baseline;
        rule.status = 'failed';
      }
    }
  }

  // Save baseline if requested
  if (saveBaseline) {
    for (const rule of config.rules || []) {
      const count = baselineCounts[rule.name] ?? 0;
      if (rule.baseline !== count) {
        rule.baseline = count;
        configModified = true;
      }
    }

    if (configModified) {
      // Validate config path is within project root
      const relativePath = path.relative(root, configPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        if (!quiet) console.error(chalk.red('❌ Cannot save baseline: config path outside project'));
        return { updated: false, counts: baselineCounts };
      }

      const yaml = YAML.stringify(config, { indent: 2, lineWidth: 0 });
      fs.writeFileSync(configPath, yaml);
      if (!quiet) {
        console.log(chalk.green('✅ Baseline saved:'), configPath);
        console.log(chalk.gray('   Run `diagram test` to verify'));
      }
    } else if (!quiet) {
      console.log(chalk.gray('ℹ️  Baseline already up to date'));
    }
  }

  return { updated: configModified, counts: baselineCounts };
}

/**
 * Compute delta between two analysis snapshots
 * @param {object} baseAnalysis - Analysis at base ref
 * @param {object} headAnalysis - Analysis at head ref
 * @param {object} changedFiles - Changed files from getChangedFiles()
 * @returns {object} Delta summary
 */
function computeDelta(baseAnalysis, headAnalysis, changedFiles) {
  const { changed, renamed, deleted, added } = changedFiles;

  // Build component indexes by filePath
  const baseByPath = new Map();
  for (const c of baseAnalysis.components || []) {
    baseByPath.set(c.filePath, c);
  }

  const headByPath = new Map();
  for (const c of headAnalysis.components || []) {
    headByPath.set(c.filePath, c);
  }

  // Find changed components
  const changedComponents = [];
  const unmodeledChanges = [];

  for (const filePath of changed) {
    const headComp = headByPath.get(filePath);
    const baseComp = baseByPath.get(filePath);

    if (headComp) {
      // File exists in head
      if (baseComp) {
        // File exists in both - check if dependencies or roleTags changed
        const depsChanged = !arraysEqual(
          (baseComp.dependencies || []).sort(),
          (headComp.dependencies || []).sort()
        );
        const rolesChanged = !arraysEqual(
          (baseComp.roleTags || []).sort(),
          (headComp.roleTags || []).sort()
        );

        if (depsChanged || rolesChanged) {
          changedComponents.push({
            filePath,
            name: headComp.name,
            type: headComp.type,
            roleTags: headComp.roleTags,
            dependenciesAdded: (headComp.dependencies || []).filter(d => !(baseComp.dependencies || []).includes(d)),
            dependenciesRemoved: (baseComp.dependencies || []).filter(d => !(headComp.dependencies || []).includes(d)),
            roleTagsAdded: (headComp.roleTags || []).filter(r => !(baseComp.roleTags || []).includes(r)),
            roleTagsRemoved: (baseComp.roleTags || []).filter(r => !(headComp.roleTags || []).includes(r))
          });
        }
      } else {
        // New file in head
        changedComponents.push({
          filePath,
          name: headComp.name,
          type: headComp.type,
          roleTags: headComp.roleTags,
          dependenciesAdded: headComp.dependencies || [],
          dependenciesRemoved: [],
          roleTagsAdded: headComp.roleTags || [],
          roleTagsRemoved: [],
          isNew: true
        });
      }
    } else {
      // File changed but not modeled (e.g., config file, non-code)
      unmodeledChanges.push(filePath);
    }
  }

  // Compute dependency edge deltas
  const baseEdges = new Set();
  for (const c of baseAnalysis.components || []) {
    for (const dep of c.dependencies || []) {
      baseEdges.add(`${c.filePath}→${dep}`);
    }
  }

  const headEdges = new Set();
  for (const c of headAnalysis.components || []) {
    for (const dep of c.dependencies || []) {
      headEdges.add(`${c.filePath}→${dep}`);
    }
  }

  const edgesAdded = [...headEdges].filter(e => !baseEdges.has(e)).sort();
  const edgesRemoved = [...baseEdges].filter(e => !headEdges.has(e)).sort();

  return {
    changedComponents: changedComponents.sort((a, b) => a.filePath.localeCompare(b.filePath)),
    unmodeledChanges: unmodeledChanges.sort(),
    renamedFiles: renamed,
    deletedFiles: deleted.sort(),
    addedFiles: added.sort(),
    dependencyEdgeDelta: {
      added: edgesAdded,
      removed: edgesRemoved,
      count: edgesAdded.length + edgesRemoved.length
    }
  };
}

/**
 * Helper to compare arrays
 */
function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

// Workflow command group
const workflowCommand = program
  .command('workflow')
  .description('Architecture impact workflows for CI and review');

workflowCommand
  .command('pr [path]')
  .description('Generate architecture impact report for a PR (base → head diff)')
  .option('--base <ref>', 'Base git ref (SHA, branch, or tag) - required unless auto-detected')
  .option('--head <ref>', 'Head git ref (SHA, branch, or tag) - defaults to HEAD')
  .option('-o, --output-dir <dir>', 'Output directory for artifacts', '.diagram/pr-impact')
  .option('-d, --manifest-dir <dir>', 'Directory containing manifest.json', '.diagram')
  .option('--max-depth <n>', 'Maximum blast radius traversal depth', '2')
  .option('--max-nodes <n>', 'Maximum components in blast radius output', '50')
  .option('--risk-threshold <level>', 'Risk threshold: none, low, medium, high', 'none')
  .option('--fail-on-risk', 'Exit with code 1 if risk exceeds threshold', false)
  .option('--risk-override-reason <string>', 'Override risk gate with documented reason (requires --fail-on-risk)')
  .option('-j, --json', 'Output as JSON only (skip HTML generation)', false)
  .option('--verbose', 'Show detailed output', false)
  .action(async (targetPath, options) => {
    const root = resolveRootPathOrExit(targetPath);
    const startTime = Date.now();

    // Validate and resolve refs
    let baseRef = options.base;
    let headRef = options.head || 'HEAD';

    // Auto-detect PR refs if not provided
    if (!baseRef) {
      const envRefs = detectPrRefsFromEnv();
      if (envRefs.base) {
        baseRef = envRefs.base;
        if (options.verbose) {
          console.log(chalk.gray('Auto-detected base ref from environment:', baseRef));
        }
      } else {
        // Try to use merge-base with origin/main or main
        try {
          const defaultBranch = fs.existsSync(path.join(root, '.git', 'refs', 'heads', 'main'))
            ? 'main'
            : 'master';
          baseRef = `origin/${defaultBranch}`;
          if (options.verbose) {
            console.log(chalk.gray(`Using default base ref: ${baseRef}`));
          }
        } catch {
          console.error(chalk.red('❌ No base ref provided and could not auto-detect.'));
          console.log(chalk.gray('Specify --base <ref> or run from a PR context.'));
          process.exit(2);
        }
      }
    }

    // Check for shallow clone warning
    if (isShallowClone(root)) {
      console.warn(chalk.yellow('⚠️  Shallow clone detected. Base refs may be unavailable.'));
      console.log(chalk.gray('   Use fetch-depth: 0 in CI or run: git fetch --unshallow'));
    }

    // Validate refs
    let baseSha, headSha;
    try {
      baseSha = validateGitRef(baseRef, root);
      headSha = validateGitRef(headRef, root);
    } catch (error) {
      console.error(chalk.red('❌ Git ref error:'), error.message);
      process.exit(2);
    }

    if (options.verbose) {
      console.log(chalk.blue('📊 PR Impact Analysis'));
      console.log(chalk.gray('  Base:'), baseRef, '→', baseSha);
      console.log(chalk.gray('  Head:'), headRef, '→', headSha);
    }

    // Validate risk threshold
    const validThresholds = ['none', 'low', 'medium', 'high'];
    const threshold = (options.riskThreshold || 'none').toLowerCase();
    if (!validThresholds.includes(threshold)) {
      console.error(chalk.red('❌ Invalid risk threshold:'), options.riskThreshold);
      console.log(chalk.gray('Valid values:', validThresholds.join(', ')));
      process.exit(2);
    }

    // Validate override reason
    if (options.riskOverrideReason && !options.failOnRisk) {
      console.error(chalk.red('❌ --risk-override-reason requires --fail-on-risk'));
      process.exit(2);
    }

    if (options.riskOverrideReason && typeof options.riskOverrideReason !== 'string') {
      console.error(chalk.red('❌ --risk-override-reason must be a non-empty string'));
      process.exit(2);
    }

    // Validate numeric options
    const maxDepth = parseInt(options.maxDepth, 10);
    const maxNodes = parseInt(options.maxNodes, 10);
    if (isNaN(maxDepth) || maxDepth < 1) {
      console.error(chalk.red('❌ --max-depth must be a positive integer'));
      process.exit(2);
    }
    if (isNaN(maxNodes) || maxNodes < 1) {
      console.error(chalk.red('❌ --max-nodes must be a positive integer'));
      process.exit(2);
    }

    // Validate output directory
    let outputDir;
    try {
      outputDir = validateOutputPath(options.outputDir, root);
    } catch (err) {
      console.error(chalk.red('❌ Output path error:'), err.message);
      process.exit(2);
    }

    // Phase 2: Git diff ingestion + snapshot preparation
    if (!options.json && options.verbose) {
      console.log(chalk.blue('\n📋 Step 1: Extracting changed files...'));
    }

    let changedFiles;
    try {
      changedFiles = getChangedFiles(baseSha, headSha, root);
    } catch (error) {
      console.error(chalk.red('❌ Git diff error:'), error.message);
      process.exit(2);
    }

    if (!options.json && options.verbose) {
      console.log(chalk.gray('   Changed:'), changedFiles.changed.length);
      console.log(chalk.gray('   Renamed:'), changedFiles.renamed.length);
      console.log(chalk.gray('   Added:'), changedFiles.added.length);
      console.log(chalk.gray('   Deleted:'), changedFiles.deleted.length);
    }

    // Handle empty diff case
    if (changedFiles.changed.length === 0 &&
        changedFiles.renamed.length === 0 &&
        changedFiles.added.length === 0 &&
        changedFiles.deleted.length === 0) {
      const emptyResult = {
        schemaVersion: '1.0',
        generatedAt: new Date().toISOString(),
        base: baseSha,
        head: headSha,
        changedFiles: [],
        renamedFiles: [],
        unmodeledChanges: [],
        changedComponents: [],
        dependencyEdgeDelta: { added: [], removed: [], count: 0 },
        blastRadius: {
          depth: maxDepth,
          truncated: false,
          omittedCount: 0,
          impactedComponents: []
        },
        risk: {
          score: 0,
          level: 'low',
          flags: [],
          factors: {
            authTouch: false,
            securityBoundaryTouch: false,
            databasePathTouch: false,
            blastRadiusSize: 0,
            blastRadiusDepth: 0,
            edgeDeltaCount: 0
          },
          override: {
            applied: false,
            reason: options.riskOverrideReason || null
          }
        },
        _meta: {
          status: 'no_changes',
          message: 'No changes detected between base and head refs',
          durationMs: Date.now() - startTime
        }
      };

      if (options.json) {
        console.log(JSON.stringify(emptyResult, null, 2));
      } else {
        console.log(chalk.green('\n✅ No architecture changes detected'));
      }
      process.exit(0);
    }

    // Phase 2: Analyze snapshots at base and head refs
    if (!options.json && options.verbose) {
      console.log(chalk.blue('\n📊 Step 2: Analyzing codebase snapshots...'));
    }

    let baseAnalysis, headAnalysis;
    try {
      const analysisOptions = {
        maxFiles: 10000, // Use high limit for accurate delta
        patterns: options.patterns,
        exclude: options.exclude
      };

      baseAnalysis = await analyzeAtRef(baseSha, root, analysisOptions);
      if (!options.json && options.verbose) {
        console.log(chalk.gray('   Base components:'), baseAnalysis.components.length);
      }

      headAnalysis = await analyzeAtRef(headSha, root, analysisOptions);
      if (!options.json && options.verbose) {
        console.log(chalk.gray('   Head components:'), headAnalysis.components.length);
      }
    } catch (error) {
      console.error(chalk.red('❌ Analysis error:'), error.message);
      process.exit(2);
    }

    // Compute delta between snapshots
    if (!options.json && options.verbose) {
      console.log(chalk.blue('\n🔄 Step 3: Computing delta...'));
    }

    const delta = computeDelta(baseAnalysis, headAnalysis, changedFiles);

    if (!options.json && options.verbose) {
      console.log(chalk.gray('   Changed components:'), delta.changedComponents.length);
      console.log(chalk.gray('   Unmodeled changes:'), delta.unmodeledChanges.length);
      console.log(chalk.gray('   Edge delta:'), delta.dependencyEdgeDelta.count);
    }

    // Compute blast radius (Phase 3 - basic implementation)
    if (!options.json && options.verbose) {
      console.log(chalk.blue('\n💥 Step 4: Computing blast radius...'));
    }

    const blastRadius = computeBlastRadiusFromDelta(delta, headAnalysis, maxDepth, maxNodes);

    if (!options.json && options.verbose) {
      console.log(chalk.gray('   Impacted components:'), blastRadius.impactedComponents.length);
      console.log(chalk.gray('   Truncated:'), blastRadius.truncated);
    }

    // Compute risk score (Phase 4 - basic implementation)
    if (!options.json && options.verbose) {
      console.log(chalk.blue('\n⚠️  Step 5: Computing risk score...'));
    }

    const risk = computeRiskFromDelta(delta, blastRadius);

    if (!options.json && options.verbose) {
      console.log(chalk.gray('   Risk score:'), risk.score);
      console.log(chalk.gray('   Risk level:'), risk.level);
      console.log(chalk.gray('   Risk flags:'), risk.flags.join(', ') || 'none');
    }

    // Build final result
    const result = {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      base: baseSha,
      head: headSha,
      changedFiles: changedFiles.changed,
      renamedFiles: changedFiles.renamed,
      deletedFiles: delta.deletedFiles,
      addedFiles: delta.addedFiles,
      unmodeledChanges: delta.unmodeledChanges,
      changedComponents: delta.changedComponents,
      dependencyEdgeDelta: delta.dependencyEdgeDelta,
      blastRadius: {
        depth: maxDepth,
        truncated: blastRadius.truncated,
        omittedCount: blastRadius.omittedCount,
        impactedComponents: blastRadius.impactedComponents
      },
      risk: {
        score: risk.score,
        level: risk.level,
        flags: risk.flags,
        factors: risk.factors,
        override: {
          applied: false,
          reason: options.riskOverrideReason || null
        }
      },
      _meta: {
        status: 'complete',
        durationMs: Date.now() - startTime,
        baseComponents: baseAnalysis.components.length,
        headComponents: headAnalysis.components.length
      }
    };

    // Output result
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green('\n✅ PR Impact Analysis Complete'));
      console.log(chalk.gray('   Duration:'), `${result._meta.durationMs}ms`);
      console.log(chalk.gray('   Changed components:'), result.changedComponents.length);
      console.log(chalk.gray('   Blast radius:'), result.blastRadius.impactedComponents.length);
      console.log(chalk.gray('   Risk level:'), result.risk.level);
      console.log(chalk.gray('   Risk score:'), result.risk.score);
      if (result.risk.flags.length > 0) {
        console.log(chalk.yellow('   Risk flags:'), result.risk.flags.join(', '));
      }
    }

    // Exit code logic
    // 0 = success, below threshold
    // 1 = risk threshold exceeded (no override)
    // 2 = config/git error (already handled above)

    // Check risk threshold gate BEFORE writing artifacts
    // so the JSON reflects the override state correctly
    let exitCode = 0;
    if (options.failOnRisk && threshold !== 'none') {
      const thresholdLevels = { low: 1, medium: 2, high: 3 };
      const riskLevels = { low: 1, medium: 2, high: 3 };

      const thresholdNum = thresholdLevels[threshold] || 0;
      const riskNum = riskLevels[result.risk.level] || 0;

      if (riskNum >= thresholdNum) {
        // Check for override
        if (options.riskOverrideReason && options.riskOverrideReason.trim() !== '') {
          result.risk.override.applied = true;
          console.log(chalk.yellow('\n⚠️  Risk threshold exceeded, but override applied'));
          console.log(chalk.gray('   Reason:'), options.riskOverrideReason);
          exitCode = 0;
        } else {
          console.error(chalk.red('\n❌ Risk threshold exceeded'));
          console.error(chalk.gray('   Threshold:'), threshold);
          console.error(chalk.gray('   Actual:'), result.risk.level);
          console.error(chalk.gray('   Score:'), result.risk.score);
          if (!options.json) {
            console.log(chalk.gray('\n   Use --risk-override-reason to bypass'));
          }
          exitCode = 1;
        }
      }
    }

    // Write artifacts to disk (after risk check so override.applied is correct)
    let artifactPaths;
    try {
      artifactPaths = writePrImpactArtifacts(outputDir, result, options.json);
      if (!options.json && exitCode === 0) {
        console.log(chalk.gray('   Output:'), artifactPaths.jsonPath);
        if (artifactPaths.htmlPath) {
          console.log(chalk.gray('   HTML:'), artifactPaths.htmlPath);
        }
      }
    } catch (err) {
      console.error(chalk.red('❌ Failed to write artifacts:'), err.message);
      process.exit(2);
    }

    process.exit(exitCode);
  });

/**
 * Compute blast radius from delta
 */
function computeBlastRadiusFromDelta(delta, headAnalysis, maxDepth, maxNodes) {
  const impacted = new Set();
  const visited = new Set();
  const queue = [];

  // Start from changed components
  for (const comp of delta.changedComponents) {
    queue.push({ name: comp.name, depth: 0 });
    visited.add(comp.name);
  }

  // Also include components whose files were added
  for (const filePath of delta.addedFiles) {
    const comp = headAnalysis.components.find(c => c.filePath === filePath);
    if (comp && !visited.has(comp.name)) {
      queue.push({ name: comp.name, depth: 0 });
      visited.add(comp.name);
    }
  }

  // BFS traversal to find downstream dependencies
  const byName = new Map();
  for (const c of headAnalysis.components) {
    byName.set(c.name, c);
  }

  while (queue.length > 0 && impacted.size < maxNodes) {
    const { name, depth } = queue.shift();

    if (depth > maxDepth) break;

    const comp = byName.get(name);
    if (!comp) continue;

    // Find components that depend on this one (reverse dependencies)
    for (const potentialDep of headAnalysis.components) {
      if (potentialDep.dependencies && potentialDep.dependencies.includes(name)) {
        if (!visited.has(potentialDep.name)) {
          visited.add(potentialDep.name);
          queue.push({ name: potentialDep.name, depth: depth + 1 });
          if (impacted.size < maxNodes) {
            impacted.add(potentialDep.name);
          }
        }
      }
    }
  }

  const truncated = visited.size > maxNodes;
  const omittedCount = Math.max(0, visited.size - maxNodes);

  return {
    impactedComponents: [...impacted].sort(),
    truncated,
    omittedCount
  };
}

/**
 * Compute risk from delta using differentiated weights
 */
function computeRiskFromDelta(delta, blastRadius) {
  let score = 0;
  const flags = [];
  const factors = {
    authTouch: false,
    securityBoundaryTouch: false,
    databasePathTouch: false,
    blastRadiusSize: 0,
    blastRadiusDepth: 0,
    edgeDeltaCount: 0
  };

  // Check for role touches (differentiated weights)
  for (const comp of delta.changedComponents) {
    const roles = comp.roleTags || [];

    if (roles.includes('auth') && !factors.authTouch) {
      score += 3;
      flags.push('auth_touch');
      factors.authTouch = true;
    }
    if (roles.includes('security') && !factors.securityBoundaryTouch) {
      score += 3;
      flags.push('security_boundary_touch');
      factors.securityBoundaryTouch = true;
    }
    if (roles.includes('database') && !factors.databasePathTouch) {
      score += 2;
      flags.push('database_path_touch');
      factors.databasePathTouch = true;
    }
  }

  // Check blast radius size
  const blastRadiusSize = blastRadius.impactedComponents.length;
  if (blastRadiusSize >= 5) {
    score += 1;
    factors.blastRadiusSize = blastRadiusSize;
  }

  // Check edge delta count
  const edgeDeltaCount = delta.dependencyEdgeDelta.count || 0;
  if (edgeDeltaCount >= 10) {
    score += 1;
    factors.edgeDeltaCount = edgeDeltaCount;
  }

  // Determine level (score 0 = none, 1-2 = low, 3-5 = medium, 6+ = high)
  let level = 'none';
  if (score >= 6) {
    level = 'high';
  } else if (score >= 3) {
    level = 'medium';
  } else if (score >= 1) {
    level = 'low';
  }

  return { score, level, flags, factors };
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Group file paths by change status with stable sorting
 * @param {object} result - PR impact result
 * @param {number} maxPreview - Maximum items to show per group (default: 10)
 * @returns {object} Grouped paths with counts and previews
 */
function groupChangePaths(result, maxPreview = 10) {
  const groups = {
    changed: { items: [], count: 0, truncated: false },
    renamed: { items: [], count: 0, truncated: false },
    added: { items: [], count: 0, truncated: false },
    deleted: { items: [], count: 0, truncated: false },
    unmodeled: { items: [], count: 0, truncated: false }
  };

  // Process each file status array with stable sorting
  const sortStrings = (arr) => [...arr].sort((a, b) => String(a).localeCompare(String(b)));

  // Changed files
  const changed = sortStrings(result.changedFiles || []);
  groups.changed.count = changed.length;
  groups.changed.items = changed.slice(0, maxPreview);
  groups.changed.truncated = changed.length > maxPreview;

  // Renamed files (array of { from, to } objects)
  const renamed = result.renamedFiles || [];
  const renamedSorted = [...renamed].sort((a, b) =>
    (a.from || '').localeCompare(b.from || '')
  );
  groups.renamed.count = renamedSorted.length;
  groups.renamed.items = renamedSorted.slice(0, maxPreview);
  groups.renamed.truncated = renamedSorted.length > maxPreview;

  // Added files
  const added = sortStrings(result.addedFiles || []);
  groups.added.count = added.length;
  groups.added.items = added.slice(0, maxPreview);
  groups.added.truncated = added.length > maxPreview;

  // Deleted files
  const deleted = sortStrings(result.deletedFiles || []);
  groups.deleted.count = deleted.length;
  groups.deleted.items = deleted.slice(0, maxPreview);
  groups.deleted.truncated = deleted.length > maxPreview;

  // Unmodeled changes
  const unmodeled = sortStrings(result.unmodeledChanges || []);
  groups.unmodeled.count = unmodeled.length;
  groups.unmodeled.items = unmodeled.slice(0, maxPreview);
  groups.unmodeled.truncated = unmodeled.length > maxPreview;

  return groups;
}

/**
 * Build risk narrative from risk object
 * @param {object} risk - Risk object from result
 * @returns {object} Risk narrative with level, score, reasons, and override info
 */
function buildRiskNarrative(risk) {
  const narrative = {
    level: risk?.level || 'none',
    score: risk?.score || 0,
    reasons: [],
    override: null
  };

  // Build human-readable reasons from flags and factors
  const factors = risk?.factors || {};
  const flagDescriptions = {
    'auth_touch': 'Touches authentication components',
    'security_boundary_touch': 'Crosses security boundaries',
    'database_path_touch': 'Modifies database-related code'
  };

  // Add flag-based reasons
  for (const flag of risk?.flags || []) {
    if (flagDescriptions[flag]) {
      narrative.reasons.push(flagDescriptions[flag]);
    } else {
      narrative.reasons.push(flag.replace(/_/g, ' '));
    }
  }

  // Add factor-based context
  if (factors.blastRadiusSize >= 5) {
    narrative.reasons.push(`Large blast radius (${factors.blastRadiusSize} components impacted)`);
  }
  if (factors.edgeDeltaCount >= 10) {
    narrative.reasons.push(`Significant dependency changes (${factors.edgeDeltaCount} edges modified)`);
  }

  // Sort reasons for deterministic output
  narrative.reasons.sort();

  // Handle override
  if (risk?.override?.applied) {
    narrative.override = {
      applied: true,
      reason: risk.override.reason || 'No reason provided'
    };
  }

  return narrative;
}

/**
 * Build summary metadata for executive summary section
 * @param {object} result - PR impact result
 * @returns {object} Summary metadata
 */
function buildSummaryMeta(result) {
  const fileGroups = groupChangePaths(result);

  return {
    totalFilesChanged: fileGroups.changed.count + fileGroups.renamed.count +
                       fileGroups.added.count + fileGroups.deleted.count,
    changedComponents: (result.changedComponents || []).length,
    blastRadiusSize: (result.blastRadius?.impactedComponents || []).length,
    blastRadiusTruncated: result.blastRadius?.truncated || false,
    blastRadiusOmitted: result.blastRadius?.omittedCount || 0,
    blastRadiusDepth: result.blastRadius?.depth || 0,
    riskLevel: result.risk?.level || 'none',
    riskScore: result.risk?.score || 0,
    unmodeledCount: fileGroups.unmodeled.count,
    hasOverride: result.risk?.override?.applied || false,
    generatedAt: result.generatedAt || new Date().toISOString(),
    base: result.base || 'unknown',
    head: result.head || 'unknown',
    durationMs: result._meta?.durationMs || 0
  };
}

/**
 * Generate HTML explainer for PR impact
 * @param {object} result - PR impact result
 * @returns {string} HTML content
 */
function generateHtmlExplainer(result) {
  // Build content models using helpers
  const summary = buildSummaryMeta(result);
  const pathGroups = groupChangePaths(result);
  const riskNarrative = buildRiskNarrative(result.risk);

  const riskColors = {
    none: '#6b7280',
    low: '#22c55e',
    medium: '#eab308',
    high: '#ef4444'
  };

  const riskColor = riskColors[riskNarrative.level] || '#6b7280';

  // Sort changed components deterministically
  const sortedComponents = [...(result.changedComponents || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  );

  // Build changed components HTML
  const changedComponentsHtml = sortedComponents.map(comp => `
      <li class="component">
        <div class="component-name">${escapeHtml(comp.name)}</div>
        <div class="component-path">${escapeHtml(comp.filePath)}</div>
        <div class="component-roles">${(comp.roleTags || []).sort().map(r => `<span class="role-tag">${escapeHtml(r)}</span>`).join(' ')}</div>
        ${comp.isNew ? '<span class="badge new">NEW</span>' : ''}
      </li>
    `).join('');

  // Build blast radius HTML with sorted components
  const sortedBlastRadius = [...(result.blastRadius?.impactedComponents || [])].sort();
  const blastRadiusHtml = sortedBlastRadius.map(name => `
      <li>${escapeHtml(name)}</li>
    `).join('');

  // Build path group HTML for Change Story section
  const buildPathList = (items, label) => {
    if (items.length === 0) return '';
    return `
      <div class="path-group">
        <h4>${label}</h4>
        <ul class="file-list">
          ${items.map(p => `<li><code>${escapeHtml(p)}</code></li>`).join('')}
        </ul>
      </div>
    `;
  };

  const buildRenamedList = (items) => {
    if (items.length === 0) return '';
    return `
      <div class="path-group">
        <h4>Renamed Files</h4>
        <ul class="file-list">
          ${items.map(r => `<li><code>${escapeHtml(r.from)}</code> → <code>${escapeHtml(r.to)}</code></li>`).join('')}
        </ul>
      </div>
    `;
  };

  // Build action checklist based on risk and changes
  const actionItems = [];

  if (riskNarrative.level === 'high') {
    actionItems.push('Review all changes carefully - high risk detected');
  }
  if (riskNarrative.reasons.some(r => r.includes('authentication'))) {
    actionItems.push('Verify authentication flow is not compromised');
    actionItems.push('Test all auth-related endpoints');
  }
  if (riskNarrative.reasons.some(r => r.includes('security'))) {
    actionItems.push('Review security implications of boundary changes');
    actionItems.push('Check for potential privilege escalation');
  }
  if (riskNarrative.reasons.some(r => r.includes('database'))) {
    actionItems.push('Review database schema changes');
    actionItems.push('Verify migration safety if applicable');
  }
  if (summary.blastRadiusSize >= 5) {
    actionItems.push('Review impact on downstream components');
  }
  if (summary.unmodeledCount > 0) {
    actionItems.push('Review unmodeled file changes');
  }
  if (riskNarrative.override?.applied) {
    actionItems.push(`Risk gate overridden: ${riskNarrative.override.reason}`);
  }
  if (actionItems.length === 0) {
    actionItems.push('Standard review - no elevated risk factors detected');
  }

  // Sort action items for determinism
  actionItems.sort();

  const actionChecklistHtml = actionItems.map(item => `
      <li>${escapeHtml(item)}</li>
    `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Impact Analysis</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 2rem;
    }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #111827; }
    h2 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
    h3 { font-size: 1.1rem; margin: 1rem 0 0.5rem; color: #374151; }
    h4 { font-size: 0.9rem; margin: 0.75rem 0 0.25rem; color: #6b7280; }
    section { margin-bottom: 1.5rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .summary-card { background: white; padding: 1rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .summary-card .label { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-card .value { font-size: 1.5rem; font-weight: 600; margin-top: 0.25rem; }
    .risk-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; color: white; }
    .component { background: white; padding: 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); list-style: none; }
    .component-name { font-weight: 600; color: #111827; }
    .component-path { font-size: 0.875rem; color: #6b7280; font-family: monospace; }
    .component-roles { margin-top: 0.5rem; }
    .role-tag { display: inline-block; padding: 0.125rem 0.5rem; background: #e5e7eb; border-radius: 0.25rem; font-size: 0.75rem; margin-right: 0.25rem; }
    .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; }
    .badge.new { background: #dbeafe; color: #1d4ed8; }
    .risk-reason { padding: 0.25rem 0; color: #b45309; }
    .override-notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 0.75rem 1rem; margin: 0.5rem 0; border-radius: 0.25rem; }
    .override-notice strong { color: #92400e; }
    ul { list-style: disc; margin-left: 1.5rem; }
    ul.file-list { list-style: none; margin-left: 0; }
    ul.file-list li { padding: 0.125rem 0; }
    ul.file-list code { font-size: 0.85rem; background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
    li { padding: 0.25rem 0; }
    .path-group { margin-bottom: 1rem; }
    .truncation-note { font-size: 0.875rem; color: #6b7280; font-style: italic; margin-top: 0.5rem; }
    .meta { font-size: 0.75rem; color: #9ca3af; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
    .empty { color: #9ca3af; font-style: italic; }
    .checklist { background: #f0fdf4; border: 1px solid #86efac; padding: 1rem; border-radius: 0.5rem; }
    .checklist li { color: #166534; }
  </style>
</head>
<body>
  <main class="container">
    <h1>PR Impact Analysis</h1>

    <section aria-labelledby="executive-summary-heading">
      <h2 id="executive-summary-heading">Executive Summary</h2>
      <p>This PR touches <strong>${summary.totalFilesChanged} file${summary.totalFilesChanged !== 1 ? 's' : ''}</strong>
         across <strong>${summary.changedComponents} component${summary.changedComponents !== 1 ? 's' : ''}</strong>
         with a <strong>Risk Level: ${riskNarrative.level.toUpperCase()}</strong> (score: ${riskNarrative.score}).</p>
      ${summary.blastRadiusSize > 0 ? `
      <p>The blast radius includes <strong>${summary.blastRadiusSize} additional component${summary.blastRadiusSize !== 1 ? 's' : ''}</strong>
         that may be affected${summary.blastRadiusTruncated ? ` (${summary.blastRadiusOmitted} more truncated at depth ${summary.blastRadiusDepth})` : ''}.</p>
      ` : ''}
      ${summary.unmodeledCount > 0 ? `
      <p><strong>${summary.unmodeledCount} file${summary.unmodeledCount !== 1 ? 's' : ''}</strong> changed outside modeled components.</p>
      ` : ''}
    </section>

    <div class="summary" role="region" aria-label="Key metrics">
      <div class="summary-card">
        <div class="label">Changed Components</div>
        <div class="value">${summary.changedComponents}</div>
      </div>
      <div class="summary-card">
        <div class="label">Blast Radius</div>
        <div class="value">${summary.blastRadiusSize}${summary.blastRadiusTruncated ? '+' : ''}</div>
      </div>
      <div class="summary-card">
        <div class="label">Risk Level</div>
        <div class="value"><span class="risk-badge" style="background: ${riskColor}">${riskNarrative.level.toUpperCase()}</span></div>
      </div>
      <div class="summary-card">
        <div class="label">Risk Score</div>
        <div class="value">${riskNarrative.score}</div>
      </div>
    </div>

    ${riskNarrative.override?.applied ? `
    <div class="override-notice" role="alert">
      <strong>Risk Override Applied:</strong> ${escapeHtml(riskNarrative.override.reason)}
    </div>
    ` : ''}

    <section aria-labelledby="change-story-heading">
      <h2 id="change-story-heading">Change Story</h2>
      ${pathGroups.changed.count > 0 ? buildPathList(pathGroups.changed.items, `Modified Files (${pathGroups.changed.count})`) + (pathGroups.changed.truncated ? `<p class="truncation-note">+ ${pathGroups.changed.count - pathGroups.changed.items.length} more modified files</p>` : '') : ''}
      ${pathGroups.renamed.count > 0 ? buildRenamedList(pathGroups.renamed.items) + (pathGroups.renamed.truncated ? `<p class="truncation-note">+ ${pathGroups.renamed.count - pathGroups.renamed.items.length} more renamed files</p>` : '') : ''}
      ${pathGroups.added.count > 0 ? buildPathList(pathGroups.added.items, `Added Files (${pathGroups.added.count})`) + (pathGroups.added.truncated ? `<p class="truncation-note">+ ${pathGroups.added.count - pathGroups.added.items.length} more added files</p>` : '') : ''}
      ${pathGroups.deleted.count > 0 ? buildPathList(pathGroups.deleted.items, `Deleted Files (${pathGroups.deleted.count})`) + (pathGroups.deleted.truncated ? `<p class="truncation-note">+ ${pathGroups.deleted.count - pathGroups.deleted.items.length} more deleted files</p>` : '') : ''}
      ${pathGroups.unmodeled.count > 0 ? buildPathList(pathGroups.unmodeled.items, `Unmodeled Changes (${pathGroups.unmodeled.count})`) + (pathGroups.unmodeled.truncated ? `<p class="truncation-note">+ ${pathGroups.unmodeled.count - pathGroups.unmodeled.items.length} more unmodeled files</p>` : '') : ''}
      ${summary.totalFilesChanged === 0 ? '<p class="empty">No file changes detected</p>' : ''}
    </section>

    ${sortedComponents.length > 0 ? `
    <section aria-labelledby="components-heading">
      <h2 id="components-heading">Changed Components</h2>
      <ul style="list-style: none; margin-left: 0;">
        ${changedComponentsHtml}
      </ul>
    </section>
    ` : ''}

    ${riskNarrative.reasons.length > 0 ? `
    <section aria-labelledby="risk-heading">
      <h2 id="risk-heading">Risk Reasoning</h2>
      <h3>Why this PR is flagged:</h3>
      <ul>
        ${riskNarrative.reasons.map(r => `<li class="risk-reason">${escapeHtml(r)}</li>`).join('')}
      </ul>
    </section>
    ` : ''}

    ${summary.blastRadiusSize > 0 ? `
    <section aria-labelledby="blast-radius-heading">
      <h2 id="blast-radius-heading">Blast Radius</h2>
      <p>Components that may be affected by these changes${summary.blastRadiusTruncated ? ` (truncated at depth ${summary.blastRadiusDepth}, ${summary.blastRadiusOmitted} omitted)` : ''}:</p>
      <ul>
        ${blastRadiusHtml}
      </ul>
      ${summary.blastRadiusTruncated ? `<p class="truncation-note">Output truncated: ${summary.blastRadiusOmitted} additional components not shown (depth limit: ${summary.blastRadiusDepth})</p>` : ''}
    </section>
    ` : ''}

    <section aria-labelledby="actions-heading">
      <h2 id="actions-heading">Action Checklist</h2>
      <div class="checklist">
        <ul>
          ${actionChecklistHtml}
        </ul>
      </div>
    </section>

    <footer class="meta">
      <p>Generated: ${escapeHtml(summary.generatedAt)}</p>
      <p>Base: <code>${escapeHtml(summary.base)}</code> | Head: <code>${escapeHtml(summary.head)}</code></p>
      <p>Analysis duration: ${summary.durationMs}ms</p>
    </footer>
  </main>
</body>
</html>`;
}

/**
 * Write PR impact artifacts to disk
 * @param {string} outputDir - Output directory path
 * @param {object} result - PR impact result
 * @param {boolean} skipHtml - Skip HTML generation
 */
function writePrImpactArtifacts(outputDir, result, skipHtml = false) {
  // Create output directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true, mode: 0o755 });
  }

  // Write JSON
  const jsonPath = path.join(outputDir, 'pr-impact.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n');

  // Write HTML (unless --json flag)
  if (!skipHtml) {
    const htmlPath = path.join(outputDir, 'pr-impact.html');
    const htmlContent = generateHtmlExplainer(result);
    fs.writeFileSync(htmlPath, htmlContent);
  }

  return { jsonPath, htmlPath: skipHtml ? null : path.join(outputDir, 'pr-impact.html') };
}

// Only run CLI when executed directly, not when required for testing
if (require.main === module) {
  program.parse();
}

// Export for testing (only when run as module)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateHtmlExplainer,
    groupChangePaths,
    buildRiskNarrative,
    buildSummaryMeta,
    escapeHtml
  };
}
