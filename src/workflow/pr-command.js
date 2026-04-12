const chalk = require('chalk');
const {
  computeDelta,
  computeBlastRadiusFromDelta,
  computeRiskFromDelta,
  writePrImpactArtifacts,
} = require('./pr-impact');
const {
  validateGitRef,
  isShallowClone,
  detectPrRefsFromEnv,
  runGitCommand,
  getChangedFiles,
  analyzeAtRef,
} = require('./git-helpers');
const {
  probeCapabilities,
  buildConfidenceReport,
  writeConfidenceReport,
  shouldFailStrictConfidence,
} = require('../confidence/pipeline');

const VALID_OUTPUT_FORMATS = Object.freeze(['text', 'json']);
const VALID_RISK_THRESHOLDS = Object.freeze(['none', 'low', 'medium', 'high']);
const RISK_LEVEL_SCORE = Object.freeze({ low: 1, medium: 2, high: 3 });

function compareStringsDeterministically(leftValue, rightValue) {
  const left = String(leftValue || '');
  const right = String(rightValue || '');
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortStringsDeterministically(values) {
  return [...(values || [])].sort(compareStringsDeterministically);
}

function hasNoChangedFiles(changedFiles) {
  return (
    (changedFiles?.changed?.length || 0) === 0 &&
    (changedFiles?.renamed?.length || 0) === 0 &&
    (changedFiles?.added?.length || 0) === 0 &&
    (changedFiles?.deleted?.length || 0) === 0
  );
}

function normalizeListOption(value, splitList) {
  return Array.isArray(value) ? value : splitList(String(value || ''));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function createVerboseLogger(enabled) {
  return (...args) => {
    if (enabled) console.log(...args);
  };
}

function sortPrImpactResultDeterministically(result) {
  result.changedFiles = sortStringsDeterministically(result.changedFiles);
  result.renamedFiles = [...(result.renamedFiles || [])].sort((a, b) => {
    const fromCmp = compareStringsDeterministically(a?.from, b?.from);
    if (fromCmp !== 0) return fromCmp;
    return compareStringsDeterministically(a?.to, b?.to);
  });
  result.deletedFiles = sortStringsDeterministically(result.deletedFiles);
  result.addedFiles = sortStringsDeterministically(result.addedFiles);
  result.unmodeledChanges = sortStringsDeterministically(result.unmodeledChanges);
  result.changedComponents = [...(result.changedComponents || [])]
    .map((component) => ({
      ...component,
      dependenciesAdded: sortStringsDeterministically(component.dependenciesAdded),
      dependenciesRemoved: sortStringsDeterministically(component.dependenciesRemoved),
      roleTagsAdded: sortStringsDeterministically(component.roleTagsAdded),
      roleTagsRemoved: sortStringsDeterministically(component.roleTagsRemoved),
      roleTags: sortStringsDeterministically(component.roleTags),
    }))
    .sort((a, b) => compareStringsDeterministically(a?.filePath, b?.filePath));
  result.dependencyEdgeDelta.added = sortStringsDeterministically(result.dependencyEdgeDelta.added);
  result.dependencyEdgeDelta.removed = sortStringsDeterministically(result.dependencyEdgeDelta.removed);
  result.blastRadius.impactedComponents = sortStringsDeterministically(result.blastRadius.impactedComponents);
  result.risk.flags = sortStringsDeterministically(result.risk.flags);
  result.agentSummary.riskReasons = sortStringsDeterministically(result.agentSummary.riskReasons);
  result._meta.durationMs = 0;
}

/**
 * Register the `workflow pr` CLI command group and its action handler for computing
 * PR architecture impact (base → head), producing analysis artifacts and exit codes.
 *
 * The command analyses changed files between two git refs, computes component deltas,
 * blast radius and risk, optionally emits a confidence report, writes artifacts to disk,
 * and exits with a risk-gated exit code suitable for CI usage.
 *
 * @param {import('commander').Command} program - The root Commander program to attach commands to.
 * @param {Object} deps - Dependency injection for filesystem, git and config helpers.
 * @param {Function} deps.resolveRootPathOrExit - Resolve the repository root path or terminate the process on error.
 * @param {Function} deps.validateOutputPath - Validate and normalise an output directory path relative to the repo root.
 * @param {Function} [deps.applyDiagramRcDefaults] - Optional function to merge CLI options with .diagramrc defaults.
 * @param {Function} [deps.getDiagramRc] - Optional function to read .diagramrc configuration; returns an object.
 * @param {Function} [deps.splitList] - Optional function to split comma-separated CLI lists into arrays.
 * @returns {import('commander').Command} The registered `workflow` command (parent of `pr`).
 */
function registerWorkflowCommands(program, deps) {
  const {
    resolveRootPathOrExit,
    validateOutputPath,
    applyDiagramRcDefaults = (options) => options,
    getDiagramRc = () => ({}),
    splitList = (value) => String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  } = deps;

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
    .option('--confidence-report', 'Write confidence report artifact', false)
    .option('--strict-confidence', 'Fail with exit code 1 when confidence checks degrade', false)
    .option('--capability-check-only', 'Run only capability checks and confidence evaluation', false)
    .option('-f, --format <type>', 'Output format (text, json)', 'text')
    .option('-m, --max-files <n>', 'Max files to analyze at each ref (CLI > .diagramrc > built-in)')
    .option('-p, --patterns <list>', 'File patterns (comma-separated)')
    .option('-e, --exclude <list>', 'Exclude patterns (comma-separated)')
    .option('--deterministic', 'Use deterministic machine output', false)
    .option('--verbose', 'Show detailed output', false)
    .action(async (targetPath, rawOptions) => {
      const diagramRc = getDiagramRc() || {};
      const options = applyDiagramRcDefaults(
        rawOptions,
        diagramRc,
        ['patterns', 'exclude', 'maxFiles'],
        { maxFiles: '10000' }
      );
      const formatStr = (options.format || 'text').toLowerCase();
      const isJson = formatStr === 'json';
      const verboseOutput = !isJson && Boolean(options.verbose);
      const logVerbose = createVerboseLogger(verboseOutput);
      if (!VALID_OUTPUT_FORMATS.includes(formatStr)) {
        console.error(chalk.red('❌ Invalid format:'), options.format);
        console.log(chalk.gray('Valid values:', VALID_OUTPUT_FORMATS.join(', ')));
        process.exit(2);
      }
      const root = resolveRootPathOrExit(targetPath);
      const startTime = Date.now();
      const confidenceEnabled = Boolean(
        options.confidenceReport || options.strictConfidence || options.capabilityCheckOnly
      );
      let capabilities = null;

      if (confidenceEnabled) {
        capabilities = probeCapabilities('workflow-pr', {});
      }

      if (options.capabilityCheckOnly) {
        const quickReport = buildConfidenceReport({
          command: 'workflow-pr',
          rootPath: root,
          capabilities,
          validation: { enabled: false, valid: true, errors: [] },
          fallback: { used: false, reasons: [] },
          notes: ['capability_check_only'],
        });
        if (options.confidenceReport || options.strictConfidence) {
          const confidencePath = writeConfidenceReport(root, quickReport);
          console.log(chalk.gray('Confidence report:'), confidencePath);
        }
        if (options.strictConfidence && shouldFailStrictConfidence(quickReport)) {
          console.error(chalk.red('❌ Strict confidence check failed'));
          process.exit(1);
        }
        console.log(chalk.green('✅ Capability check complete'));
        process.exit(0);
      }

      // Validate and resolve refs
      let baseRef = options.base;
      let headRef = options.head || 'HEAD';

      // Auto-detect PR refs if not provided
      if (!baseRef) {
        const envRefs = detectPrRefsFromEnv();
        if (envRefs.base) {
          baseRef = envRefs.base;
          logVerbose(chalk.gray('Auto-detected base ref from environment:', baseRef));
        } else {
          // Prefer remote-tracking default branch refs for CI clones.
          try {
            const remoteCandidates = ['origin/main', 'origin/master'];
            for (const candidate of remoteCandidates) {
              try {
                validateGitRef(candidate, root);
                baseRef = candidate;
                break;
              } catch (_candidateError) {
                // Try next candidate.
              }
            }
            if (!baseRef) {
              const originHead = runGitCommand(['rev-parse', '--abbrev-ref', 'origin/HEAD'], root).trim();
              if (originHead && originHead !== 'origin/HEAD') {
                validateGitRef(originHead, root);
                baseRef = originHead;
              }
            }
            if (!baseRef) {
              throw new Error('No remote base branch available');
            }
            logVerbose(chalk.gray(`Using default base ref: ${baseRef}`));
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

      if (verboseOutput) {
        console.log(chalk.blue('📊 PR Impact Analysis'));
        console.log(chalk.gray('  Base:'), baseRef, '→', baseSha);
        console.log(chalk.gray('  Head:'), headRef, '→', headSha);
      }

      // Validate risk threshold
      const threshold = (options.riskThreshold || 'none').toLowerCase();
      if (!VALID_RISK_THRESHOLDS.includes(threshold)) {
        console.error(chalk.red('❌ Invalid risk threshold:'), options.riskThreshold);
        console.log(chalk.gray('Valid values:', VALID_RISK_THRESHOLDS.join(', ')));
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
      logVerbose(chalk.blue('\n📋 Step 1: Extracting changed files...'));

      let changedFiles;
      try {
        changedFiles = getChangedFiles(baseSha, headSha, root);
      } catch (error) {
        console.error(chalk.red('❌ Git diff error:'), error.message);
        process.exit(2);
      }

      logVerbose(chalk.gray('   Changed:'), changedFiles.changed.length);
      logVerbose(chalk.gray('   Renamed:'), changedFiles.renamed.length);
      logVerbose(chalk.gray('   Added:'), changedFiles.added.length);
      logVerbose(chalk.gray('   Deleted:'), changedFiles.deleted.length);

      // Handle empty diff case
      if (hasNoChangedFiles(changedFiles)) {
        const emptyResult = {
          schemaVersion: '1.0',
          generatedAt: options.deterministic ? '1970-01-01T00:00:00.000Z' : new Date().toISOString(),
          base: baseSha,
          head: headSha,
          changedFiles: [],
          renamedFiles: [],
          addedFiles: [],
          deletedFiles: [],
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
            level: 'none',
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
            durationMs: options.deterministic ? 0 : Date.now() - startTime
          },
          agentSummary: {
            changedComponents: 0,
            riskReasons: [],
            suggestedReviewerChecks: [
              'No architecture-impacting files detected.',
              'Skip PR risk override unless code changes are introduced.',
            ],
          },
        };

        if (isJson) {
          console.log(JSON.stringify(emptyResult, null, 2));
        } else {
          console.log(chalk.green('\n✅ No architecture changes detected'));
          console.log(chalk.cyan('\nNext steps:'));
          console.log('  1) Skip architecture-risk override for this PR.');
          console.log('  2) Re-run `diagram workflow pr` after new code changes.');
        }
        process.exit(0);
      }

      // Phase 2: Analyze snapshots at base and head refs
      logVerbose(chalk.blue('\n📊 Step 2: Analyzing codebase snapshots...'));

      let baseAnalysis, headAnalysis;
      try {
        const maxFilesAtRef = parseInt(options.maxFiles, 10) || 10000;
        const patterns = normalizeListOption(options.patterns, splitList);
        const exclude = normalizeListOption(options.exclude, splitList);
        const analysisOptions = {
          maxFiles: maxFilesAtRef,
          patterns,
          exclude,
          deterministic: Boolean(options.deterministic),
        };

        baseAnalysis = await analyzeAtRef(baseSha, root, analysisOptions);
        logVerbose(chalk.gray('   Base components:'), baseAnalysis.components.length);

        headAnalysis = await analyzeAtRef(headSha, root, analysisOptions);
        logVerbose(chalk.gray('   Head components:'), headAnalysis.components.length);
      } catch (error) {
        console.error(chalk.red('❌ Analysis error:'), error.message);
        process.exit(2);
      }

      // Compute delta between snapshots
      logVerbose(chalk.blue('\n🔄 Step 3: Computing delta...'));

      const delta = computeDelta(baseAnalysis, headAnalysis, changedFiles);

      logVerbose(chalk.gray('   Changed components:'), delta.changedComponents.length);
      logVerbose(chalk.gray('   Unmodeled changes:'), delta.unmodeledChanges.length);
      logVerbose(chalk.gray('   Edge delta:'), delta.dependencyEdgeDelta.count);

      // Compute blast radius (Phase 3 - basic implementation)
      logVerbose(chalk.blue('\n💥 Step 4: Computing blast radius...'));

      const blastRadius = computeBlastRadiusFromDelta(delta, headAnalysis, maxDepth, maxNodes);

      logVerbose(chalk.gray('   Impacted components:'), blastRadius.impactedComponents.length);
      logVerbose(chalk.gray('   Truncated:'), blastRadius.truncated);

      // Compute risk score (Phase 4 - basic implementation)
      logVerbose(chalk.blue('\n⚠️  Step 5: Computing risk score...'));

      const risk = computeRiskFromDelta(delta, blastRadius);

      logVerbose(chalk.gray('   Risk score:'), risk.score);
      logVerbose(chalk.gray('   Risk level:'), risk.level);
      logVerbose(chalk.gray('   Risk flags:'), risk.flags.join(', ') || 'none');

      // Build final result
      const result = {
        schemaVersion: '1.0',
        generatedAt: options.deterministic ? '1970-01-01T00:00:00.000Z' : new Date().toISOString(),
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
        },
        agentSummary: {
          changedComponents: delta.changedComponents.length,
          riskReasons: risk.flags,
          suggestedReviewerChecks: [
            'Validate touched auth/security/database paths with domain owners.',
            'Review blast-radius components for transitive side effects.',
            'Use risk override only with an explicit mitigation plan.',
          ],
        },
      };

      if (options.deterministic) sortPrImpactResultDeterministically(result);

      // Exit code logic
      // 0 = success, below threshold
      // 1 = risk threshold exceeded (no override)
      // 2 = config/git error (already handled above)

      // Check risk threshold gate BEFORE writing artifacts
      // so the JSON reflects the override state correctly
      let exitCode = 0;
      if (options.failOnRisk && threshold !== 'none') {
        const thresholdNum = RISK_LEVEL_SCORE[threshold];
        const riskNum = RISK_LEVEL_SCORE[result.risk.level];

        if (typeof riskNum !== 'number') {
          console.error(chalk.red('\n❌ Unknown computed risk level:'), result.risk.level);
          process.exit(2);
        }

        if (riskNum >= thresholdNum) {
          // Check for override
          if (isNonEmptyString(options.riskOverrideReason)) {
            result.risk.override.applied = true;
            console.log(chalk.yellow('\n⚠️  Risk threshold exceeded, but override applied'));
            console.log(chalk.gray('   Reason:'), options.riskOverrideReason);
            exitCode = 0;
          } else {
            console.error(chalk.red('\n❌ Risk threshold exceeded'));
            console.error(chalk.gray('   Threshold:'), threshold);
            console.error(chalk.gray('   Actual:'), result.risk.level);
            console.error(chalk.gray('   Score:'), result.risk.score);
            if (!isJson) {
              console.log(chalk.gray('\n   Use --risk-override-reason to bypass'));
            }
            exitCode = 1;
          }
        }
      }

      if (confidenceEnabled) {
        const report = buildConfidenceReport({
          command: 'workflow-pr',
          rootPath: root,
          capabilities,
          validation: { enabled: false, valid: true, errors: [] },
          fallback: { used: false, reasons: [] },
          notes: [`risk:${result.risk.level}`, `changed_components:${result.changedComponents.length}`],
        });

        if (options.confidenceReport || options.strictConfidence) {
          const confidencePath = writeConfidenceReport(root, report);
          if (!isJson) {
            console.log(chalk.gray('   Confidence:'), confidencePath);
          }
        }

        if (options.strictConfidence && shouldFailStrictConfidence(report)) {
          exitCode = 1;
          if (!isJson) {
            console.error(chalk.red('\n❌ Strict confidence check failed'));
          }
        }
      }

      // Write artifacts to disk (after risk check so override.applied is correct)
      let artifactPaths;
      try {
        artifactPaths = writePrImpactArtifacts(outputDir, result, /* skipHtml */ isJson);
        if (!isJson && exitCode === 0) {
          console.log(chalk.gray('   Output:'), artifactPaths.jsonPath);
          if (artifactPaths.htmlPath) {
            console.log(chalk.gray('   HTML:'), artifactPaths.htmlPath);
          }
        }
      } catch (err) {
        console.error(chalk.red('❌ Failed to write artifacts:'), err.message);
        process.exit(2);
      }

      if (isJson) {
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
        console.log(chalk.cyan('\nNext steps:'));
        console.log('  1) Review `pr-impact.html` with architecture owners for high/medium risk PRs.');
        console.log('  2) Use `--risk-override-reason` only when mitigations are documented in the PR.');
      }

      process.exit(exitCode);
    });

  return workflowCommand;
}

module.exports = {
  registerWorkflowCommands,
  normalizeListOption,
  compareStringsDeterministically,
  sortPrImpactResultDeterministically,
};
