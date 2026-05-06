const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');

function createWorkspace() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'archscope-agent-context-'));
  fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'src', 'index.js'), 'console.log("hello");\n');
  return workspace;
}

function assertHasRequiredFields(payload, requiredFields) {
  for (const field of requiredFields) {
    expect(payload, field).to.have.property(field);
  }
}

describe('agent context contract', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('emits the required v1 fields and schema contract file', () => {
    const workspace = createWorkspace();
    try {
      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'scan',
        workspace,
        '--deterministic',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      const schema = JSON.parse(fs.readFileSync(
        path.join(repoRoot, 'src', 'schema', 'agent-context-v1.schema.json'),
        'utf8'
      ));
      expect(schema.required).to.have.members([
        'schemaVersion',
        'generatedBy',
        'mode',
        'summary',
        'artifacts',
        'components',
        'readOrder',
        'agentInstructions',
        'warnings',
        'errors',
        'partial',
      ]);

      const context = JSON.parse(fs.readFileSync(
        path.join(workspace, '.diagram', 'agent-context.json'),
        'utf8'
      ));
      assertHasRequiredFields(context, schema.required);
      expect(context.schemaVersion).to.equal('1.0');
      expect(context.summary).to.include.keys([
        'componentCount',
        'entryPointCount',
        'totalFilesFound',
        'languages',
        'architectureAreas',
      ]);
      expect(context.components).to.deep.equal([{
        kind: 'component',
        name: 'index',
        path: 'src/index.js',
        type: 'file',
        roleTags: ['general'],
        dependencyCount: 0,
        source: 'analysis.components',
        derivation: 'static-analysis',
      }]);
      const paths = context.artifacts.map((entry) => entry.path);
      expect(paths).to.deep.equal([...paths].sort());
      expect(new Set(paths).size).to.equal(paths.length);
      expect(context.errors).to.deep.equal([]);
      expect(context.agentInstructions).to.include.keys([
        'readFirst',
        'safeToSkip',
        'beforeEditing',
        'whenBlocked',
        'partialEvidence',
        'nextSafeAction',
      ]);
      expect(context.agentInstructions.readFirst).to.deep.equal([
        '.diagram/manifest.json',
        '.diagram/brief.md',
        '.diagram/agent-context.json',
      ]);
      expect(context.agentInstructions.safeToSkip).to.include('.diagram/architecture.mmd');
      expect(context.agentInstructions.safeToSkip).to.include('.diagram/report.html');
      expect(context.agentInstructions.beforeEditing).to.include(
        'Read only artifacts whose status is written before using their contents.'
      );
      expect(context.agentInstructions.whenBlocked.git_refs_missing).to.deep.include({
        action: 'fetch_refs',
        retryable: true,
        humanRequired: false,
      });
      expect(context.agentInstructions.partialEvidence.status).to.equal('complete');
      expect(context.agentInstructions.nextSafeAction).to.deep.include({
        action: 'read_manifest',
        category: null,
        retryable: false,
        humanRequired: false,
        canUseWrittenEvidence: true,
      });
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
