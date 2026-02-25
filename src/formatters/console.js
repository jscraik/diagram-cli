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
  const locale = `${process.env.LC_ALL || ''} ${process.env.LC_CTYPE || ''} ${process.env.LANG || ''}`;
  const windowsUnicodeTerminal = Boolean(
    process.env.WT_SESSION ||
    process.env.TERM_PROGRAM === 'vscode' ||
    process.env.TERM === 'xterm-256color'
  );
  const supportsUnicode = process.platform !== 'win32' ||
                          windowsUnicodeTerminal ||
                          /UTF-?8/i.test(locale);

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
  
  // Validate startTime
  if (!Number.isFinite(startTime)) {
    startTime = Date.now();
  }
  const duration = Math.max(0, Date.now() - startTime);

  const safeResults = results && typeof results === 'object' ? results : {};
  const summary = safeResults.summary && typeof safeResults.summary === 'object' ? safeResults.summary : {};
  const safeRules = Array.isArray(safeResults.rules) ? safeResults.rules : [];
  const computed = safeRules.reduce((acc, item) => {
    const rule = item && typeof item === 'object' ? item : {};
    if (rule.status === 'failed') {
      acc.failed++;
    } else if (rule.status === 'skipped') {
      acc.skipped++;
    } else {
      acc.passed++;
    }
    if (Array.isArray(rule.violations)) {
      acc.violations += rule.violations.length;
    }
    return acc;
  }, { total: safeRules.length, passed: 0, failed: 0, skipped: 0, violations: 0 });
  const total = Number.isInteger(summary.total) && summary.total >= 0
    ? Math.max(summary.total, computed.total)
    : computed.total;
  const passed = Number.isInteger(summary.passed) && summary.passed >= 0
    ? Math.max(summary.passed, computed.passed)
    : computed.passed;
  const failed = Number.isInteger(summary.failed) && summary.failed >= 0
    ? Math.max(summary.failed, computed.failed)
    : computed.failed;
  const violations = Number.isInteger(summary.violations) && summary.violations >= 0
    ? Math.max(summary.violations, computed.violations)
    : computed.violations;

  // Configure chalk for CI
  const c = new chalk.Instance({ level: env.isCI ? 0 : undefined });

  let hasFailures = false;

  for (const rule of safeRules) {
    const currentRule = rule && typeof rule === 'object' ? rule : {};
    const ruleIcon = currentRule.status === 'passed' ? icons.success :
                     currentRule.status === 'skipped' ? icons.skipped :
                     icons.error;

    const statusColor = currentRule.status === 'passed' ? c.green :
                        currentRule.status === 'skipped' ? c.yellow :
                        c.red;

    // Rule header
    const filesChecked = Number.isInteger(currentRule.filesChecked) ? currentRule.filesChecked : 0;
    const ruleName = typeof currentRule.name === 'string' && currentRule.name.trim() !== ''
      ? currentRule.name
      : 'unnamed';
    console.log(`${ruleIcon} ${statusColor(ruleName)} ${c.gray(`(${filesChecked} files)`)}`);

    if (typeof currentRule.description === 'string' && currentRule.description && verbose) {
      console.log(c.gray(`   ${currentRule.description}`));
    }

    // Violations
    const ruleViolations = Array.isArray(currentRule.violations) ? currentRule.violations : [];
    if (ruleViolations.length > 0) {
      hasFailures = true;

      // Group by file for cleaner output
      const byFile = {};
      for (const v of ruleViolations) {
        const fileKey = typeof v?.file === 'string' && v.file !== '' ? v.file : '<unknown file>';
        if (!byFile[fileKey]) byFile[fileKey] = [];
        byFile[fileKey].push(v || {});
      }

      for (const [file, violations] of Object.entries(byFile)) {
        console.log(c.gray(`   ${file}`));
        for (const v of violations) {
          // Validate line number
          let line = '';
          if (typeof v.line === 'number' && v.line >= 0 && v.line < 1000000) {
            line = c.cyan(`:${v.line}`);
          }
          const message = typeof v.message === 'string' ? v.message.slice(0, 200) : 'Unknown error';
          console.log(`      ${icons.arrow} ${c.red(message)}${line}`);
          if (typeof v.suggestion === 'string' && v.suggestion) {
            console.log(c.gray(`        💡 ${v.suggestion.slice(0, 200)}`));
          }
        }
      }
    }

    // Skipped message
    if (currentRule.status === 'skipped' && currentRule.message) {
      console.log(c.yellow(`   ${icons.warning} ${currentRule.message}`));
    }

    console.log();
  }

  // Summary
  const skipped = Math.max(0, total - passed - failed, computed.skipped);

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
