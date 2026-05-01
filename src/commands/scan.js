const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const {
  createScanEvidenceManifest,
  writeJsonFile,
} = require('../artifacts/evidence-manifest');
const { buildMachineEnvelope } = require('./output');
const {
  applyDiagramRcDefaults,
  getDiagramRcFromProgram,
  resolveRootPathOrExit,
  validateOutputPath,
} = require('./shared');

function outcomeForManifest(manifest) {
  const failed = manifest.artifacts.some((entry) => entry.status === 'failed');
  const partial = manifest.artifacts.some((entry) => entry.status === 'partial');
  if (failed) return 'failed';
  if (partial) return 'partial';
  return 'success';
}

function createScanSummary(manifest) {
  return {
    manifestPath: manifest.artifactReadOrder[0],
    primaryHumanArtifact: manifest.primaryHumanArtifact,
    primaryAgentArtifact: manifest.primaryAgentArtifact,
    nextAction: `Read ${manifest.artifactReadOrder[0]} for artifact status before opening deferred files.`,
  };
}

/**
 * Register the `scan [path]` CLI command.
 *
 * The P0 scan implementation establishes the evidence-pack command surface and
 * manifest contract. Later phases attach the actual non-visual evidence writers.
 *
 * @param {import('commander').Command} program - Commander program instance.
 */
function registerScanCommand(program) {
  program
    .command('scan [path]')
    .description('Generate architecture evidence pack manifest')
    .option('-O, --output-dir <dir>', 'Output directory', '.diagram')
    .option('-p, --patterns <list>', 'File patterns')
    .option('-e, --exclude <list>', 'Exclude patterns')
    .option('-m, --max-files <n>', 'Max files to analyze')
    .option('--analyzer <name>', 'Analyzer plugin to use', 'default')
    .option('--base <ref>', 'Base git ref for PR evidence')
    .option('--head <ref>', 'Head git ref for PR evidence')
    .option('-f, --format <type>', 'Output format (text, json)', 'text')
    .option('--deterministic', 'Use deterministic machine output', false)
    .option('-q, --quiet', 'Suppress non-essential logging', false)
    .action(async (targetPath, rawOptions) => {
      const options = applyDiagramRcDefaults(
        rawOptions,
        getDiagramRcFromProgram(program),
        ['patterns', 'exclude', 'maxFiles']
      );
      const root = resolveRootPathOrExit(targetPath);
      const formatStr = String(options.format || 'text').toLowerCase().trim();
      if (!['text', 'json'].includes(formatStr)) {
        console.error(chalk.red('❌ Invalid format:'), options.format);
        console.error(chalk.gray('Fix: use --format text or --format json.'));
        process.exit(2);
      }

      let outDir;
      try {
        outDir = validateOutputPath(options.outputDir, root);
      } catch (error) {
        console.error(chalk.red('❌ Configuration error:'), error.message);
        process.exit(2);
      }
      fs.mkdirSync(outDir, { recursive: true });

      const warnings = ['non_visual_writers_deferred'];
      if (options.base || options.head) {
        warnings.push('pr_evidence_deferred');
      }
      const manifest = createScanEvidenceManifest({
        root,
        outDir,
        deterministic: Boolean(options.deterministic),
        warnings,
      });
      const manifestPath = path.join(outDir, 'manifest.json');
      writeJsonFile(manifestPath, manifest);

      const outcome = outcomeForManifest(manifest);
      const summary = createScanSummary(manifest);

      if (formatStr === 'json') {
        const payload = buildMachineEnvelope({
          schemaVersion: '1.0',
          command: 'scan',
          rootPath: root,
          deterministic: Boolean(options.deterministic),
          status: outcome,
          data: {
            outcome,
            evidencePack: manifest,
            manifestPath: summary.manifestPath,
            briefPath: manifest.artifactReadOrder[1],
            agentContextPath: manifest.primaryAgentArtifact,
            warnings: manifest.warnings,
          },
          agentSummary: {
            changedComponents: 0,
            riskReasons: manifest.warnings,
            suggestedReviewerChecks: [
              'Read `.diagram/manifest.json` before consuming deferred evidence artifacts.',
            ],
          },
        });
        console.log(JSON.stringify(payload, null, 2));
        process.exit(outcome === 'failed' ? 1 : 0);
      }

      if (!options.quiet) {
        console.error(chalk.blue('Scanning'), root);
        console.error(chalk.green('✅ manifest'), '→', manifestPath);
      }
      console.log(chalk.green('\nArchitecture evidence pack initialized'));
      console.log(`  Manifest: ${summary.manifestPath}`);
      console.log(`  Human artifact: ${summary.primaryHumanArtifact}`);
      console.log(`  Agent artifact: ${summary.primaryAgentArtifact}`);
      console.log(chalk.cyan('\nNext action:'));
      console.log(`  ${summary.nextAction}`);
    });
}

module.exports = {
  createScanSummary,
  outcomeForManifest,
  registerScanCommand,
};
