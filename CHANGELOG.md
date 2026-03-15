# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.0] - 2026-03-15

### Added

- Add `agent` diagram type: detects orchestrator/worker/tool/memory components and renders
  Anthropic canonical agentic patterns (orchestrator-workers, tool use, memory retrieval).
  Reference: anthropic.com/research/building-effective-agents (Dec 2024).
- Add `c4context` diagram type: C4 Model Level 1 System Context using Mermaid native `C4Context`
  syntax. Auto-detects external package categories (AI, database, payment, cloud, etc.).
  Reference: c4model.com (Simon Brown).
- Add `rag` diagram type: canonical RAG pipeline diagram (Query → Embed → Retrieve → LLM →
  Response) with overlay of detected memory/LLM/tool components.
- Add AI-native role detection patterns: `agent`, `tool`, `memory`, `llm` — covering
  LangChain, AutoGen, CrewAI, OpenAI Swarm, and Anthropic SDK naming conventions.
- Add `ROLE_COLOURS` palette constant (exported): C4/arc42-aligned fill/text colours keyed
  by role tag, used consistently across all diagram generators.
- Add `ROLE_ARCH_ICON` constant: maps role tags to Mermaid v11 architecture-beta icon names.

### Changed

- Upgrade `architecture` diagram generator from `graph TD` to Mermaid v11 `architecture-beta`
  syntax. Services now have typed icons (database, server, disk, cloud, internet), directories
  become named groups, and dependency edges use directional `B --> T` port routing.
  Reference: mermaid.js.org/syntax/architecture.html (v11.1.0+).
- Upgrade `sequence` diagram generator: now traces actual dependency edges via BFS from entry
  points rather than picking arbitrary "service" filenames. Participants declared as
  `actor`/`participant`/`database` by role. Arrows carry semantic verb labels
  (reads from, authenticates via, calls LLM, invokes tool, emits to).
  Reference: arc42 Section 6 (Runtime View).
- Wire verb labels on agent, events, and security dependency edges for C4-compliant
  "every arrow has a verb" notation.
- Wire `diagram test --format junit` into the architecture CI workflow, replacing the
  separate manifest validation step. JUnit output fed directly to `dorny/test-reporter`.

### Fixed

- Fix incremental cache returning stale analysis after source file changes. Cache entries now
  store a per-file `contentSignature` (SHA-256 of mtime + size). On read, the signature is
  recomputed; any mtime change evicts the entry and triggers a full re-scan.
- Fix silent truncation when `--max-files` ceiling is hit. A visible warning now fires:
  `⚠️  Max-files limit reached: analyzing N of M files. Use --max-files X to expand.`
  `totalFilesFound` and `maxFilesApplied` are also exposed in the analysis return value.
- Add Zod validation for `.diagramrc` config file (`src/config/diagramrc.js`). Invalid
  keys or wrong types now print a clear error and exit 2 instead of silently ignoring config.

## [1.0.3] - 2026-02-28

### Added

- Add `ci:artifacts` script to generate `.diagram/` artifacts (all diagram variants + JUnit results) in CI.
- Wire architecture workflow to emit and upload `.diagram/` artifacts from PR checks.
- Ignore `.diagram/` by default to keep generated CI artifacts out of source control.

## [1.0.2] - 2026-02-27

### Changed

- Codex/docs qa readability (#3) (9e51719)
- docs: bootstrap docs QA and readability updates (#2) (fcaec03)
- docs: refresh docs and bug report markdown (40f095d)
- docs: add upgrade notice for 1.0.0 regression (5cf96be)


## [1.0.1] - 2026-02-25

### Changed

- fix: include commands module in published package (f95066d)
- Customer notice: `1.0.0` had a packaging regression; upgrade to `1.0.1+`.

## [1.0.0] - 2026-02-24

### Added

- Initial CLI with `analyze`, `generate`, and `all` commands.
- Mermaid diagram generation and preview link output.
