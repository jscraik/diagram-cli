const fs = require('fs');
const path = require('path');
const { estimateTokensFromBytes } = require('./artifact-budget');

const FIXED_DETERMINISTIC_TIMESTAMP = '1970-01-01T00:00:00.000Z';
const ARTIFACT_STATUSES = new Set(['written', 'deferred', 'partial', 'failed']);

function unixPath(value) {
  return String(value || '').split(path.sep).join('/');
}

function sortStrings(values) {
  return [...(values || [])].sort((a, b) => String(a).localeCompare(String(b)));
}

function getGeneratedAt(deterministic) {
  return deterministic ? FIXED_DETERMINISTIC_TIMESTAMP : new Date().toISOString();
}

function realpathIfPresent(value) {
  try {
    return fs.realpathSync(value);
  } catch (_error) {
    return value;
  }
}

function writeJsonFile(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function createGenerateAllManifest({
  root,
  outDir,
  artifactProfile,
  budgeted,
  deterministic = false,
}) {
  const realRoot = realpathIfPresent(root);
  return {
    generatedAt: getGeneratedAt(deterministic),
    schemaVersion: '1.0',
    rootPath: root,
    diagramDir: path.relative(realRoot, outDir) || '.',
    compaction: {
      applied: budgeted.applied,
      profile: artifactProfile.name,
      maxTotalBytes: artifactProfile.maxBytesTotal,
      maxPerDiagramBytes: artifactProfile.maxBytesPerDiagram,
      maxDiagrams: artifactProfile.maxDiagrams,
      generatedDiagrams: budgeted.summary.generatedCount,
      writtenDiagrams: budgeted.summary.includedCount,
      omittedTypes: budgeted.omitted.map((entry) => entry.type),
      truncatedTypes: budgeted.truncatedTypes,
      bytesSaved: budgeted.summary.bytesSaved,
      estimatedTokensSaved: estimateTokensFromBytes(budgeted.summary.bytesSaved),
      reason: artifactProfile.name === 'full'
        ? 'full_profile'
        : (budgeted.applied ? 'budget_constraints' : 'within_budget'),
    },
    diagrams: [],
  };
}

function artifactEntry({
  id,
  path: artifactPath,
  status,
  role,
  optional = false,
  reason = null,
  errorCategory = null,
}) {
  if (!ARTIFACT_STATUSES.has(status)) {
    throw new Error(`Invalid artifact status for ${id}: ${status}`);
  }
  return {
    id,
    path: artifactPath,
    status,
    role,
    optional,
    ...(reason ? { reason } : {}),
    ...(errorCategory ? { errorCategory } : {}),
  };
}

function createScanEvidenceManifest({
  root,
  outDir,
  deterministic = false,
  warnings = [],
  artifactStatuses = {},
  artifactReasons = {},
  artifactErrorCategories = {},
}) {
  const realRoot = realpathIfPresent(root);
  const diagramDir = unixPath(path.relative(realRoot, outDir) || '.');
  const artifactPath = (fileName) => unixPath(path.join(diagramDir, fileName));
  const statusFor = (id, fallback) => artifactStatuses[id] || fallback;
  const reportStatus = statusFor('report', 'deferred');

  const artifacts = [
    artifactEntry({
      id: 'manifest',
      path: artifactPath('manifest.json'),
      status: statusFor('manifest', 'written'),
      role: 'artifact-index',
      reason: artifactReasons.manifest || null,
      errorCategory: artifactErrorCategories.manifest || null,
    }),
    artifactEntry({
      id: 'brief',
      path: artifactPath('brief.md'),
      status: statusFor('brief', 'deferred'),
      role: 'primary-human-summary',
      reason: artifactReasons.brief
        || (statusFor('brief', 'deferred') === 'deferred' ? 'p1_not_implemented' : null),
      errorCategory: artifactErrorCategories.brief || null,
    }),
    artifactEntry({
      id: 'agent-context',
      path: artifactPath('agent-context.json'),
      status: statusFor('agent-context', 'deferred'),
      role: 'primary-agent-context',
      reason: artifactReasons['agent-context']
        || (statusFor('agent-context', 'deferred') === 'deferred' ? 'p1_not_implemented' : null),
      errorCategory: artifactErrorCategories['agent-context'] || null,
    }),
    artifactEntry({
      id: 'architecture',
      path: artifactPath('architecture.mmd'),
      status: statusFor('architecture', 'deferred'),
      role: 'supporting-diagram',
      reason: artifactReasons.architecture
        || (statusFor('architecture', 'deferred') === 'deferred' ? 'p1_not_implemented' : null),
      errorCategory: artifactErrorCategories.architecture || null,
    }),
    artifactEntry({
      id: 'report',
      path: artifactPath('report.html'),
      status: reportStatus,
      role: 'human-report',
      optional: true,
      reason: artifactReasons.report || (reportStatus === 'deferred' ? 'ui_spec_required' : null),
      errorCategory: artifactErrorCategories.report || null,
    }),
    artifactEntry({
      id: 'pr-impact',
      path: artifactPath('pr-impact/pr-impact.json'),
      status: statusFor('pr-impact', 'deferred'),
      role: 'pr-impact-json',
      optional: true,
      reason: artifactReasons['pr-impact']
        || (statusFor('pr-impact', 'deferred') === 'deferred' ? 'pr_refs_not_supplied' : null),
      errorCategory: artifactErrorCategories['pr-impact'] || null,
    }),
  ].sort((a, b) => a.path.localeCompare(b.path));

  const primaryHumanArtifact = reportStatus === 'written'
    ? artifactPath('report.html')
    : artifactPath('brief.md');
  const primaryAgentArtifact = artifactPath('agent-context.json');
  const artifactReadOrder = [
    artifactPath('manifest.json'),
    artifactPath('brief.md'),
    artifactPath('agent-context.json'),
    ...(statusFor('pr-impact', 'deferred') === 'written' ? [artifactPath('pr-impact/pr-impact.json')] : []),
  ];

  return {
    schemaVersion: '1.0',
    command: 'scan',
    generatedAt: getGeneratedAt(deterministic),
    deterministic: Boolean(deterministic),
    project: {
      label: path.basename(root) || '.',
      path: '.',
    },
    outputDirectory: diagramDir,
    primaryHumanArtifact,
    primaryAgentArtifact,
    artifactReadOrder,
    artifacts,
    subordinateDirectories: [
      unixPath(path.join(diagramDir, 'contracts')),
      unixPath(path.join(diagramDir, 'context')),
      unixPath(path.join(diagramDir, 'migration')),
      unixPath(path.join(diagramDir, 'pr-impact')),
    ].sort(),
    validation: {
      status: 'not_run',
      summary: 'scan does not run validation automatically',
    },
    warnings: sortStrings(warnings),
  };
}

module.exports = {
  FIXED_DETERMINISTIC_TIMESTAMP,
  createGenerateAllManifest,
  createScanEvidenceManifest,
  getGeneratedAt,
  writeJsonFile,
};
