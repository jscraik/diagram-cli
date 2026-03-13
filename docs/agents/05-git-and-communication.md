# Git workflow and communication

## Table of Contents
- [Git risk escalation](#git-risk-escalation)
- [Merge readiness](#merge-readiness)
- [Communication rules](#communication-rules)

## Git risk escalation
For rebasing 5+ commits, resolving merge conflicts, or force-pushing, pause and present:
1. Current branch state.
2. Proposed strategy and risks.
3. Alternative approaches.
4. Explicit user confirmation before proceeding.

## Merge readiness
- Run `codex review --uncommitted` before merge and resolve findings first.
- Never assume conflict-free status without explicit verification.

## Communication rules
- Keep communication single-threaded by default: one clear next step per update.
- When a user names a tool or skill, verify it exists before assuming fallback behavior.
