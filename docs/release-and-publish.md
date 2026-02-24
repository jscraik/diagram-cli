# Release and Publish

## Table of Contents

- [Pre-release checklist](#pre-release-checklist)
- [Version bump](#version-bump)
- [Dry-run package check](#dry-run-package-check)
- [Publish](#publish)
- [Post-publish checks](#post-publish-checks)

## Pre-release checklist

1. Ensure you are on `main` with a clean working tree.
2. Pull latest changes.
3. Run tests:

```bash
npm test
```

## Version bump

Update `package.json#version` to the target release version and commit the change.

## Dry-run package check

Validate the publish artifact before publishing:

```bash
npm pack --dry-run
```

Confirm only intended files are included:

- `src/diagram.js`
- `README.md`
- `LICENSE`

## Publish

Authenticate and publish:

```bash
npm login
npm publish --access public
```

## Post-publish checks

1. Confirm package on npm: `@jmc/diagram`.
1. Verify install:

```bash
npx @jmc/diagram --help
```

1. Create a GitHub release tag matching the version.
