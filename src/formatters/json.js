const fs = require('fs');

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
  const duration = Date.now() - startTime;
  
  const output = {
    version: '1.0.0',
    schema: 'https://diagram-cli.dev/schemas/output-v1.json',
    summary: {
      total: results.summary.total,
      passed: results.summary.passed,
      failed: results.summary.failed,
      skipped: results.summary.total - results.summary.passed - results.summary.failed,
      violations: results.summary.violations,
      duration: duration / 1000, // Convert to seconds
      exitCode: results.summary.failed > 0 ? ExitCodes.VALIDATION_FAILED : ExitCodes.SUCCESS
    },
    rules: results.rules.map(rule => ({
      name: rule.name,
      description: rule.description,
      status: rule.status,
      filesChecked: rule.filesChecked,
      message: rule.message,
      violations: (rule.violations || []).map(v => ({
        file: v.file,
        line: v.line,
        column: v.column,
        severity: v.severity,
        message: v.message,
        suggestion: v.suggestion,
        relatedFile: v.relatedFile,
        source: v.source
      }))
    }))
  };

  const json = JSON.stringify(output, null, 2);

  if (options.output) {
    // Ensure output directory exists
    const outputDir = require('path').dirname(options.output);
    if (!require('fs').existsSync(outputDir)) {
      require('fs').mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(options.output, json);
    if (options.verbose) {
      console.log(`Results written to ${options.output}`);
    }
  } else {
    console.log(json);
  }

  return results.summary.failed > 0 ? ExitCodes.VALIDATION_FAILED : ExitCodes.SUCCESS;
}

module.exports = { formatJSON, ExitCodes };
