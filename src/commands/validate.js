const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const YAML = require('yaml');
const { analyze } = require('../core/analysis-generation');
const { RulesEngine } = require('../rules');
const { ComponentGraph } = require('../graph');
const { RuleFactory } = require('../rules/factory');
const { formatResults } = require('../formatters/index');
const { buildJSONOutput } = require('../formatters/json');
const { validateConfig, getDefaultConfig } = require('../schema/rules-schema');
const {
  applyDiagramRcDefaults,
  getDiagramRcFromProgram,
  resolveRootPathOrExit,
  validateOutputPath,
} = require('./shared');
const { buildMachineEnvelope } = require('./output');

/**
 * Apply configured baselines to validation results and optionally persist updated baselines to the config file.
 *
 * Updates each result rule with baseline-related fields (`baseline`, `baselineWarning`, `baselineExceeded`, `status`)
 * based on the matching rule in `config`. When `saveBaseline` is enabled, updates `config.rules[*].baseline` to the
 * observed violation counts and writes the YAML back to `configPath` provided that `configPath` is inside `root`.
 *
 * @param {Object} results - Validation results object containing a `rules` array of rule result objects.
 * @param {Object} config - Loaded configuration object containing a `rules` array of configured rules.
 * @param {boolean} saveBaseline - If `true`, update and persist observed baseline values into the config file.
 * @param {string} configPath - Absolute path to the configuration file to write when saving baselines.
 * @param {string} root - Project root directory; `configPath` must reside inside this directory to be written.
 * @param {boolean} [quiet=false] - If `true`, suppress console informational and error messages.
 * @returns {{ updated: boolean, counts: Object }} `updated` is `true` if the config file was modified and written, `false` otherwise; `counts` maps rule names to observed violation counts.
 */
function applyBaseline(results, config, saveBaseline, configPath, root, quiet = false) {
  const baselineCounts = {};
  let configModified = false;

  for (const rule of results.rules || []) {
    const configRule = config.rules?.find((candidate) => candidate.name === rule.name);
    const violationCount = rule.violations?.length || 0;
    const baseline = configRule?.baseline;
    baselineCounts[rule.name] = violationCount;

    if (baseline !== undefined) {
      rule.baseline = baseline;
      if (violationCount <= baseline) {
        rule.status = 'passed';
        if (violationCount > 0) {
          rule.baselineWarning = `Baseline allows ${baseline} violation(s), found ${violationCount}`;
        }
      } else {
        rule.baselineExceeded = violationCount - baseline;
        rule.status = 'failed';
      }
    }
  }

  if (saveBaseline) {
    for (const rule of config.rules || []) {
      const count = baselineCounts[rule.name] ?? 0;
      if (rule.baseline !== count) {
        rule.baseline = count;
        configModified = true;
      }
    }

    if (configModified) {
      const relativePath = path.relative(root, configPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        if (!quiet) console.error(chalk.red('❌ Cannot save baseline: config path outside project'));
        return { updated: false, counts: baselineCounts };
      }
      const yaml = YAML.stringify(config, { indent: 2, lineWidth: 0 });
      fs.writeFileSync(configPath, yaml);
      if (!quiet) {
        console.log(chalk.green('✅ Baseline saved:'), configPath);
        console.log(chalk.gray('   Run `diagram validate` to verify'));
      }
    } else if (!quiet) {
      console.log(chalk.gray('ℹ️  Baseline already up to date'));
    }
  }

  return { updated: configModified, counts: baselineCounts };
}

/**
 * Resolve a configuration file path inside the given project root, exiting the process if the resolved path lies outside the root.
 *
 * Resolves `configPathInput` (or `.architecture.yml` when omitted) to an absolute path relative to `root`. If the resolved path would traverse outside `root` or otherwise be invalid, an error is printed and the process exits with code `2`.
 * @param {string} root - Project root directory used as the base for relative resolution.
 * @param {string|undefined} configPathInput - Optional user-supplied config path; may be absolute or relative to `root`.
 * @returns {string} The resolved absolute path to the configuration file.
 */
function resolveConfigPathOrExit(root, configPathInput) {
  const absoluteRoot = path.resolve(root);
  let realRoot;
  try {
    realRoot = fs.realpathSync(absoluteRoot);
  } catch (_error) {
    console.error(chalk.red('❌ Invalid project path:'), absoluteRoot);
    process.exit(2);
  }
  const requestedPath = configPathInput || '.architecture.yml';
  const resolvedPath = path.isAbsolute(requestedPath)
    ? path.resolve(requestedPath)
    : path.resolve(absoluteRoot, requestedPath);

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

  const canonicalConfigPath = resolveViaExistingAncestor(resolvedPath);
  const relativeConfigPath = path.relative(realRoot, canonicalConfigPath);
  if (relativeConfigPath.startsWith('..') || path.isAbsolute(relativeConfigPath)) {
    console.error(chalk.red('❌ Invalid config path: directory traversal detected'));
    process.exit(2);
  }
  return canonicalConfigPath;
}

/**
 * Attach the `validate [path]` command to the given Commander program, enabling architecture validation driven by `.architecture.yml`.
 *
 * The command supports config discovery/initialisation, analysis, dry-run previews, baseline management, formatted output, and exit codes for CI integration.
 * @param {import('commander').Command} program - Commander program instance to augment with the `validate` command.
 */
function registerValidateCommand(program) {
  program
    .command('validate [path]')
    .description('Validate architecture against .architecture.yml rules')
    .option('-q, --quiet', 'Suppress non-essential logging', false)
    .option('-c, --config <file>', 'Config file path', '.architecture.yml')
    .option('-f, --format <format>', 'Output format: console, json, junit', 'console')
    .option('-o, --output <file>', 'Output file (for json/junit formats)')
    .option('-p, --patterns <list>', 'File patterns')
    .option('-e, --exclude <list>', 'Exclude patterns')
    .option('-m, --max-files <n>', 'Max files to analyze')
    .option('--dry-run', 'Preview file matching without validation', false)
    .option('--verbose', 'Show detailed output', false)
    .option('--deterministic', 'Use deterministic output where supported', false)
    .option('--init', 'Generate starter configuration file', false)
    .option('--force', 'Overwrite existing configuration with --init', false)
    .option('--save-baseline', 'Save current violation counts as baseline', false)
    .action(async (targetPath, rawOptions) => {
      const configValueSource = typeof rawOptions?.getOptionValueSource === 'function'
        ? rawOptions.getOptionValueSource('config')
        : null;
      const configProvidedByCli = configValueSource
        ? configValueSource === 'cli'
        : (process.argv.includes('--config') || process.argv.includes('-c'));
      const options = applyDiagramRcDefaults(rawOptions, getDiagramRcFromProgram(program), ['patterns', 'exclude', 'maxFiles']);
      const root = resolveRootPathOrExit(targetPath);
      const engine = new RulesEngine();
      const startTime = Date.now();
      const format = String(options.format || 'console').toLowerCase();
      const outputsMachineFormat = !options.output && (format === 'json' || format === 'junit');
      const quietMachineOutput = options.quiet || (outputsMachineFormat && !options.verbose);

      if (options.init) {
        const configPath = resolveConfigPathOrExit(root, options.config);
        const defaultConfig = getDefaultConfig();
        const yaml = YAML.stringify(defaultConfig, {
          indent: 2,
          lineWidth: 0,
        });

        try {
          fs.writeFileSync(configPath, yaml, { flag: options.force ? 'w' : 'wx' });
        } catch (error) {
          if (error.code === 'EEXIST') {
            console.error(chalk.yellow('⚠️  Configuration already exists:'), configPath);
            console.log(chalk.gray('   Use --force to overwrite'));
            process.exit(2);
          }
          throw error;
        }
        console.log(chalk.green('✅ Created configuration:'), configPath);
        console.log(chalk.gray('\nEdit the file to define your architecture rules, then run:'));
        console.log(chalk.cyan('  diagram validate'));
        process.exit(0);
      }

      let configPath = resolveConfigPathOrExit(root, options.config);

      if (!fs.existsSync(configPath)) {
        if (configProvidedByCli) {
          console.error(chalk.red('❌ Config file not found:'), configPath);
          console.error(chalk.gray('Fix: run `diagram init .` or `diagram validate --init` to scaffold rules.'));
          process.exit(2);
        }
        const found = engine.findConfig(root);
        if (!found) {
          console.error(chalk.red('❌ No .architecture.yml found.'));
          console.error(chalk.gray('Fix: run `diagram init .` or `diagram validate --init` to scaffold rules.'));
          process.exit(2);
        }
        configPath = resolveConfigPathOrExit(root, found);
      }

      let config;
      try {
        config = engine.loadConfig(configPath);
      } catch (error) {
        console.error(chalk.red('❌ Config error:'), error.message);
        process.exit(2);
      }

      const validation = validateConfig(config);
      if (!validation.valid) {
        console.error(chalk.red('❌ Schema validation failed:'));
        for (const error of validation.errors) {
          console.error(chalk.red(`   • ${error.path}: ${error.message}`));
        }
        process.exit(2);
      }

      if (!quietMachineOutput) {
        console.log(chalk.blue('🔍 Analyzing'), root);
      }
      const data = await analyze(root, options);
      const graph = new ComponentGraph(data);

      let rules;
      try {
        rules = RuleFactory.createRules(config);
      } catch (error) {
        console.error(chalk.red('❌ Rule error:'), error.message);
        process.exit(2);
      }

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

      if (!quietMachineOutput) {
        console.log(chalk.blue('🧪 Validating'), rules.length, 'rules...\n');
      }
      const results = engine.validate(rules, graph);
      if (options.deterministic) {
        results.generatedAt = undefined;
      }
      applyBaseline(results, config, options.saveBaseline, configPath, root, quietMachineOutput);

      let safeOutput = options.output;
      if (safeOutput) {
        try {
          safeOutput = validateOutputPath(safeOutput, root);
        } catch (error) {
          console.error(chalk.red('❌ Output path error:'), error.message);
          process.exit(2);
        }
      }

      if (format === 'json' && !safeOutput) {
        const validationOutput = buildJSONOutput(results, options.deterministic ? Date.now() : startTime);
        const exitCode = validationOutput.summary.exitCode;
        const payload = buildMachineEnvelope({
          schemaVersion: '1.0',
          command: 'validate',
          rootPath: root,
          status: exitCode === 0 ? 'success' : 'failed',
          deterministic: Boolean(options.deterministic),
          data: {
            validation: validationOutput,
          },
          errors: exitCode === 0
            ? []
            : [{
              code: 'architecture_validation_failed',
              message: 'Architecture validation failed',
            }],
          agentSummary: {
            changedComponents: 0,
            riskReasons: exitCode === 0 ? [] : ['architecture_validation_failed'],
            suggestedReviewerChecks: exitCode === 0
              ? ['Architecture rules passed for this workspace.']
              : ['Review failed architecture rules before merging.'],
          },
        });
        console.log(JSON.stringify(payload, null, 2));
        process.exit(exitCode);
      }

      const exitCode = formatResults(results, format, {
        output: safeOutput,
        verbose: options.verbose,
      }, startTime);

      if (!quietMachineOutput && exitCode === 0) {
        console.log(chalk.cyan('\nNext steps:'));
        console.log('  1) Run `diagram workflow pr . --base origin/main --head HEAD` before opening a PR.');
        console.log('  2) Add `diagram validate` to CI using `diagram init` sample workflow.');
      }

      process.exit(exitCode);
    });
}

module.exports = {
  applyBaseline,
  registerValidateCommand,
};
