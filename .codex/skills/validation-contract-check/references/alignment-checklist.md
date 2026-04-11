# Validation Contract Alignment Checklist

## Table of Contents
- [Source order](#source-order)
- [Stale patterns to remove](#stale-patterns-to-remove)

## Source order

1. `package.json`
2. `Makefile`
3. `README.md`
4. Live scripts under `scripts/`
5. `AGENTS.md`
6. `docs/agents/**`

Update the lower rows to match the higher rows, not the other way around.

## Stale patterns to remove

- `source scripts/codex-preflight.sh && preflight_repo`
- Claims that this repo has no lint, typecheck, or test pipeline
- `harness validate` as the default validation command when the repo contract is npm scripts plus wrapper verification
- Docs that point validation to non-existent `codex/scripts/**` paths instead of `scripts/**`
