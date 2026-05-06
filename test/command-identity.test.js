const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');
const {
  CANONICAL_COMMAND_NAME,
  COMPATIBILITY_COMMAND_NAME,
  COMPATIBILITY_NOTICE,
  getInvocationName,
  isCompatibilityInvocation,
} = require('../src/diagram.js');
const packageJson = require('../package.json');

describe('command identity and compatibility', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('publishes canonical and compatibility bin names', () => {
    expect(packageJson.bin).to.include({
      [CANONICAL_COMMAND_NAME]: 'src/diagram.js',
      [COMPATIBILITY_COMMAND_NAME]: 'src/diagram.js',
    });
    expect(packageJson.description).to.equal('Generate architecture evidence for humans and AI agents');
  });

  it('detects compatibility invocation by argv script name', () => {
    expect(getInvocationName(['node', '/tmp/diagram'])).to.equal(COMPATIBILITY_COMMAND_NAME);
    expect(getInvocationName(['node', '/tmp/archscope'])).to.equal(CANONICAL_COMMAND_NAME);
    expect(getInvocationName(['node', '/repo/src/diagram.js'], { _: '/tmp/diagram' })).to.equal(COMPATIBILITY_COMMAND_NAME);
    expect(isCompatibilityInvocation(['node', '/tmp/diagram'])).to.equal(true);
    expect(isCompatibilityInvocation(['node', '/tmp/archscope'])).to.equal(false);
    expect(isCompatibilityInvocation(['node', '/repo/src/diagram.js'], { _: '/tmp/diagram' })).to.equal(true);
  });

  it('uses archscope in help and unknown-command guidance', () => {
    const help = spawnSync('node', ['src/diagram.js', '--help'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(help.status, help.stderr).to.equal(0);
    expect(help.stdout).to.include(`Usage: ${CANONICAL_COMMAND_NAME}`);
    expect(help.stdout).to.include('Generate architecture evidence for humans and AI agents');
    expect(help.stdout).to.not.include(`Usage: ${COMPATIBILITY_COMMAND_NAME}`);

    const unknown = spawnSync('node', ['src/diagram.js', 'unknown-command'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(unknown.status).to.equal(1);
    expect(unknown.stderr).to.include(`${CANONICAL_COMMAND_NAME} analyze [path]`);
    expect(unknown.stderr).to.include(`${CANONICAL_COMMAND_NAME} agent [path]`);
    expect(unknown.stderr).to.include(`${CANONICAL_COMMAND_NAME} agent-pr [path]`);
    expect(unknown.stderr).to.include('Optional advanced media commands:');
    expect(unknown.stderr).to.include(`${CANONICAL_COMMAND_NAME} generate-video [path]`);
    expect(unknown.stderr).to.include(`Use ${CANONICAL_COMMAND_NAME} --help`);

    const agentPrIndex = unknown.stderr.indexOf(`${CANONICAL_COMMAND_NAME} agent-pr [path]`);
    const agentIndex = unknown.stderr.indexOf(`${CANONICAL_COMMAND_NAME} agent [path]`);
    const analyzeIndex = unknown.stderr.indexOf(`${CANONICAL_COMMAND_NAME} analyze [path]`);
    const generateIndex = unknown.stderr.indexOf(`${CANONICAL_COMMAND_NAME} generate [path]`);
    const mediaHeaderIndex = unknown.stderr.indexOf('Optional advanced media commands:');
    const videoIndex = unknown.stderr.indexOf(`${CANONICAL_COMMAND_NAME} generate-video [path]`);

    expect(agentPrIndex).to.be.lessThan(analyzeIndex);
    expect(agentIndex).to.be.lessThan(analyzeIndex);
    expect(agentPrIndex).to.be.lessThan(generateIndex);
    expect(mediaHeaderIndex).to.be.lessThan(videoIndex);
    expect(generateIndex).to.be.lessThan(mediaHeaderIndex);
  });

  it('makes placeholder validation scripts explicit machine-readable no-ops', () => {
    for (const scriptName of ['lint', 'typecheck', 'docs:lint']) {
      expect(packageJson.scripts[scriptName]).to.include("status:'not_configured'");
      expect(packageJson.scripts[scriptName]).to.include(`check:'${scriptName}'`);
    }
  });

  it('keeps compatibility notices on stderr so JSON stdout remains parseable', () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'archscope-compat-json-'));
    const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archscope-compat-bin-'));

    try {
      fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
      fs.writeFileSync(path.join(workspace, 'src', 'index.js'), 'module.exports = { ok: true };\n');
      const compatibilityBin = path.join(binDir, COMPATIBILITY_COMMAND_NAME);
      fs.symlinkSync(path.join(repoRoot, 'src', 'diagram.js'), compatibilityBin);

      const result = spawnSync(
        'node',
        [compatibilityBin, 'analyze', workspace, '--format', 'json'],
        {
          cwd: repoRoot,
          encoding: 'utf8',
        }
      );

      expect(result.status, result.stderr).to.equal(0);
      expect(result.stderr).to.include(COMPATIBILITY_NOTICE);
      expect(() => JSON.parse(result.stdout.trim())).to.not.throw();
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
      fs.rmSync(binDir, { recursive: true, force: true });
    }
  });
});
