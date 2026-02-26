#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  getOpenCommand,
  getNpxCommandCandidates,
  getFfmpegCommandCandidates
} = require('../src/utils/commands');

const CLI_PATH = path.join(__dirname, '..', 'src', 'diagram.js');

function runCLI(args, cwd) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8'
  });
}

function run() {
  // Cross-platform command selection tests
  assert.deepStrictEqual(getOpenCommand('https://example.com', 'darwin'), {
    cmd: 'open',
    args: ['https://example.com']
  });
  assert.deepStrictEqual(getOpenCommand('https://example.com', 'win32'), {
    cmd: 'explorer.exe',
    args: ['https://example.com']
  });
  assert.deepStrictEqual(getOpenCommand('https://example.com', 'linux'), {
    cmd: 'xdg-open',
    args: ['https://example.com']
  });
  assert.deepStrictEqual(getNpxCommandCandidates('win32'), ['npx.cmd', 'npx']);
  assert.deepStrictEqual(getNpxCommandCandidates('linux'), ['npx']);
  assert.ok(
    getFfmpegCommandCandidates('win32', 'C:\\Users\\tester').some(candidate => candidate.endsWith('ffmpeg.exe')),
    'Windows ffmpeg candidates should include .exe paths'
  );

  // Integration checks with special characters/spaces in paths
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-regression-'));
  const workspace = path.join(tmpRoot, 'workspace with spaces [x] & chars');
  fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });

  fs.writeFileSync(path.join(workspace, 'src', 'main.js'), "const util = require('./util');\nmodule.exports = util;\n");
  fs.writeFileSync(path.join(workspace, 'src', 'util.js'), 'module.exports = { ok: true };\n');

  fs.writeFileSync(path.join(workspace, '.architecture.yml'), `version: "1.0"\nrules:\n  - name: Require shared import\n    layer: "src/util.js"\n    must_import_from:\n      - src/shared/**\n`);

  const analysis = runCLI(['analyze', '.', '--json'], workspace);
  assert.strictEqual(analysis.status, 0, `analyze failed: ${analysis.stderr}`);
  const parsed = JSON.parse(analysis.stdout);
  assert.ok(Array.isArray(parsed.components), 'analyze --json should return components');

  const jsonOutput = path.join(workspace, 'reports', 'result file.json');
  const testJson = runCLI(['test', '.', '--format', 'JSON', '--output', jsonOutput], workspace);
  assert.strictEqual(testJson.status, 1, `test json expected failure exit=1, got ${testJson.status}`);
  assert.ok(fs.existsSync(jsonOutput), 'json output file should be written');
  const jsonResults = JSON.parse(fs.readFileSync(jsonOutput, 'utf8'));
  assert.strictEqual(jsonResults.summary.failed, 1, 'expected one failing rule');
  assert.strictEqual(jsonResults.summary.skipped, 0, 'skipped count should remain stable');

  const junitOutput = path.join(workspace, 'reports', 'result file.xml');
  const testJunit = runCLI(['test', '.', '--format', 'Junit', '--output', junitOutput], workspace);
  assert.strictEqual(testJunit.status, 1, `test junit expected failure exit=1, got ${testJunit.status}`);
  assert.ok(fs.existsSync(junitOutput), 'junit output file should be written');
  const junitText = fs.readFileSync(junitOutput, 'utf8');
  assert.ok(junitText.includes('<testsuite'), 'junit file should contain testsuite');

  const diagramOutput = path.join(workspace, 'diagrams', 'dependency graph (alpha).mmd');
  const generate = runCLI(['generate', '.', '--type', 'dependency', '--output', diagramOutput], workspace);
  assert.strictEqual(generate.status, 0, `generate expected success, got ${generate.status}`);
  assert.ok(fs.existsSync(diagramOutput), 'diagram output file should be written');

  const absGenerateOutput = path.join(tmpRoot, 'dependency-absolute.mmd');
  const generateAbsolute = runCLI(['generate', '.', '--type', 'dependency', '--output', absGenerateOutput], workspace);
  assert.strictEqual(generateAbsolute.status, 0, `generate absolute output expected success, got ${generateAbsolute.status}`);
  assert.ok(fs.existsSync(absGenerateOutput), 'absolute path diagram output file should be written');

  fs.rmSync(tmpRoot, { recursive: true, force: true });

  console.log('deep-regression: OK');
}

try {
  run();
} catch (error) {
  console.error('deep-regression: FAILED');
  console.error(error.message || error);
  process.exit(1);
}
