# Release and Publish

## Table of Contents

- [Pre-release checklist](#pre-release-checklist)
- [Preflight command](#preflight-command)
- [First release (new package)](#first-release-new-package)
- [Publish command](#publish-command)
- [Post-publish checks](#post-publish-checks)

## Pre-release checklist

1. Ensure you are on `main` with a clean working tree.
2. Pull latest changes.
3. Run tests:

```bash
npm test
```

## Preflight command

Run the release guard script with your target version:

```bash
npm run release:prepare -- X.Y.Z
```

This command validates:

- branch is `main`
- working tree is clean
- target version is valid semver and greater than current
- tag `vX.Y.Z` does not already exist
- `npm test` passes
- `npm pack --dry-run` includes expected files

## Publish command

After preflight passes and npm auth is ready (`npm login`), publish:

```bash
npm run release:publish -- X.Y.Z
```

`release:publish` will run the same checks, then run `npm version X.Y.Z` (commit + tag) and `npm publish --access public`.

## First release (new package)

For the first publish of a brand-new package version already set in `package.json`:

```bash
npm run release:prepare:initial -- X.Y.Z
npm run release:publish:initial -- X.Y.Z
```

`X.Y.Z` must exactly match `package.json#version` for initial publish mode.

## Post-publish checks

1. Confirm package on npm: `@jmc/diagram`.
1. Verify install:

```bash
npx @jmc/diagram --help
```

1. Create a GitHub release tag matching the version.
