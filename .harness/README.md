---
schema_version: 1
artifact_type: harness-control-plane-policy
status: active
---

# Harness Control-Plane Tracking Policy

## Table of Contents

- [Purpose](#purpose)
- [Tracking Contract](#tracking-contract)
- [Authority Model](#authority-model)
- [Directory Classification](#directory-classification)
- [Operational Rules](#operational-rules)

## Purpose

`.harness` is part of this repository's agent and governance control plane. It is not a blanket scratch directory.

Track curated Markdown and JSON contract files that carry repository intent, approved decisions, execution routing, quality criteria, and review evidence. Ignore runtime state, backups, caches, databases, and bulk generated snapshots.

This policy prevents two failure modes:

- durable Harness Engineering context existing only on one machine
- the repository becoming a junk drawer of transient harness output

## Tracking Contract

Track these curated surfaces by default:

- `.harness/core/**.md`
- `.harness/decisions/**.md`
- `.harness/linear/**.md`
- `.harness/refactors/**.md`
- `.harness/features/**.md`
- `.harness/strategy/**.md`
- `.harness/triage/**.md`
- `.harness/review/**.md`
- `.harness/ideate/**.md`
- `.harness/brainstorm/**.md`
- `.harness/specs/**.md`
- `.harness/plan/**.md`
- `.harness/memory/LEARNINGS.md`
- `.harness/quality/**`
- `.harness/ci-required-checks.json`
- `.harness/ci-provider-transition-status.json`
- `.harness/*-manifest.json`

Do not track these surfaces by default:

- `.harness/backups/**`
- `.harness/*.db`
- `.harness/ci-migrate-snapshots/**`
- cache directories
- temporary exports
- bulk generated snapshots without a named fixture, validator, or review contract

## Authority Model

Tracked `.harness` files do not all have the same authority.

Primary execution authority belongs to selected execution-input surfaces such as `.harness/linear/**` and `.harness/refactors/**`.

Secondary context surfaces such as `.harness/features/**`, `.harness/strategy/**`, `.harness/triage/**`, and `.harness/review/**` inform implementation but must not directly drive code changes unless admitted by an execution-input artifact or an explicit human instruction.

Policy and decision surfaces such as `.harness/core/**`, `.harness/decisions/**`, `.harness/memory/LEARNINGS.md`, `.harness/quality/**`, and tracked contract JSON files define repository constraints and should be treated as source-of-truth inputs.

## Directory Classification

| Path | Class | Default tracking | Authority |
| --- | --- | --- | --- |
| `.harness/core/` | policy | track curated Markdown | source of truth |
| `.harness/decisions/` | decision | track curated Markdown | source of truth |
| `.harness/linear/` | execution-input | track curated Markdown | implementation authority when selected |
| `.harness/refactors/` | execution-input | track curated Markdown | implementation authority when selected |
| `.harness/features/` | secondary-context | track curated Markdown | context only |
| `.harness/strategy/` | secondary-context | track curated Markdown | context only |
| `.harness/triage/` | secondary-context | track curated Markdown | context only |
| `.harness/review/` | secondary-context | track curated Markdown | context and evidence |
| `.harness/ideate/` | lifecycle-artifact | track curated Markdown | context until admitted |
| `.harness/brainstorm/` | lifecycle-artifact | track curated Markdown | context until admitted |
| `.harness/specs/` | lifecycle-artifact | track curated Markdown | context until admitted |
| `.harness/plan/` | lifecycle-artifact | track curated Markdown | context until admitted |
| `.harness/memory/` | learned-fixes | track curated memory files | source of truth when documented |
| `.harness/quality/` | governance | track | source of truth |
| `.harness/*.json` | contract/config | track when consumed by validators or workflows | source of truth |
| `.harness/backups/` | backup/scratch | ignore | no authority |
| `.harness/*.db` | generated-runtime | ignore | no authority unless promoted to fixture |
| `.harness/ci-migrate-snapshots/` | generated-runtime | ignore by default | no authority unless promoted |

## Operational Rules

- Review tracked `.harness` changes like docs, specs, plans, or policy changes.
- Do not let secondary context become implementation authority by accident.
- Promote a generated snapshot only when a test, validator, fixture, or explicit review contract consumes it.
- Keep backup and runtime output out of commits.
- If a validator consumes a `.harness` file, prefer tracking it or moving it to a tracked fixture path.
