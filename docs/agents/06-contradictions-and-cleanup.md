# Contradictions and cleanup

## Table of Contents
- [Resolved contradictions](#resolved-contradictions)
- [Cleanup policy](#cleanup-policy)

## Resolved contradictions
- Home-level AGENTS text references `/Users/jamiecraik/dev/config/codex` as a repo-specific preflight path.
- For this repository scope, the nearest-repo guidance applies and uses `/Users/jamiecraik/dev/diagram-cli` as the working root.
- Node runtime expectations vary by source. Package metadata requires `node >=18`, while workflows currently include Node 20, 24, and 25 lanes.

## Cleanup policy
- Keep root `AGENTS.md` minimal and route detailed policy to `docs/agents/*`.
- Remove duplicated or vague guidance during edits.
- If a contradiction is discovered and precedence is unclear, stop and request a user decision.
