#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  buildMigrationReadinessRecord,
  validateMigrationReadinessRecord,
  validateLedgerAppendOnly,
} = require('../src/migration/evidence');

const repoRoot = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`record-migration-readiness failed: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--release-id') {
      options.releaseId = next;
      index += 1;
    } else if (arg === '--source-commit') {
      options.sourceCommit = next;
      index += 1;
    } else if (arg === '--compatibility-declared-at') {
      options.compatibilityDeclaredAtUtc = next;
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAtUtc = next;
      index += 1;
    } else if (arg === '--rc-tags') {
      options.releaseCandidateTags = String(next || '').split(',').map((item) => item.trim()).filter(Boolean);
      index += 1;
    } else if (arg === '--promote') {
      options.promote = true;
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function git(args) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) {
    fail(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function defaultRcTags() {
  return git(['tag', '--list', 'v*-rc.*'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function readJsonIfPresent(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function promoteRecord(record, releaseRecordPath) {
  const relativeRecordPath = path.relative(repoRoot, releaseRecordPath);
  const pointerPath = path.join(repoRoot, '.diagram', 'migration', 'migration-readiness.json');
  const ledgerPath = path.join(repoRoot, '.diagram', 'migration', 'releases', 'ledger.json');
  const previousLedger = readJsonIfPresent(ledgerPath, { schemaVersion: '1.0', entries: [] });
  const previousEntries = Array.isArray(previousLedger.entries) ? previousLedger.entries : [];
  const existingEntry = previousEntries.find((entry) => entry.releaseId === record.releaseId);
  if (existingEntry && existingEntry.contentHash !== record.contentHash) {
    fail(`releaseId ${record.releaseId} already exists in ledger with a different contentHash`);
  }

  const ledgerEntry = {
    releaseId: record.releaseId,
    releaseTag: record.releaseTag,
    recordPath: relativeRecordPath,
    contentHash: record.contentHash,
    sourceCommit: record.sourceCommit,
    generatedAtUtc: record.generatedAtUtc,
  };
  const nextEntries = existingEntry ? previousEntries : [...previousEntries, ledgerEntry];
  const appendOnly = validateLedgerAppendOnly(previousEntries, nextEntries);
  if (!appendOnly.valid) {
    fail(appendOnly.errors.join('; '));
  }

  writeJson(releaseRecordPath, record);
  writeJson(ledgerPath, { schemaVersion: '1.0', entries: nextEntries });

  writeJson(pointerPath, {
    schemaVersion: '1.0',
    releaseId: record.releaseId,
    releaseTag: record.releaseTag,
    recordPath: relativeRecordPath,
    contentHash: record.contentHash,
    updatedAtUtc: record.generatedAtUtc,
  });
}

function main() {
  const options = parseArgs(process.argv);
  if (!options.releaseId) fail('--release-id is required');
  if (!options.compatibilityDeclaredAtUtc) fail('--compatibility-declared-at is required');
  const sourceCommit = options.sourceCommit || git(['rev-parse', 'HEAD']);
  const releaseCandidateTags = options.releaseCandidateTags || defaultRcTags();
  let record = buildMigrationReadinessRecord({
    releaseId: options.releaseId,
    sourceCommit,
    compatibilityDeclaredAtUtc: options.compatibilityDeclaredAtUtc,
    generatedAtUtc: options.generatedAtUtc,
    releaseCandidateTags,
  });
  const baseDir = options.promote
    ? path.join(repoRoot, '.diagram', 'migration', 'releases', options.releaseId)
    : path.join(repoRoot, '.diagram', 'migration', 'candidates', options.releaseId);
  fs.mkdirSync(baseDir, { recursive: true });
  const outputPath = path.join(baseDir, 'migration-readiness.json');
  if (options.promote && fs.existsSync(outputPath)) {
    const existingRecord = readJsonIfPresent(outputPath, null);
    const existingValidation = validateMigrationReadinessRecord(existingRecord);
    if (!existingValidation.valid) {
      fail(`existing promoted record is invalid: ${existingValidation.errors.join('; ')}`);
    }
    if (options.generatedAtUtc && existingRecord.generatedAtUtc !== options.generatedAtUtc) {
      fail(`releaseId ${options.releaseId} already has generatedAtUtc ${existingRecord.generatedAtUtc}`);
    }
    if (existingRecord.sourceCommit !== sourceCommit) {
      fail(`releaseId ${options.releaseId} already has sourceCommit ${existingRecord.sourceCommit}`);
    }
    record = existingRecord;
  }
  if (options.promote) {
    promoteRecord(record, outputPath);
  } else {
    writeJson(outputPath, record);
  }
  console.log(JSON.stringify({
    schemaVersion: '1.0',
    status: 'written',
    outputPath: path.relative(repoRoot, outputPath),
    finalizationEligible: record.finalizationEligible,
    contentHash: record.contentHash,
  }, null, 2));
}

if (require.main === module) {
  main();
}
