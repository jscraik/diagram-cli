# Maintainer Checklist

## Table of Contents

- [Per-PR checklist](#per-pr-checklist)
- [Documentation checklist](#documentation-checklist)
- [Release checklist](#release-checklist)

## Per-PR checklist

- [ ] Scope is clear and small.
- [ ] `npm test` passes.
- [ ] CLI examples match actual command behavior.
- [ ] No secrets, tokens, or private endpoints were added.

## Documentation checklist

- [ ] README is updated if commands/flags changed.
- [ ] `docs/` pages are updated for maintainers.
- [ ] Community files are present:
  - [ ] `LICENSE`
  - [ ] `CODE_OF_CONDUCT.md`
  - [ ] `CONTRIBUTING.md`
  - [ ] `SECURITY.md`
  - [ ] `SUPPORT.md`
  - [ ] Issue templates
  - [ ] PR template

## Release checklist

- [ ] Version is bumped.
- [ ] `npm pack --dry-run` output verified.
- [ ] Packaged CLI smoke test passes (`diagram --help` from packed tarball).
- [ ] `npm publish --access public` completed.
- [ ] Release notes/tag created on GitHub.
