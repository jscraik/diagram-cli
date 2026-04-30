const path = require('path');
const fs = require('fs');
const { expect } = require('chai');
const { spawnSync } = require('child_process');

describe('archscope readiness validation', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('passes compatibility and contract checks without claiming finalization readiness', () => {
    const result = spawnSync('node', ['scripts/validate-archscope-readiness.js'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).to.equal(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).to.equal('pass');
    expect(payload.migrationState).to.equal('compatibility');
    expect(payload.finalizationReady).to.equal(false);
    expect(payload.compatibilityDrill.status).to.equal('pass');
  });

  it('fails closed when finalization readiness is required without release evidence', () => {
    const result = spawnSync('node', [
      'scripts/validate-archscope-readiness.js',
      '--require-finalization-ready',
      '--release-id',
      '9.9.9-rc.2',
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(result.status).to.equal(1);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).to.equal('blocked');
    expect(payload.finalizationReady).to.equal(false);
    expect(payload.releaseEvidence.errors[0]).to.include('missing release record');
  });

  it('treats promoted release evidence retries as idempotent', () => {
    const releaseId = '9.9.9-rc.2';
    const cleanupPaths = [
      path.join(repoRoot, '.diagram', 'migration', 'releases', releaseId),
      path.join(repoRoot, '.diagram', 'migration', 'releases', 'ledger.json'),
      path.join(repoRoot, '.diagram', 'migration', 'migration-readiness.json'),
    ];
    try {
      const args = [
        'scripts/record-migration-readiness.js',
        '--release-id',
        releaseId,
        '--source-commit',
        'testcommit',
        '--compatibility-declared-at',
        '2026-04-01T00:00:00.000Z',
        '--generated-at',
        '2026-05-02T00:00:00.000Z',
        '--rc-tags',
        'v9.9.9-rc.1,v9.9.9-rc.2',
        '--promote',
      ];
      const first = spawnSync('node', args, { cwd: repoRoot, encoding: 'utf8' });
      const second = spawnSync('node', args, { cwd: repoRoot, encoding: 'utf8' });
      expect(first.status, first.stderr).to.equal(0);
      expect(second.status, second.stderr).to.equal(0);

      const readiness = spawnSync('node', [
        'scripts/validate-archscope-readiness.js',
        '--release-id',
        releaseId,
        '--require-finalization-ready',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(readiness.status, readiness.stderr).to.equal(0);
      expect(JSON.parse(readiness.stdout).finalizationReady).to.equal(true);
    } finally {
      for (const cleanupPath of cleanupPaths) {
        fs.rmSync(cleanupPath, { recursive: true, force: true });
      }
    }
  });
});
