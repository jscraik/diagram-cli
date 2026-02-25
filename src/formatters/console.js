const chalk = require('chalk');

const ExitCodes = {
  SUCCESS: 0,
  VALIDATION_FAILED: 1,
  CONFIG_ERROR: 2
};

/**
 * Detect CI environment and encoding support
 */
function detectEnvironment() {
  const isCI = process.env.CI === 'true' || !process.stdout.isTTY;
  const supportsUnicode = process.env.LC_ALL?.includes('UTF') ||
                          process.platform !== 'win32';

  return { isCI, supportsUnicode };
}

/**
 * Get icons based on environment
 */
function getIcons(env) {
  if (env.isCI || !env.supportsUnicode) {
    return {
      success: '[OK]',
      error: '[FAIL]',
      warning: '[WARN]',
      skipped: '[SKIP]',
      arrow: '->'
    };
  }
  return {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    skipped: '⏭️',
    arrow: '→'
  };
}

/**
 * Format results for console output
 * @param {Object} results - Validation results
 * @param {Object} options - Output options
 * @param {number} startTime - Start timestamp for duration calculation
 * @returns {number} Exit code
 */
function formatConsole(results, options = {}, startTime = Date.now()) {
  const env = detectEnvironment();
  const icons = getIcons(env);
  const { verbose } = options;
  const duration = Date.now() - startTime;

  // Configure chalk for CI
  const c = new chalk.Instance({ level: env.isCI ? 0 : undefined });

  let hasFailures = false;

  for (const rule of results.rules) {
    const ruleIcon = rule.status === 'passed' ? icons.success :
                     rule.status === 'skipped' ? icons.skipped :
                     icons.error;

    const statusColor = rule.status === 'passed' ? c.green :
                        rule.status === 'skipped' ? c.yellow :
                        c.red;

    // Rule header
    console.log(`${ruleIcon} ${statusColor(rule.name)} ${c.gray(`(${rule.filesChecked} files)`)}`);

    if (rule.description && verbose) {
      console.log(c.gray(`   ${rule.description}`));
    }

    // Violations
    if (rule.violations && rule.violations.length > 0) {
      hasFailures = true;

      // Group by file for cleaner output
      const byFile = {};
      for (const v of rule.violations) {
        if (!byFile[v.file]) byFile[v.file] = [];
        byFile[v.file].push(v);
      }

      for (const [file, violations] of Object.entries(byFile)) {
        console.log(c.gray(`   ${file}`));
        for (const v of violations) {
          const line = v.line !== undefined && v.line !== null ? c.cyan(`:${v.line}`) : '';
          console.log(`      ${icons.arrow} ${c.red(v.message)}${line}`);
          if (v.suggestion) {
            console.log(c.gray(`        💡 ${v.suggestion}`));
          }
        }
      }
    }

    // Skipped message
    if (rule.status === 'skipped' && rule.message) {
      console.log(c.yellow(`   ${icons.warning} ${rule.message}`));
    }

    console.log();
  }

  // Summary
  const { passed, failed, violations } = results.summary;
  const total = results.summary.total;
  const skipped = Math.max(0, total - passed - failed);

  if (hasFailures) {
    console.log(c.red(`${icons.error} ${failed} of ${total} rules failed (${violations} violations)`));
  } else if (passed === total) {
    console.log(c.green(`${icons.success} All ${total} rules passed`));
  } else {
    console.log(c.yellow(`${icons.warning} ${passed} passed, ${skipped} skipped`));
  }

  // Duration (only in verbose mode)
  if (verbose) {
    console.log(c.gray(`\nDuration: ${(duration / 1000).toFixed(3)}s`));
  }

  return hasFailures ? ExitCodes.VALIDATION_FAILED : ExitCodes.SUCCESS;
}

module.exports = {
  formatConsole,
  ExitCodes,
  detectEnvironment,
  getIcons
};
