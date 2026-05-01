const fs = require('fs');
const path = require('path');
const { summarizeAnalysis } = require('./evidence-summary');

function buildAgentContext({
  manifest,
  analysis = {},
  prImpact = null,
  warnings = [],
  errors = [],
  mode = 'repository',
}) {
  const summary = summarizeAnalysis(analysis);
  const artifacts = manifest.artifacts
    .map((entry) => ({
      id: entry.id,
      path: entry.path,
      role: entry.role,
      status: entry.status,
      ...(entry.reason ? { reason: entry.reason } : {}),
      ...(entry.errorCategory ? { errorCategory: entry.errorCategory } : {}),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  const payload = {
    schemaVersion: '1.0',
    generatedBy: 'archscope scan',
    mode: prImpact ? 'pr' : mode,
    partial: artifacts.some((entry) => entry.status === 'partial' || entry.status === 'failed'),
    summary: {
      componentCount: summary.componentCount,
      entryPointCount: summary.entryPointCount,
      totalFilesFound: summary.totalFilesFound,
      languages: Object.fromEntries(summary.languages),
      architectureAreas: Object.fromEntries(summary.areas),
    },
    artifacts,
    readOrder: [...manifest.artifactReadOrder],
    warnings: [...warnings].sort(),
    errors: errors
      .map((error) => ({
        category: error.category,
        artifact: error.artifact,
        message: error.message,
      }))
      .sort((left, right) =>
        `${left.artifact || ''}:${left.category}`.localeCompare(`${right.artifact || ''}:${right.category}`)
      ),
  };

  if (prImpact) {
    payload.pr = {
      status: prImpact._meta?.status || 'complete',
      changedFiles: prImpact.changedFiles || [],
      changedComponents: prImpact.changedComponents || [],
      blastRadius: prImpact.blastRadius || null,
      reviewerChecks: prImpact.agentSummary?.suggestedReviewerChecks || [],
    };
    payload.base = prImpact.base;
    payload.head = prImpact.head;
    payload.risk = prImpact.risk || null;
  }

  return payload;
}

function writeAgentContext(filePath, input) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload = buildAgentContext(input);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

module.exports = {
  buildAgentContext,
  writeAgentContext,
};
