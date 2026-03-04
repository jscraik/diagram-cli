#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { spawn, spawnSync, execFileSync } = require('child_process');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const { getOpenCommand, getNpxCommandCandidates } = require('./utils/commands');
const {
  SUPPORTED_DIAGRAM_TYPES,
  analyze,
  generate,
  toManifestEntry,
  parseCommaSeparatedList,
  buildManifestSummary,
} = require('./core/analysis-generation');
const {
  escapeHtml,
  groupChangePaths,
  buildRiskNarrative,
  buildSummaryMeta,
  generateHtmlExplainer,
} = require('./workflow/pr-impact');
const {
  analyzeAtRef,
  computeArchitectureDiff,
  printArchitectureDiff,
} = require('./workflow/git-helpers');
const { registerWorkflowCommands } = require('./workflow/pr-command');

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
 * Validate Mermaid syntax using mermaid-cli
 * @param {string} mermaid - Mermaid diagram source
 * @param {string} theme - Theme name
 * @returns {{valid: boolean, errors: Array<{line?: number, message: string}>}}
 */
function validateMermaidSyntax(mermaid, theme = 'default') {
  const result = { valid: true, errors: [] };

  // Basic syntax checks (no external dependency required)
  const lines = mermaid.split('\n');

  // Check for common issues
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for unbalanced quotes in labels
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      result.errors.push({ line: lineNum, message: 'Unbalanced quotes in label' });
      result.valid = false;
    }

    // Check for invalid arrow syntax
    if (line.includes('-->') && line.includes('---')) {
      result.errors.push({ line: lineNum, message: 'Mixed arrow syntax (-->) and comment syntax (---)' });
      result.valid = false;
    }

    // Check for empty node labels
    if (/\[\s*\]/.test(line) && !line.includes('%%')) {
      result.errors.push({ line: lineNum, message: 'Empty node label []' });
      result.valid = false;
    }
  }

  // Check for required diagram type declaration
  const firstNonCommentLine = lines.find(l => !l.trim().startsWith('%%'));
  const validDiagramTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'erDiagram', 'gantt', 'pie', 'journey', 'gitGraph', 'mindmap', 'timeline'];
  const hasValidType = validDiagramTypes.some(type => firstNonCommentLine?.trim().startsWith(type));

  if (!hasValidType && firstNonCommentLine) {
    result.errors.push({ line: 1, message: 'Missing or invalid diagram type declaration' });
    result.valid = false;
  }

  // Try to validate with mmdc if available
  try {
    const randomId = crypto.randomBytes(8).toString('hex');
    const tempFile = path.join(os.tmpdir(), `diagram-validate-${Date.now()}-${randomId}.mmd`);
    fs.writeFileSync(tempFile, `%%{init: {'theme': '${theme}'}}%%\n${mermaid}`);

    // Use spawnSync for safer execution (no shell interpolation)
    const { status, stderr } = cp.spawnSync(
      'npx',
      ['-y', '@mermaid-js/mermaid-cli', 'mmdc', '-i', tempFile, '--dryRun'],
      { encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    fs.unlinkSync(tempFile);

    if (status !== 0 && result.errors.length === 0) {
      // mmdc validation failed - parse error message
      const output = stderr || '';
      const lineMatch = output.match(/line (\d+)/i);
      const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : undefined;

      let errorMsg = 'Mermaid syntax error';
      if (output.includes('Error parsing')) {
        errorMsg = 'Parse error in Mermaid syntax';
      } else if (output.includes('lexing error')) {
        errorMsg = 'Lexing error - invalid characters or syntax';
      }

      result.errors.push({ line: errorLine, message: errorMsg });
      result.valid = false;
    }
  } catch (e) {
    // mmdc not available or failed - rely on basic checks only
    if (process.env.DEBUG) {
      console.log(chalk.gray('Mermaid CLI not available for validation, using basic checks only'));
    }
  }

  return result;
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
  .option('--validate', 'Validate Mermaid syntax', false)
  .option('--fail-on-validation-error', 'Exit with error if validation fails', false)
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

    // Validate Mermaid syntax if requested
    if (options.validate) {
      console.log(chalk.blue('\n🔍 Validating Mermaid syntax...'));
      const validationResult = validateMermaidSyntax(mermaid, safeTheme);

      if (validationResult.valid) {
        console.log(chalk.green('✅ Mermaid syntax is valid'));
      } else {
        console.log(chalk.yellow('⚠️  Mermaid syntax issues detected:'));
        for (const error of validationResult.errors) {
          console.log(chalk.yellow(`   Line ${error.line || '?'}: ${error.message}`));
        }

        if (options.failOnValidationError) {
          console.error(chalk.red('❌ Validation failed (exit 1)'));
          process.exit(1);
        }
      }
    }

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
  .command('diff <base> <head>')
  .description('Compare architecture diagrams between two git refs')
  .option('-j, --json', 'Output as JSON')
  .option('-m, --max-files <n>', 'Max files to analyze per ref', '100')
  .option('-p, --patterns <list>', 'File patterns to include (comma-separated)')
  .option('-e, --exclude <list>', 'Paths to exclude (comma-separated)')
  .option('--verbose', 'Show detailed output')
  .action(async (baseRef, headRef, options) => {
    const root = resolveRootPathOrExit('.');
    const verbose = options.verbose || false;

    // Validate refs exist
    const baseCheck = spawnSync('git', ['rev-parse', '--verify', baseRef], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'pipe'],
      encoding: 'utf-8'
    });
    if (baseCheck.status !== 0) {
      console.error(chalk.red('❌ Invalid base ref:'), baseRef);
      process.exit(2);
    }

    const headCheck = spawnSync('git', ['rev-parse', '--verify', headRef], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'pipe'],
      encoding: 'utf-8'
    });
    if (headCheck.status !== 0) {
      console.error(chalk.red('❌ Invalid head ref:'), headRef);
      process.exit(2);
    }

    if (!options.json) {
      console.log(chalk.blue('\n🔍 Architecture Diff'));
      console.log(chalk.gray(`   Base: ${baseRef}`));
      console.log(chalk.gray(`   Head: ${headRef}`));
      console.log('');
    }

    const analysisOptions = {
      maxFiles: parseInt(options.maxFiles, 10) || 100,
      patterns: options.patterns,
      exclude: options.exclude
    };

    // Analyze at both refs
    let baseAnalysis, headAnalysis;
    try {
      baseAnalysis = await analyzeAtRef(baseRef, root, analysisOptions);
      if (verbose && !options.json) {
        console.log(chalk.gray(`   Base components: ${baseAnalysis.components.length}`));
      }

      headAnalysis = await analyzeAtRef(headRef, root, analysisOptions);
      if (verbose && !options.json) {
        console.log(chalk.gray(`   Head components: ${headAnalysis.components.length}`));
      }
    } catch (e) {
      console.error(chalk.red('❌ Analysis error:'), e.message);
      process.exit(2);
    }

    // Build comparison
    const diff = computeArchitectureDiff(baseAnalysis, headAnalysis);

    if (options.json) {
      console.log(JSON.stringify(diff, null, 2));
      return;
    }

    // Console output
    printArchitectureDiff(diff, baseRef, headRef);
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

// Register workflow commands
registerWorkflowCommands(program, {
  resolveRootPathOrExit,
  validateOutputPath,
});

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
