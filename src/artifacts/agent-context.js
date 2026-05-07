const fs = require('fs');
const path = require('path');
const { actionableMissingArtifacts } = require('./evidence-manifest');
const { summarizeAnalysis } = require('./evidence-summary');

/**
 * Produce a sorted, de-duplicated array of trimmed strings from the given value.
 * @param {*} value - Input value; expected to be an array of strings. Non-array inputs produce an empty array.
 * @returns {string[]} An array of unique, trimmed strings sorted lexicographically; returns an empty array if there are no valid string entries.
 */
function normalizeStringArray(value) {
  return Array.isArray(value)
    ? [...new Set(value
      .filter((entry) => typeof entry === 'string' && entry.trim())
      .map((entry) => entry.trim()))].sort()
    : [];
}

/**
 * Produce a sorted, normalized list of component metadata derived from static analysis.
 *
 * Transforms each entry in `analysis.components` into a metadata object with the following keys:
 * `kind`, `name`, `path`, `type`, `roleTags`, `dependencyCount`, `source`, and `derivation`.
 * The resulting list is sorted by the string `"<path>:<name>"`.
 *
 * @param {Object} analysis - The analysis payload produced by static analysis tools.
 *   Expected to have a `components` array where each component may include:
 *   `name`, `originalName`, `filePath`, `type`, `roleTags`, and `dependencies`.
 * @returns {Array<Object>} An array of component metadata objects; returns an empty array if
 *   `analysis.components` is not an array.
 */
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

/**
 * Locate an artifact's file path in a manifest by its artifact id.
 * @param {Object} manifest - Object containing an `artifacts` array of entries with `id` and `path` properties.
 * @param {string} id - The artifact identifier to look up.
 * @returns {string|null} The artifact's `path` if an entry with the given `id` exists, otherwise `null`.
 */
function artifactPathById(manifest, id) {
  if (!manifest || !manifest.artifacts || !Array.isArray(manifest.artifacts)) {
    return null;
  }
  return manifest.artifacts.find((entry) => entry.id === id)?.path || null;
}

/**
 * Collects the file paths of artifacts marked as written in a manifest.
 * @param {Object} manifest - Manifest object containing an `artifacts` array.
 * @return {Set<string>} A set of artifact `path` values where the artifact's `status` is `'written'`.
 */
function writtenArtifactPaths(manifest) {
  return new Set(manifest.artifacts
    .filter((entry) => entry.status === 'written')
    .map((entry) => entry.path));
}

/**
 * Produce a list of instructions to follow before editing architecture-sensitive code.
 *
 * The returned list includes baseline safety checks, PR-specific reviewer checks and risk reasons
 * when `prImpact` is provided, plus entries derived from `warnings` and `errors`. The result is
 * normalised, de-duplicated and sorted.
 * @param {Object} params - Input parameters.
 * @param {Object|null} params.prImpact - PR impact information; may contain `agentSummary.suggestedReviewerChecks` and `agentSummary.riskReasons`.
 * @param {string[]|any} params.warnings - Warnings to incorporate into the instructions.
 * @param {Array<Object>} params.errors - Errors whose `category` and `artifact` fields may produce blocking instructions.
 * @returns {string[]} A normalised list of pre-editing instructions.
 */
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

/**
 * Determine evidence completeness and identify artifacts that block reliable analysis.
 *
 * Builds a summary of whether the available artifacts constitute complete evidence, whether
 * written evidence can be used, a human-facing instruction, and a sorted list of blocked artifacts.
 *
 * @param {Object} params
 * @param {Array<Object>} params.artifacts - Artifact entries from the manifest; each entry is expected to include `id`, `path`, `status`, and optional `reason` and `errorCategory`.
 * @param {Array} params.errors - List of error entries; any non-empty list contributes to a `limited` status.
 * @param {Object|null} params.nextSafeAction - Optional object that may include `canUseWrittenEvidence` to override the default determination.
 * @returns {Object} An object describing partial evidence:
 *   - `status` {string} — `'complete'` if there are no blocked artifacts and no errors, otherwise `'limited'`.
 *   - `canUseWrittenEvidence` {boolean} — whether it is safe to rely on previously written artifacts.
 *   - `instruction` {string} — a short guidance message for the agent/operator.
 *   - `blockedArtifacts` {Array<Object>} — sorted list of blocking artifacts; each object contains:
 *       - `artifact` {string} — artifact id,
 *       - `path` {string} — artifact path,
 *       - `status` {string} — artifact status (`failed`, `partial`, or `deferred`),
 *       - `reason` {string} (optional) — reason for deferral,
 *       - `category` {string} (optional) — error category when present.
 */
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

/**
 * Provide a map of default recovery actions for common blocking categories, optionally overriding one entry with values from `nextSafeAction`.
 *
 * @param {Object|null} nextSafeAction - Optional override for a single category.
 * @param {string} [nextSafeAction.category] - Category key to override in the defaults.
 * @param {string} [nextSafeAction.action] - Action identifier to take for the overridden category.
 * @param {boolean} [nextSafeAction.retryable] - Whether the action can be retried.
 * @param {boolean} [nextSafeAction.humanRequired] - Whether human intervention is required.
 * @param {string} [nextSafeAction.message] - Human-readable instruction for the overridden category.
 * @param {string} [nextSafeAction.fallbackAction] - Optional fallback action identifier.
 * @returns {Object} A mapping from category keys to action descriptors. Each descriptor contains:
 *  - `action` (string): the action identifier,
 *  - `retryable` (boolean): whether the action can be retried,
 *  - `humanRequired` (boolean): whether human intervention is required,
 *  - `message` (string): human-readable instruction,
 *  - `fallbackAction` (string, optional): fallback action when provided.
 */
function buildWhenBlocked(nextSafeAction) {
  const defaults = {
    git_refs_missing: {
      action: 'fetch_refs',
      retryable: true,
      humanRequired: false,
      message: 'Fetch the missing base/head refs, then rerun the PR evidence scan.',
      fallbackAction: 'rerun_repository_scan',
    },
    artifact_write_failed: {
      action: 'retry_artifact_write',
      retryable: true,
      humanRequired: false,
      message: 'Retry the failed artifact write when required evidence remains available.',
    },
    approval_required: {
      action: 'request_approval',
      retryable: false,
      humanRequired: true,
      message: 'Request explicit approval before continuing the blocked operation.',
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
    git_state: {
      action: 'repair_git_state',
      retryable: false,
      humanRequired: false,
      message: 'Repair the working tree, index, or merge state before rerunning the scan.',
    },
    missing_file: {
      action: 'restore_missing_file',
      retryable: false,
      humanRequired: false,
      message: 'Restore the missing file or update the scan target before rerunning.',
    },
    lint_failure: {
      action: 'fix_lint_failure',
      retryable: false,
      humanRequired: false,
      message: 'Fix the lint failure, then rerun validation and the scan.',
    },
    test_failure: {
      action: 'fix_test_failure',
      retryable: false,
      humanRequired: false,
      message: 'Fix the failing test, then rerun validation and the scan.',
    },
    analysis_partial: {
      action: 'rerun_repository_scan',
      retryable: true,
      humanRequired: false,
      message: 'Rerun the repository scan or narrow scope after partial analysis.',
    },
    internal_error: {
      action: 'inspect_error',
      retryable: false,
      humanRequired: false,
      message: 'Inspect the error details before relying on generated evidence.',
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

/**
 * Assemble agent-facing instruction and control fields derived from manifest, artifacts and analysis state.
 * 
 * @param {Object} params - Input options.
 * @param {Object} params.manifest - The artifact manifest; must include `artifacts` and `artifactReadOrder`.
 * @param {Array<Object>} params.artifacts - List of artifact entries produced by evidence collection.
 * @param {Object|null} params.prImpact - Pull-request impact summary, used to tailor pre-edit checks (optional).
 * @param {Array<string>} params.warnings - Warning messages to incorporate into pre-edit instructions.
 * @param {Array<Object>} params.errors - Error entries to consider when evaluating partial evidence.
 * @param {Object|null} params.nextSafeAction - Suggested next safe action that can override default blocked handling (optional).
 * @returns {Object} An instructions object containing:
 *  - readFirst: {Array<string>} ordered paths that should be read first (present in manifest.readOrder and written).
 *  - safeToSkip: {Array<string>} sorted paths considered safe to skip.
 *  - beforeEditing: {Array<string>} ordered pre-edit instructions.
 *  - whenBlocked: {Object} map of blockage categories to recommended actions and metadata.
 *  - partialEvidence: {Object} summary about evidence completeness, blocked artifacts and guidance.
 *  - nextSafeAction: {Object} the next action to take when blocked (either provided or a sensible default).
 */
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
      entry.status === 'written'
      && (entry.optional || entry.role === 'supporting-diagram' || entry.role === 'human-report')
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

/**
 * Build the agent context payload describing schema, analysed components, evidence artifacts, read order and PR-specific context.
 *
 * Constructs a normalized JSON payload that summarises analysis results, artefacts, component metadata, read/skip instructions and agent control fields; includes PR impact, warnings, errors and an optional next safe action.
 *
 * @param {Object} options - Options for building the context.
 * @param {Object} options.manifest - Manifest containing `artifacts` and `artifactReadOrder`.
 * @param {Object} [options.analysis={}] - Analysis results passed to summarisation and component metadata builders.
 * @param {Object|null} [options.prImpact=null] - Optional pull-request impact object; when present the payload mode becomes `'pr'` and PR fields are included.
 * @param {string[]} [options.warnings=[]] - List of warning messages to include in the payload.
 * @param {Object[]} [options.errors=[]] - List of error objects; each may include `category`, `artifact` and `message`.
 * @param {Object|null} [options.nextSafeAction=null] - Optional suggestion for the next safe action when blocked; used to populate agent instruction fallbacks.
 * @param {string} [options.mode='repository'] - Default mode for the payload when `prImpact` is not provided.
 * @returns {Object} The assembled agent context payload containing schemaVersion, generatedBy, mode, partial flag, summary, artefacts, components, readOrder, agentInstructions, warnings, errors and optional PR fields.
 */
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
