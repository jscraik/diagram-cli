const { expect } = require('chai');
const {
  mergeRoleComponents,
} = require('../src/core/analysis-generation-utils-graph');

describe('analysis generation graph utils', () => {
  it('merges role-based components with stable order and dedupe', () => {
    const shared = { name: 'shared', roleTags: ['security', 'auth'] };
    const authOnly = { name: 'auth', roleTags: ['auth'] };
    const securityOnly = { name: 'security', roleTags: ['security'] };
    const integrations = { name: 'integrations', roleTags: ['integrations'] };

    const components = [shared, authOnly, securityOnly, integrations];
    const merged = mergeRoleComponents(components, ['security', 'auth', 'integrations']);

    expect(merged).to.deep.equal([shared, securityOnly, authOnly, integrations]);
  });

  it('respects per-role limits while merging', () => {
    const firstUser = { name: 'user-1', roleTags: ['user'] };
    const secondUser = { name: 'user-2', roleTags: ['user'] };
    const thirdUser = { name: 'user-3', roleTags: ['user'] };
    const agent = { name: 'agent', roleTags: ['agent'] };

    const components = [agent, firstUser, secondUser, thirdUser];
    const merged = mergeRoleComponents(components, ['agent', { role: 'user', limit: 2 }]);

    expect(merged).to.deep.equal([agent, firstUser, secondUser]);
  });
});
