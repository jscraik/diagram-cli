const { expect } = require('chai');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

describe('refresh diagram context script', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'refresh-diagram-context.sh');
  const repoRoot = path.resolve(__dirname, '..');

  it('rejects unknown options before running refresh work', () => {
    const result = spawnSync('bash', [scriptPath, '--definitely-unknown'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(result.status).to.equal(2);
    expect(result.stderr).to.include('Unknown option: --definitely-unknown');
  });

  it('reports current context without refresh next steps in CLI check mode', () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'archscope-context-check-'));
    try {
      const scriptsDir = path.join(workspace, 'scripts');
      fs.mkdirSync(scriptsDir, { recursive: true });
      fs.writeFileSync(path.join(scriptsDir, 'refresh-diagram-context.sh'), [
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        'if [[ "$*" == *"--check"* ]]; then',
        '  echo "check: diagram context is current"',
        '  exit 0',
        'fi',
        'echo "ok: refreshed 3 diagrams (changed=false)"',
        '',
      ].join('\n'));

      const result = spawnSync('node', [
        path.join(repoRoot, 'src', 'diagram.js'),
        'context',
        workspace,
        '--check',
      ], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      expect(result.stdout).to.include('Context pack is current');
      expect(result.stdout).to.not.include('Context pack refreshed');
      expect(result.stdout).to.not.include('Next steps:');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
