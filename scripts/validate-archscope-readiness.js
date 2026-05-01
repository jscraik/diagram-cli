#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  validateMigrationReadinessRecord,
} = require('../src/migration/evidence');
const { REQUIRED_GATES } = require('../src/migration/finalization-policy');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'diagram.js');

function parseArgs(argv) {
  const options = {
    requireFinalizationReady: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--release-id') {
      options.releaseId = argv[index + 1];
      index += 1;
    } else if (arg === '--require-finalization-ready') {
      options.requireFinalizationReady = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });
}

function parseJson(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${label} did not produce parseable JSON: ${error.message}`);
  }
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function assertCommandPass(label, command, args, options = {}) {
  const result = run(command, args, options);
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

function runLinkedCli(commandPath, args, options = {}) {
  return run(process.execPath, [commandPath, ...args], options);
}

function runJsonCli(commandPath, args, workspace) {
  const result = runLinkedCli(commandPath, args, { cwd: workspace });
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`${path.basename(commandPath)} ${args.join(' ')} failed unexpectedly: ${result.stderr || result.stdout}`);
  }
  result.payload = parseJson(result.stdout, `${path.basename(commandPath)} ${args.join(' ')}`);
  return result;
}

function assertPayloadParity(archscopeResult, diagramResult) {
  const stripVolatile = (payload) => {
    const clone = JSON.parse(JSON.stringify(payload));
    if (clone?.data?.validation?.summary) {
      delete clone.data.validation.summary.duration;
    }
    return clone;
  };
  const archscopePayload = stripVolatile(archscopeResult.payload);
  const diagramPayload = stripVolatile(diagramResult.payload);
  const archscopeComparable = {
    status: archscopeResult.status,
    payloadStatus: archscopePayload.status,
    data: archscopePayload.data,
    errors: archscopePayload.errors,
  };
  const diagramComparable = {
    status: diagramResult.status,
    payloadStatus: diagramPayload.status,
    data: diagramPayload.data,
    errors: diagramPayload.errors,
  };
  if (stableStringify(archscopeComparable) !== stableStringify(diagramComparable)) {
    throw new Error('compatibility drill failed: archscope and diagram validate JSON output diverged');
  }
}

function runCompatibilityDrill() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'archscope-readiness-'));
  try {
    const binDir = path.join(tmpRoot, 'bin');
    const workspace = path.join(tmpRoot, 'workspace');
    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
    fs.symlinkSync(cliPath, path.join(binDir, 'archscope'));
    fs.symlinkSync(cliPath, path.join(binDir, 'diagram'));
    fs.writeFileSync(path.join(workspace, 'src', 'index.js'), "module.exports = { ok: true };\n");
    fs.writeFileSync(
      path.join(workspace, '.architecture.yml'),
      'version: "1.0"\nrules:\n  - name: No external imports\n    layer: "src/index.js"\n    must_not_import_from:\n      - node_modules/**\n'
    );

    const archscopePath = path.join(binDir, 'archscope');
    const diagramPath = path.join(binDir, 'diagram');
    const archscopeHelp = runLinkedCli(archscopePath, ['--help']);
    if (archscopeHelp.status !== 0) {
      throw new Error(`archscope help failed: ${archscopeHelp.stderr || archscopeHelp.stdout}`);
    }
    if (!archscopeHelp.stdout.includes('Usage: archscope')) {
      throw new Error('archscope help did not advertise canonical usage');
    }
    const diagramHelp = runLinkedCli(diagramPath, ['--help']);
    if (diagramHelp.status !== 0) {
      throw new Error(`diagram help failed: ${diagramHelp.stderr || diagramHelp.stdout}`);
    }
    const archscopeResult = runJsonCli(archscopePath, ['validate', '.', '--format', 'json', '--deterministic'], workspace);
    const diagramResult = runJsonCli(diagramPath, ['validate', '.', '--format', 'json', '--deterministic'], workspace);
    assertPayloadParity(archscopeResult, diagramResult);
    return {
      status: 'pass',
      checked: [
        'archscope --help',
        'diagram --help',
        'archscope validate --format json',
        'diagram validate --format json',
        'archscope/diagram validate output parity',
      ],
    };
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function evaluateReleaseEvidence(releaseId) {
  if (!releaseId) {
    return {
      releaseId: null,
      status: 'not_requested',
      finalizationEligible: false,
      errors: ['releaseId is required for finalization eligibility'],
    };
  }

  const recordPath = path.join(repoRoot, '.diagram', 'migration', 'releases', releaseId, 'migration-readiness.json');
  const pointerPath = path.join(repoRoot, '.diagram', 'migration', 'migration-readiness.json');
  const errors = [];
  if (!fs.existsSync(recordPath)) errors.push(`missing release record: ${path.relative(repoRoot, recordPath)}`);
  if (!fs.existsSync(pointerPath)) errors.push(`missing latest pointer: ${path.relative(repoRoot, pointerPath)}`);
  if (errors.length > 0) {
    return { releaseId, status: 'blocked', finalizationEligible: false, errors };
  }

  const record = readJson(recordPath);
  const pointer = readJson(pointerPath);
  const validation = validateMigrationReadinessRecord(record);
  errors.push(...validation.errors);
  const evidenceGates = new Set((record.evidenceRefs || []).map((entry) => entry.gate));
  for (const gate of REQUIRED_GATES) {
    if (!evidenceGates.has(gate)) {
      errors.push(`release evidence missing required gate: ${gate}`);
    }
  }
  if (pointer.releaseId !== releaseId) errors.push('latest pointer releaseId does not match requested releaseId');
  if (pointer.contentHash !== record.contentHash) errors.push('latest pointer contentHash does not match release record');
  if (record.finalizationEligible !== true) errors.push('release record is not finalization eligible');

  return {
    releaseId,
    status: errors.length === 0 ? 'pass' : 'blocked',
    finalizationEligible: errors.length === 0,
    recordPath: path.relative(repoRoot, recordPath),
    pointerPath: path.relative(repoRoot, pointerPath),
    errors,
  };
}

function main() {
  const options = parseArgs(process.argv);
  const machineContracts = parseJson(
    assertCommandPass('machine contract validation', process.execPath, ['scripts/validate-machine-contracts.js']).stdout,
    'validate-machine-contracts'
  );
  const migrationArtifacts = parseJson(
    assertCommandPass('migration artifact validation', process.execPath, ['scripts/validate-migration-artifacts.js']).stdout,
    'validate-migration-artifacts'
  );
  const compatibilityDrill = runCompatibilityDrill();
  const releaseEvidence = evaluateReleaseEvidence(options.releaseId);
  const finalizationReady = releaseEvidence.finalizationEligible === true
    && machineContracts.status === 'pass'
    && migrationArtifacts.status === 'pass'
    && compatibilityDrill.status === 'pass';

  const report = {
    schemaVersion: '1.0',
    status: options.requireFinalizationReady && !finalizationReady ? 'blocked' : 'pass',
    migrationState: 'compatibility',
    finalizationReady,
    machineContracts: {
      status: machineContracts.status,
      commandCount: machineContracts.commandCount,
    },
    migrationArtifacts: {
      status: migrationArtifacts.status,
      releaseRecordCount: migrationArtifacts.releaseRecordCount,
      ledgerEntryCount: migrationArtifacts.ledgerEntryCount,
    },
    compatibilityDrill,
    releaseEvidence,
  };

  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'pass') {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(`archscope readiness validation failed: ${error.message}`);
  process.exit(1);
}
