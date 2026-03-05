# Confidence Pipeline

Confidence artifacts make CLI capability and validation health explicit for local runs and CI.

## Table of Contents

- [Artifacts](#artifacts)
- [Flags](#flags)
- [Strict mode behavior](#strict-mode-behavior)
- [Fallback semantics](#fallback-semantics)

## Artifacts

- Confidence report: `.diagram/confidence/confidence-report.json`
- Typed IR artifact (opt-in): `.diagram/ir/architecture-ir.json`

Report contract (v1):
- `schemaVersion`
- `capabilities`
- `validation`
- `fallback`
- `confidence` (verdict/score/reasons)

## Flags

`diagram generate` and `diagram workflow pr`:
- `--confidence-report`
- `--strict-confidence`
- `--capability-check-only`

Typed IR emission (analysis family):
- `--emit-ir`

Incremental caching (analysis family):
- `--incremental`

## Strict mode behavior

`--strict-confidence` exits with code `1` when any confidence-critical degradation occurs:
- required capability failure
- validation failure
- fallback usage

Usage/config/ref/path errors continue to use exit code `2`.

## Fallback semantics

Fallbacks are recorded explicitly in the confidence report under:
- `fallback.used`
- `fallback.reasons[]`

Examples:
- Mermaid CLI validation unavailable, basic checks used instead
- Incremental mode requested but full scan fallback used
