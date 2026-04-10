const { expect } = require('chai');
const {
  emitClassStyle,
  emitRoleClassStyle,
  emitSeedNodesWithIngress,
  emitSubgraph,
  emitSubgraphSpecs,
} = require('../src/core/analysis-generation-diagrams-role-helpers');

describe('analysis generation role diagram helpers', () => {
  it('emits subgraph nodes and returns true when components are present', () => {
    const lines = [];
    const components = [{ name: 'alpha' }, { name: 'beta' }];

    const emitted = emitSubgraph(
      lines,
      'Detected',
      'Detected Components',
      components,
      (_component, safe) => `${safe}["node"]`
    );

    expect(emitted).to.equal(true);
    expect(lines[0]).to.equal('  subgraph Detected["Detected Components"]');
    expect(lines[lines.length - 1]).to.equal('  end');
    expect(lines).to.have.lengthOf(4);
  });

  it('emits class style and optional class assignment', () => {
    const lines = [];

    emitClassStyle(lines, 'demoNode', '#111', '#fff', ['NodeA', 'NodeB']);
    emitClassStyle(lines, 'emptyNode', '#222', '#eee', []);

    expect(lines).to.deep.equal([
      '  classDef demoNode fill:#111,color:#fff',
      '  class NodeA,NodeB demoNode',
      '  classDef emptyNode fill:#222,color:#eee',
    ]);
  });

  it('emits role class style from role palette with general fallback', () => {
    const lines = [];

    emitRoleClassStyle(lines, 'agentNode', 'agent', ['AgentA'], {
      agent: { fill: '#123', color: '#eee' },
      general: { fill: '#555', color: '#fff' },
    });
    emitRoleClassStyle(lines, 'unknownNode', 'missing', ['X'], {
      general: { fill: '#555', color: '#fff' },
    });

    expect(lines).to.deep.equal([
      '  classDef agentNode fill:#123,color:#eee',
      '  class AgentA agentNode',
      '  classDef unknownNode fill:#555,color:#fff',
      '  class X unknownNode',
    ]);
  });

  it('emits seed nodes with deduped ingress edges', () => {
    const lines = [];
    const edges = new Set();
    const first = { name: 'auth-service' };
    const second = { name: 'token-checker' };
    const safeNames = new Map([
      [first, 'AuthSvc'],
      [second, 'TokenChecker'],
    ]);
    const nodeIds = [];

    emitSeedNodesWithIngress(lines, [first, first, second], safeNames, {
      nodeIds,
      renderNode: (_component, safe) => `${safe}["node"]`,
      ingressFrom: 'Boundary',
      edges,
    });

    expect(lines).to.deep.equal([
      '  AuthSvc["node"]',
      '  Boundary --> AuthSvc',
      '  AuthSvc["node"]',
      '  TokenChecker["node"]',
      '  Boundary --> TokenChecker',
    ]);
    expect(nodeIds).to.deep.equal(['AuthSvc', 'AuthSvc', 'TokenChecker']);
  });

  it('emits all non-empty subgraph specs in order', () => {
    const lines = [];
    const first = [{ name: 'one' }];
    const second = [];
    const third = [{ name: 'two' }];
    const specs = [
      { id: 'A', title: 'First', components: first, renderNode: (_component, safe) => `${safe}["A"]` },
      { id: 'B', title: 'Second', components: second, renderNode: (_component, safe) => `${safe}["B"]` },
      { id: 'C', title: 'Third', components: third, renderNode: (_component, safe) => `${safe}["C"]` },
    ];

    const emitted = emitSubgraphSpecs(lines, specs);

    expect(emitted).to.have.lengthOf(2);
    expect(emitted.map((spec) => spec.id)).to.deep.equal(['A', 'C']);
    expect(lines[0]).to.equal('  subgraph A["First"]');
    expect(lines[1]).to.match(/^ {4}one(?:_[a-f0-9]+)?\["A"\]$/);
    expect(lines[2]).to.equal('  end');
    expect(lines[3]).to.equal('  subgraph C["Third"]');
    expect(lines[4]).to.match(/^ {4}two(?:_[a-f0-9]+)?\["C"\]$/);
    expect(lines[5]).to.equal('  end');
  });
});
