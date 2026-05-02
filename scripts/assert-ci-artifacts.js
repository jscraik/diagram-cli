#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, '.diagram');
const cli = path.join(repoRoot, 'src', 'diagram.js');
const baseRef = process.env.ARCHSCOPE_BASE_REF || 'HEAD~1';
const headRef = process.env.ARCHSCOPE_HEAD_REF || 'HEAD';
const COMMON_SCAN_ARTIFACTS = [
  ['manifest', 'written', '.diagram/manifest.json'],
  ['brief', 'written', '.diagram/brief.md'],
  ['agent-context', 'written', '.diagram/agent-context.json'],
  ['architecture', 'written', '.diagram/architecture.mmd'],
  ['report', 'written', '.diagram/report.html'],
];

function fail(message) {
  console.error(`ci artifact assertion failed: ${message}`);
  process.exit(1);
}

function run(args, label) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    fail(`${label} exited ${result.status}\n${result.stderr || result.stdout}`);
  }
  return result;
}

function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`${relativePath} was not written`);
  }
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function assertArtifact(manifest, id, status, expectedPath) {
  const artifact = manifest.artifacts.find((entry) => entry.id === id);
  if (!artifact) {
    fail(`manifest missing ${id} artifact`);
  }
  if (artifact.status !== status) {
    fail(`${id} status was ${artifact.status}, expected ${status}`);
  }
  if (expectedPath && artifact.path !== expectedPath) {
    fail(`${id} path was ${artifact.path}, expected ${expectedPath}`);
  }
}

function assertCommonScanArtifacts(manifest) {
  for (const [id, status, expectedPath] of COMMON_SCAN_ARTIFACTS) {
    assertArtifact(manifest, id, status, expectedPath);
  }
}

function resetScanOutputs() {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const entry of fs.readdirSync(outputDir)) {
    if (['contracts', 'migration'].includes(entry)) continue;
    fs.rmSync(path.join(outputDir, entry), { recursive: true, force: true });
  }
}

function assertRepositoryScan() {
  resetScanOutputs();
  run(['scan', '.', '--output-dir', '.diagram', '--deterministic'], 'repository scan');

  const manifest = readJson('.diagram/manifest.json');
  if (manifest.command !== 'scan') {
    fail(`manifest command was ${manifest.command}, expected scan`);
  }
  if (manifest.artifactReadOrder[0] !== '.diagram/manifest.json') {
    fail('manifest must be first in artifactReadOrder');
  }
  assertCommonScanArtifacts(manifest);
  if (manifest.primaryHumanArtifact !== '.diagram/report.html') {
    fail(`primaryHumanArtifact was ${manifest.primaryHumanArtifact}, expected .diagram/report.html`);
  }
  if (!fs.existsSync(path.join(repoRoot, '.diagram', 'report.html'))) {
    fail('repository scan must write report.html');
  }
  assertArtifact(manifest, 'pr-impact', 'deferred', '.diagram/pr-impact/pr-impact.json');
  if (fs.existsSync(path.join(repoRoot, '.diagram', 'pr-impact', 'pr-impact.json'))) {
    fail('repository scan must not leave a PR impact artifact when refs are not supplied');
  }
}

function assertPrScan() {
  resetScanOutputs();
  const result = run([
    'scan',
    '.',
    '--output-dir',
    '.diagram',
    '--base',
    baseRef,
    '--head',
    headRef,
    '--format',
    'json',
    '--deterministic',
  ], 'PR scan');
  const payload = JSON.parse(result.stdout);
  if (payload.status !== 'success') {
    fail(`PR scan machine status was ${payload.status}, expected success`);
  }
  if (payload.data.pr?.status !== 'complete') {
    fail(`PR scan data.pr.status was ${payload.data.pr?.status}, expected complete`);
  }

  const manifest = readJson('.diagram/manifest.json');
  assertCommonScanArtifacts(manifest);
  assertArtifact(manifest, 'pr-impact', 'written', '.diagram/pr-impact/pr-impact.json');
  if (!fs.existsSync(path.join(repoRoot, '.diagram', 'report.html'))) {
    fail('PR scan must write report.html');
  }
  readJson('.diagram/pr-impact/pr-impact.json');
}

function assertValidationArtifact() {
  run([
    'validate',
    '.',
    '--format',
    'junit',
    '--output',
    '.diagram/architecture-results.xml',
  ], 'architecture validation artifact');
  if (!fs.existsSync(path.join(repoRoot, '.diagram', 'architecture-results.xml'))) {
    fail('.diagram/architecture-results.xml was not written');
  }
}

assertRepositoryScan();
assertPrScan();
assertValidationArtifact();
console.log('ci artifact assertions: OK');
