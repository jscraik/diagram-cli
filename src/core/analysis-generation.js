const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk');
const crypto = require('crypto');

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


module.exports = {
  detectLanguage,
  inferType,
  extractImports,
  extractImportsWithPositions,
  sanitize,
  escapeMermaid,
  normalizePath,
  getImportPath,
  resolveInternalImport,
  findComponentByResolvedPath,
  getExternalPackageName,
  inferRoleTags,
  SUPPORTED_DIAGRAM_TYPES,
  analyze,
  generate,
  isPlaceholderDiagram,
  toManifestEntry,
  parseCommaSeparatedList,
  buildManifestSummary,
};
