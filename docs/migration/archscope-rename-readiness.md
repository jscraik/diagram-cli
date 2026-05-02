# Archscope Rename Readiness

## Table of Contents

- [Status](#status)
- [Protected Compatibility Surfaces](#protected-compatibility-surfaces)
- [Readiness Checklist](#readiness-checklist)
- [Required Follow-Up Specs](#required-follow-up-specs)
- [Planning Handoff](#planning-handoff)
- [Validation Evidence](#validation-evidence)

## Status

Current status: `rename_deferred`.

Archscope is the canonical product and CLI identity for new user-facing wording,
but external compatibility surfaces are not ready for hard rename work. The
current package, repository, artifact namespace, configuration file, and schema
URL surfaces remain compatibility contracts until dedicated migration specs and
release evidence prove a safe cutover path.

This record covers rename readiness only. It does not weaken the existing
command compatibility contract where both `archscope` and `diagram` remain
supported.

## Protected Compatibility Surfaces

The following names remain intentionally supported:

- Package: `@brainwav/diagram`
- Repository slug and URLs: `diagram-cli`
- Compatibility command: `diagram`
- Artifact namespace: `.diagram`
- Config file: `.diagramrc`
- Historical schema/domain URLs that include diagram-era naming

These names may appear in docs, package metadata, generated manifests, schema
URLs, migration evidence, and compatibility guidance when they describe current
runtime truth.

## Readiness Checklist

| Rename area | Current decision | Required readiness evidence before planning |
| --- | --- | --- |
| Package rename | Defer `@brainwav/diagram` rename. | Dedicated package migration spec covering publish ownership, package availability, dual-package behavior, npm deprecation messaging, consumer impact, dependency update guidance, and rollback. |
| Repository rename | Defer `diagram-cli` repository rename. | Dedicated repository migration spec covering GitHub redirects, branch protection, badges, workflow URLs, package metadata URLs, issue tracker references, downstream cloned remotes, and rollback. |
| Artifact namespace rename | Defer `.diagram` rename. | Dedicated artifact namespace migration spec covering dual-write or opt-in behavior, CI artifact consumers, manifest discovery, agent read order, cleanup policy, and rollback. |
| Config file rename | Defer `.diagramrc` rename. | Dedicated config migration spec covering discovery precedence, dual-read behavior, generated init output, user warnings, and rollback. |
| Schema/domain URL rename | Defer diagram-era schema URL rename. | Dedicated schema migration spec covering versioning, redirects, deterministic output, consumer compatibility, and parser rollback. |

## Required Follow-Up Specs

Hard rename work must not start from this identity convergence plan alone.
Before implementation, create one or more focused specs:

- Package rename spec for any `@brainwav/archscope` or equivalent npm package.
- Repository rename spec for any move away from `jscraik/diagram-cli`.
- Artifact namespace spec for any required `.archscope` output path.
- Config migration spec for any required `.archscoperc` or replacement config
  path.
- Schema/domain migration spec for any schema URL or domain rename.

Each follow-up spec must define consumer impact, release choreography,
validation gates, rollback, and how compatibility evidence will be recorded.

## Planning Handoff

Next eligible state: `rename_ready_for_planning`.

Entry requirements:

- SA13-SA16 from the governing identity convergence spec pass.
- The relevant follow-up spec exists and has been technically reviewed.
- Consumer impact is documented for humans, CI, and AI coding agents.
- Rollback is explicit and does not depend on deleting compatibility surfaces.
- Validation evidence can prove both old and new surfaces before any hard
  deprecation.

Until those requirements exist, keep shipping Archscope-first language while
preserving `@brainwav/diagram`, `diagram`, `diagram-cli`, `.diagram`, and
`.diagramrc` as live compatibility facts.

## Validation Evidence

Required local checks for this record:

```bash
vale --config .vale.ini docs/migration/archscope-rename-readiness.md
rg -n "rename_deferred|@brainwav/diagram|diagram-cli|\\.diagram|\\.diagramrc" docs/migration/archscope-rename-readiness.md
```
