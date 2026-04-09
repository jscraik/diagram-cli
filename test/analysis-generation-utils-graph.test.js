const { expect } = require('chai');
const {
  mergeRoleComponents,
  buildReverseDependencyIndex,
  collectConnectedComponents,
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

  it('builds reverse dependency index for fast lookup', () => {
    const database = { name: 'db', dependencies: [] };
    const service = { name: 'svc', dependencies: ['db'] };
    const worker = { name: 'worker', dependencies: ['db'] };
    const index = buildReverseDependencyIndex([database, service, worker]);

    expect(index.has('db')).to.equal(true);
    expect(index.get('db')).to.deep.equal([service, worker]);
  });

  it('includes reverse-dependent neighbors when collecting connected components', () => {
    const root = { name: 'root', dependencies: ['shared'] };
    const shared = { name: 'shared', dependencies: [] };
    const downstream = { name: 'downstream', dependencies: ['shared'] };
    const isolated = { name: 'isolated', dependencies: [] };

    const connected = collectConnectedComponents(
      [root, shared, downstream, isolated],
      [root],
      2,
      10
    );

    expect(connected).to.include(root);
    expect(connected).to.include(shared);
    expect(connected).to.include(downstream);
    expect(connected).to.not.include(isolated);
  });
});
