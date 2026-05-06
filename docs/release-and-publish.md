# Release and Publish

Use the release guard script and GitHub workflow to publish
`@brainwav/diagram` safely. The package currently installs canonical
`archscope` and compatibility `diagram` binaries.

## Table of Contents

- [Pre-release checklist](#pre-release-checklist)
- [Local preflight](#local-preflight)
- [GitHub workflow release](#github-workflow-release)
- [Local publish fallback](#local-publish-fallback)
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

## GitHub workflow release

Use `.github/workflows/release.yml` via **Run workflow**. This is the canonical
publish path for this repo because it uses npm trusted publishing and does not
require local npm OTP prompts.

CLI equivalent:

```bash
gh workflow run Release --repo jscraik/diagram-cli --ref main \
  -f version=X.Y.Z \
  -f initial_release=false \
  -f auth_mode=trusted
```

For the first publish of the existing `package.json` version, set
`initial_release=true`.

Inputs:

- `version` (required, semver `X.Y.Z`)
- `initial_release` (`true` only when publishing the existing
  `package.json#version`)
- `auth_mode` (`trusted` is the default and expected path; `token` is fallback
  only)

Workflow behavior:

1. Enforces `main` branch.
2. Updates `CHANGELOG.md` with a release section.
3. Runs release publish script (`release:publish` or `release:publish:initial`).
4. Pushes commit and tags.
5. Creates GitHub release `vX.Y.Z`.

Known-good evidence: run
[`25435539149`](https://github.com/jscraik/diagram-cli/actions/runs/25435539149)
published `@brainwav/diagram@1.1.0` with `auth_mode=trusted`, pushed tag
`v1.1.0`, and created the GitHub release.

## Local publish fallback

Local publish is a fallback path for maintainers with an npm token/session that
can publish without an interactive 2FA challenge. It is not the expected
no-OTP path for this project.

```bash
npm run release:publish -- X.Y.Z
```

This reruns preflight checks, then:

- bumps package version (`npm version X.Y.Z`)
- creates git commit/tag
- publishes to npm (`npm publish --access public`)

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
npx archscope analyze . --format json >/dev/null
npx diagram analyze . --format json >/dev/null
npx archscope generate . --type architecture --output architecture.mmd >/dev/null
npx diagram generate . --type architecture --output diagram-architecture.mmd >/dev/null
```

1. Confirm git tag and GitHub release exist for `vX.Y.Z`.
