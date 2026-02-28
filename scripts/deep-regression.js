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
  fs.writeFileSync(
    path.join(workspace, 'src', 'database.js'),
    'const db = require("./db");\nfunction getOrCreateRecord(req) { return db.get(req.id) || db.create(req.body); }\nmodule.exports = getOrCreateRecord;\n'
  );
  fs.writeFileSync(
    path.join(workspace, 'src', 'db.js'),
    'function get(id) { return null; }\nfunction create(payload) { return { id: payload.id }; }\nmodule.exports = { get, create };\n'
  );
  fs.writeFileSync(
    path.join(workspace, 'src', 'events.js'),
    'const bus = require("eventemitter3");\nconst hub = require("./evt-hub");\nfunction publish(event) { bus.emit(event); hub.publish(event); }\nmodule.exports = { publish };\n'
  );
  fs.writeFileSync(
    path.join(workspace, 'src', 'evt-hub.js'),
    'function publish(payload) { return payload; }\nmodule.exports = { publish };\n'
  );
  fs.writeFileSync(
    path.join(workspace, 'src', 'pipeline.js'),
    'const hub = require("./evt-hub");\nmodule.exports = function runPipeline(input) { return hub.publish(input); };\n'
  );
  fs.writeFileSync(
    path.join(workspace, 'src', 'auth.js'),
    'const jwt = require("jsonwebtoken");\nfunction authenticate(req) { return jwt.verify(req.token, "secret"); }\nmodule.exports = authenticate;\n'
  );
  fs.writeFileSync(
    path.join(workspace, 'src', 'router.js'),
    'const auth = require("./auth");\nconst events = require("./events");\nconst userRoute = (req, res) => { const user = auth(req); events.publish("user.signedin"); return user; };\nmodule.exports = userRoute;\n'
  );
  fs.writeFileSync(
    path.join(workspace, 'src', 'user-route.js'),
    'const router = require("./router");\nfunction userLanding(req, res) { return router(req, res); }\nmodule.exports = userLanding;\n'
  );

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

  const allOutputDir = path.join(workspace, 'diagrams');
  const allRun = runCLI(['all', '.', '--output-dir', allOutputDir], workspace);
  assert.strictEqual(allRun.status, 0, `all expected success, got ${allRun.status}`);
  const manifestOutput = path.join(allOutputDir, 'manifest.json');
  assert.ok(fs.existsSync(manifestOutput), 'all should write manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestOutput, 'utf8'));
  assert.ok(Array.isArray(manifest.diagrams), 'manifest should include diagrams array');
  const expectedTypes = ['architecture', 'sequence', 'dependency', 'class', 'flow', 'database', 'user', 'events', 'auth', 'security'];
  for (const type of expectedTypes) {
    assert.ok(
      manifest.diagrams.some((entry) => entry.type === type),
      `manifest should include ${type} diagram`
    );
  }

  const summaryOutput = path.join('diagrams', 'manifest-summary.json');
  const manifestSummary = runCLI([
    'manifest',
    '.',
    '--manifest-dir',
    'diagrams',
    '--output',
    summaryOutput,
    '--require-types',
    expectedTypes.join(','),
  ], workspace);
  assert.strictEqual(manifestSummary.status, 0, `manifest expected success, got ${manifestSummary.status}`);
  const summaryParsed = JSON.parse(fs.readFileSync(path.join(workspace, summaryOutput), 'utf8'));
  assert.ok(summaryParsed.totalDiagrams >= expectedTypes.length, 'manifest summary should include generated diagrams');
  assert.deepStrictEqual(summaryParsed.required.missing, [], 'manifest summary should have no missing required types');

  const databaseOutput = path.join(workspace, 'diagrams', 'database.mmd');
  const userOutput = path.join(workspace, 'diagrams', 'user.mmd');
  const eventsOutput = path.join(workspace, 'diagrams', 'events.mmd');
  const authOutput = path.join(workspace, 'diagrams', 'auth.mmd');
  const securityOutput = path.join(workspace, 'diagrams', 'security.mmd');

  const generateAI = [
    ['database', databaseOutput, 'flowchart', 'database-focused components'],
    ['user', userOutput, 'User(("User"))', 'user-facing components'],
    ['events', eventsOutput, 'Event channels', 'event graph'],
    ['auth', authOutput, 'Auth Boundary', 'auth flow'],
    ['security', securityOutput, 'Untrusted input', 'security flow']
  ];

  const generatedTextByType = new Map();
  for (const [type, output, marker, label] of generateAI) {
    const result = runCLI(['generate', '.', '--type', type, '--output', output], workspace);
    assert.strictEqual(result.status, 0, `generate ${type} expected success, got ${result.status}`);
    assert.ok(fs.existsSync(output), `${label} output should be written`);
    const text = fs.readFileSync(output, 'utf8');
    assert.ok(text.includes(marker), `expected ${type} output to include ${marker}`);
    generatedTextByType.set(type, text);
  }

  const databaseText = generatedTextByType.get('database');
  assert.ok(databaseText.includes('classDef dbNode'), 'database diagram should define dbNode class style');
  assert.ok(databaseText.includes('class Decision decisionNode'), 'database diagram should style Decision node');

  const userText = generatedTextByType.get('user');
  assert.ok(userText.includes('classDef userNode'), 'user diagram should define userNode class style');
  assert.match(userText, /class\s+.+\s+userNode/, 'user diagram should assign userNode class');

  const eventsText = generatedTextByType.get('events');
  assert.ok(eventsText.includes('classDef eventNode'), 'events diagram should define eventNode class style');
  assert.ok(eventsText.includes('-->|emit|'), 'events diagram should include emit-labeled edge');
  assert.ok(eventsText.includes('-->|consume|'), 'events diagram should include consume-labeled edge');

  const authText = generatedTextByType.get('auth');
  assert.ok(authText.includes('classDef authNode'), 'auth diagram should define authNode class style');
  assert.match(authText, /class\s+.+\s+authNode/, 'auth diagram should assign authNode class');

  const securityText = generatedTextByType.get('security');
  assert.ok(securityText.includes('classDef securityNode'), 'security diagram should define securityNode class style');
  assert.match(securityText, /class\s+.+\s+securityNode/, 'security diagram should assign securityNode class');

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
