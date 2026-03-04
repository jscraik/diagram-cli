const fs = require('fs');
const path = require('path');
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
  getChangedFiles,
  analyzeAtRef,
} = require('./git-helpers');

/**
 * Register workflow command group and PR impact command.
 * @param {import('commander').Command} program
 * @param {{resolveRootPathOrExit: Function, validateOutputPath: Function}} deps
 */
function registerWorkflowCommands(program, deps) {
  const { resolveRootPathOrExit, validateOutputPath } = deps;

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
    .option('-j, --json', 'Output as JSON only (skip HTML generation)', false)
    .option('--verbose', 'Show detailed output', false)
    .action(async (targetPath, options) => {
      const root = resolveRootPathOrExit(targetPath);
      const startTime = Date.now();

      // Validate and resolve refs
      let baseRef = options.base;
      let headRef = options.head || 'HEAD';

      // Auto-detect PR refs if not provided
      if (!baseRef) {
        const envRefs = detectPrRefsFromEnv();
        if (envRefs.base) {
          baseRef = envRefs.base;
          if (options.verbose) {
            console.log(chalk.gray('Auto-detected base ref from environment:', baseRef));
          }
        } else {
          // Try to use merge-base with origin/main or main
          try {
            const defaultBranch = fs.existsSync(path.join(root, '.git', 'refs', 'heads', 'main'))
              ? 'main'
              : 'master';
            baseRef = `origin/${defaultBranch}`;
            if (options.verbose) {
              console.log(chalk.gray(`Using default base ref: ${baseRef}`));
            }
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

      if (options.verbose) {
        console.log(chalk.blue('📊 PR Impact Analysis'));
        console.log(chalk.gray('  Base:'), baseRef, '→', baseSha);
        console.log(chalk.gray('  Head:'), headRef, '→', headSha);
      }

      // Validate risk threshold
      const validThresholds = ['none', 'low', 'medium', 'high'];
      const threshold = (options.riskThreshold || 'none').toLowerCase();
      if (!validThresholds.includes(threshold)) {
        console.error(chalk.red('❌ Invalid risk threshold:'), options.riskThreshold);
        console.log(chalk.gray('Valid values:', validThresholds.join(', ')));
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
      if (!options.json && options.verbose) {
        console.log(chalk.blue('\n📋 Step 1: Extracting changed files...'));
      }

      let changedFiles;
      try {
        changedFiles = getChangedFiles(baseSha, headSha, root);
      } catch (error) {
        console.error(chalk.red('❌ Git diff error:'), error.message);
        process.exit(2);
      }

      if (!options.json && options.verbose) {
        console.log(chalk.gray('   Changed:'), changedFiles.changed.length);
        console.log(chalk.gray('   Renamed:'), changedFiles.renamed.length);
        console.log(chalk.gray('   Added:'), changedFiles.added.length);
        console.log(chalk.gray('   Deleted:'), changedFiles.deleted.length);
      }

      // Handle empty diff case
      if (changedFiles.changed.length === 0 &&
          changedFiles.renamed.length === 0 &&
          changedFiles.added.length === 0 &&
          changedFiles.deleted.length === 0) {
        const emptyResult = {
          schemaVersion: '1.0',
          generatedAt: new Date().toISOString(),
          base: baseSha,
          head: headSha,
          changedFiles: [],
          renamedFiles: [],
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
            level: 'low',
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
            durationMs: Date.now() - startTime
          }
        };

        if (options.json) {
          console.log(JSON.stringify(emptyResult, null, 2));
        } else {
          console.log(chalk.green('\n✅ No architecture changes detected'));
        }
        process.exit(0);
      }

      // Phase 2: Analyze snapshots at base and head refs
      if (!options.json && options.verbose) {
        console.log(chalk.blue('\n📊 Step 2: Analyzing codebase snapshots...'));
      }

      let baseAnalysis, headAnalysis;
      try {
        const analysisOptions = {
          maxFiles: 10000, // Use high limit for accurate delta
          patterns: options.patterns,
          exclude: options.exclude
        };

        baseAnalysis = await analyzeAtRef(baseSha, root, analysisOptions);
        if (!options.json && options.verbose) {
          console.log(chalk.gray('   Base components:'), baseAnalysis.components.length);
        }

        headAnalysis = await analyzeAtRef(headSha, root, analysisOptions);
        if (!options.json && options.verbose) {
          console.log(chalk.gray('   Head components:'), headAnalysis.components.length);
        }
      } catch (error) {
        console.error(chalk.red('❌ Analysis error:'), error.message);
        process.exit(2);
      }

      // Compute delta between snapshots
      if (!options.json && options.verbose) {
        console.log(chalk.blue('\n🔄 Step 3: Computing delta...'));
      }

      const delta = computeDelta(baseAnalysis, headAnalysis, changedFiles);

      if (!options.json && options.verbose) {
        console.log(chalk.gray('   Changed components:'), delta.changedComponents.length);
        console.log(chalk.gray('   Unmodeled changes:'), delta.unmodeledChanges.length);
        console.log(chalk.gray('   Edge delta:'), delta.dependencyEdgeDelta.count);
      }

      // Compute blast radius (Phase 3 - basic implementation)
      if (!options.json && options.verbose) {
        console.log(chalk.blue('\n💥 Step 4: Computing blast radius...'));
      }

      const blastRadius = computeBlastRadiusFromDelta(delta, headAnalysis, maxDepth, maxNodes);

      if (!options.json && options.verbose) {
        console.log(chalk.gray('   Impacted components:'), blastRadius.impactedComponents.length);
        console.log(chalk.gray('   Truncated:'), blastRadius.truncated);
      }

      // Compute risk score (Phase 4 - basic implementation)
      if (!options.json && options.verbose) {
        console.log(chalk.blue('\n⚠️  Step 5: Computing risk score...'));
      }

      const risk = computeRiskFromDelta(delta, blastRadius);

      if (!options.json && options.verbose) {
        console.log(chalk.gray('   Risk score:'), risk.score);
        console.log(chalk.gray('   Risk level:'), risk.level);
        console.log(chalk.gray('   Risk flags:'), risk.flags.join(', ') || 'none');
      }

      // Build final result
      const result = {
        schemaVersion: '1.0',
        generatedAt: new Date().toISOString(),
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
        }
      };

      // Output result
      if (options.json) {
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
      }

      // Exit code logic
      // 0 = success, below threshold
      // 1 = risk threshold exceeded (no override)
      // 2 = config/git error (already handled above)

      // Check risk threshold gate BEFORE writing artifacts
      // so the JSON reflects the override state correctly
      let exitCode = 0;
      if (options.failOnRisk && threshold !== 'none') {
        const thresholdLevels = { low: 1, medium: 2, high: 3 };
        const riskLevels = { low: 1, medium: 2, high: 3 };

        const thresholdNum = thresholdLevels[threshold] || 0;
        const riskNum = riskLevels[result.risk.level] || 0;

        if (riskNum >= thresholdNum) {
          // Check for override
          if (options.riskOverrideReason && options.riskOverrideReason.trim() !== '') {
            result.risk.override.applied = true;
            console.log(chalk.yellow('\n⚠️  Risk threshold exceeded, but override applied'));
            console.log(chalk.gray('   Reason:'), options.riskOverrideReason);
            exitCode = 0;
          } else {
            console.error(chalk.red('\n❌ Risk threshold exceeded'));
            console.error(chalk.gray('   Threshold:'), threshold);
            console.error(chalk.gray('   Actual:'), result.risk.level);
            console.error(chalk.gray('   Score:'), result.risk.score);
            if (!options.json) {
              console.log(chalk.gray('\n   Use --risk-override-reason to bypass'));
            }
            exitCode = 1;
          }
        }
      }

      // Write artifacts to disk (after risk check so override.applied is correct)
      let artifactPaths;
      try {
        artifactPaths = writePrImpactArtifacts(outputDir, result, options.json);
        if (!options.json && exitCode === 0) {
          console.log(chalk.gray('   Output:'), artifactPaths.jsonPath);
          if (artifactPaths.htmlPath) {
            console.log(chalk.gray('   HTML:'), artifactPaths.htmlPath);
          }
        }
      } catch (err) {
        console.error(chalk.red('❌ Failed to write artifacts:'), err.message);
        process.exit(2);
      }

      process.exit(exitCode);
    });

  return workflowCommand;
}

module.exports = { registerWorkflowCommands };
