# Contributing

Thanks for contributing to `@brainwav/diagram`.

## Table of Contents

- [Development setup](#development-setup)
- [Run checks](#run-checks)
- [Submit changes](#submit-changes)
- [Docs updates](#docs-updates)

## Development setup

Requirements:

- Node.js 18+
- npm (package-lock is committed, so npm is the canonical package manager)

Setup:

```bash
git clone https://github.com/jscraik/diagram-cli.git
cd diagram-cli
npm install
```

Optional local CLI link:

```bash
npm link
```

## Run checks

Run the required check before opening a PR:

```bash
npm test
```

The current test script runs:

```bash
node src/diagram.js analyze .
```

## Submit changes

1. Create a branch from `main`.
2. Make focused changes.
3. Run `npm test`.
4. Update docs when behavior changes.
5. Open a pull request using the PR template.

Commit message convention is currently not observed/enforced in this repo.

## Docs updates

When you add or change CLI flags/commands:

- Update [README.md](README.md)
- Update relevant files under [docs/](docs/README.md)
- Include usage examples for the new behavior
