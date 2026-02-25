const fs = require('fs');
const path = require('path');

const ExitCodes = {
  SUCCESS: 0,
  VALIDATION_FAILED: 1,
  CONFIG_ERROR: 2
};

/**
 * Format results as JSON
 * @param {Object} results - Validation results
 * @param {Object} options - Output options
 * @param {number} startTime - Start timestamp for duration calculation
 * @returns {number} Exit code
 */
function formatJSON(results, options = {}, startTime = Date.now()) {
  if (!Number.isFinite(startTime)) {
    startTime = Date.now();
  }
  const duration = Math.max(0, Date.now() - startTime);
  const safeResults = results && typeof results === 'object' ? results : {};
  const summary = safeResults.summary && typeof safeResults.summary === 'object' ? safeResults.summary : {};
  const rules = Array.isArray(safeResults.rules) ? safeResults.rules : [];
  const computed = rules.reduce((acc, item) => {
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
  }, { total: rules.length, passed: 0, failed: 0, skipped: 0, violations: 0 });
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
  
  const output = {
    version: '1.0.0',
    schema: 'https://diagram-cli.dev/schemas/output-v1.json',
    summary: {
      total,
      passed,
      failed,
      skipped: Math.max(0, total - passed - failed, computed.skipped),
      violations,
      duration: duration / 1000, // Convert to seconds
      exitCode: failed > 0 ? ExitCodes.VALIDATION_FAILED : ExitCodes.SUCCESS
    },
    rules: rules.map(rule => {
      const safeRule = rule && typeof rule === 'object' ? rule : {};
      return {
        name: typeof safeRule.name === 'string' ? safeRule.name : 'unnamed',
        description: typeof safeRule.description === 'string' ? safeRule.description : '',
        status: typeof safeRule.status === 'string' ? safeRule.status : 'failed',
        filesChecked: Number.isInteger(safeRule.filesChecked) ? safeRule.filesChecked : 0,
        message: typeof safeRule.message === 'string' ? safeRule.message : undefined,
        violations: (Array.isArray(safeRule.violations) ? safeRule.violations : []).map(v => ({
          file: typeof v?.file === 'string' ? v.file : undefined,
          line: Number.isInteger(v?.line) ? v.line : undefined,
          column: Number.isInteger(v?.column) ? v.column : undefined,
          severity: typeof v?.severity === 'string' ? v.severity : 'error',
          message: typeof v?.message === 'string' ? v.message : 'Unknown error',
          suggestion: typeof v?.suggestion === 'string' ? v.suggestion : undefined,
          relatedFile: typeof v?.relatedFile === 'string' ? v.relatedFile : undefined,
          source: typeof v?.source === 'string' ? v.source : undefined
        }))
      };
    })
  };

  const json = JSON.stringify(output, null, 2);

  if (options.output) {
    try {
      const outputDir = path.dirname(options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true, mode: 0o755 });
      }
      fs.writeFileSync(options.output, json, { mode: 0o644 });
      if (options.verbose) {
        console.log(`Results written to ${options.output}`);
      }
    } catch (error) {
      console.error(`Failed to write JSON output: ${error.message}`);
      return ExitCodes.CONFIG_ERROR;
    }
  } else {
    console.log(json);
  }

  return failed > 0 ? ExitCodes.VALIDATION_FAILED : ExitCodes.SUCCESS;
}

module.exports = { formatJSON, ExitCodes };
