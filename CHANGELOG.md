# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
