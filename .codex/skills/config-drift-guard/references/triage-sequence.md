# Config Drift Triage Sequence

## Table of Contents
- [Order](#order)
- [Failure cues](#failure-cues)

## Order

1. Validate environment and tooling contract:
   - `bash scripts/check-environment.sh`
2. Validate preflight behavior:
   - `bash scripts/codex-preflight.sh --stack auto --mode optional`
3. Validate repo wrapper behavior:
   - `bash scripts/verify-work.sh --fast`
4. If startup still fails after the first three checks, classify the remaining issue with:
   - `codex mcp list`

Run the same sequence automatically with:

- `bash .codex/skills/config-drift-guard/scripts/run_guard_checks.sh`

## Failure cues

- `missing tooling contract` or missing required binaries:
  - repair `docs/agents/tooling.contract.json`, docs generation, or local toolchain before startup tuning.
- Preflight wrapper fails while environment check passes:
  - fix `scripts/codex-preflight.sh` contract or invocation docs before changing MCP settings.
- `verify-work.sh --fast` fails because expected scripts/binaries are unavailable:
  - resolve wrapper/tooling contract drift before editing startup flags.
- `codex mcp list` still fails after environment and wrappers pass:
  - treat this as `mcp-startup-triage`, not config drift.
