const { expect } = require('chai');
const {
  buildNextSafeAction,
  normalizeOperationalFriction,
} = require('../src/commands/operational-friction');

describe('operational friction signals', () => {
  it('normalizes common blocker messages to stable categories', () => {
    expect(normalizeOperationalFriction({ message: 'Operation not permitted' })).to.equal('permission');
    expect(normalizeOperationalFriction({ message: 'request timed out after 120000ms' })).to.equal('timeout');
    expect(normalizeOperationalFriction({ message: 'connect ETIMEDOUT 10.0.0.1:443' })).to.equal('timeout');
    expect(normalizeOperationalFriction({ message: 'No such file or directory' })).to.equal('missing_file');
    expect(normalizeOperationalFriction({ message: 'connect ECONNREFUSED 127.0.0.1:3000' })).to.equal('network');
    expect(normalizeOperationalFriction({ message: 'getaddrinfo ENOTFOUND api.example.test' })).to.equal('network');
    expect(normalizeOperationalFriction({ message: 'bad revision HEAD~5' })).to.equal('git_refs_missing');
    expect(normalizeOperationalFriction({ message: 'analysis failed for target' })).to.equal('analysis_partial');
    expect(normalizeOperationalFriction({ message: 'failed to write artifact' })).to.equal('artifact_write_failed');
    expect(normalizeOperationalFriction({ message: 'please analyze this output' })).to.equal('internal_error');
    expect(normalizeOperationalFriction({ message: 'write a short note' })).to.equal('internal_error');
  });

  it('builds fetch-ref guidance for missing PR refs', () => {
    const action = buildNextSafeAction({
      outcome: 'partial',
      manifestPath: '.diagram/manifest.json',
      errors: [{
        artifact: 'pr-impact',
        category: 'git_refs_missing',
        message: 'bad revision missing-ref',
      }],
      prSummary: {
        status: 'failed',
        errorCategory: 'git_refs_missing',
      },
    });

    expect(action).to.deep.include({
      action: 'fetch_refs',
      category: 'git_refs_missing',
      retryable: true,
      humanRequired: false,
      canUseWrittenEvidence: true,
      fallbackAction: 'rerun_repository_scan',
    });
  });

  it('distinguishes retryable artifact writes from missing required evidence', () => {
    const stopOnMissingAgentContext = buildNextSafeAction({
      outcome: 'partial',
      manifestPath: '.diagram/manifest.json',
      manifest: {
        artifacts: [
          { id: 'brief', status: 'written' },
          { id: 'agent-context', status: 'failed' },
        ],
      },
      errors: [{
        artifact: 'agent-context',
        category: 'artifact_write_failed',
        message: 'EISDIR: illegal operation on a directory',
      }],
    });
    const retry = buildNextSafeAction({
      outcome: 'partial',
      manifestPath: '.diagram/manifest.json',
      manifest: {
        artifacts: [
          { id: 'brief', status: 'written' },
          { id: 'agent-context', status: 'written' },
          { id: 'report', status: 'failed' },
        ],
      },
      errors: [{
        artifact: 'report',
        category: 'artifact_write_failed',
        message: 'EISDIR: illegal operation on a directory',
      }],
    });
    const stop = buildNextSafeAction({
      outcome: 'partial',
      manifestPath: null,
      manifest: {
        artifacts: [
          { id: 'manifest', status: 'failed' },
          { id: 'brief', status: 'written' },
        ],
      },
      errors: [{
        artifact: 'manifest',
        category: 'artifact_write_failed',
        message: 'EISDIR: illegal operation on a directory',
      }],
    });

    expect(stopOnMissingAgentContext).to.deep.include({
      action: 'stop_and_fix_artifact_output',
      category: 'artifact_write_failed',
      retryable: false,
      humanRequired: true,
      canUseWrittenEvidence: false,
      artifact: 'agent-context',
    });
    expect(retry).to.deep.include({
      action: 'retry_artifact_write',
      category: 'artifact_write_failed',
      retryable: true,
      humanRequired: false,
      canUseWrittenEvidence: true,
      artifact: 'report',
    });
    expect(stop).to.deep.include({
      action: 'stop_and_fix_artifact_output',
      category: 'artifact_write_failed',
      retryable: false,
      humanRequired: true,
      canUseWrittenEvidence: false,
      artifact: 'manifest',
    });
  });
});
