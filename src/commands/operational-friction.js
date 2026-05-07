const KNOWN_CATEGORIES = new Set([
  'approval_required',
  'network',
  'permission',
  'timeout',
  'git_state',
  'missing_file',
  'lint_failure',
  'test_failure',
  'git_refs_missing',
  'analysis_partial',
  'artifact_write_failed',
  'internal_error',
]);

/**
 * Normalises an operational friction signal into a recognised category.
 *
 * @param {Object} [input] - Signal object that may contain a pre-set category or error text.
 * @param {string} [input.category] - Optional explicit category to accept when it matches a known category.
 * @param {string} [input.message] - Optional human-readable message describing the error.
 * @param {Error} [input.error] - Optional error object; its `message` may be used when `message` is not provided.
 * @returns {string} One of: 'approval_required', 'network', 'permission', 'timeout', 'git_state', 'missing_file', 'lint_failure', 'test_failure', 'git_refs_missing', 'analysis_partial', 'artifact_write_failed', or 'internal_error'.
 */
function normalizeOperationalFriction(input = {}) {
  const rawCategory = String(input.category || '').trim();
  if (KNOWN_CATEGORIES.has(rawCategory)) return rawCategory;

  const message = String(input.message || input.error?.message || '').toLowerCase();
  if (/approval required|requires approval|user approval|approval denied/.test(message)) return 'approval_required';
  if (/permission denied|operation not permitted|eacces|eperm|access denied/.test(message)) return 'permission';
  if (/timed out|timeout|etimedout|deadline exceeded/.test(message)) return 'timeout';
  if (/network|enotfound|econnrefused|econnreset|dns|socket|offline/.test(message)) return 'network';
  if (/bad revision|unknown revision|ambiguous argument|not a valid object name|invalid ref|unknown ref|needed a single revision|revision or path not in the working tree/.test(message)) return 'git_refs_missing';
  if (/not a git repository|working tree|index\.lock|merge conflict|unmerged|detached head/.test(message)) return 'git_state';
  if (/enoent|no such file|file not found|missing file/.test(message)) return 'missing_file';
  if (/lint|eslint|markdownlint|vale/.test(message)) return 'lint_failure';
  if (/test failed|failing test|assertionerror|mocha|vitest|pytest/.test(message)) return 'test_failure';
  if (/\banalysis failed\b|\bpartial analysis\b|\banalysis incomplete\b/.test(message)) return 'analysis_partial';
  if (/\bfailed to write\b|\bwrite failed\b|\bwriter error\b|\bartifact write failed\b/.test(message)) return 'artifact_write_failed';
  return 'internal_error';
}

/**
 * Find an artifact with the specified id inside a manifest's `artifacts` array.
 *
 * @param {Object|null|undefined} manifest - Manifest object that may contain an `artifacts` array; may be falsy.
 * @param {string} id - Artifact identifier to locate.
 * @returns {Object|null} The matching artifact object, or `null` if the manifest, its `artifacts` array, or the artifact is not present.
 */
function artifactById(manifest, id) {
  return manifest?.artifacts?.find((entry) => entry.id === id) || null;
}

/**
 * Determine whether required evidence artifacts have been written to disk.
 *
 * Checks the manifest for the primary machine artifact and returns `true` only
 * when `agent-context` has `status === 'written'`. If `manifestPath` is falsy
 * the function returns `false`.
 *
 * @param {Object} manifest - The manifest object which may contain an `artifacts` array.
 * @param {string|null|undefined} manifestPath - Path to the manifest on disk; if falsy the manifest is considered absent.
 * @returns {boolean} `true` if the `agent-context` artifact is marked as written, `false` otherwise.
 */
function hasWrittenRequiredEvidence(manifest, manifestPath) {
  if (!manifestPath) return false;
  const agentContext = artifactById(manifest, 'agent-context');
  return agentContext?.status === 'written';
}

/**
 * Selects the first error signal and returns its normalized category, artifact id and message.
 *
 * @param {Array} errors - An array of error-like objects; each item may contain `message`, `artifact` or an `error` sub-object.
 * @returns {{category: string|null, artifact: string|null, message: string|null}} An object with `category` set to the normalized operational friction category or `null`, `artifact` set to the artifact identifier or `null`, and `message` set to the error message or `null`.
 */
function firstSignal(errors = []) {
  const firstError = Array.isArray(errors) ? errors[0] : null;
  if (!firstError) return { category: null, artifact: null, message: null };
  return {
    category: normalizeOperationalFriction(firstError),
    artifact: firstError.artifact || null,
    message: firstError.message || null,
  };
}

/**
 * Choose the next safe action after a PR evidence scan based on outcome, manifest state and operational-friction signals.
 *
 * @param {Object} [opts] - Options.
 * @param {'success'|'failure'|undefined} [opts.outcome] - Overall scan outcome.
 * @param {Object} [opts.manifest] - Parsed manifest object (may be undefined when the manifest was not written).
 * @param {string|undefined} [opts.manifestPath] - Path to the written manifest file, if present.
 * @param {Array<Object>} [opts.errors] - Array of operational-friction/error signals produced by the scan.
 * @param {Object|null} [opts.prSummary] - Optional PR scan summary which may override the derived error category (e.g. { status, errorCategory }).
 * @returns {Object} An action descriptor object with these properties:
 *   - {string} action: Machine-readable action to perform (for example 'fetch_refs', 'retry_artifact_write', 'read_manifest', 'inspect_error').
 *   - {string|null} category: Normalised operational-friction category or `null` when none.
 *   - {boolean} retryable: Whether the action can be retried automatically.
 *   - {boolean} humanRequired: Whether human intervention is required.
 *   - {boolean} canUseWrittenEvidence: Whether already-written evidence artifacts may be used.
 *   - {string|null} [artifact]: Identifier of the artifact related to the signal, if any.
 *   - {string} message: Human-facing guidance for the next step.
 *   - {string} [fallbackAction]: Optional secondary action to attempt if the primary recovery fails.
 */
function buildNextSafeAction({
  outcome,
  manifest,
  manifestPath,
  errors = [],
  prSummary = null,
} = {}) {
  const signal = firstSignal(errors);
  const category = prSummary?.status === 'failed'
    ? normalizeOperationalFriction({
      category: prSummary.errorCategory,
      message: signal.message,
    })
    : signal.category;

  if (category === 'git_refs_missing') {
    return {
      action: 'fetch_refs',
      category,
      retryable: true,
      humanRequired: false,
      // Exception: manifestPath alone is sufficient for ref-fetching because the agent
      // only needs to know where to write the updated scan results, not that the initial
      // write already succeeded. This differs from artifact_write_failed which requires
      // hasWrittenRequiredEvidence to confirm baseline evidence is usable.
      canUseWrittenEvidence: Boolean(manifestPath),
      message: 'Fetch the missing base/head refs, then rerun the PR evidence scan.',
      fallbackAction: 'rerun_repository_scan',
    };
  }

  if (category === 'artifact_write_failed') {
    const canUseWrittenEvidence = hasWrittenRequiredEvidence(manifest, manifestPath);
    const manifestMissing = signal.artifact === 'manifest' || !manifestPath;
    const message = artifactWriteMessage({ canUseWrittenEvidence, manifestMissing });
    return {
      action: canUseWrittenEvidence ? 'retry_artifact_write' : 'stop_and_fix_artifact_output',
      category,
      retryable: canUseWrittenEvidence,
      humanRequired: !canUseWrittenEvidence,
      canUseWrittenEvidence,
      artifact: signal.artifact,
      message,
    };
  }

  if (category) {
    const actionByCategory = {
      approval_required: 'request_approval',
      network: 'restore_network',
      permission: 'fix_permissions',
      timeout: 'retry_with_smaller_scope',
      git_state: 'repair_git_state',
      missing_file: 'restore_missing_file',
      lint_failure: 'fix_lint_failure',
      test_failure: 'fix_test_failure',
      analysis_partial: 'rerun_repository_scan',
      internal_error: 'inspect_error',
    };
    return {
      action: actionByCategory[category] || 'inspect_error',
      category,
      retryable: ['network', 'timeout', 'analysis_partial'].includes(category),
      humanRequired: category === 'approval_required' || category === 'permission',
      canUseWrittenEvidence: hasWrittenRequiredEvidence(manifest, manifestPath),
      artifact: signal.artifact,
      message: messageForCategory(category),
    };
  }

  if (outcome === 'success') {
    return {
      action: 'read_manifest',
      category: null,
      retryable: false,
      humanRequired: false,
      canUseWrittenEvidence: true,
      message: manifestPath
        ? `Read ${manifestPath} for artifact status before opening optional files.`
        : 'Read the written evidence artifacts in manifest order.',
    };
  }

  return {
    action: 'inspect_error',
    category: 'internal_error',
    retryable: false,
    humanRequired: true,
    canUseWrittenEvidence: Boolean(manifestPath),
    message: 'Inspect scan errors before consuming evidence artifacts.',
  };
}

/**
 * Choose a human-readable message advising how to proceed after an artifact write failure.
 * @param {Object} opts
 * @param {boolean} opts.canUseWrittenEvidence - Whether evidence artifacts were successfully written and can be relied on.
 * @param {boolean} opts.manifestMissing - Whether the manifest itself was not written or is missing.
 * @returns {string} A concise instruction message describing the next safe action regarding evidence consumption.
 */
function artifactWriteMessage({ canUseWrittenEvidence, manifestMissing }) {
  if (manifestMissing) {
    return 'Manifest was not written; inspect the reported errors before consuming evidence artifacts.';
  }
  if (canUseWrittenEvidence) {
    return 'Use written evidence cautiously, then retry the failed artifact write.';
  }
  return 'Stop before consuming artifacts; fix artifact output so required evidence is available.';
}

/**
 * Provide a concise, human-readable guidance message for an operational friction category.
 * @param {string} category - Normalised operational friction category (e.g. `approval_required`, `network`, `permission`, `timeout`, `git_state`, `missing_file`, `lint_failure`, `test_failure`, `analysis_partial`).
 * @returns {string} A short guidance message appropriate for the provided category; a generic inspection prompt is returned for unknown categories.
 */
function messageForCategory(category) {
  switch (category) {
    case 'approval_required':
      return 'Request the required approval, then rerun the scan.';
    case 'network':
      return 'Restore network access or rerun with local-only evidence.';
    case 'permission':
      return 'Fix filesystem or sandbox permissions before rerunning the scan.';
    case 'timeout':
      return 'Retry with a smaller scope or investigate the timed-out operation.';
    case 'git_state':
      return 'Repair the repository git state before trusting PR evidence.';
    case 'missing_file':
      return 'Restore the missing file or remove the stale reference, then rerun.';
    case 'lint_failure':
      return 'Fix the lint failure before using this as validation evidence.';
    case 'test_failure':
      return 'Fix the failing test before using this as validation evidence.';
    case 'analysis_partial':
      return 'Rerun repository analysis after fixing the analysis blocker.';
    default:
      return 'Inspect the error before consuming evidence artifacts.';
  }
}

module.exports = {
  buildNextSafeAction,
  normalizeOperationalFriction,
};
