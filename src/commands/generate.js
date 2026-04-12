const fs = require('fs');
const os = require('os');
const path = require('path');
const chalk = require('chalk');
const {
  probeCapabilities,
  buildConfidenceReport,
  writeConfidenceReport,
  shouldFailStrictConfidence,
} = require('../confidence/pipeline');
const { generate } = require('../core/analysis-generation');
const {
  ALLOWED_THEMES,
  applyDiagramRcDefaults,
  createMermaidUrl,
  findClosestMatch,
  formatSuggestion,
  getDiagramRcFromProgram,
  maybeWriteArchitectureIR,
  normalizeThemeOption,
  openPreviewUrl,
  resolveRootPathOrExit,
  runAnalysisPipeline,
  runMermaidCli,
  validateOutputPath,
} = require('./shared');
const { buildMachineEnvelope } = require('./output');

function cleanupTempDirectory(tempDir) {
  if (!tempDir || !fs.existsSync(tempDir)) return;
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_cleanupError) {
    // Ignore cleanup errors.
  }
}

/**
 * Validate Mermaid diagram text for common syntax issues and, when possible, via the Mermaid CLI.
 *
 * Performs line-level basic checks (unbalanced double quotes and empty `[]` node labels),
 * verifies that the first non-comment line declares a recognised diagram type, and — if available —
 * attempts full rendering validation using the Mermaid CLI (`mmdc`).
 *
 * @param {string} mermaid - The Mermaid diagram source to validate.
 * @param {string} [theme='default'] - Theme to inject when invoking the Mermaid CLI for validation.
 * @param {boolean} [allowAutoInstall=false] - If `true`, allow the helper that runs `mmdc` to attempt automatic installation of required CLI packages.
 * @returns {{ valid: boolean, errors: Array<{line:number,message:string}>, meta: { mode: string, fallbackUsed: boolean, fallbackReasons: string[], cliValidation: { attempted: boolean, success: boolean, error: string|null } } }}
 *   An object describing validation outcome:
 *   - `valid`: `true` when no validation errors were found.
 *   - `errors`: list of detected issues with `line` and `message`.
 *   - `meta.mode`: validation mode used (`'basic'` or `'mmdc'`).
 *   - `meta.fallbackUsed`: `true` when CLI validation was attempted and failed, causing a fallback to basic checks.
 *   - `meta.fallbackReasons`: list of fallback reason identifiers.
 *   - `meta.cliValidation`: details about the CLI validation attempt.
 */
function validateMermaidSyntax(mermaid, theme = 'default', allowAutoInstall = false) {
  const result = {
    valid: true,
    errors: [],
    meta: {
      mode: 'basic',
      fallbackUsed: false,
      fallbackReasons: [],
      cliValidation: {
        attempted: false,
        success: false,
        error: null,
      },
    },
  };

  const lines = mermaid.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNum = i + 1;
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      result.errors.push({ line: lineNum, message: 'Unbalanced quotes in label' });
      result.valid = false;
    }
    if (/\[\s*\]/.test(line) && !line.includes('%%')) {
      result.errors.push({ line: lineNum, message: 'Empty node label []' });
      result.valid = false;
    }
  }

  const firstNonCommentLine = lines.find((line) => !line.trim().startsWith('%%'));
  const validDiagramTypes = [
    'graph',
    'flowchart',
    'sequenceDiagram',
    'classDiagram',
    'erDiagram',
    'gantt',
    'pie',
    'journey',
    'gitGraph',
    'mindmap',
    'timeline',
    'architecture-beta',
    'C4Context',
  ];
  const hasValidType = validDiagramTypes.some((type) => firstNonCommentLine?.trim().startsWith(type));

  if (!hasValidType && firstNonCommentLine) {
    result.errors.push({ line: 1, message: 'Missing or invalid diagram type declaration' });
    result.valid = false;
  }

  let tempDir;
  try {
    result.meta.cliValidation.attempted = true;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-validate-'));
    const tempFile = path.join(tempDir, 'validate.mmd');
    const tempOutput = path.join(tempDir, 'validate.svg');
    fs.writeFileSync(tempFile, `%%{init: {'theme': '${theme}'}}%%\n${mermaid}`);
    runMermaidCli(
      ['@mermaid-js/mermaid-cli', 'mmdc', '-i', tempFile, '-o', tempOutput, '-b', 'transparent'],
      { allowAutoInstall }
    );
    result.meta.mode = 'mmdc';
    result.meta.cliValidation.success = true;
  } catch (error) {
    result.meta.fallbackUsed = true;
    result.meta.fallbackReasons.push('mmdc_unavailable_or_failed');
    result.meta.cliValidation.error = error.message || String(error);
    if (process.env.DEBUG) {
      console.error(chalk.gray('Mermaid CLI not available for validation, using basic checks only'));
    }
  } finally {
    cleanupTempDirectory(tempDir);
  }

  return result;
}

/**
 * Register the `generate [path]` CLI command and its options on the provided Commander program.
 *
 * The command handles analysis, Mermaid generation, optional validation, confidence/capability
 * checks, rendering to files (or printing as Mermaid source), and related output behaviours.
 *
 * @param {import('commander').Command} program - Commander `Command` instance to extend with the `generate` command; the function mutates this instance.
 */
function registerGenerateCommand(program) {
  program
    .command('generate [path]')
    .description('Generate a diagram')
    .option('-t, --type <type>', 'Diagram type: architecture, sequence, dependency, class, flow, database, user, events, auth, security, agent, c4context, rag', 'architecture')
    .option('-f, --focus <module>', 'Focus on specific module')
    .option('-o, --output <file>', 'Output file (SVG/PNG)')
    .option('--format <type>', 'Output format (text, json)', 'text')
    .option('--force', 'Overwrite output file if it exists', false)
    .option('-q, --quiet', 'Suppress non-essential logging', false)
    .option('-m, --max-files <n>', 'Max files to analyze')
    .option('-p, --patterns <list>', 'File patterns (comma-separated)')
    .option('-e, --exclude <list>', 'Exclude patterns')
    .option('--analyzer <name>', 'Analyzer plugin to use', 'default')
    .option('--emit-ir', 'Write typed architecture IR artifact', false)
    .option('--incremental', 'Use incremental cache when available', false)
    .option('--theme <theme>', 'Theme: default, dark, forest, neutral, light')
    .option('--validate', 'Validate Mermaid syntax', false)
    .option('--fail-on-validation-error', 'Exit with error if validation fails (requires --validate)', false)
    .option('--allow-auto-install', 'Allow npx to auto-install missing Mermaid CLI dependencies', false)
    .option('--confidence-report', 'Write confidence report artifact', false)
    .option('--strict-confidence', 'Fail with exit code 1 when confidence checks degrade', false)
    .option('--capability-check-only', 'Run only capability checks and confidence evaluation', false)
    .option('--deterministic', 'Use deterministic machine output', false)
    .option('--open', 'Open in browser')
    .action(async (targetPath, rawOptions) => {
      const options = applyDiagramRcDefaults(rawOptions, getDiagramRcFromProgram(program), ['patterns', 'exclude', 'maxFiles', 'theme']);
      const formatStr = (options.format || 'text').toLowerCase();
      const isJson = formatStr === 'json';
      const quietOutput = Boolean(options.quiet || isJson);
      if (options.failOnValidationError && !options.validate) {
        console.warn(chalk.yellow('⚠️  --fail-on-validation-error has no effect unless --validate is also provided.'));
      }
      const root = resolveRootPathOrExit(targetPath);
      const requestedTheme = String(options.theme || 'default').toLowerCase();
      const safeTheme = normalizeThemeOption(options.theme, 'default');
      if (requestedTheme !== safeTheme) {
        const suggestion = findClosestMatch(options.theme, ALLOWED_THEMES);
        console.warn(chalk.yellow(`⚠️  Unknown theme "${options.theme}", using "${safeTheme}"`));
        if (suggestion) console.warn(formatSuggestion(suggestion));
      }
      const outputExt = options.output ? path.extname(options.output).toLowerCase() : '';
      const needsMermaidCli = Boolean(
        options.validate || (options.output && outputExt !== '.md' && outputExt !== '.mmd')
      );
      const confidenceEnabled = Boolean(
        options.confidenceReport || options.strictConfidence || options.capabilityCheckOnly
      );

      let capabilities = null;
      if (confidenceEnabled) {
        capabilities = probeCapabilities('generate', { requiresMermaidCli: needsMermaidCli });
      }

      if (options.capabilityCheckOnly) {
        const quickReport = buildConfidenceReport({
          command: 'generate',
          rootPath: root,
          capabilities,
          validation: { enabled: false, valid: true, errors: [] },
          fallback: { used: false, reasons: [] },
          notes: ['capability_check_only'],
        });
        let confidencePath = null;
        if (options.confidenceReport || options.strictConfidence) {
          confidencePath = writeConfidenceReport(root, quickReport);
          if (!quietOutput) {
            console.error(chalk.gray('Confidence report:'), confidencePath);
          }
        }
        const strictConfidenceFailed = options.strictConfidence && shouldFailStrictConfidence(quickReport);
        if (isJson) {
          const machinePayload = buildMachineEnvelope({
            schemaVersion: '1.0',
            command: 'generate',
            rootPath: root,
            deterministic: Boolean(options.deterministic),
            status: strictConfidenceFailed ? 'failure' : 'success',
            data: {
              capabilityCheckOnly: true,
              confidence: quickReport,
              artifacts: {
                confidenceReportPath: confidencePath,
              },
            },
            errors: strictConfidenceFailed
              ? [{ message: 'Strict confidence check failed' }]
              : [],
            agentSummary: {
              changedComponents: 0,
              riskReasons: quickReport?.fallback?.reasons || [],
              suggestedReviewerChecks: [
                'Install missing capabilities listed in the confidence report before generation.',
              ],
            },
          });
          console.log(JSON.stringify(machinePayload, null, 2));
        } else if (strictConfidenceFailed) {
          if (!quietOutput) {
            console.error(chalk.red('❌ Strict confidence check failed'));
          }
        } else if (!quietOutput) {
          console.log(chalk.green('✅ Capability check complete'));
        }
        process.exit(strictConfidenceFailed ? 1 : 0);
      }
      if (!quietOutput) {
        console.error(chalk.blue('Generating'), options.type, 'diagram for', root);
      }

      const pipeline = await runAnalysisPipeline(root, options, 'generate');
      const data = pipeline.analysis;
      const irPath = options.emitIr
        ? maybeWriteArchitectureIR(root, data, pipeline.analyzer, true)
        : null;
      const mermaid = generate(data, options.type, options.focus);
      let validationResult = {
        enabled: Boolean(options.validate),
        valid: true,
        errors: [],
        meta: { fallbackUsed: false, fallbackReasons: [], mode: 'not_requested' },
      };

      let failOnValidationErrorTriggered = false;
      if (options.validate) {
        if (!quietOutput) console.error(chalk.blue('\n🔍 Validating Mermaid syntax...'));
        validationResult = validateMermaidSyntax(mermaid, safeTheme, options.allowAutoInstall);
        validationResult.enabled = true;

        if (validationResult.valid) {
          if (!quietOutput) console.error(chalk.green('✅ Mermaid syntax is valid'));
        } else {
          if (!quietOutput) {
            console.error(chalk.yellow('⚠️  Mermaid syntax issues detected:'));
            for (const error of validationResult.errors) {
              console.error(chalk.yellow(`   Line ${error.line || '?'}: ${error.message}`));
            }
          }
          if (options.failOnValidationError) {
            if (!isJson) {
              console.error(chalk.red('❌ Validation failed (exit 1)'));
              console.error(chalk.gray('Fix: run `diagram generate . --type architecture --validate` and address listed lines.'));
            }
            failOnValidationErrorTriggered = true;
          }
        }
      }

      const fallbackReasons = [];
      if (validationResult?.meta?.fallbackUsed) {
        fallbackReasons.push(...(validationResult.meta.fallbackReasons || []));
      }
      if (pipeline.incremental.requested && !pipeline.incremental.used) {
        const incrementalReason = pipeline.incremental.reason || 'unknown';
        const expectedIncrementalBypassReasons = new Set(['cache_miss', 'incremental_disabled_in_ci']);
        if (!expectedIncrementalBypassReasons.has(incrementalReason)) {
          fallbackReasons.push(`incremental_${incrementalReason}`);
        }
      }
      const fallback = {
        used: fallbackReasons.length > 0,
        reasons: fallbackReasons,
      };

      let strictConfidenceFailed = false;
      let confidencePath = null;
      if (confidenceEnabled) {
        const report = buildConfidenceReport({
          command: 'generate',
          rootPath: root,
          capabilities,
          validation: {
            enabled: Boolean(validationResult.enabled),
            valid: Boolean(validationResult.valid),
            errors: validationResult.errors || [],
            mode: validationResult?.meta?.mode || 'basic',
          },
          fallback,
          notes: [
            pipeline.incremental.requested
              ? `incremental:${pipeline.incremental.used ? 'hit' : pipeline.incremental.reason}`
              : 'incremental:not_requested',
          ],
        });

        if (options.confidenceReport || options.strictConfidence) {
          confidencePath = writeConfidenceReport(root, report);
          if (!quietOutput) console.error(chalk.gray('Confidence report:'), confidencePath);
        }

        if (options.strictConfidence && shouldFailStrictConfidence(report)) {
          strictConfidenceFailed = true;
          if (!isJson && !quietOutput) {
            console.error(chalk.red('❌ Strict confidence check failed'));
          }
        }
      }

      const { url, large } = createMermaidUrl(mermaid);
      const envelopeErrors = [...(validationResult.errors || [])];
      if (strictConfidenceFailed) {
        envelopeErrors.push({ message: 'Strict confidence check failed' });
      }
      if (failOnValidationErrorTriggered && envelopeErrors.length === 0) {
        envelopeErrors.push({ message: 'Validation failed with --fail-on-validation-error' });
      }
      const failed = failOnValidationErrorTriggered || strictConfidenceFailed || !validationResult.valid;
      let resolvedOutputPath = null;
      const machinePayload = buildMachineEnvelope({
        schemaVersion: '1.0',
        command: 'generate',
        rootPath: root,
        deterministic: Boolean(options.deterministic),
        status: failed ? 'failure' : 'success',
        data: {
          diagramType: options.type,
          mermaid,
          previewUrl: url,
          previewTooLarge: large,
          analyzer: pipeline.analyzer,
          incremental: pipeline.incremental,
          validation: {
            enabled: Boolean(validationResult.enabled),
            valid: Boolean(validationResult.valid),
            mode: validationResult?.meta?.mode || 'basic',
            errors: validationResult.errors || [],
          },
          artifacts: {
            architectureIrPath: irPath,
            confidenceReportPath: confidencePath,
            outputPath: null,
          },
        },
        errors: envelopeErrors,
        agentSummary: {
          changedComponents: data.components?.length || 0,
          riskReasons: fallbackReasons,
          suggestedReviewerChecks: [
            'Review large fan-out modules in dependency diagram.',
            'Confirm auth/security edges match expected trust boundaries.',
          ],
        },
      });

      if (failOnValidationErrorTriggered || strictConfidenceFailed) {
        machinePayload.data.artifacts.outputPath = resolvedOutputPath;
        if (isJson) {
          console.log(JSON.stringify(machinePayload, null, 2));
        }
        process.exit(1);
      }

      if (!options.output) {
        machinePayload.data.artifacts.outputPath = resolvedOutputPath;
        if (isJson) {
          console.log(JSON.stringify(machinePayload, null, 2));
        } else {
          console.log(chalk.green('\n📐 Mermaid Diagram:\n'));
          console.log('```mermaid');
          console.log(mermaid);
          console.log('```\n');

          if (large || !url) {
            console.error(chalk.yellow('⚠️  Diagram is too large for preview URL.'));
            console.error(chalk.cyan('💾 Save to file:'), 'diagram generate . --output diagram.svg');
          } else {
            console.error(chalk.cyan('🔗 Preview:'), url);
          }
        }
      }

      if (options.output) {
        let safeOutput;
        try {
          safeOutput = validateOutputPath(options.output, root);
        } catch (error) {
          console.error(chalk.red('❌ Output path error:'), error.message);
          process.exit(2);
        }

        const outputDir = path.dirname(safeOutput);
        fs.mkdirSync(outputDir, { recursive: true, mode: 0o755 });
        const ext = outputExt;
        if (ext === '.md' || ext === '.mmd') {
          try {
            fs.writeFileSync(safeOutput, mermaid, { flag: options.force ? 'w' : 'wx' });
            resolvedOutputPath = safeOutput;
            if (!quietOutput) console.error(chalk.green('✅ Saved to'), options.output);
          } catch (error) {
            if (error.code === 'EEXIST') {
              console.error(chalk.red(`❌ Target file exists: ${safeOutput}`));
              console.error(chalk.yellow('Use --force to overwrite.'));
              process.exit(1);
            }
            throw error;
          }
        } else {
          let tempDir = null;
          try {
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-'));
            const tempFile = path.join(tempDir, 'diagram.mmd');
            fs.writeFileSync(tempFile, `%%{init: {'theme': '${safeTheme}'}}%%\n${mermaid}`);
            runMermaidCli(
              ['@mermaid-js/mermaid-cli', 'mmdc', '-i', tempFile, '-o', safeOutput, '-b', 'transparent'],
              { allowAutoInstall: options.allowAutoInstall }
            );
            resolvedOutputPath = safeOutput;
            if (!quietOutput) console.error(chalk.green('✅ Rendered to'), options.output);
          } catch (error) {
            console.error(chalk.red('❌ Could not render output file.'));
            console.error(chalk.gray('Fix: npm install -g @mermaid-js/mermaid-cli'));
            if (process.env.DEBUG) console.error(chalk.gray(error.message));
            process.exit(2);
          } finally {
            cleanupTempDirectory(tempDir);
          }
        }
      }

      machinePayload.data.artifacts.outputPath = resolvedOutputPath;
      if (isJson && options.output) {
        console.log(JSON.stringify(machinePayload, null, 2));
      }

      if (options.open && url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          console.error(chalk.red('❌ Invalid URL protocol'));
        } else {
          openPreviewUrl(url);
        }
      }

      if (!isJson && !options.quiet) {
        console.log(chalk.cyan('\nNext steps:'));
        console.log('  1) Run `diagram validate .` to enforce architecture policy constraints.');
        console.log('  2) Run `diagram generate-all . --artifact-profile agent` for AI-friendly context pack artifacts.');
      }
    });
}

module.exports = {
  registerGenerateCommand,
  validateMermaidSyntax,
};
