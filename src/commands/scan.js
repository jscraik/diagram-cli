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

/**
 * Mark given artifacts as failed because analysis failed and record their failure details.
 *
 * For each artifact id in `artifacts` this records status `'failed'`, reason `'analysis_failed'`,
 * category `'analysis_partial'` and appends the provided error into the shared failure state.
 *
 * @param {string[]} artifacts - Artifact identifiers to mark as failed.
 * @param {Object} failureState - Shared failure state containing `artifactStatuses`, `artifactReasons`, `artifactErrorCategories` and `errors`.
 * @param {Error|any} error - The error that caused the analysis failure; its message is attached to each artifact's error entry.
 */
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

/**
 * Produce a semicolon-separated summary of warning messages or `'none'` when there are none.
 * @param {Array<string>} warnings - Array of warning messages; any non-array or empty array is treated as no warnings.
 * @return {string} `'none'` if `warnings` is not a non-empty array, otherwise the warnings joined with `'; '`.
 */
function summarizeWarnings(warnings) {
  if (!Array.isArray(warnings) || warnings.length === 0) return 'none';
  return warnings.join('; ');
}

/**
 * Convert an array of items into a single semicolon-separated string or return 'none'.
 *
 * @param {Array} items - The items to summarise; may be non-array or empty.
 * @returns {string} `'none'` if `items` is not a non-empty array, otherwise the items joined with `'; '`.
 */
function summarizeList(items) {
  if (!Array.isArray(items) || items.length === 0) return 'none';
  return items.join('; ');
}

/**
 * Build a concise summary of an evidence pack suitable for CLI output and machine envelopes.
 *
 * @param {Object} manifest - Evidence pack manifest; must include `artifactReadOrder` and may include `primaryHumanArtifact`, `primaryAgentArtifact` and `warnings`.
 * @param {Object} [options] - Optional inputs to augment the summary.
 * @param {Object|null} [options.analysis=null] - Analysis result object; `analysis.components` is used to compute `componentCount`.
 * @param {string} [options.outcome] - Overall pack outcome; defaults to a value derived from `manifest`.
 * @param {string|null} [options.manifestPath] - Filesystem path to the written manifest artifact, if any.
 * @param {Object|null} [options.prImpact=null] - PR impact data produced by workflow analysis; used to populate `pr` fields when present.
 * @param {string|null} [options.prImpactPath=null] - Filesystem path to the written PR impact artifact, if any.
 * @param {Object|null} [options.prSummary=null] - Machine PR summary used to keep failed PR scans visible in text summaries.
 * @returns {Object} An object containing:
 *  - `manifestPath`: path to the primary manifest entry,
 *  - `primaryHumanArtifact` and `primaryAgentArtifact`: ids from the manifest,
 *  - `packStatus`: overall outcome,
 *  - `componentCount`: number of analysed components (0 if unavailable),
 *  - `warningSummary`: human-readable summary of manifest warnings,
 *  - `pr`: `null` or an object with `riskLevel`, `changedComponents`, `riskReasons`, `reviewerChecks`, and `prImpactPath`,
 *  - `nextAction`: a short instruction pointing to the manifest for artefact status.
 */
function createScanSummary(manifest, {
  analysis = null,
  outcome = outcomeForManifest(manifest),
  manifestPath = manifestArtifactPath(manifest, 'manifest', { requireWritten: true }),
  prImpact = null,
  prImpactPath = null,
  prSummary = null,
} = {}) {
  const componentCount = Array.isArray(analysis?.components) ? analysis.components.length : 0;
  const warnings = Array.isArray(manifest.warnings) ? manifest.warnings : [];
  const prAgentSummary = prImpact?.agentSummary || {};
  return {
    manifestPath,
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
    } : prSummary ? {
      riskLevel: prSummary.risk?.level || 'unknown',
      changedComponents: 0,
      riskReasons: [prSummary.errorCategory || 'pr_evidence_unavailable'],
      reviewerChecks: [`Resolve PR evidence failure before approving architecture-sensitive changes.`],
      prImpactPath: prSummary.prImpactPath || null,
    } : null,
    nextAction: manifestPath
      ? `Read ${manifestPath} for artifact status before opening optional files.`
      : 'Manifest was not written; inspect the reported errors before consuming evidence artifacts.',
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

function inferWorkflowPrErrorCategory({ payload, result }) {
  const payloadCategory = payload?.errors?.[0]?.category
    || payload?.errors?.[0]?.extensions?.code
    || payload?.data?.prImpact?.errorCategory;
  const output = `${result?.stderr || ''}\n${result?.stdout || ''}`;
  if (/bad revision|unknown revision|ambiguous argument|not a valid object name|invalid ref|unknown ref|git ref not found|needed a single revision|revision or path not in the working tree/i.test(output)) {
    return 'git_refs_missing';
  }
  if (payloadCategory) return payloadCategory;
  if (/permission denied|eacces|enoent|no such file|timed out|timeout|unexpected token|invalid json/i.test(output)) {
    return 'internal_error';
  }
  return 'internal_error';
}

/**
 * Invoke the local diagram workflow to generate PR-impact evidence for a repository and return the parsed PR impact data.
 *
 * @param {Object} params
 * @param {string} params.root - Filesystem path to the repository root to analyse.
 * @param {string} params.outDir - Directory where PR-impact output will be written (`<outDir>/pr-impact`).
 * @param {Object} params.options - Options forwarded to the workflow; recognised properties:
 *   - {string} [head] - HEAD ref (defaults to `HEAD`).
 *   - {string} [base] - Base ref for comparison.
 *   - {string} [patterns] - File match patterns to include.
 *   - {string} [exclude] - File match patterns to exclude.
 *   - {number|string} [maxFiles] - Maximum files to consider.
 *   - {boolean} [deterministic] - Whether to run the workflow in deterministic mode.
 * @returns {Object} The PR impact data object parsed from the workflow's JSON output.
 * @throws {Error} If the workflow process fails or does not produce a `prImpact` payload; the thrown error carries the workflow category when available.
 */
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
    error.category = inferWorkflowPrErrorCategory({ payload, result });
    throw error;
  }

  return payload.data.prImpact;
}

function printScanTextSummary(summary) {
  console.log(`  Pack status: ${summary.packStatus}`);
  console.log(`  Components detected: ${summary.componentCount}`);
  console.log(`  Manifest: ${summary.manifestPath || 'not written'}`);
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
}

/**
 * Build a machine-oriented summary of pull-request impact analysis for inclusion in the scan envelope.
 *
 * When `prImpact` is provided, returns an object describing the PR analysis status, refs, risk metrics and suggested reviewer checks.
 * When `prImpact` is absent but `options.base` or `options.head` are supplied, returns a failed summary containing the provided refs and an `errorCategory`.
 * Returns `null` if no PR refs were supplied and no `prImpact` is available.
 *
 * @param {object|null} prImpact - The parsed PR impact payload produced by the workflow PR evidence run, or `null`.
 * @param {string|null} prImpactPath - Filesystem path to the PR impact artifact, or `null`.
 * @param {object} options - CLI options; expected to contain `base` and/or `head` when refs were supplied.
 * @param {Array<object>} errors - Collected error objects produced while generating artifacts; used to derive an error category when `prImpact` is missing.
 * @returns {object|null} When available, returns a summary object:
 *  - If `prImpact` present: `{ status, base, head, prImpactPath, risk, blastRadius, reviewerChecks }`.
 *  - If `prImpact` missing but refs provided: `{ status: 'failed', base, head, errorCategory }`.
 *  - Otherwise `null`.
 */
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
function addScanOptions(command) {
  return command
    .option('-O, --output-dir <dir>', 'Output directory', '.diagram')
    .option('-p, --patterns <list>', 'File patterns')
    .option('-e, --exclude <list>', 'Exclude patterns')
    .option('-m, --max-files <n>', 'Max files to analyze')
    .option('--analyzer <name>', 'Analyzer plugin to use', 'default')
    .option('--base <ref>', 'Base git ref for PR evidence')
    .option('--head <ref>', 'Head git ref for PR evidence')
    .option('-f, --format <type>', 'Output format (text, json)', 'text')
    .option('--deterministic', 'Use deterministic machine output', false)
    .option('-q, --quiet', 'Suppress non-essential logging', false);
}

async function runScanCommand(program, targetPath, rawOptions, metadata = {}) {
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
  const writtenManifestPath = manifestArtifactPath(manifest, 'manifest', { requireWritten: true });
  const prImpactPath = prImpact
    ? manifestArtifactPath(manifest, 'pr-impact', { requireWritten: true })
    : null;
  const prSummary = buildPrMachineSummary({
    prImpact,
    prImpactPath,
    options,
    errors,
  });
  const summary = createScanSummary(manifest, {
    analysis,
    outcome,
    manifestPath: writtenManifestPath,
    prImpact,
    prImpactPath,
    prSummary,
  });

  if (formatStr === 'json') {
    const commandName = metadata.commandName || 'scan';
    const delegatedCommand = metadata.delegatedCommand || null;
    const scanEquivalent = metadata.scanEquivalent || null;
    const payload = buildMachineEnvelope({
      schemaVersion: '1.0',
      command: commandName,
      rootPath: root,
      deterministic: Boolean(options.deterministic),
      status: outcome,
      data: {
        ...(delegatedCommand ? { delegatedCommand } : {}),
        ...(scanEquivalent ? { scanEquivalent } : {}),
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
          summary.manifestPath
            ? `Read \`${summary.manifestPath}\` before consuming evidence artifacts.`
            : 'Inspect scan errors before consuming evidence artifacts.',
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
    console.log(chalk.cyan('\nArchitecture evidence pack summary'));
    printScanTextSummary(summary);
    process.exit(1);
  }
  console.log(chalk.green('\nArchitecture evidence pack initialized'));
  printScanTextSummary(summary);
}

function registerScanCommand(program) {
  addScanOptions(program
    .command('scan [path]')
    .description('Generate architecture evidence pack'))
    .action(async (targetPath, rawOptions) => {
      await runScanCommand(program, targetPath, rawOptions, { commandName: 'scan' });
    });
}

module.exports = {
  addScanOptions,
  createScanSummary,
  outcomeForManifest,
  registerScanCommand,
  runScanCommand,
};
