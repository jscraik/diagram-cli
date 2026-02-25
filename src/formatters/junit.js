const fs = require('fs');

const ExitCodes = {
  SUCCESS: 0,
  VALIDATION_FAILED: 1,
  CONFIG_ERROR: 2
};

/**
 * Format results as JUnit XML
 * @param {Object} results - Validation results
 * @param {Object} options - Output options
 * @param {number} startTime - Start timestamp for duration calculation
 * @returns {number} Exit code
 */
function formatJUnit(results, options = {}, startTime = Date.now()) {
  const duration = (Date.now() - startTime) / 1000; // Convert to seconds
  const timestamp = new Date().toISOString();
  const totalTests = results.summary.total;
  const failures = results.summary.failed;
  const skipped = results.summary.total - results.summary.passed - results.summary.failed;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites name="Architecture" tests="${totalTests}" failures="${failures}" skipped="${skipped}" time="${duration.toFixed(3)}">\n`;
  xml += `  <testsuite name="Architecture Validation" tests="${totalTests}" failures="${failures}" errors="0" skipped="${skipped}" time="${duration.toFixed(3)}" timestamp="${timestamp}">\n`;

  for (const rule of results.rules) {
    const testName = escapeXml(rule.name);

    if (rule.status === 'failed') {
      const violations = rule.violations.map(v => {
        let msg = `File: ${v.file}`;
        if (v.line) msg += `:${v.line}`;
        msg += `\nMessage: ${v.message}`;
        if (v.suggestion) msg += `\nSuggestion: ${v.suggestion}`;
        return msg;
      }).join('\n\n');

      xml += `    <testcase name="${testName}" time="0">\n`;
      xml += `      <failure message="${rule.violations.length} violation(s)" type="ArchitectureViolation">\n`;
      xml += escapeXml(violations);
      xml += `\n      </failure>\n`;
      xml += `    </testcase>\n`;
    } else if (rule.status === 'skipped') {
      const skipMessage = escapeXml(rule.message || 'No files matched layer pattern');
      xml += `    <testcase name="${testName}" time="0">\n`;
      xml += `      <skipped message="${skipMessage}"/>\n`;
      xml += `    </testcase>\n`;
    } else {
      xml += `    <testcase name="${testName}" time="0"/>\n`;
    }
  }

  xml += `  </testsuite>\n`;
  xml += `</testsuites>\n`;

  if (options.output) {
    // Ensure output directory exists
    const outputDir = require('path').dirname(options.output);
    if (!require('fs').existsSync(outputDir)) {
      require('fs').mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(options.output, xml);
    if (options.verbose) {
      console.log(`Results written to ${options.output}`);
    }
  } else {
    console.log(xml);
  }

  return results.summary.failed > 0 ? ExitCodes.VALIDATION_FAILED : ExitCodes.SUCCESS;
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = { formatJUnit, ExitCodes };
