const { expect } = require('chai');
const { inferRoleTags } = require('../src/core/analysis-generation');

describe('role tag inference', () => {
  it('does not infer sensitive tags from generic command help text content alone', () => {
    const tags = inferRoleTags(
      'src/commands/generate.js',
      'generate.js',
      'Diagram type: architecture, sequence, dependency, class, flow, database, auth, security',
      [],
      'module'
    );

    expect(tags).to.not.include('database');
    expect(tags).to.not.include('auth');
    expect(tags).to.not.include('security');
  });

  it('infers database tag from structural path/name signals', () => {
    const tags = inferRoleTags(
      'src/db/repository.js',
      'repository.js',
      '',
      [],
      'module'
    );

    expect(tags).to.include('database');
  });

  it('infers auth tag from structural auth path signals', () => {
    const tags = inferRoleTags(
      'src/auth/session-manager.js',
      'session-manager.js',
      '',
      [],
      'module'
    );

    expect(tags).to.include('auth');
  });
});
