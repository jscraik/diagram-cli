const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { writeAgentContext } = require('../artifacts/agent-context');
const { writeArchitectureBrief } = require('../artifacts/brief');
const {
  createScanEvidenceManifest,
  writeJsonFile,
} = require('../artifacts/evidence-manifest');
const { generateDiagramArtifact } = require('../core/analysis-generation');
const { buildMachineEnvelope } = require('./output');
const {
  applyDiagramRcDefaults,
  getDiagramRcFromProgram,
  runAnalysisPipeline,
  resolveRootPathOrExit,
  validateOutputPath,
} = require('./shared');

function outcomeForManifest(manifest) {
  const state = manifest.artifacts.reduce((current, entry) => ({
    failed: current.failed || entry.status === 'failed',
    partial: current.partial || entry.status === 'partial',
    written: current.written || entry.status === 'written',
  }), { failed: false, partial: false, written: false });
  if (state.failed) {
    if (state.written) return 'partial';
    return 'failed';
  }
  if (state.partial) return 'partial';
  return 'success';
}

function markArtifactFailure({
  artifactStatuses,
  artifactReasons,
  artifactErrorCategories,
  errors,
  artifact,
  reason = 'writer_failed',
  category = 'artifact_write_failed',
  error,
}) {
  artifactStatuses[artifact] = 'failed';
  artifactReasons[artifact] = reason;
  artifactErrorCategories[artifact] = category;
  errors.push(errorForArtifact(artifact, category, error));
}

function writeArtifact({ artifact, write, failureState }) {
  try {
    return write();
  } catch (error) {
    markArtifactFailure({
      ...failureState,
      artifact,
      error,
    });
    return null;
  }
}

function failArtifactsForAnalysis(artifacts, failureState, error) {
  for (const artifact of artifacts) {
    markArtifactFailure({
      ...failureState,
      artifact,
      reason: 'analysis_failed',
      category: 'analysis_failed',
      error,
    });
  }
}

function createScanSummary(manifest) {
  return {
    manifestPath: manifest.artifactReadOrder[0],
    primaryHumanArtifact: manifest.primaryHumanArtifact,
    primaryAgentArtifact: manifest.primaryAgentArtifact,
    nextAction: `Read ${manifest.artifactReadOrder[0]} for artifact status before opening optional files.`,
  };
}

function errorForArtifact(artifact, category, error) {
  return {
    artifact,
    category,
    message: error?.message || String(error),
  };
}

function writeArchitectureArtifact({ outDir, analysis }) {
  const artifact = generateDiagramArtifact(analysis, 'architecture');
  const architecturePath = path.join(outDir, 'architecture.mmd');
  fs.writeFileSync(architecturePath, artifact.mermaid);
  return architecturePath;
}

/**
 * Register the `scan [path]` CLI command.
 *
 * The scan implementation coordinates the non-visual evidence pack and writes
 * manifest.json last so consumers can trust artifact-level statuses.
 *
 * @param {import('commander').Command} program - Commander program instance.
 */
function registerScanCommand(program) {
  program
    .command('scan [path]')
    .description('Generate architecture evidence pack')
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

      const warnings = [];
      if (options.base || options.head) {
        warnings.push('pr_evidence_deferred');
      }
      const artifactStatuses = {
        manifest: 'written',
        brief: 'written',
        'agent-context': 'written',
        architecture: 'written',
        report: 'deferred',
      };
      const artifactReasons = {};
      const artifactErrorCategories = {};
      const errors = [];
      const failureState = {
        artifactStatuses,
        artifactReasons,
        artifactErrorCategories,
        errors,
      };
      let analysis = null;
      const buildManifest = () => createScanEvidenceManifest({
        root,
        outDir,
        deterministic: Boolean(options.deterministic),
        warnings,
        artifactStatuses,
        artifactReasons,
        artifactErrorCategories,
      });

      try {
        const pipeline = await runAnalysisPipeline(root, options, 'scan');
        analysis = pipeline.analysis;
      } catch (error) {
        failArtifactsForAnalysis(['brief', 'agent-context', 'architecture'], failureState, error);
      }

      if (analysis) {
        writeArtifact({
          artifact: 'architecture',
          write: () => writeArchitectureArtifact({ outDir, analysis }),
          failureState,
        });
      }

      let manifest = buildManifest();

      if (analysis) {
        const briefPath = path.join(outDir, 'brief.md');
        writeArtifact({
          artifact: 'brief',
          write: () => writeArchitectureBrief(briefPath, {
            manifest,
            analysis,
            warnings,
            errors,
          }),
          failureState,
        });

        manifest = buildManifest();

        const agentContextPath = path.join(outDir, 'agent-context.json');
        writeArtifact({
          artifact: 'agent-context',
          write: () => writeAgentContext(agentContextPath, {
            manifest,
            analysis,
            warnings,
            errors,
          }),
          failureState,
        });
      }

      manifest = buildManifest();
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
          errors,
          agentSummary: {
            changedComponents: analysis?.components?.length || 0,
            riskReasons: errors.length > 0
              ? errors.map((entry) => entry.category)
              : manifest.warnings,
            suggestedReviewerChecks: [
              'Read `.diagram/manifest.json` before consuming evidence artifacts.',
            ],
          },
        });
        console.log(JSON.stringify(payload, null, 2));
        process.exit(outcome === 'success' ? 0 : 1);
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
      if (outcome !== 'success') {
        process.exit(1);
      }
    });
}

module.exports = {
  createScanSummary,
  outcomeForManifest,
  registerScanCommand,
};
