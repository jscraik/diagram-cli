# coding-harness Greptile rules

## Scope

These rules define repository-specific review expectations for Greptile.

## Rule set

### 1) Independent validation is mandatory

- The coding agent must not act as approving reviewer on the same PR.
- Greptile/Codex artifacts must be produced by an independent review step.

### 2) Governance contract and docs must remain aligned

If a PR changes any of the following, reviewers must verify consistency across all touched files:

- `/harness.contract.json`
- `/AGENTS.md`
- `/CONTRIBUTING.md`
- `/docs/agents/02-tooling-policy.md`
- `/docs/agents/03-validation.md`
- `/.github/PULL_REQUEST_TEMPLATE.md`

### 3) Command-surface compatibility

- Changes to `src/diagram.js`, `src/rules.js`, and `src/graph.js` must preserve CLI flag behavior and output format unless explicitly documented in `CHANGELOG.md`.
- Breaking changes require updated examples under `/examples/*.architecture.yml` and matching regression tests.

### 4) Security and evidence

- PRs changing policy/gate behavior must include test and evidence artifacts.
- Any reduction in mandatory checks/review gates must be treated as high risk.

### 5) Merge confidence threshold

- Confidence < 4/5 is merge-blocking.
- Confidence 4/5 may merge only when remaining items are non-logic polish.
- Confidence 5/5 is merge-ready.
