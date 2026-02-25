# Maintainer Checklist

Review this checklist before merging changes or cutting a release.

## Table of Contents

- [Per-PR checklist](#per-pr-checklist)
- [Documentation checklist](#documentation-checklist)
- [Release checklist](#release-checklist)

## Per-PR checklist

- [ ] Scope is clear and minimal.
- [ ] `npm test` passes.
- [ ] `npm run test:deep` passes when behavior or command output changed.
- [ ] CLI examples were validated against current command behavior.
- [ ] No secrets, tokens, or private endpoints were added.

## Documentation checklist

- [ ] `README.md` reflects command/flag changes.
- [ ] Relevant pages under `docs/` are updated.
- [ ] Community files remain present and current:
  - [ ] `LICENSE`
  - [ ] `CODE_OF_CONDUCT.md`
  - [ ] `CONTRIBUTING.md`
  - [ ] `SECURITY.md`
  - [ ] `SUPPORT.md`
  - [ ] `.github/ISSUE_TEMPLATE/*`
  - [ ] `.github/pull_request_template.md`

## Release checklist

- [ ] Version is updated.
- [ ] `npm run release:prepare -- X.Y.Z` passes.
- [ ] Packaged CLI smoke test passes.
- [ ] Publish command completed (`npm run release:publish -- X.Y.Z` or initial equivalent).
- [ ] Git tag and GitHub release exist.
- [ ] `CHANGELOG.md` contains release notes.
