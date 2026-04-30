# Archscope Compatibility Migration

`archscope` is the canonical CLI identity for the `@brainwav/diagram` package.
The package remains in the `compatibility` migration state, so the legacy
`diagram` command is still supported for existing scripts.

## Table of Contents

- [Current State](#current-state)
- [Command Identity](#command-identity)
- [Machine Output](#machine-output)
- [Migration Evidence](#migration-evidence)
- [Finalization Rules](#finalization-rules)
- [Rollback Checks](#rollback-checks)

## Current State

- Migration state: `compatibility`
- Canonical command: `archscope`
- Compatibility command: `diagram`
- Package name: `@brainwav/diagram`
- Package rename status: out of scope for this migration window

New docs, examples, and automation should use `archscope`. Existing automation
can continue to use `diagram` while the compatibility window is open.

## Command Identity

Both command names route through the same implementation:

```bash
archscope --help
diagram --help
archscope validate .
diagram validate .
```

Compatibility invocation may emit migration guidance on `stderr`. Machine
payloads on `stdout` must remain parseable when `--format json` is used.

## Machine Output

Canonical machine mode is:

```bash
archscope generate . --type architecture --format json --deterministic
archscope workflow pr . --base origin/main --head HEAD --format json --deterministic
```

Covered JSON-capable commands use a root envelope with:

- `schemaVersion`
- `command`
- `status`
- `meta`
- `data`
- `errors`
- optional `agentSummary`

The tracked coverage manifest is
`.diagram/contracts/machine-command-coverage.json`. Update it only when command
JSON capability changes, then run:

```bash
node scripts/validate-machine-contracts.js
```

## Migration Evidence

Finalization readiness is recorded as promoted migration evidence:

```bash
node scripts/record-migration-readiness.js \
  --release-id X.Y.Z-rc.N \
  --compatibility-declared-at YYYY-MM-DDTHH:mm:ss.sssZ \
  --rc-tags vX.Y.Z-rc.1,vX.Y.Z-rc.N \
  --promote
node scripts/validate-migration-artifacts.js
```

Promoted evidence writes:

- immutable record: `.diagram/migration/releases/<releaseId>/migration-readiness.json`
- latest pointer: `.diagram/migration/migration-readiness.json`
- append-only ledger: `.diagram/migration/releases/ledger.json`

Candidate evidence without `--promote` writes under ignored candidate paths:

```bash
.diagram/migration/candidates/<releaseId>/migration-readiness.json
```

## Finalization Rules

Finalization is blocked unless all of these are true:

- `.diagram/migration/finalization-policy.json` passes semantic validation.
- The release candidate sequence is consecutive from `vX.Y.Z-rc.1` through the
  target `releaseId`.
- At least two release candidates exist for the target version.
- At least 30 UTC days have elapsed since compatibility was declared.
- The immutable record, latest pointer, and ledger agree on `releaseId`,
  `releaseTag`, `recordPath`, and `contentHash`.
- Compatibility command behavior and machine-envelope conformance still pass.

Run the validation gate before any finalization decision:

```bash
node scripts/validate-migration-artifacts.js
npm test
npm run test:deep
```

## Rollback Checks

After a failed release candidate or rollback drill:

```bash
archscope --help
diagram --help
archscope validate . --format json --deterministic
diagram validate . --format json --deterministic
node scripts/validate-machine-contracts.js
node scripts/validate-migration-artifacts.js
```

Do not advance to `finalized` while any compatibility command, machine-contract,
or migration-evidence check is failing.
