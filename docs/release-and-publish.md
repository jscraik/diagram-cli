# Release and Publish

Use the release guard script and GitHub workflow to publish
`@brainwav/diagram` safely. The package currently installs canonical
`archscope` and compatibility `diagram` binaries.

## Table of Contents

- [Pre-release checklist](#pre-release-checklist)
- [Local preflight](#local-preflight)
- [Local publish](#local-publish)
- [GitHub workflow release](#github-workflow-release)
- [Initial publish path](#initial-publish-path)
- [Migration evidence](#migration-evidence)
- [Post-publish checks](#post-publish-checks)

## Pre-release checklist

1. Be on `main`.
2. Ensure the working tree is clean.
3. Pull latest changes.
4. Run required tests:

```bash
npm test
npm run test:deep
```

## Local preflight

Run guarded checks for a target version:

```bash
npm run release:prepare -- X.Y.Z
```

What this validates:

- current branch is `main`
- working tree is clean
- version is valid semver and greater than current version
- release tag `vX.Y.Z` does not already exist
- npm registry does not already have `@brainwav/diagram@X.Y.Z`
- `npm test` passes
- migration artifact validation passes
- `npm pack --dry-run` succeeds
- packaged smoke test passes (`./node_modules/.bin/archscope --help` and
  `./node_modules/.bin/diagram --help` from packed artifact)

## Local publish

```bash
npm run release:publish -- X.Y.Z
```

This reruns preflight checks, then:

- bumps package version (`npm version X.Y.Z`)
- creates git commit/tag
- publishes to npm (`npm publish --access public`)

## GitHub workflow release

Use `.github/workflows/release.yml` via **Run workflow**.

Inputs:

- `version` (required, semver `X.Y.Z`)
- `initial_release` (`true` only for first publish flow)
- `auth_mode` (`trusted` recommended, `token` fallback)

Workflow behavior:

1. Enforces `main` branch.
2. Updates `CHANGELOG.md` with a release section.
3. Runs release publish script (`release:publish` or `release:publish:initial`).
4. Pushes commit and tags.
5. Creates GitHub release `vX.Y.Z`.

## Initial publish path

For first-time publish where `package.json` already has the target version:

```bash
npm run release:prepare:initial -- X.Y.Z
npm run release:publish:initial -- X.Y.Z
```

In this mode, `X.Y.Z` must exactly match `package.json#version`.

## Migration evidence

Current migration state: `compatibility`.

Before any release-candidate finalization decision, generate and validate
migration evidence:

```bash
node scripts/record-migration-readiness.js \
  --release-id X.Y.Z-rc.N \
  --compatibility-declared-at YYYY-MM-DDTHH:mm:ss.sssZ \
  --rc-tags vX.Y.Z-rc.1,vX.Y.Z-rc.N \
  --promote
npm run migration:readiness -- --release-id X.Y.Z-rc.N --require-finalization-ready
```

Promoted evidence writes:

- immutable record: `.diagram/migration/releases/<releaseId>/migration-readiness.json`
- latest pointer: `.diagram/migration/migration-readiness.json`
- append-only ledger: `.diagram/migration/releases/ledger.json`

Finalization is not eligible until the policy in
`.diagram/migration/finalization-policy.json` passes, the release-candidate
sequence is consecutive, at least two RCs exist for the target version, and at
least 30 UTC days have elapsed since compatibility was declared.

Use `npm run migration:readiness` without `--require-finalization-ready` during
ordinary compatibility releases. It verifies compatibility command behavior,
machine-contract coverage, and migration artifact integrity without claiming the
release can move to `finalized`.

## Post-publish checks

1. Confirm npm package version exists:

```bash
npm view @brainwav/diagram version
```

1. Smoke test published package in a clean temp directory:

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
npm init -y >/dev/null
npm install @brainwav/diagram@X.Y.Z >/dev/null
npx archscope --help
npx diagram --help
```

1. Confirm git tag and GitHub release exist for `vX.Y.Z`.
