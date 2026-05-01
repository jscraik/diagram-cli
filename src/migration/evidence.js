const crypto = require('crypto');

const RC_TAG_PATTERN = /^v(\d+)\.(\d+)\.(\d+)-rc\.(\d+)$/;
const RELEASE_ID_PATTERN = /^(\d+)\.(\d+)\.(\d+)-rc\.(\d+)$/;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const MINIMUM_WINDOW_DAYS = 30;
const MINIMUM_RELEASE_CANDIDATES = 2;
const DEFAULT_EVIDENCE_REFS = [
  {
    gate: 'dual_command_identity_available',
    evidence: 'test/command-identity.test.js',
  },
  {
    gate: 'compatibility_path_regression_passed',
    evidence: 'scripts/validate-archscope-readiness.js compatibilityDrill',
  },
  {
    gate: 'machine_command_coverage_manifest_valid',
    evidence: 'scripts/validate-machine-contracts.js',
  },
  {
    gate: 'machine_envelope_conformance_passed',
    evidence: 'test/workflow-pr-machine-envelope.test.js',
  },
  {
    gate: 'migration_evidence_hash_valid',
    evidence: 'scripts/validate-migration-artifacts.js',
  },
  {
    gate: 'append_only_ledger_valid',
    evidence: 'scripts/validate-migration-artifacts.js',
  },
  {
    gate: 'rollback_drill_passed',
    evidence: 'scripts/validate-archscope-readiness.js compatibilityDrill',
  },
];

function sortObjectDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectDeep);
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortObjectDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

function canonicalize(value) {
  return JSON.stringify(sortObjectDeep(value));
}

function withoutContentHash(record) {
  const clone = JSON.parse(JSON.stringify(record));
  delete clone.contentHash;
  return clone;
}

function computeContentHash(record) {
  return crypto
    .createHash('sha256')
    .update(canonicalize(withoutContentHash(record)))
    .digest('hex');
}

function attachContentHash(record) {
  return {
    ...record,
    contentHash: computeContentHash(record),
  };
}

function parseRcTag(tag) {
  const match = RC_TAG_PATTERN.exec(String(tag || ''));
  if (!match) return null;
  const [, major, minor, patch, rc] = match;
  return {
    tag,
    baseVersion: `${major}.${minor}.${patch}`,
    rcNumber: Number.parseInt(rc, 10),
  };
}

function releaseIdToTag(releaseId) {
  if (!RELEASE_ID_PATTERN.test(String(releaseId || ''))) {
    throw new Error(`Invalid releaseId: ${releaseId}`);
  }
  return `v${releaseId}`;
}

function daysBetweenUtc(startUtc, endUtc) {
  if (!UTC_TIMESTAMP_PATTERN.test(String(startUtc || '')) || !UTC_TIMESTAMP_PATTERN.test(String(endUtc || ''))) {
    throw new Error('compatibility window timestamps must be UTC ISO-8601 strings ending in Z');
  }
  const start = Date.parse(startUtc);
  const end = Date.parse(endUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('compatibility window timestamps must be valid UTC date strings');
  }
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

function evaluateRcSequence(releaseCandidateTags, baseVersion) {
  const parsed = releaseCandidateTags
    .map(parseRcTag)
    .filter((entry) => entry && (!baseVersion || entry.baseVersion === baseVersion))
    .sort((a, b) => a.rcNumber - b.rcNumber);
  const rcNumbers = parsed.map((entry) => entry.rcNumber);
  const consecutive = rcNumbers.every((number, index) => (
    index === 0 || number === rcNumbers[index - 1] + 1
  ));
  return {
    baseVersion,
    releaseCandidateTags: parsed.map((entry) => entry.tag),
    releaseCandidateCount: parsed.length,
    rcNumbers,
    consecutive,
  };
}

function evaluateMigrationWindow({
  releaseId,
  compatibilityDeclaredAtUtc,
  evaluatedAtUtc,
  releaseCandidateTags,
  minimumWindowDays = MINIMUM_WINDOW_DAYS,
  minimumReleaseCandidates = MINIMUM_RELEASE_CANDIDATES,
}) {
  const releaseTag = releaseIdToTag(releaseId);
  const releaseRc = parseRcTag(releaseTag);
  const daysElapsed = daysBetweenUtc(compatibilityDeclaredAtUtc, evaluatedAtUtc);
  const rcSequence = evaluateRcSequence(releaseCandidateTags, releaseRc.baseVersion);
  const rcSatisfied = rcSequence.consecutive && rcSequence.releaseCandidateCount >= minimumReleaseCandidates;
  const dayWindowSatisfied = daysElapsed >= minimumWindowDays;
  const satisfied = rcSatisfied && dayWindowSatisfied;

  return {
    compatibilityDeclaredAtUtc,
    evaluatedAtUtc,
    minimumWindowDays,
    minimumReleaseCandidates,
    daysElapsed,
    windowSatisfiedAtUtc: dayWindowSatisfied ? evaluatedAtUtc : null,
    rcSequence,
    satisfied,
  };
}

function buildMigrationReadinessRecord({
  releaseId,
  sourceCommit,
  compatibilityDeclaredAtUtc,
  releaseCandidateTags,
  generatedAtUtc = new Date().toISOString(),
}) {
  const releaseTag = releaseIdToTag(releaseId);
  const compatibilityWindow = evaluateMigrationWindow({
    releaseId,
    compatibilityDeclaredAtUtc,
    evaluatedAtUtc: generatedAtUtc,
    releaseCandidateTags,
  });
  const record = {
    schemaVersion: '1.0',
    releaseId,
    releaseTag,
    sourceCommit,
    generatedAtUtc,
    evaluatedAt: generatedAtUtc,
    migrationState: 'compatibility',
    status: compatibilityWindow.satisfied ? 'eligible' : 'blocked',
    finalizationEligible: compatibilityWindow.satisfied,
    criteria: {
      minimumWindowDays: compatibilityWindow.minimumWindowDays,
      minimumReleaseCandidates: compatibilityWindow.minimumReleaseCandidates,
      releaseCandidateCount: compatibilityWindow.rcSequence.releaseCandidateCount,
      releaseCandidatesConsecutive: compatibilityWindow.rcSequence.consecutive,
      daysElapsed: compatibilityWindow.daysElapsed,
      satisfied: compatibilityWindow.satisfied,
    },
    evidenceRefs: DEFAULT_EVIDENCE_REFS,
    approvals: [],
    compatibilityWindow,
    checks: {
      immutableRecord: true,
      contentHashAlgorithm: 'sha256-canonical-json-without-contentHash',
    },
  };
  return attachContentHash(record);
}

function validateMigrationReadinessRecord(record) {
  const errors = [];
  if (record?.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!RELEASE_ID_PATTERN.test(String(record?.releaseId || ''))) errors.push('releaseId must match X.Y.Z-rc.N');
  if (record?.releaseTag !== `v${record?.releaseId}`) errors.push('releaseTag must equal v<releaseId>');
  if (!record?.sourceCommit) errors.push('sourceCommit is required');
  if (!UTC_TIMESTAMP_PATTERN.test(String(record?.evaluatedAt || ''))) errors.push('evaluatedAt must be a UTC ISO-8601 string ending in Z');
  if (record?.migrationState !== 'compatibility') errors.push('migrationState must be compatibility');
  if (!['eligible', 'blocked'].includes(record?.status)) errors.push('status must be eligible or blocked');
  if (!Array.isArray(record?.evidenceRefs)) errors.push('evidenceRefs must be an array');
  if (!Array.isArray(record?.approvals)) errors.push('approvals must be an array');
  if (record?.contentHash !== computeContentHash(record || {})) errors.push('contentHash mismatch');
  const window = record?.compatibilityWindow || {};
  if (window.minimumWindowDays !== MINIMUM_WINDOW_DAYS) errors.push('minimumWindowDays must equal 30');
  if (window.minimumReleaseCandidates !== MINIMUM_RELEASE_CANDIDATES) errors.push('minimumReleaseCandidates must equal 2');
  if (!window.rcSequence?.consecutive) errors.push('release candidates must be consecutive');
  if ((window.rcSequence?.releaseCandidateCount || 0) < MINIMUM_RELEASE_CANDIDATES) {
    errors.push('releaseCandidateCount must meet minimumReleaseCandidates');
  }
  if ((window.daysElapsed || 0) < MINIMUM_WINDOW_DAYS) {
    errors.push('daysElapsed must meet minimumWindowDays');
  }
  const expectedSatisfied = window.rcSequence?.consecutive === true
    && (window.rcSequence?.releaseCandidateCount || 0) >= MINIMUM_RELEASE_CANDIDATES
    && (window.daysElapsed || 0) >= MINIMUM_WINDOW_DAYS;
  if (window.satisfied !== expectedSatisfied) {
    errors.push('compatibilityWindow.satisfied does not match derived eligibility');
  }
  if (record?.status !== (expectedSatisfied ? 'eligible' : 'blocked')) {
    errors.push('status does not match compatibilityWindow.satisfied');
  }
  if (record?.finalizationEligible !== expectedSatisfied) {
    errors.push('finalizationEligible does not match compatibilityWindow.satisfied');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateLedgerAppendOnly(previousLedger, nextLedger) {
  const previous = Array.isArray(previousLedger) ? previousLedger : [];
  const next = Array.isArray(nextLedger) ? nextLedger : [];
  if (next.length < previous.length) {
    return { valid: false, errors: ['ledger cannot shrink'] };
  }
  for (let index = 0; index < previous.length; index += 1) {
    if (canonicalize(previous[index]) !== canonicalize(next[index])) {
      return { valid: false, errors: [`ledger entry changed at index ${index}`] };
    }
  }
  return { valid: true, errors: [] };
}

module.exports = {
  MINIMUM_RELEASE_CANDIDATES,
  MINIMUM_WINDOW_DAYS,
  DEFAULT_EVIDENCE_REFS,
  attachContentHash,
  buildMigrationReadinessRecord,
  computeContentHash,
  evaluateMigrationWindow,
  parseRcTag,
  releaseIdToTag,
  validateLedgerAppendOnly,
  validateMigrationReadinessRecord,
};
