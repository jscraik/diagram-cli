const fs = require('fs');
const path = require('path');
const { actionableMissingArtifacts } = require('./evidence-manifest');
const { summarizeAnalysis } = require('./evidence-summary');

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? [...new Set(value
      .filter((entry) => typeof entry === 'string' && entry.trim())
      .map((entry) => entry.trim()))].sort()
    : [];
}

function buildComponentMetadata(analysis) {
  return Array.isArray(analysis?.components)
    ? analysis.components
      .map((component) => ({
        kind: 'component',
        name: component.name || component.originalName || component.filePath || 'unknown',
        path: component.filePath || '',
        type: component.type || 'unknown',
        roleTags: normalizeStringArray(component.roleTags),
        dependencyCount: Array.isArray(component.dependencies) ? component.dependencies.length : 0,
        source: 'analysis.components',
        derivation: 'static-analysis',
      }))
      .sort((left, right) =>
        `${left.path}:${left.name}`.localeCompare(`${right.path}:${right.name}`)
      )
    : [];
}

function artifactPathById(manifest, id) {
  return manifest.artifacts.find((entry) => entry.id === id)?.path || null;
}

function writtenArtifactPaths(manifest) {
  return new Set(manifest.artifacts
    .filter((entry) => entry.status === 'written')
    .map((entry) => entry.path));
}

function buildBeforeEditing({ prImpact, warnings, errors }) {
  const instructions = [
    'Read only artifacts whose status is written before using their contents.',
    'Inspect artifact statuses before editing architecture-sensitive code.',
  ];
  if (prImpact) {
    instructions.push('Compare changedComponents and blastRadius before choosing files to edit.');
    for (const check of normalizeStringArray(prImpact.agentSummary?.suggestedReviewerChecks)) {
      instructions.push(check);
    }
    for (const reason of normalizeStringArray(prImpact.agentSummary?.riskReasons)) {
      instructions.push(`Check PR risk reason: ${reason}.`);
    }
  }
  for (const warning of normalizeStringArray(warnings)) {
    instructions.push(`Account for warning: ${warning}.`);
  }
  for (const error of errors) {
    if (error?.category) {
      instructions.push(`Resolve or report ${error.category} before relying on ${error.artifact || 'scan evidence'}.`);
    }
  }
  return normalizeStringArray(instructions);
}

function buildPartialEvidence({ artifacts, errors, nextSafeAction }) {
  const blockedArtifacts = actionableMissingArtifacts(artifacts)
    .map((entry) => ({
      artifact: entry.id,
      path: entry.path,
      status: entry.status,
      ...(entry.reason ? { reason: entry.reason } : {}),
      ...(entry.errorCategory ? { category: entry.errorCategory } : {}),
    }))
    .sort((left, right) => `${left.path}:${left.status}`.localeCompare(`${right.path}:${right.status}`));
  return {
    status: blockedArtifacts.length > 0 || errors.length > 0 ? 'limited' : 'complete',
    canUseWrittenEvidence: nextSafeAction?.canUseWrittenEvidence ?? errors.length === 0,
    instruction: blockedArtifacts.length > 0
      ? 'Use written artifacts only and report blocked artifacts before editing.'
      : 'All required evidence is available; continue with the read-first order.',
    blockedArtifacts,
  };
}

function buildWhenBlocked(nextSafeAction) {
  const defaults = {
    git_refs_missing: {
      action: 'fetch_refs',
      retryable: true,
      humanRequired: false,
      message: 'Fetch the missing base/head refs, then rerun the PR evidence scan.',
    },
    artifact_write_failed: {
      action: 'retry_artifact_write',
      retryable: true,
      humanRequired: false,
      message: 'Retry the failed artifact write when required evidence remains available.',
    },
    permission: {
      action: 'fix_permissions',
      retryable: false,
      humanRequired: true,
      message: 'Fix filesystem or sandbox permissions before rerunning the scan.',
    },
    timeout: {
      action: 'retry_with_smaller_scope',
      retryable: true,
      humanRequired: false,
      message: 'Retry with a smaller scope or investigate the timed-out operation.',
    },
    network: {
      action: 'restore_network',
      retryable: true,
      humanRequired: false,
      message: 'Restore network access or rerun with local-only evidence.',
    },
  };
  if (!nextSafeAction?.category) return defaults;
  return {
    ...defaults,
    [nextSafeAction.category]: {
      action: nextSafeAction.action,
      retryable: Boolean(nextSafeAction.retryable),
      humanRequired: Boolean(nextSafeAction.humanRequired),
      message: nextSafeAction.message,
      ...(nextSafeAction.fallbackAction ? { fallbackAction: nextSafeAction.fallbackAction } : {}),
    },
  };
}

function buildAgentInstructions({
  manifest,
  artifacts,
  prImpact,
  warnings,
  errors,
  nextSafeAction,
}) {
  const writtenPaths = writtenArtifactPaths(manifest);
  const readFirst = manifest.artifactReadOrder.filter((artifactPath) => writtenPaths.has(artifactPath));
  const safeToSkip = manifest.artifacts
    .filter((entry) =>
      entry.optional || entry.role === 'supporting-diagram' || entry.role === 'human-report'
    )
    .map((entry) => entry.path)
    .filter((artifactPath) => !readFirst.includes(artifactPath))
    .sort();
  const manifestPath = artifactPathById(manifest, 'manifest');
  return {
    readFirst,
    safeToSkip,
    beforeEditing: buildBeforeEditing({ prImpact, warnings, errors }),
    whenBlocked: buildWhenBlocked(nextSafeAction),
    partialEvidence: buildPartialEvidence({ artifacts, errors, nextSafeAction }),
    nextSafeAction: nextSafeAction || {
      action: 'read_manifest',
      category: null,
      retryable: false,
      humanRequired: false,
      canUseWrittenEvidence: true,
      message: manifestPath
        ? `Read ${manifestPath} for artifact status before opening optional files.`
        : 'Read written evidence artifacts in manifest order.',
    },
  };
}

function buildAgentContext({
  manifest,
  analysis = {},
  prImpact = null,
  warnings = [],
  errors = [],
  nextSafeAction = null,
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
    components: buildComponentMetadata(analysis),
    readOrder: [...manifest.artifactReadOrder],
    agentInstructions: buildAgentInstructions({
      manifest,
      artifacts,
      prImpact,
      warnings,
      errors,
      nextSafeAction,
    }),
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
