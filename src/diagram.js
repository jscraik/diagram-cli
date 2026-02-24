#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk');
const { execSync, spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');

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
    // ES6 imports
    const es6 = [...content.matchAll(/import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/g)];
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

function sanitize(name) {
  // Ensure unique, valid mermaid ID
  const base = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
  // Add hash suffix to prevent collisions
  const hash = crypto.createHash('md5').update(name).digest('hex').slice(0, 6);
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
    .replace(/>/g, '\\>');
}

function normalizePath(inputPath) {
  // Always use forward slashes for consistency
  return inputPath.replace(/\\/g, '/');
}

// Analysis
async function analyze(rootPath, options) {
  // Validate maxFiles
  let maxFiles = parseInt(options.maxFiles);
  if (isNaN(maxFiles) || maxFiles < 1 || maxFiles > 10000) {
    maxFiles = 100;
  }
  
  const patterns = options.patterns ? options.patterns.split(',') : ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go', '**/*.rs'];
  const exclude = options.exclude ? options.exclude.split(',') : ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.test.*', '*.spec.*'];

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
      const content = fs.readFileSync(filePath, 'utf-8');
      const lang = detectLanguage(filePath);
      let rel = normalizePath(path.relative(rootPath, filePath));
      const dir = path.dirname(rel);
      if (dir === '.') {
        rel = './' + rel;
      }

      languages[lang] = (languages[lang] || 0) + 1;
      if (dir !== '.') directories.add(dir);
      
      // Support more entry point patterns
      if (rel.match(/\/(index|main|app|server)\.(ts|js|tsx|jsx|mts|mjs|py|go|rs)$/i)) {
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

      components.push({
        name: uniqueName,
        originalName: baseName,
        filePath: rel,
        type: inferType(filePath, content),
        imports: extractImports(content, lang),
        directory: dir,
      });
    } catch (e) {
      if (process.env.DEBUG) console.error(chalk.gray(`Skipped ${filePath}: ${e.message}`));
    }
  }

  // Resolve dependencies
  for (const comp of components) {
    comp.dependencies = [];
    for (const imp of comp.imports) {
      if (imp.startsWith('.')) {
        const dirName = normalizePath(path.dirname(comp.filePath));
        const resolved = normalizePath(path.join(dirName, imp));
        const dep = components.find(c => 
          c.filePath === resolved ||
          c.filePath === resolved + '.ts' ||
          c.filePath === resolved + '.tsx' ||
          c.filePath === resolved + '.js' ||
          c.filePath === resolved + '.jsx' ||
          c.filePath === resolved + '.mjs' ||
          c.filePath === resolved + '.mts' ||
          c.filePath === resolved + '/index.ts' ||
          c.filePath === resolved + '/index.tsx' ||
          c.filePath === resolved + '/index.js' ||
          c.filePath === resolved + '/index.jsx' ||
          c.filePath === resolved + '/index.mjs' ||
          c.filePath === resolved + '/index.mts'
        );
        if (dep) comp.dependencies.push(dep.name);
      }
    }
  }

  return { rootPath, components, entryPoints, languages, directories: [...directories].sort() };
}

// Diagram generators
function generateArchitecture(data, focus) {
  const lines = ['graph TD'];
  const focusNorm = focus ? normalizePath(focus) : null;
  const comps = focusNorm 
    ? data.components.filter(c => c.filePath.includes(focusNorm) || c.name.includes(focusNorm)) 
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
  const lines = ['sequenceDiagram'];
  const services = data.components.filter(c => c.type === 'service' || c.name === 'index').slice(0, 6);
  
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
  const lines = ['graph LR'];
  const focusNorm = focus ? normalizePath(focus) : null;
  const comps = focusNorm ? data.components.filter(c => c.filePath.includes(focusNorm)) : data.components;
  
  if (comps.length === 0) {
    lines.push('  Note["No components found"]');
    return lines.join('\n');
  }
  
  const external = new Set();

  for (const c of comps) {
    for (const imp of c.imports) {
      if (!imp.startsWith('.')) {
        const pkg = imp.split('/')[0];
        if (pkg) {
          external.add(pkg);
          lines.push(`  ${sanitize(pkg)}["${escapeMermaid(pkg)}"] --> ${sanitize(c.name)}`);
        }
      } else {
        const dirName = normalizePath(path.dirname(c.filePath));
        const basePath = normalizePath(path.join(dirName, imp));
        const resolved = comps.find(x => 
          x.filePath === basePath ||
          x.filePath === basePath + '.ts' ||
          x.filePath === basePath + '.tsx' ||
          x.filePath === basePath + '.js' ||
          x.filePath === basePath + '.jsx' ||
          x.filePath === basePath + '.mjs' ||
          x.filePath === basePath + '/index.ts' ||
          x.filePath === basePath + '/index.tsx' ||
          x.filePath === basePath + '/index.js' ||
          x.filePath === basePath + '/index.jsx' ||
          x.filePath === basePath + '/index.mjs'
        );
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
  const lines = ['classDiagram'];
  const classes = data.components.filter(c => c.type === 'class' || c.type === 'component').slice(0, 20);
  
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
    for (const d of c.dependencies.slice(0, 3)) {
      if (classes.find(x => x.name === d)) {
        lines.push(`  ${sanitize(c.name)} --> ${sanitize(d)}`);
      }
    }
  }
  return lines.join('\n');
}

function generateFlow(data) {
  const lines = ['flowchart TD'];
  lines.push('  Start(["Start"])');
  const comps = data.components.slice(0, 8);
  
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

function generate(data, type, focus) {
  switch (type) {
    case 'architecture': return generateArchitecture(data, focus);
    case 'sequence': return generateSequence(data);
    case 'dependency': return generateDependency(data, focus);
    case 'class': return generateClass(data);
    case 'flow': return generateFlow(data);
    default: return generateArchitecture(data, focus);
  }
}

// URL shortening for large diagrams
function createMermaidUrl(mermaidCode) {
  // If diagram is very large, provide text file instead
  if (mermaidCode.length > 5000) {
    return { url: null, large: true };
  }
  
  try {
    const encoded = Buffer.from(JSON.stringify({ code: mermaidCode })).toString('base64url');
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

// Safe file path escaping for shell commands
function escapeShellArg(arg) {
  // For cross-platform safety, wrap in quotes and escape inner quotes
  if (process.platform === 'win32') {
    // Windows: escape quotes by doubling them
    return `"${arg.replace(/"/g, '""')}"`;
  }
  // Unix: use single quotes and escape single quotes
  if (arg.includes("'")) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return `'${arg}'`;
}

// Commands
program
  .name('diagram')
  .description('Generate architecture diagrams from code')
  .version('1.0.0');

program
  .command('analyze [path]')
  .description('Analyze codebase structure')
  .option('-p, --patterns <list>', 'File patterns (comma-separated)', '**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.go,**/*.rs')
  .option('-e, --exclude <list>', 'Exclude patterns', 'node_modules/**,.git/**,dist/**')
  .option('-m, --max-files <n>', 'Max files to analyze', '100')
  .option('-j, --json', 'Output as JSON')
  .action(async (targetPath, options) => {
    const root = path.resolve(targetPath || '.');
    console.log(chalk.blue('Analyzing'), root);
    
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
  .option('-t, --type <type>', 'Diagram type: architecture, sequence, dependency, class, flow', 'architecture')
  .option('-f, --focus <module>', 'Focus on specific module')
  .option('-o, --output <file>', 'Output file (SVG/PNG)')
  .option('-m, --max-files <n>', 'Max files to analyze', '100')
  .option('--theme <theme>', 'Theme: default, dark, forest, neutral', 'default')
  .option('--open', 'Open in browser')
  .action(async (targetPath, options) => {
    const root = path.resolve(targetPath || '.');
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
      const ext = path.extname(options.output).toLowerCase();
      if (ext === '.md' || ext === '.mmd') {
        fs.writeFileSync(options.output, mermaid);
        console.log(chalk.green('✅ Saved to'), options.output);
      } else {
        // Try to render
        try {
          const tempFile = path.join(os.tmpdir(), `diagram-${Date.now()}.mmd`);
          const theme = (options.theme || 'default').toLowerCase();
          fs.writeFileSync(tempFile, `%%{init: {'theme': '${theme}'}}%%\n${mermaid}`);
          execSync(`npx -y @mermaid-js/mermaid-cli mmdc -i ${escapeShellArg(tempFile)} -o ${escapeShellArg(options.output)} -b transparent`, { stdio: 'pipe' });
          fs.unlinkSync(tempFile);
          console.log(chalk.green('✅ Rendered to'), options.output);
        } catch (e) {
          console.log(chalk.yellow('⚠️  Could not render. Install mermaid-cli: npm i -g @mermaid-js/mermaid-cli'));
        }
      }
    }
    
    if (options.open && url) {
      const platform = process.platform;
      const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
      const child = spawn(cmd, platform === 'win32' ? ['', url] : [url], { 
        stdio: 'ignore', 
        detached: true 
      });
      child.unref();
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
    const root = path.resolve(targetPath || '.');
    const outDir = path.resolve(options.outputDir);
    
    console.log(chalk.blue('Analyzing'), root);
    const data = await analyze(root, options);
    
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    const types = ['architecture', 'sequence', 'dependency', 'class', 'flow'];
    
    for (const type of types) {
      const mermaid = generate(data, type);
      const file = path.join(outDir, `${type}.mmd`);
      fs.writeFileSync(file, mermaid);
      console.log(chalk.green('✅'), type, '→', file);
    }
    
    console.log(chalk.cyan('\n🔗 Preview all at: https://mermaid.live'));
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
  .option('--theme <theme>', 'Theme: default, dark, forest, neutral', 'dark')
  .option('-m, --max-files <n>', 'Max files to analyze', '100')
  .action(async (targetPath, options) => {
    const root = path.resolve(targetPath || '.');
    console.log(chalk.blue('🎬 Generating video for'), root);
    
    const data = await analyze(root, options);
    const mermaid = generate(data, options.type);
    
    const { generateVideo } = getVideoModule();
    
    await generateVideo(mermaid, path.resolve(options.output), {
      duration: parseInt(options.duration) || 5,
      fps: parseInt(options.fps) || 30,
      width: parseInt(options.width) || 1280,
      height: parseInt(options.height) || 720,
      theme: (options.theme || 'dark').toLowerCase()
    });
  });

program
  .command('animate [path]')
  .description('Generate animated SVG with CSS animations')
  .option('-t, --type <type>', 'Diagram type', 'architecture')
  .option('-o, --output <file>', 'Output file', 'diagram-animated.svg')
  .option('--theme <theme>', 'Theme', 'dark')
  .option('-m, --max-files <n>', 'Max files to analyze', '100')
  .action(async (targetPath, options) => {
    const root = path.resolve(targetPath || '.');
    console.log(chalk.blue('✨ Generating animated SVG for'), root);
    
    const data = await analyze(root, options);
    const mermaid = generate(data, options.type);
    
    const { generateAnimatedSVG } = getVideoModule();
    
    await generateAnimatedSVG(mermaid, path.resolve(options.output), {
      theme: (options.theme || 'dark').toLowerCase()
    });
  });

program.parse();
