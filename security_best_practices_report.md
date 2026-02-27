# Security Best Practices Review Report

**Plan reviewed:** `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`
**Date:** 2026-02-26

## Executive summary
The plan is strong on intent and already bakes in several secure-by-default controls, but its current security posture is incomplete for a CLI that processes filesystem inputs, launches local artifacts, and performs local-only reproducibility checks. The highest risks are around unsafe local-side effects (`open` launch behavior), incomplete path/key trust boundaries, and external command/subprocess usage that can break local-only guarantees.

## Critical

### [S1] Enforce local-only execution and block implicit external network/tool side effects
- **Evidence:** The plan introduces `workflow state` and `workflow pr` but does not constrain runtime dependency execution to pre-installed local binaries/paths. Mermaid rendering and diff processing may still invoke external toolchains (existing CLI behavior already shells out via `npx`; see plan intent around bounded/streaming and external tool use at lines 397-398).
- **Impact (critical):** A local-first command can unintentionally trigger network/toolchain side effects (dependency download, command execution drift), undermining reproducibility and allowing environment-dependent manipulation.
- **Mitigation:**
  - Add explicit `--offline`-equivalent enforcement for these subcommands and fail closed if required binaries are missing.
  - Use an allowlist of approved local executable paths for `mermaid-cli`, `git`, and any parser/render helper.
  - Emit an explicit warning + non-zero security policy code when offline/local-only preconditions are not met.
  - Record resolved executable paths in provenance.

## High

### [S2] Restrict launch target surface for `--open`
- **Evidence:** `--open` supports `manifest` and `prompt-pack` kinds (`pr` flow) and `all` mode launching multiple artifact kinds (lines 235-240).
- **Impact:** Opening non-HTML/text artifacts can invoke arbitrary local handlers and increases local execution risk beyond visual verification.
- **Mitigation:**
  - Limit launchable artifact kinds to intentionally rendered viewer artifacts only (HTML/video currently).
  - Treat `manifest` and `prompt-pack` as non-launch artifacts by default.
  - Add explicit allowlist in `openArtifact` by filetype and extension.
  - Require a separate `--open-unsafe` flag for additional artifact kinds.

### [S3] Strengthen path trust boundaries for all user-provided file paths, not only `--output`
- **Evidence:** Path controls appear in many flags (`--output`, `--manifest`, `--attest-key`, `--verify`) but the security-oriented pseudo snippet only targets output path normalization (`safeOutputPath`) and does not define equivalent checks for all file arguments (lines 185, 331-335, 453-480, 276-290).
- **Impact:** A path argument could traverse outside intended project scope (including via symlink/UNC/Windows device-name tricks), or allow tampering with attestation key/read files.
- **Mitigation:**
  - Centralize a `validateFilePath()` that canonicalizes + validates **every** path argument against a strict policy (scope, symlink policy, reserved device names, alternate data streams, null bytes).
  - Differentiate allowed classes:
    - Inputs (for reading): allow explicit path validation + size/type checks.
    - Outputs (for writing): write-only under normalized artifact root unless explicit `--unsafe-paths`.
    - Sensitive files (`--attest-key`): require local-only, canonical path, owner-readable-only checks, and deny symlink indirection.

### [S4] Ensure binary/input parsing is fail-closed with explicit caps
- **Evidence:** The plan allows bounded/truncated handling for non-text/binary content (lines 131, 511, 679-680), but does not yet define fail-closed behavior when binary/parsing pressure exceeds safe limits.
- **Impact:** Parser behavior may become inconsistent and could degrade into partial artifacts under hostile input, masking tampering and weakening reproducibility guarantees.
- **Mitigation:**
  - For `workflow state` and `workflow pr`, enforce deterministic parser policy: max input bytes, max diff chunks, hard UTF-8 decode mode with fallback path.
  - Detect binary signatures and refuse or isolate non-text inputs unless `--allow-binary-metadata` mode.
  - Emit explicit `E_INPUT_BIN`/`E_PARSE_LIMIT` diagnostics and stop normal artifact emission on parse policy violations.

### [S5] Harden attestation key and provenance integrity semantics
- **Evidence:** The plan includes `--attest-key <path>` and provenance generation but does not define key provenance controls, format, and failure semantics around weak/compromised keys (lines 288-289, 290-299).
- **Impact:** Attestation can become advisory-only or manipulable, reducing trust guarantees around local artifact verification.
- **Mitigation:**
  - Enforce strict signing-mode checks: supported key formats only, explicit algorithm allowlist, and key-id persistence in provenance.
  - Reject weak/expired/unreadable key files and deny following symlink chains.
  - For unsigned mode, include a prominent warning in output/status and require explicit `--attest-key` for CI policies that require verifiable artifacts.

### [S6] Make `--verify` truly side-effect free
- **Evidence:** `--verify` is described as read-only and no prompt-pack regeneration (lines 290-293), but this should be treated as an absolute contract in implementation and exit-model.
- **Impact:** Any write or launch side effects during verify defeats audit intent and allows malicious local tampering through replay workflows.
- **Mitigation:**
  - In verify mode, enforce a hard denylist of write and launch actions.
  - Validate exit code taxonomy so `--verify` cannot accidentally overwrite manifests/provenance, even if diagnostics are generated.
  - Add explicit tests asserting zero writes and zero launch attempts during `--verify`.
