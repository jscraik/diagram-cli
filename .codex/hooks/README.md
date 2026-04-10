# Codex Hook Pack

## Table of Contents

- [Overview](#overview)
- [Files](#files)
- [Install shape](#install-shape)
- [What this pack does](#what-this-pack-does)
- [Validation](#validation)

## Overview

This hook pack was scaffolded from `utilities/codex-hooks-builder` and
targets the currently documented Codex command-hook contract.

## Files

- `.codex/hooks.json`
- `.codex/hooks/run-hook.sh`
- `.codex/hooks/session-start.sh`
- `.codex/hooks/user-prompt-submit.sh`
- `.codex/hooks/stop-guard.sh`

## Install shape

- active config layer: repo-local `.codex`
- hook scripts folder: `.codex/hooks`
- command paths in `hooks.json` resolve the git repo root at runtime, then dispatch through `run-hook.sh`

## What this pack does

- `SessionStart` adds concise repo-aware startup context
- `UserPromptSubmit` blocks obvious instruction-waiver attempts and annotates risky shortcuts
- `Stop` blocks clearly incomplete final handoffs once, then fails open on retry
- `PreToolUse` and `PostToolUse` are supported by Codex docs but intentionally not scaffolded in this starter pack unless requested

## Validation

```bash
zsh -n .codex/hooks/run-hook.sh
zsh -n .codex/hooks/session-start.sh
zsh -n .codex/hooks/user-prompt-submit.sh
zsh -n .codex/hooks/stop-guard.sh
jq . .codex/hooks.json
```
