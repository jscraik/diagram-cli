const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getNpxCommandCandidates } = require('../utils/commands');

const CONFIDENCE_SCHEMA_VERSION = '1.0';

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: options.timeoutMs || 15000,
    windowsHide: true,
    ...options,
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
    error: result.error ? String(result.error.message || result.error) : null,
  };
}

function probeNodeRuntime() {
  return {
    id: 'node_runtime',
    required: true,
    status: 'pass',
    message: `Node runtime detected: ${process.version}`,
    details: { version: process.version },
  };
}

function probeGitCapability() {
  const result = runCommand('git', ['--version']);
  if (!result.ok) {
    return {
      id: 'git_cli',
      required: true,
      status: 'fail',
      message: 'Git CLI unavailable',
      details: result,
    };
  }

  return {
    id: 'git_cli',
    required: true,
    status: 'pass',
    message: result.stdout || 'Git CLI available',
    details: result,
  };
}

function probeMermaidCli() {
  const candidates = getNpxCommandCandidates(process.platform);
  let lastFailure = null;

  for (const candidate of candidates) {
    const result = runCommand(candidate, ['-y', '@mermaid-js/mermaid-cli', '--version'], { timeoutMs: 30000 });
    if (result.ok) {
      return {
        id: 'mermaid_cli',
        required: true,
        status: 'pass',
        message: `Mermaid CLI available via ${candidate}`,
        details: { candidate, version: result.stdout || 'unknown' },
      };
    }
    lastFailure = { candidate, ...result };
  }

  return {
    id: 'mermaid_cli',
    required: true,
    status: 'fail',
    message: 'Mermaid CLI unavailable or not runnable via npx',
    details: lastFailure,
  };
}

function probeCapabilities(command, context = {}) {
  const checks = [probeNodeRuntime()];

  if (command === 'workflow-pr') {
    checks.push(probeGitCapability());
  }

  if (context.requiresMermaidCli) {
    checks.push(probeMermaidCli());
  }

  return {
    command,
    generatedAt: new Date().toISOString(),
    checks,
  };
}

function evaluateConfidence({ capabilities, validation, fallback }) {
  const checks = Array.isArray(capabilities?.checks) ? capabilities.checks : [];
  const failures = checks.filter((check) => check.required && check.status === 'fail');
  const warnings = checks.filter((check) => check.status === 'warn');

  const validationFailed = Boolean(validation?.enabled && validation?.valid === false);
  const fallbackUsed = Boolean(fallback?.used);

  let verdict = 'pass';
  const reasons = [];

  if (failures.length > 0 || validationFailed) {
    verdict = 'fail';
  } else if (warnings.length > 0 || fallbackUsed) {
    verdict = 'warn';
  }

  if (failures.length > 0) {
    reasons.push(...failures.map((failure) => `${failure.id}: ${failure.message}`));
  }
  if (validationFailed) {
    reasons.push('validation: Mermaid validation reported errors');
  }
  if (fallbackUsed) {
    reasons.push('fallback: degraded fallback path used');
  }

  let score = 100;
  score -= failures.length * 30;
  score -= warnings.length * 10;
  if (validationFailed) score -= 30;
  if (fallbackUsed) score -= 15;
  score = Math.max(0, Math.min(100, score));

  return {
    verdict,
    score,
    reasons,
    summary: {
      requiredFailures: failures.length,
      warnings: warnings.length,
      validationFailed,
      fallbackUsed,
    },
  };
}

function buildConfidenceReport({ command, rootPath, capabilities, validation, fallback, notes = [] }) {
  const confidence = evaluateConfidence({ capabilities, validation, fallback });

  return {
    schemaVersion: CONFIDENCE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    command,
    rootPath,
    capabilities,
    validation,
    fallback,
    confidence,
    notes,
  };
}

function writeConfidenceReport(rootPath, report, explicitPath) {
  const destination = explicitPath
    ? path.resolve(explicitPath)
    : path.join(rootPath, '.diagram', 'confidence', 'confidence-report.json');

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
  return destination;
}

function shouldFailStrictConfidence(report) {
  const summary = report?.confidence?.summary || {};
  return Boolean(summary.requiredFailures > 0 || summary.validationFailed || summary.fallbackUsed);
}

module.exports = {
  CONFIDENCE_SCHEMA_VERSION,
  probeCapabilities,
  evaluateConfidence,
  buildConfidenceReport,
  writeConfidenceReport,
  shouldFailStrictConfidence,
};
