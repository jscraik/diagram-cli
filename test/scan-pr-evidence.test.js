const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
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
  if (result.error || result.status !== 0) {
    const renderedCommand = [command, ...args].join(' ');
    throw new Error(
      `Command failed: ${renderedCommand}\n`
      + `status: ${result.status}\n`
      + `error: ${result.error?.message || 'none'}\n`
      + `stdout: ${result.stdout || ''}\n`
      + `stderr: ${result.stderr || ''}`
    );
  }
  return result;
}

function createRepo() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'archscope-scan-pr-'));
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('scan PR evidence composition', () => {
  const repoRoot = path.resolve(__dirname, '..');
  let workspace;

  beforeEach(() => {
    workspace = createRepo();
  });

  afterEach(() => {
    if (workspace && fs.existsSync(workspace)) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
    workspace = undefined;
  });

  it('reuses workflow pr output and indexes PR artifacts', () => {
    const result = spawnSync('node', [
      path.join(repoRoot, 'src', 'diagram.js'),
      'scan',
      workspace,
      '--base',
      'HEAD~1',
      '--head',
      'HEAD',
      '--format',
      'json',
      '--deterministic',
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(result.status, result.stderr).to.equal(0);
    const payload = JSON.parse(result.stdout.trim());
    const manifest = payload.data.evidencePack;
    const artifacts = Object.fromEntries(manifest.artifacts.map((entry) => [entry.id, entry]));
    expect(artifacts['pr-impact'].status).to.equal('written');
    expect(artifacts.report.status).to.equal('written');
    expect(manifest.primaryHumanArtifact).to.equal('.diagram/report.html');
    expect(manifest.artifactReadOrder).to.include('.diagram/pr-impact/pr-impact.json');
    expect(payload.data.prImpactPath).to.equal('.diagram/pr-impact/pr-impact.json');
    expect(payload.data.pr.status).to.equal('complete');
    expect(payload.data.pr.base).to.be.a('string');
    expect(payload.data.pr.head).to.be.a('string');
    expect(payload.data.pr.prImpactPath).to.equal('.diagram/pr-impact/pr-impact.json');
    expect(payload.data.pr.reviewerChecks).to.include(
      'Review blast-radius components for transitive side effects.'
    );

    const prImpact = readJson(path.join(workspace, '.diagram', 'pr-impact', 'pr-impact.json'));
    expect(prImpact.changedFiles).to.include('src/index.js');
    expect(prImpact.agentSummary.suggestedReviewerChecks).to.include(
      'Review blast-radius components for transitive side effects.'
    );

    const agentContext = readJson(path.join(workspace, '.diagram', 'agent-context.json'));
    expect(agentContext.mode).to.equal('pr');
    expect(agentContext.pr.reviewerChecks).to.include(
      'Review blast-radius components for transitive side effects.'
    );
    expect(agentContext.risk.level).to.be.a('string');

    const brief = fs.readFileSync(path.join(workspace, '.diagram', 'brief.md'), 'utf8');
    expect(brief).to.include('- Mode: pr scan');
    expect(brief).to.include('- PR base:');
    expect(brief).to.include('- Blast radius:');
    expect(brief).to.include('- Risk reasons:');
    expect(brief).to.include('- Reviewer checks:');
    expect(brief).to.include('- Validation evidence: workflow pr contract reused via .diagram/pr-impact/pr-impact.json');

    const report = fs.readFileSync(path.join(workspace, '.diagram', 'report.html'), 'utf8');
    expect(report).to.include('PR scan');
    expect(report).to.include('Risk And Review Focus');
    expect(report).to.include('Review blast-radius components for transitive side effects.');
  });

  it('preserves repository evidence when PR refs are unavailable', () => {
    const result = spawnSync('node', [
      path.join(repoRoot, 'src', 'diagram.js'),
      'scan',
      workspace,
      '--base',
      'missing-ref',
      '--head',
      'HEAD',
      '--format',
      'json',
      '--deterministic',
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(result.status).to.equal(1);
    const payload = JSON.parse(result.stdout.trim());
    expect(payload.data.outcome).to.equal('partial');
    const artifacts = Object.fromEntries(payload.data.evidencePack.artifacts.map((entry) => [entry.id, entry]));
    expect(artifacts.brief.status).to.equal('written');
    expect(artifacts['agent-context'].status).to.equal('written');
    expect(artifacts.report.status).to.equal('written');
    expect(artifacts['pr-impact'].status).to.equal('failed');
    expect(artifacts['pr-impact'].errorCategory).to.equal('pr_refs_unavailable');
    expect(payload.data.evidencePack.artifactReadOrder).to.not.include('.diagram/pr-impact/pr-impact.json');
    expect(payload.data.pr.status).to.equal('failed');
    expect(payload.data.pr.base).to.equal('missing-ref');
    expect(payload.data.pr.head).to.equal('HEAD');
    expect(payload.data.pr.errorCategory).to.equal('pr_refs_unavailable');
    expect(payload.errors.map((error) => error.category)).to.include('pr_refs_unavailable');
  });

  it('keeps PR artifact paths consistent with custom output directories', () => {
    const result = run('node', [
      path.join(repoRoot, 'src', 'diagram.js'),
      'scan',
      workspace,
      '--base',
      'HEAD~1',
      '--head',
      'HEAD',
      '--output-dir',
      'artifacts/scan',
      '--format',
      'json',
      '--deterministic',
    ], repoRoot);

    expect(result.status, result.stderr).to.equal(0);
    const payload = JSON.parse(result.stdout.trim());
    expect(payload.data.prImpactPath).to.equal('artifacts/scan/pr-impact/pr-impact.json');
    expect(payload.data.pr.prImpactPath).to.equal('artifacts/scan/pr-impact/pr-impact.json');
    expect(fs.existsSync(path.join(workspace, 'artifacts', 'scan', 'pr-impact', 'pr-impact.json'))).to.equal(true);
  });
});
