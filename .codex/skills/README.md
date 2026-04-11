# Repo-Local Skills

## Table of Contents
- [Overview](#overview)
- [Skills](#skills)

## Overview

These skills are specific to this repository and cover recurring governance and startup failure patterns that the global shared skill library does not own.

They are stored and versioned in this repository under `.codex/skills/`. The shared `agent-skills` catalog (for example `~/dev/agent-skills`) is a reference source for patterns and quality standards, not the runtime source of truth for these repo-local workflows.

## Skills

- `config-drift-guard`: guard tooling-envelope and local projection drift across `docs/agents/tooling.contract.json`, `.codex/environments/environment.toml`, and preflight wrappers.
- `validation-contract-check`: keep AGENTS, README, docs under `docs/agents/`, Makefile, package scripts, and validator wrappers aligned with the live command contract.
- `mcp-startup-triage`: classify MCP, Local Memory, `mise` trust, login-shell, and handshake startup failures before editing runtime flags.
- `ci-check-name-parity`: keep workflow job names, required-check config, and harness contract naming in sync.
