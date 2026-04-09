const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const {
  SUPPORTED_DIAGRAM_TYPES,
  generate,
  toManifestEntry,
} = require('../core/analysis-generation');
const {
  estimateTokensFromBytes,
  resolveArtifactProfile,
  applyArtifactBudget,
} = require('../artifacts/artifact-budget');
const {
  applyDiagramRcDefaults,
  getDiagramRcFromProgram,
  maybeWriteArchitectureIR,
  resolveRootPathOrExit,
  runAnalysisPipeline,
  validateOutputPath,
} = require('./shared');
const { buildMachineEnvelope } = require('./output');

/**
 * Register the `generate-all [path]` CLI command which generates Mermaid diagram files for all supported diagram types and writes a manifest describing outputs and compaction decisions.
 *
 * The command analyses the target path, applies RC defaults, validates and resolves output and artifact profile, runs the analysis pipeline, optionally emits a typed architecture IR, generates diagrams for every supported type, applies an artifact budget to decide which diagrams to include/truncate/omit, writes `.mmd` files and a `manifest.json`, and emits either a machine-readable JSON envelope or human-friendly text output depending on the `--format` option.
 *
 * @param {import('commander').Command} program - Commander program instance to register the command on.
 */
function registerGenerateAllCommand(program) {
  program
    .command('generate-all [path]')
    .description('Generate all diagram types')
    .option('-O, --output-dir <dir>', 'Output directory', '.diagram')
    .option('--artifact-profile <profile>', 'Artifact output profile (full, agent, ultra-compact)', 'full')
    .option('-q, --quiet', 'Suppress non-essential logging', false)
    .option('-p, --patterns <list>', 'File patterns')
    .option('-e, --exclude <list>', 'Exclude patterns')
    .option('-m, --max-files <n>', 'Max files to analyze')
    .option('--analyzer <name>', 'Analyzer plugin to use', 'default')
    .option('--emit-ir', 'Write typed architecture IR artifact', false)
    .option('--incremental', 'Use incremental cache when available', false)
    .option('-f, --format <type>', 'Output format (text, json)', 'text')
    .option('--deterministic', 'Use deterministic machine output', false)
    .action(async (targetPath, rawOptions) => {
      const options = applyDiagramRcDefaults(rawOptions, getDiagramRcFromProgram(program), ['patterns', 'exclude', 'maxFiles']);
      const root = resolveRootPathOrExit(targetPath);
      let outDir;
      let artifactProfile;
      try {
        outDir = validateOutputPath(options.outputDir, root);
        artifactProfile = resolveArtifactProfile(options.artifactProfile);
      } catch (error) {
        console.error(chalk.red('❌ Configuration error:'), error.message);
        process.exit(2);
      }

      if (!options.quiet) {
        console.error(chalk.blue('Analyzing'), root);
      }
      const pipeline = await runAnalysisPipeline(root, options, 'generate-all');
      const data = pipeline.analysis;
      const irPath = options.emitIr
        ? maybeWriteArchitectureIR(root, data, pipeline.analyzer, true)
        : null;

      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      const types = [...SUPPORTED_DIAGRAM_TYPES];
      const generatedDiagrams = types.map((type) => ({
        type,
        mermaid: generate(data, type),
      }));
      const budgeted = applyArtifactBudget(generatedDiagrams, artifactProfile);

      const staleMermaidFiles = fs
        .readdirSync(outDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.mmd'))
        .map((entry) => path.join(outDir, entry.name));
      for (const staleFile of staleMermaidFiles) {
        fs.rmSync(staleFile, { force: true });
      }

      const generatedAt = options.deterministic ? '1970-01-01T00:00:00.000Z' : new Date().toISOString();
      const manifest = {
        generatedAt,
        schemaVersion: '1.0',
        rootPath: root,
        diagramDir: path.relative(root, outDir) || '.',
        compaction: {
          applied: budgeted.applied,
          profile: artifactProfile.name,
          maxTotalBytes: artifactProfile.maxBytesTotal,
          maxPerDiagramBytes: artifactProfile.maxBytesPerDiagram,
          maxDiagrams: artifactProfile.maxDiagrams,
          generatedDiagrams: budgeted.summary.generatedCount,
          writtenDiagrams: budgeted.summary.includedCount,
          omittedTypes: budgeted.omitted.map((entry) => entry.type),
          truncatedTypes: budgeted.truncatedTypes,
          bytesSaved: budgeted.summary.bytesSaved,
          estimatedTokensSaved: estimateTokensFromBytes(budgeted.summary.bytesSaved),
          reason: artifactProfile.name === 'full'
            ? 'full_profile'
            : (budgeted.applied ? 'budget_constraints' : 'within_budget'),
        },
        diagrams: [],
      };

      for (const entry of budgeted.included) {
        const file = path.join(outDir, `${entry.type}.mmd`);
        fs.writeFileSync(file, entry.mermaid);
        const manifestEntry = toManifestEntry(entry.type, file, entry.mermaid, root);
        if (entry.truncated) {
          manifestEntry.compacted = true;
          manifestEntry.sourceBytes = entry.originalBytes;
          manifestEntry.bytesSaved = entry.bytesSaved;
        }
        manifest.diagrams.push(manifestEntry);
        if (!options.quiet) {
          const truncationSuffix = entry.truncated ? chalk.yellow(' [truncated]') : '';
          console.error(chalk.green('✅'), entry.type, '→', file, truncationSuffix);
        }
      }

      manifest.diagrams = manifest.diagrams.sort((a, b) => a.type.localeCompare(b.type));
      const manifestPath = path.join(outDir, 'manifest.json');
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      const formatStr = (options.format || 'text').toLowerCase();
      if (formatStr === 'json') {
        const payload = buildMachineEnvelope({
          schemaVersion: '1.0',
          command: 'generate-all',
          rootPath: root,
          deterministic: Boolean(options.deterministic),
          data: {
            manifest,
            artifacts: {
              manifestPath,
              architectureIrPath: irPath,
            },
            analyzer: pipeline.analyzer,
            incremental: pipeline.incremental,
          },
          agentSummary: {
            changedComponents: data.components?.length || 0,
            riskReasons: manifest.compaction.omittedTypes.length > 0 ? ['artifact_budget_omitted_types'] : [],
            suggestedReviewerChecks: [
              'Review omitted diagram types when using compact profiles.',
              'Attach `.diagram/manifest.json` to CI artifacts for agent consumers.',
            ],
          },
        });
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      if (!options.quiet) {
        if (manifest.compaction.omittedTypes.length > 0) {
          console.error(
            chalk.yellow('⚠️  omitted diagrams:'),
            manifest.compaction.omittedTypes.join(', ')
          );
        }
        console.error(chalk.green('✅ manifest'), '→', manifestPath);
        if (irPath) {
          console.error(chalk.gray('IR artifact:'), irPath);
        }
        console.error(chalk.cyan('\n🔗 Preview all at: https://mermaid.live'));
        console.log(chalk.cyan('\nNext steps:'));
        console.log('  1) Run `diagram context .` to refresh compact AI context pack files.');
        console.log('  2) Upload `.diagram` artifacts in CI for PR analysis workflows.');
      }
    });
}

module.exports = {
  registerGenerateAllCommand,
};
