const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');
const {
  buildArchitectureReportHtml,
  hrefForArtifact,
} = require('../src/renderers/report-html');

function createWorkspace(prefix = 'archscope-scan-report-') {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(workspace, 'src', 'services'), { recursive: true });
  fs.writeFileSync(
    path.join(workspace, 'src', 'index.js'),
    "const service = require('./services/service');\nservice.run();\n"
  );
  fs.writeFileSync(
    path.join(workspace, 'src', 'services', 'service.js'),
    'exports.run = () => "ok";\n'
  );
  return workspace;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('scan report.html artifact', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('writes a static HTML report and promotes it as the primary human artifact', () => {
    const workspace = createWorkspace();
    try {
      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'scan',
        workspace,
        '--format',
        'json',
        '--deterministic',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      const manifest = readJson(path.join(workspace, '.diagram', 'manifest.json'));
      const reportPath = path.join(workspace, '.diagram', 'report.html');
      const report = fs.readFileSync(reportPath, 'utf8');
      const artifacts = Object.fromEntries(manifest.artifacts.map((entry) => [entry.id, entry]));

      expect(artifacts.report.status).to.equal('written');
      expect(manifest.primaryHumanArtifact).to.equal('.diagram/report.html');
      expect(report).to.include('<!doctype html>');
      expect(report).to.include('<title>Archscope Evidence Report</title>');
      expect(report).to.include('<meta name="viewport" content="width=device-width, initial-scale=1">');
      expect(report).to.include('Evidence Status');
      expect(report).to.include('Architecture Components');
      expect(report).to.include('Dependency Neighborhood');
      expect(report).to.include('Raw Artifacts');
      expect(report).to.include('href="manifest.json"');
      expect(report).to.include('href="agent-context.json"');
      expect(report).to.include('href="architecture.mmd"');
      expect(report).to.not.include('href="pr-impact/pr-impact.json"');
      expect(report).to.not.match(/<(?:link|script|img)[^>]+(?:href|src)\s*=\s*["']https?:\/\//i);
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('falls back to brief.md when report generation cannot write', () => {
    const workspace = createWorkspace();
    try {
      fs.mkdirSync(path.join(workspace, '.diagram', 'report.html'), { recursive: true });

      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'scan',
        workspace,
        '--format',
        'json',
        '--deterministic',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status).to.equal(1);
      const payload = JSON.parse(result.stdout.trim());
      const artifacts = Object.fromEntries(payload.data.evidencePack.artifacts.map((entry) => [entry.id, entry]));
      expect(payload.data.outcome).to.equal('partial');
      expect(payload.data.evidencePack.primaryHumanArtifact).to.equal('.diagram/brief.md');
      expect(artifacts.report.status).to.equal('failed');
      expect(artifacts.report.reason).to.equal('write_failure');
      expect(artifacts.report.errorCategory).to.equal('artifact_write_failed');
      expect(artifacts.brief.status).to.equal('written');
      expect(artifacts['agent-context'].status).to.equal('written');
      expect(payload.errors.map((error) => error.artifact)).to.include('report');
      expect(payload.errors.map((error) => error.category)).to.include('artifact_write_failed');

      const agentContext = readJson(path.join(workspace, '.diagram', 'agent-context.json'));
      const reportEntry = agentContext.artifacts.find((entry) => entry.id === 'report');
      expect(reportEntry.status).to.equal('failed');
      expect(reportEntry.errorCategory).to.equal('artifact_write_failed');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('escapes report values and keeps artifact links relative to the report file', () => {
    const manifest = {
      outputDirectory: '.diagram',
      artifactReadOrder: ['.diagram/manifest.json', '.diagram/brief.md', '.diagram/agent-context.json'],
      primaryAgentArtifact: '.diagram/agent-context.json',
      validation: { status: 'not_run', summary: 'scan only' },
      artifacts: [
        { id: 'manifest', path: '.diagram/manifest.json', status: 'written', role: 'artifact-index' },
        { id: 'brief', path: '.diagram/brief.md', status: 'written', role: 'primary-human-summary' },
        { id: 'agent-context', path: '.diagram/agent-context.json', status: 'written', role: 'primary-agent-context' },
        { id: 'architecture', path: '.diagram/architecture.mmd', status: 'written', role: 'supporting-diagram' },
        { id: 'report', path: '.diagram/report.html', status: 'written', role: 'human-report' },
        { id: 'pr-impact', path: '.diagram/pr-impact/pr-impact.json', status: 'written', role: 'pr-impact-json' },
      ],
    };
    const html = buildArchitectureReportHtml({
      manifest,
      analysis: {
        components: [{
          name: '<script>alert(1)</script>',
          type: 'module',
          language: 'javascript',
          filePath: 'src/index.js',
          dependencies: ['shared'],
        }],
        totalFilesFound: 1,
      },
      prImpact: {
        risk: { level: 'high' },
        agentSummary: {
          riskReasons: ['auth < boundary'],
          suggestedReviewerChecks: ['review "quotes"'],
        },
      },
    });

    expect(hrefForArtifact(manifest, '.diagram/pr-impact/pr-impact.json')).to.equal('pr-impact/pr-impact.json');
    expect(html).to.include('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).to.include('auth &lt; boundary');
    expect(html).to.include('review &quot;quotes&quot;');
    expect(html).to.include('href="pr-impact/pr-impact.json"');
    expect(html).to.not.include('<script>alert(1)</script>');
  });
});
