# Validation and checks

## Table of Contents
- [Focused validation loop](#focused-validation-loop)
- [Required repository checks](#required-repository-checks)
- [Config and CI edits](#config-and-ci-edits)
- [Failure reporting](#failure-reporting)

## Focused validation loop
- Run focused checks immediately after each edit.
- Run broader repository checks before final handoff.

## Required repository checks
- Baseline checks for implementation changes:
  - `npm test`
  - `npm run test:deep`
- If CI artifact generation behavior changes, run:
  - `npm run ci:artifacts`

## Config and CI edits
- For changes to `package.json`, CI workflow files, `settings.json`, or related config files, run applicable validation and report pass/fail before committing.
- Never commit configuration changes without validation evidence.

## Failure reporting
- Record exact failing command outputs for validation failures.
- Distinguish pre-existing failures from regressions introduced in the current run.
