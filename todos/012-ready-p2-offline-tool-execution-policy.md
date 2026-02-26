---
status: complete
priority: p2
issue_id: "012"
tags: ["code-review", "security", "architecture"]
dependencies: []
---

# Define explicit offline/local-tool execution policy for workflow commands

## Problem Statement

The plan repeatedly promises local-first/offline reproducibility but does not enforce it with a concrete execution policy for external tools (git, mermaid rendering, video tooling). Without explicit allowlisting and offline checks, commands could silently invoke remote dependency resolution (e.g., `npx`) or environment-dependent tooling in CI/air-gapped contexts, invalidating reproducibility guarantees.

## Findings

- `reproducibility` positioning is stated as a core goal in `Overview` and `Decision Record` lines 71-75 and 223-235.
- Existing CLI currently shells out via `execFileSync` and `npx` candidates for rendering (`runMermaidCli` in `src/diagram.js`); this behavior is not constrained by a local-only policy in the plan.
- In research addendum (line 566), `--offline` is suggested but not required for V1 command contracts.
- No explicit failure code is defined when required executables are unavailable in local/offline mode.

## Proposed Solutions

### Option 1: Add explicit `--offline` (or `--no-network`) for workflow mode

**Approach:** Introduce explicit policy flag for `workflow` subcommands that pre-flights required binaries and disables networked resolution.

**Pros:**
- Enforces local-first as an opt-outable default behavior.
- Produces deterministic, actionable failures when dependencies are missing.

**Cons:**
- Expands command surface and tests in early V1.

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Require local binary allowlist in project config

**Approach:** Keep no new flags but validate executables against explicit allowlist (`mermaid-cli`, `git`, optional renderer toolchain).

**Pros:**
- Minimal CLI changes.
- Still constrains behavior consistently.

**Cons:**
- Adds config/bootstrap complexity.

**Effort:** Medium

**Risk:** Medium

### Option 3: Fail-closed default: `--offline` implied for all workflow commands

**Approach:** Define workflow commands to never perform network-backed resolution by default and fail clearly when prerequisites are missing.

**Pros:**
- Strong local-first guarantee from day one.
- No extra flags required for standard use.

**Cons:**
- Can increase setup burden for contributors in dev environments.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

**Approved:** Adopt **Option 3 (Fail-closed offline default for workflow commands)** as the implemented policy.

Workflow subcommands will run in local/offline mode by default, performing preflight checks for required local binaries (`git`, `mermaid-cli`/`mmdc`, etc.) and returning an explicit `E_POLICY`-style error when prerequisites are missing. This preserves deterministic execution in air-gapped/dev-restricted environments and avoids network-backed tool resolution (`npx`/remote installs) unless an explicit online override is introduced later.

## Technical Details

**Affected files:**
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md` (`Decision Record`, `Technical Considerations`, `Acceptance Criteria`).
- Planned rendering and PR extraction modules under `src/workflows/*`.
- Existing helper `src/utils/commands.js`.

**Related components:**
- Command execution wrapper for `npx`/mermaid
- Git command invocation strategy
- Exit-code mapping for policy failures

## Acceptance Criteria

- [ ] Workflow commands fail closed in offline mode when required local binaries are unavailable.
- [ ] Non-network dependency resolution behavior is documented in command reference and acceptance criteria.
- [ ] `--offline`/policy violation returns explicit `E_POLICY`-style diagnostic and stable exit code.
- [ ] Tests cover missing dependency and blocked network scenarios.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Compared plan goals against current CLI runtime dependency patterns.
- Identified lack of explicit local-tool enforcement despite local-first stated objective.

**Learnings:**
- Runtime command execution behavior is as critical to reproducibility as input/path contracts.

## Resources

- Plan sections: `Overview`, `Decision Record`, `Technical Considerations`, `Deepened Research Insights`.
- Implementation reference: `src/utils/commands.js`, `src/diagram.js`.

### 2026-02-26 - Approved for Work

**By:** Codex Triage System

**Actions:**
- Issue approved during triage session
- Status changed from pending → ready
- Ready to be picked up and worked on

**Learnings:**
- Local-first guarantees require explicit runtime policy controls, not just documentation intent.

### 2026-02-26 - Resolved

**By:** Codex Workflow Resolver

**Actions:**
- Selected Option 3 as the concrete offline execution policy.
- Updated status from `ready` to `complete` after policy decision was finalized.
- Logged explicit policy direction for local-tool preflight and `E_POLICY` failure behavior.

**Learnings:**
- Deterministic, offline-safe execution requires an explicit default policy at the command-level, not optional documentation-only guidance.
