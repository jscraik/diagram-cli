const { expect } = require('chai');
const {
  buildMigrationReadinessRecord,
  computeContentHash,
  evaluateMigrationWindow,
  parseRcTag,
  validateLedgerAppendOnly,
  validateMigrationReadinessRecord,
} = require('../src/migration/evidence');

describe('migration evidence', () => {
  it('builds hash-verifiable readiness records', () => {
    const record = buildMigrationReadinessRecord({
      releaseId: '1.2.3-rc.2',
      sourceCommit: 'abc123',
      compatibilityDeclaredAtUtc: '2026-04-01T00:00:00.000Z',
      generatedAtUtc: '2026-05-02T00:00:00.000Z',
      releaseCandidateTags: ['v1.2.3-rc.1', 'v1.2.3-rc.2'],
    });

    expect(record.releaseTag).to.equal('v1.2.3-rc.2');
    expect(record.evaluatedAt).to.equal('2026-05-02T00:00:00.000Z');
    expect(record.status).to.equal('eligible');
    expect(record.finalizationEligible).to.equal(true);
    expect(record.criteria).to.include({
      minimumWindowDays: 30,
      minimumReleaseCandidates: 2,
      releaseCandidateCount: 2,
      releaseCandidatesConsecutive: true,
      daysElapsed: 31,
      satisfied: true,
    });
    expect(record.evidenceRefs.map((entry) => entry.gate)).to.include.members([
      'dual_command_identity_available',
      'compatibility_path_regression_passed',
      'machine_command_coverage_manifest_valid',
      'machine_envelope_conformance_passed',
      'migration_evidence_hash_valid',
      'append_only_ledger_valid',
      'rollback_drill_passed',
    ]);
    expect(record.approvals).to.deep.equal([]);
    expect(record.contentHash).to.equal(computeContentHash(record));
    expect(validateMigrationReadinessRecord(record)).to.deep.equal({ valid: true, errors: [] });
  });

  it('fails validation when immutable content is tampered', () => {
    const record = buildMigrationReadinessRecord({
      releaseId: '1.2.3-rc.2',
      sourceCommit: 'abc123',
      compatibilityDeclaredAtUtc: '2026-04-01T00:00:00.000Z',
      generatedAtUtc: '2026-05-02T00:00:00.000Z',
      releaseCandidateTags: ['v1.2.3-rc.1', 'v1.2.3-rc.2'],
    });
    record.sourceCommit = 'changed';

    const result = validateMigrationReadinessRecord(record);
    expect(result.valid).to.equal(false);
    expect(result.errors).to.include('contentHash mismatch');
  });

  it('evaluates RC sequence and UTC window rules', () => {
    expect(parseRcTag('v1.2.3-rc.4')).to.include({
      baseVersion: '1.2.3',
      rcNumber: 4,
    });

    const early = evaluateMigrationWindow({
      releaseId: '1.2.3-rc.2',
      compatibilityDeclaredAtUtc: '2026-04-01T00:00:00.000Z',
      evaluatedAtUtc: '2026-04-15T00:00:00.000Z',
      releaseCandidateTags: ['v1.2.3-rc.1', 'v1.2.3-rc.2'],
    });
    expect(early.satisfied).to.equal(false);
    expect(early.daysElapsed).to.equal(14);

    const gap = evaluateMigrationWindow({
      releaseId: '1.2.3-rc.3',
      compatibilityDeclaredAtUtc: '2026-04-01T00:00:00.000Z',
      evaluatedAtUtc: '2026-05-02T00:00:00.000Z',
      releaseCandidateTags: ['v1.2.3-rc.1', 'v1.2.3-rc.3'],
    });
    expect(gap.satisfied).to.equal(false);
    expect(gap.rcSequence.consecutive).to.equal(false);
  });

  it('rejects non-UTC compatibility window timestamps', () => {
    expect(() => evaluateMigrationWindow({
      releaseId: '1.2.3-rc.2',
      compatibilityDeclaredAtUtc: '2026-04-01',
      evaluatedAtUtc: '2026-05-02T00:00:00.000Z',
      releaseCandidateTags: ['v1.2.3-rc.1', 'v1.2.3-rc.2'],
    })).to.throw('UTC ISO-8601');
  });

  it('rejects ledger rewrites while allowing append-only updates', () => {
    const before = [{ releaseId: '1.2.3-rc.1', contentHash: 'aaa' }];
    const after = [...before, { releaseId: '1.2.3-rc.2', contentHash: 'bbb' }];
    expect(validateLedgerAppendOnly(before, after)).to.deep.equal({ valid: true, errors: [] });

    const rewritten = [{ releaseId: '1.2.3-rc.1', contentHash: 'changed' }];
    const result = validateLedgerAppendOnly(before, rewritten);
    expect(result.valid).to.equal(false);
    expect(result.errors[0]).to.include('ledger entry changed');
  });
});
