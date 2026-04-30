#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { validateMigrationReadinessRecord } = require('../src/migration/evidence');
const { validateFinalizationPolicy } = require('../src/migration/finalization-policy');

const repoRoot = path.resolve(__dirname, '..');
const migrationRoot = path.join(repoRoot, '.diagram', 'migration');

function fail(message) {
  console.error(`migration artifact validation failed: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`could not read ${path.relative(repoRoot, filePath)}: ${error.message}`);
  }
}

function listReleaseRecords() {
  const releasesDir = path.join(migrationRoot, 'releases');
  if (!fs.existsSync(releasesDir)) return [];
  return fs.readdirSync(releasesDir)
    .filter((releaseId) => releaseId !== 'ledger.json')
    .map((releaseId) => path.join(releasesDir, releaseId, 'migration-readiness.json'))
    .filter((recordPath) => fs.existsSync(recordPath));
}

function validatePointerAndLedger(recordsByPath) {
  const errors = [];
  const pointerPath = path.join(migrationRoot, 'migration-readiness.json');
  const ledgerPath = path.join(migrationRoot, 'releases', 'ledger.json');
  const hasReleaseRecords = recordsByPath.size > 0;
  if (!hasReleaseRecords && !fs.existsSync(pointerPath) && !fs.existsSync(ledgerPath)) {
    return { valid: true, errors, pointer: null, ledgerEntries: [] };
  }
  if (!fs.existsSync(pointerPath)) errors.push('latest pointer is required when release records exist');
  if (!fs.existsSync(ledgerPath)) errors.push('ledger is required when release records exist');
  if (errors.length > 0) return { valid: false, errors, pointer: null, ledgerEntries: [] };

  const pointer = readJson(pointerPath);
  const ledger = readJson(ledgerPath);
  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  if (pointer.schemaVersion !== '1.0') errors.push('latest pointer schemaVersion must be 1.0');
  if (ledger.schemaVersion !== '1.0') errors.push('ledger schemaVersion must be 1.0');

  for (const [relativePath, record] of recordsByPath.entries()) {
    const entry = entries.find((candidate) => candidate.recordPath === relativePath);
    if (!entry) {
      errors.push(`ledger missing record: ${relativePath}`);
      continue;
    }
    if (entry.releaseId !== record.releaseId) errors.push(`ledger releaseId mismatch: ${relativePath}`);
    if (entry.releaseTag !== record.releaseTag) errors.push(`ledger releaseTag mismatch: ${relativePath}`);
    if (entry.contentHash !== record.contentHash) errors.push(`ledger contentHash mismatch: ${relativePath}`);
  }

  const latestEntry = entries[entries.length - 1];
  if (latestEntry) {
    if (pointer.releaseId !== latestEntry.releaseId) errors.push('latest pointer releaseId does not match ledger tail');
    if (pointer.releaseTag !== latestEntry.releaseTag) errors.push('latest pointer releaseTag does not match ledger tail');
    if (pointer.recordPath !== latestEntry.recordPath) errors.push('latest pointer recordPath does not match ledger tail');
    if (pointer.contentHash !== latestEntry.contentHash) errors.push('latest pointer contentHash does not match ledger tail');
    const pointedRecord = recordsByPath.get(pointer.recordPath);
    if (!pointedRecord) {
      errors.push(`latest pointer recordPath is missing: ${pointer.recordPath}`);
    } else if (pointedRecord.contentHash !== pointer.contentHash) {
      errors.push('latest pointer contentHash does not match pointed record');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    pointer: path.relative(repoRoot, pointerPath),
    ledgerEntries: entries,
  };
}

function main() {
  const policyPath = path.join(migrationRoot, 'finalization-policy.json');
  const policyResult = validateFinalizationPolicy(readJson(policyPath));
  if (!policyResult.valid) {
    fail(policyResult.errors.join('; '));
  }

  const recordPaths = listReleaseRecords();
  const recordsByPath = new Map();
  const records = recordPaths.map((recordPath) => {
    const record = readJson(recordPath);
    const result = validateMigrationReadinessRecord(record);
    if (!result.valid) {
      fail(`${path.relative(repoRoot, recordPath)}: ${result.errors.join('; ')}`);
    }
    const relativePath = path.relative(repoRoot, recordPath);
    recordsByPath.set(relativePath, record);
    return relativePath;
  });
  const pointerLedgerResult = validatePointerAndLedger(recordsByPath);
  if (!pointerLedgerResult.valid) {
    fail(pointerLedgerResult.errors.join('; '));
  }

  console.log(JSON.stringify({
    schemaVersion: '1.0',
    status: 'pass',
    policy: path.relative(repoRoot, policyPath),
    latestPointer: pointerLedgerResult.pointer,
    ledgerEntryCount: pointerLedgerResult.ledgerEntries.length,
    releaseRecordCount: records.length,
    releaseRecords: records,
  }, null, 2));
}

if (require.main === module) {
  main();
}
