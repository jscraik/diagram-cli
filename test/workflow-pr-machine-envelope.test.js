const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Diagram Test',
      GIT_AUTHOR_EMAIL: 'diagram-test@example.com',
      GIT_COMMITTER_NAME: 'Diagram Test',
      GIT_COMMITTER_EMAIL: 'diagram-test@example.com',
    },
  });
}

function createRepo() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-pr-envelope-'));
  fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });

  run('git', ['init'], workspace);
  fs.writeFileSync(path.join(workspace, 'src', 'index.js'), 'module.exports = { value: 1 };\n');
  run('git', ['add', '.'], workspace);
  run('git', ['commit', '-m', 'initial'], workspace);

  fs.writeFileSync(
    path.join(workspace, 'src', 'index.js'),
    "const util = require('./util');\nmodule.exports = util;\n"
  );
  fs.writeFileSync(path.join(workspace, 'src', 'util.js'), 'module.exports = { value: 2 };\n');
  run('git', ['add', '.'], workspace);
  run('git', ['commit', '-m', 'change architecture'], workspace);

  return workspace;
}

describe('workflow pr machine envelope', () => {
  const repoRoot = path.resolve(__dirname, '..');
  let workspace;

  beforeEach(() => {
    workspace = createRepo();
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it('emits the canonical envelope with legacy PR payload under data', () => {
    const result = run(
      'node',
      [
        path.join(repoRoot, 'src', 'diagram.js'),
        'workflow',
        'pr',
        workspace,
        '--base',
        'HEAD~1',
        '--head',
        'HEAD',
        '--format',
        'json',
        '--deterministic',
      ],
      repoRoot
    );

    expect(result.status, result.stderr).to.equal(0);
    const payload = JSON.parse(result.stdout.trim());
    expect(payload.schemaVersion).to.equal('1.0');
    expect(payload.command).to.equal('workflow-pr');
    expect(payload.status).to.equal('success');
    expect(payload).to.not.have.property('base');
    expect(payload.data.prImpact.base).to.be.a('string');
    expect(payload.data.prImpact.head).to.be.a('string');
    expect(payload.data.prImpact.changedFiles).to.include('src/index.js');
    expect(payload.agentSummary.changedComponents).to.be.a('number');
  });

  it('keeps no-change workflow output in the same envelope', () => {
    const result = run(
      'node',
      [
        path.join(repoRoot, 'src', 'diagram.js'),
        'workflow',
        'pr',
        workspace,
        '--base',
        'HEAD',
        '--head',
        'HEAD',
        '--format',
        'json',
        '--deterministic',
      ],
      repoRoot
    );

    expect(result.status, result.stderr).to.equal(0);
    const payload = JSON.parse(result.stdout.trim());
    expect(payload.schemaVersion).to.equal('1.0');
    expect(payload.command).to.equal('workflow-pr');
    expect(payload.data.prImpact._meta.status).to.equal('no_changes');
    expect(payload.data.prImpact.changedFiles).to.deep.equal([]);
  });
});
