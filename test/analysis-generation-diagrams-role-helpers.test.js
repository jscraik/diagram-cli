const { expect } = require('chai');
const {
  emitClassStyle,
  emitSubgraph,
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
});
