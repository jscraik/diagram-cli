# Contributing

Thanks for contributing to `@brainwav/diagram`.

## Table of Contents

- [Quick guide](#quick-guide)
- [Development setup](#development-setup)
- [Run checks](#run-checks)
- [Submit changes](#submit-changes)
- [Documentation updates](#documentation-updates)

## Quick guide

Keep each change small.
Run tests first.
Keep docs in sync.
Use real commands and real paths.
Do not add secrets.

## Development setup

Requirements:

- Node.js 18+
- npm (this repo uses `package-lock.json`)

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

Required baseline check:

```bash
npm test
```

Additional regression check (run when behavior changes):

```bash
npm run test:deep
```

Useful smoke checks:

```bash
node src/diagram.js --help
node src/diagram.js test --help
```

## Submit changes

1. Create a branch from `main`.
2. Keep changes focused.
3. Run the checks above.
4. Update docs when behavior changes.
5. Open a pull request using `.github/pull_request_template.md`.

## Documentation updates

When adding or changing CLI behavior:

- update [README.md](README.md)
- update relevant files under [docs/](docs/README.md)
- validate examples and commands before merging
