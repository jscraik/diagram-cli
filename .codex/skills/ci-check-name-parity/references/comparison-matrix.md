# CI Check Comparison Matrix

## Table of Contents

- [Sources](#sources)
- [Rule](#rule)

## Sources

- `.github/workflows/pr-pipeline.yml`: workflow job names
- `.harness/ci-required-checks.json`: required-check policy names and patterns
- `harness.contract.json`: harness-required check names
- `AGENTS.md` and `docs/agents/**`: human-facing descriptions

## Rule

- If the same required check is represented in more than one source, the naming must either match exactly or have an explicit documented mapping.
- Silent drift is not acceptable. If `dependency-review` in the workflow is meant to satisfy a policy called `dependency-scan`, that mapping must be written down in docs instead of left implicit.

Generate the current mismatch report with:

- `bash .codex/skills/ci-check-name-parity/scripts/report_check_name_drift.sh`
