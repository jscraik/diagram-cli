const fs = require('fs');
const path = require('path');

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
  if (!Number.isFinite(startTime)) {
    startTime = Date.now();
  }
  const duration = Math.max(0, (Date.now() - startTime) / 1000); // Convert to seconds
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
    return acc;
  }, { total: rules.length, passed: 0, failed: 0, skipped: 0 });
  const totalTests = Number.isInteger(summary.total) && summary.total >= 0
    ? Math.max(summary.total, computed.total)
    : computed.total;
  const failures = Number.isInteger(summary.failed) && summary.failed >= 0
    ? Math.max(summary.failed, computed.failed)
    : computed.failed;
  const passed = Number.isInteger(summary.passed) && summary.passed >= 0
    ? Math.max(summary.passed, computed.passed)
    : computed.passed;
  const skipped = Math.max(0, totalTests - passed - failures, computed.skipped);
  const timestamp = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites name="Architecture" tests="${totalTests}" failures="${failures}" skipped="${skipped}" time="${duration.toFixed(3)}">\n`;
  xml += `  <testsuite name="Architecture Validation" tests="${totalTests}" failures="${failures}" errors="0" skipped="${skipped}" time="${duration.toFixed(3)}" timestamp="${timestamp}">\n`;

  for (const rule of rules) {
    const safeRule = rule && typeof rule === 'object' ? rule : {};
    const testName = escapeXml(typeof safeRule.name === 'string' ? safeRule.name : 'unnamed');
    const violationsList = Array.isArray(safeRule.violations) ? safeRule.violations : [];

    if (safeRule.status === 'failed') {
      const violations = violationsList.map(v => {
        let msg = `File: ${v.file || 'unknown'}`;
        if (v.line !== undefined && v.line !== null) msg += `:${v.line}`;
        msg += `\nMessage: ${v.message || 'No message'}`;
        if (v.suggestion) msg += `\nSuggestion: ${v.suggestion}`;
        return msg;
      }).join('\n\n') || 'Rule failed with no violations payload';

      xml += `    <testcase name="${testName}" time="${duration.toFixed(3)}">\n`;
      xml += `      <failure message="${violationsList.length} violation(s)" type="ArchitectureViolation"><![CDATA[`;
      xml += escapeCdata(violations);
      xml += `]]></failure>\n`;
      xml += `    </testcase>\n`;
    } else if (safeRule.status === 'skipped') {
      const skipMessage = escapeXml(safeRule.message || 'No files matched layer pattern');
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
    try {
      const outputDir = path.dirname(options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true, mode: 0o755 });
      }
      fs.writeFileSync(options.output, xml, { mode: 0o644 });
      if (options.verbose) {
        console.log(`Results written to ${options.output}`);
      }
    } catch (error) {
      console.error(`Failed to write JUnit output: ${error.message}`);
      return ExitCodes.CONFIG_ERROR;
    }
  } else {
    console.log(xml);
  }

  return failures > 0 ? ExitCodes.VALIDATION_FAILED : ExitCodes.SUCCESS;
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCdata(str) {
  if (!str) return '';
  return str.replace(/\]\]>/g, ']]]]><![CDATA[>');
}

module.exports = { formatJUnit, ExitCodes };
