const path = require('path');
const { expect } = require('chai');
const policy = require('../.diagram/migration/finalization-policy.json');
const {
  REQUIRED_GATES,
  validateFinalizationPolicy,
} = require('../src/migration/finalization-policy');
const { spawnSync } = require('child_process');

describe('finalization policy', () => {
  it('matches required lifecycle semantics', () => {
    const result = validateFinalizationPolicy(policy);
    expect(result).to.deep.equal({ valid: true, errors: [] });
    for (const gate of REQUIRED_GATES) {
      expect(policy.gatingCriteria).to.include(gate);
    }
  });

  it('rejects weakened compatibility window semantics', () => {
    const weakened = {
      ...policy,
      minimumWindow: {
        ...policy.minimumWindow,
        days: 7,
      },
    };
    const result = validateFinalizationPolicy(weakened);
    expect(result.valid).to.equal(false);
    expect(result.errors).to.include('minimumWindow.days must equal 30');
  });

  it('passes the migration artifact validator script', () => {
    const repoRoot = path.resolve(__dirname, '..');
    const result = spawnSync('node', ['scripts/validate-migration-artifacts.js'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).to.equal(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).to.equal('pass');
    expect(payload.policy).to.equal('.diagram/migration/finalization-policy.json');
  });
});
