const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const chalk = require('chalk');
const { writeAgentContext } = require('../artifacts/agent-context');
const { writeArchitectureBrief } = require('../artifacts/brief');
const {
  createScanEvidenceManifest,
  writeJsonFile,
} = require('../artifacts/evidence-manifest');
const { generateDiagramArtifact } = require('../core/analysis-generation');
const { writeArchitectureReport } = require('../renderers/report-html');
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

function writeArtifact({
  artifact,
  write,
  failureState,
  reason = 'writer_failed',
  category = 'artifact_write_failed',
}) {
  try {
    return write();
  } catch (error) {
    markArtifactFailure({
      ...failureState,
      artifact,
      reason,
      category,
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
      category: 'analysis_partial',
      error,
    });
  }
}

function summarizeWarnings(warnings) {
  if (!Array.isArray(warnings) || warnings.length === 0) return 'none';
  return warnings.join('; ');
}

function summarizeList(items) {
  if (!Array.isArray(items) || items.length === 0) return 'none';
  return items.join('; ');
}

function createScanSummary(manifest, {
  analysis = null,
  outcome = outcomeForManifest(manifest),
  prImpact = null,
  prImpactPath = null,
} = {}) {
  const componentCount = Array.isArray(analysis?.components) ? analysis.components.length : 0;
  const warnings = Array.isArray(manifest.warnings) ? manifest.warnings : [];
  const prAgentSummary = prImpact?.agentSummary || {};
  return {
    manifestPath: manifest.artifactReadOrder[0],
    primaryHumanArtifact: manifest.primaryHumanArtifact,
    primaryAgentArtifact: manifest.primaryAgentArtifact,
    packStatus: outcome,
    componentCount,
    warningSummary: summarizeWarnings(warnings),
    pr: prImpact ? {
      riskLevel: prImpact.risk?.level || 'unknown',
      changedComponents: prAgentSummary.changedComponents ?? prImpact.changedComponents?.length ?? 0,
      riskReasons: prAgentSummary.riskReasons || [],
      reviewerChecks: prAgentSummary.suggestedReviewerChecks || [],
      prImpactPath,
    } : null,
    nextAction: `Read ${manifest.artifactReadOrder[0]} for artifact status before opening optional files.`,
  };
}

function manifestArtifactPath(manifest, id, { requireWritten = false } = {}) {
  const artifact = manifest.artifacts.find((entry) => entry.id === id);
  if (!artifact) return null;
  if (requireWritten && artifact.status !== 'written') return null;
  return artifact.path;
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

function optionArg(args, flag, value) {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    args.push(flag, String(value));
  }
}

function parseWorkflowPrPayload(stdout) {
  const trimmed = String(stdout || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    return null;
  }
}

function runWorkflowPrEvidence({ root, outDir, options }) {
  const prImpactDir = path.join(outDir, 'pr-impact');
  const args = [
    path.join(__dirname, '..', 'diagram.js'),
    'workflow',
    'pr',
    root,
    '--head',
    options.head || 'HEAD',
    '--output-dir',
    prImpactDir,
    '--format',
    'json',
  ];
  optionArg(args, '--base', options.base);
  optionArg(args, '--patterns', options.patterns);
  optionArg(args, '--exclude', options.exclude);
  optionArg(args, '--max-files', options.maxFiles);
  if (options.deterministic) {
    args.push('--deterministic');
  }

  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000, // 2 minutes
  });
  const payload = parseWorkflowPrPayload(result.stdout);
  if (result.status !== 0 || !payload?.data?.prImpact) {
    const error = new Error(
      payload?.errors?.[0]?.message
      || result.stderr.trim()
      || result.stdout.trim()
      || 'workflow pr evidence failed'
    );
    error.category = 'git_refs_missing';
    throw error;
  }

  return payload.data.prImpact;
}

function buildPrMachineSummary({
  prImpact,
  prImpactPath,
  options,
  errors,
}) {
  if (prImpact) {
    return {
      status: prImpact._meta?.status || 'complete',
      base: prImpact.base,
      head: prImpact.head,
      prImpactPath,
      risk: prImpact.risk || null,
      blastRadius: prImpact.blastRadius || null,
      reviewerChecks: prImpact.agentSummary?.suggestedReviewerChecks || [],
    };
  }
  if (options.base || options.head) {
    const prError = errors.find((error) => error.artifact === 'pr-impact');
    return {
      status: 'failed',
      base: options.base || null,
      head: options.head || 'HEAD',
      errorCategory: prError?.category || 'git_refs_missing',
    };
  }
  return null;
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
      const artifactStatuses = {
        manifest: 'written',
        brief: 'written',
        'agent-context': 'written',
        architecture: 'written',
        report: 'written',
        'pr-impact': 'deferred',
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
      let prImpact = null;
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
        failArtifactsForAnalysis(['brief', 'agent-context', 'architecture', 'report'], failureState, error);
      }

      if (analysis) {
        writeArtifact({
          artifact: 'architecture',
          write: () => writeArchitectureArtifact({ outDir, analysis }),
          failureState,
        });
      }

      if (options.base || options.head) {
        try {
          const prEvidence = runWorkflowPrEvidence({ root, outDir, options });
          prImpact = prEvidence;
          if (prEvidence?._meta?.status === 'complete') {
            artifactStatuses['pr-impact'] = 'written';
          } else {
            artifactStatuses['pr-impact'] = 'deferred';
            artifactReasons['pr-impact'] = prEvidence?._meta?.status || 'no_pr_impact_artifact';
          }
        } catch (error) {
          markArtifactFailure({
            ...failureState,
            artifact: 'pr-impact',
            reason: 'pr_refs_unavailable',
            category: error.category || 'git_refs_missing',
            error,
          });
        }
      }

      let manifest = buildManifest();

      if (analysis) {
        const briefPath = path.join(outDir, 'brief.md');
        writeArtifact({
          artifact: 'brief',
          write: () => writeArchitectureBrief(briefPath, {
            manifest,
            analysis,
            prImpact,
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
            prImpact,
            warnings,
            errors,
          }),
          failureState,
        });

        manifest = buildManifest();

        const reportPath = path.join(outDir, 'report.html');
        writeArtifact({
          artifact: 'report',
          write: () => writeArchitectureReport(reportPath, {
            manifest,
            analysis,
            prImpact,
            warnings,
            errors,
          }),
          failureState,
          reason: 'write_failure',
          category: 'artifact_write_failed',
        });
      }

      manifest = buildManifest();
      if (
        analysis
        && artifactStatuses.report === 'failed'
        && artifactStatuses['agent-context'] === 'written'
      ) {
        const agentContextPath = path.join(outDir, 'agent-context.json');
        writeArtifact({
          artifact: 'agent-context',
          write: () => writeAgentContext(agentContextPath, {
            manifest,
            analysis,
            prImpact,
            warnings,
            errors,
          }),
          failureState,
        });
        manifest = buildManifest();
      }
      const manifestPath = path.join(outDir, 'manifest.json');
      try {
        writeJsonFile(manifestPath, manifest);
      } catch (error) {
        markArtifactFailure({
          ...failureState,
          artifact: 'manifest',
          reason: 'write_failure',
          category: 'artifact_write_failed',
          error,
        });
        manifest = buildManifest();
      }

      const outcome = outcomeForManifest(manifest);
      const prImpactPath = prImpact
        ? manifest.artifactReadOrder.find((entry) => entry.endsWith('pr-impact/pr-impact.json'))
          || null
        : null;
      const summary = createScanSummary(manifest, {
        analysis,
        outcome,
        prImpact,
        prImpactPath,
      });

      if (formatStr === 'json') {
        const prSummary = buildPrMachineSummary({
          prImpact,
          prImpactPath,
          options,
          errors,
        });
        const payload = buildMachineEnvelope({
          schemaVersion: '1.0',
          command: 'scan',
          rootPath: root,
          deterministic: Boolean(options.deterministic),
          status: outcome,
          data: {
            outcome,
            partial: outcome === 'partial',
            evidencePack: manifest,
            artifacts: manifest.artifacts,
            manifestPath: summary.manifestPath,
            briefPath: manifestArtifactPath(manifest, 'brief', { requireWritten: true }),
            agentContextPath: manifestArtifactPath(manifest, 'agent-context', { requireWritten: true }),
            diagramPath: manifestArtifactPath(manifest, 'architecture', { requireWritten: true }),
            reportPath: manifestArtifactPath(manifest, 'report', { requireWritten: true }),
            prImpactPath,
            ...(prSummary ? { pr: prSummary } : {}),
            warnings: manifest.warnings,
          },
          errors,
          agentSummary: {
            changedComponents: prImpact?.agentSummary?.changedComponents ?? analysis?.components?.length ?? 0,
            riskReasons: errors.length > 0
              ? errors.map((entry) => entry.category)
              : (prImpact?.agentSummary?.riskReasons || manifest.warnings),
            suggestedReviewerChecks: [
              ...(prImpact?.agentSummary?.suggestedReviewerChecks || []),
              `Read \`${summary.manifestPath}\` before consuming evidence artifacts.`,
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
      if (outcome !== 'success') {
        console.error(chalk.yellow('\nArchitecture evidence pack incomplete'));
        console.error(`  Outcome: ${outcome}`);
        if (errors.length > 0) {
          console.error(`  Error: ${errors[0].category}: ${errors[0].message}`);
        }
        process.exit(1);
      }
      console.log(chalk.green('\nArchitecture evidence pack initialized'));
      console.log(`  Pack status: ${summary.packStatus}`);
      console.log(`  Components detected: ${summary.componentCount}`);
      console.log(`  Manifest: ${summary.manifestPath}`);
      console.log(`  Human artifact: ${summary.primaryHumanArtifact}`);
      console.log(`  Agent artifact: ${summary.primaryAgentArtifact}`);
      console.log(`  Warnings: ${summary.warningSummary}`);
      if (summary.pr) {
        console.log(chalk.cyan('\nPR review focus:'));
        console.log(`  Risk: ${summary.pr.riskLevel}`);
        console.log(`  Changed components: ${summary.pr.changedComponents}`);
        console.log(`  Risk reasons: ${summarizeList(summary.pr.riskReasons)}`);
        console.log(`  Reviewer checks: ${summarizeList(summary.pr.reviewerChecks)}`);
        console.log(`  PR impact artifact: ${summary.pr.prImpactPath || 'not written'}`);
      }
      console.log(chalk.cyan('\nNext action:'));
      console.log(`  ${summary.nextAction}`);
    });
}

module.exports = {
  createScanSummary,
  outcomeForManifest,
  registerScanCommand,
};
