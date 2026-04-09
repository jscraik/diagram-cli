const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const YAML = require('yaml');
const { analyze } = require('../core/analysis-generation');
const { RulesEngine } = require('../rules');
const { ComponentGraph } = require('../graph');
const { RuleFactory } = require('../rules/factory');
const { formatResults } = require('../formatters/index');
const { validateConfig, getDefaultConfig } = require('../schema/rules-schema');
const {
  applyDiagramRcDefaults,
  resolveRootPathOrExit,
  validateOutputPath,
} = require('./shared');

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
      const options = applyDiagramRcDefaults(rawOptions, program._diagramRc, ['patterns', 'exclude', 'maxFiles']);
      const root = resolveRootPathOrExit(targetPath);
      const engine = new RulesEngine();
      const startTime = Date.now();
      const outputsMachineFormat = !options.output && (options.format === 'json' || options.format === 'junit');
      const quietMachineOutput = options.quiet || (outputsMachineFormat && !options.verbose);

      if (options.init) {
        const configPath = path.join(root, '.architecture.yml');
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

      let configPath = options.config;
      if (!path.isAbsolute(configPath)) {
        configPath = path.join(root, configPath);
      }

      const relativeConfigPath = path.relative(root, configPath);
      if (relativeConfigPath.startsWith('..') || path.isAbsolute(relativeConfigPath)) {
        console.error(chalk.red('❌ Invalid config path: directory traversal detected'));
        process.exit(2);
      }

      if (!fs.existsSync(configPath)) {
        const found = engine.findConfig(root);
        if (!found) {
          console.error(chalk.red('❌ No .architecture.yml found.'));
          console.error(chalk.gray('Fix: run `diagram init .` or `diagram validate --init` to scaffold rules.'));
          process.exit(2);
        }
        configPath = found;
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

      const exitCode = formatResults(results, options.format, {
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
