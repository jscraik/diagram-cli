#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk');
const { execSync, spawn } = require('child_process');
const os = require('os');

const program = new Command();

// Utility functions
function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript',
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
    const es6 = [...content.matchAll(/import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/g)];
    es6.forEach(m => imports.push(m[1]));
    const cjs = [...content.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g)];
    cjs.forEach(m => imports.push(m[1]));
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
  return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
}

function escapeMermaid(str) {
  return str.replace(/"/g, '\\"');
}

// Analysis
async function analyze(rootPath, options) {
  const patterns = options.patterns ? options.patterns.split(',') : ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go', '**/*.rs'];
  const exclude = options.exclude ? options.exclude.split(',') : ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.test.*', '*.spec.*'];
  const maxFiles = parseInt(options.maxFiles) || 100;

  const files = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: rootPath, absolute: true, ignore: exclude });
    files.push(...matches);
  }

  const uniqueFiles = [...new Set(files)].slice(0, maxFiles);
  const components = [];
  const languages = {};
  const directories = new Set();
  const entryPoints = [];

  for (const filePath of uniqueFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lang = detectLanguage(filePath);
      const rel = path.relative(rootPath, filePath);
      const dir = path.dirname(rel);

      languages[lang] = (languages[lang] || 0) + 1;
      if (dir !== '.') directories.add(dir);
      if (rel.match(/index\.(ts|js|tsx|jsx|py)$/)) entryPoints.push(rel);

      components.push({
        name: path.basename(filePath, path.extname(filePath)),
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
        const resolved = path.posix.join(path.dirname(comp.filePath), imp);
        const dep = components.find(c => 
          c.filePath === resolved ||
          c.filePath === resolved + '.ts' ||
          c.filePath === resolved + '.tsx' ||
          c.filePath === resolved + '.js' ||
          c.filePath === resolved + '.jsx' ||
          c.filePath === resolved + '/index.ts' ||
          c.filePath === resolved + '/index.tsx' ||
          c.filePath === resolved + '/index.js' ||
          c.filePath === resolved + '/index.jsx'
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
  const comps = focus ? data.components.filter(c => c.filePath.includes(focus) || c.name.includes(focus)) : data.components;
  
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
      lines.push(`    ${sanitize(c.name)}${shape}"${escapeMermaid(c.name)}"${end}`);
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

  for (const ep of data.entryPoints) {
    const name = path.basename(ep, path.extname(ep));
    lines.push(`  style ${sanitize(name)} fill:#4f46e5,color:#fff`);
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

  for (const s of services) lines.push(`  participant ${sanitize(s.name)}`);
  for (let i = 0; i < services.length - 1; i++) {
    lines.push(`  ${sanitize(services[i].name)}->>${sanitize(services[i+1].name)}: calls`);
  }
  return lines.join('\n');
}

function generateDependency(data, focus) {
  const lines = ['graph LR'];
  const comps = focus ? data.components.filter(c => c.filePath.includes(focus)) : data.components;
  const external = new Set();

  for (const c of comps) {
    for (const imp of c.imports) {
      if (!imp.startsWith('.')) {
        const pkg = imp.split('/')[0];
        external.add(pkg);
        lines.push(`  ${sanitize(pkg)}["${escapeMermaid(pkg)}"] --> ${sanitize(c.name)}`);
      } else {
        const basePath = path.posix.join(path.dirname(c.filePath), imp);
        const resolved = comps.find(x => 
          x.filePath === basePath ||
          x.filePath === basePath + '.ts' ||
          x.filePath === basePath + '.tsx' ||
          x.filePath === basePath + '.js' ||
          x.filePath === basePath + '.jsx' ||
          x.filePath === basePath + '/index.ts' ||
          x.filePath === basePath + '/index.tsx' ||
          x.filePath === basePath + '/index.js' ||
          x.filePath === basePath + '/index.jsx'
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
  
  for (const c of classes) {
    lines.push(`  class ${sanitize(c.name)} {`);
    lines.push(`    +${c.filePath}`);
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
  lines.push('  Start([Start])');
  const comps = data.components.slice(0, 8);
  let prev = 'Start';
  for (const c of comps) {
    lines.push(`  ${sanitize(c.name)}["${escapeMermaid(c.name)}"]`);
    lines.push(`  ${prev} --> ${sanitize(c.name)}`);
    prev = sanitize(c.name);
  }
  lines.push('  End([End])');
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
      console.log(`  Languages: ${Object.entries(data.languages).map(([k,v]) => `${k}(${v})`).join(', ')}`);
      console.log(`  Entry points: ${data.entryPoints.join(', ') || 'none'}`);
      console.log(`\n${chalk.yellow('Components:')}`);
      data.components.slice(0, 15).forEach(c => {
        const deps = c.dependencies.length > 0 ? ` → ${c.dependencies.slice(0, 3).join(', ')}` : '';
        console.log(`  ${c.name} (${c.type})${deps}`);
      });
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
    const encoded = Buffer.from(JSON.stringify({ code: mermaid })).toString('base64url');
    const url = `https://mermaid.live/edit#pako:${encoded}`;
    
    if (url.length > 8000) {
      console.log(chalk.yellow('⚠️  Diagram is very large. Preview URL may not work in some browsers.'));
      console.log(chalk.cyan('💾 Save to file instead:'), 'diagram generate . --output diagram.svg');
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
          fs.writeFileSync(tempFile, `%%{init: {'theme': '${options.theme}'}}%%\n${mermaid}`);
          execSync(`npx -y @mermaid-js/mermaid-cli mmdc -i ${tempFile} -o ${options.output} -b transparent`, { stdio: 'pipe' });
          fs.unlinkSync(tempFile);
          console.log(chalk.green('✅ Rendered to'), options.output);
        } catch (e) {
          console.log(chalk.yellow('⚠️  Could not render. Install mermaid-cli: npm i -g @mermaid-js/mermaid-cli'));
        }
      }
    }
    
    if (options.open) {
      const platform = process.platform;
      const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
      const args = platform === 'win32' ? ['', url] : [url];
      spawn(cmd, args, { stdio: 'ignore', detached: true });
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

program.parse();
