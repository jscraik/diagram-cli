# Tooling and command policy

## Package-manager command map
- install: `npm install`
- run: `npm run <script>`
- exec: `npm exec <command>`

## Core tooling
- Run shell commands with `zsh -lc`.
- Prefer `rg`, `fd`, and `jq`.
- Read `/Users/jamiecraik/.codex/instructions/tooling.md` before selecting tools.

## ESM-only package constraints
This project uses CommonJS. Do NOT upgrade these packages beyond the pinned versions:
- `chai` - pinned to v4.x (v5+ is ESM-only)
- `chalk` - pinned to v4.x (v5+ is ESM-only)
- `glob` - pinned to v10.x (v11+ is ESM-only)

These constraints are enforced via:
- `package.json` devDependencies (version ranges)
- `package.json` overrides (forced resolution)
- `.github/dependabot.yml` ignore rules
