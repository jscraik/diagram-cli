# diagram-cli: Living Map

Internal development overview for this repo. Tracked for harness closeout compliance.

## TL;DR
CLI tool that scans source code and generates Mermaid architecture diagrams. No AI, no network calls. Static analysis only.
Uses `@brainwav/coding-harness` v0.5.3 for agentic development control plane (risk tiers, pilot policies, preflight gates).
---

## Quickstart
```bash
npm install                    # Install deps
npm test                       # Mocha test suite (22 tests)
npm run test:watch             # Watch mode for TDD
npm run test:deep              # Deep regression suite
node src/diagram.js --help     # CLI reference
# Generate diagrams
node src/diagram.js all . --output-dir .diagram
# Refresh AI context pack
bash scripts/refresh-diagram-context.sh --force
# Harness (agentic control plane)
npx harness --help             # CLI reference
node node_modules/@brainwav/coding-harness/dist/cli.js preflight-gate  # Run policy checks
node node_modules/@brainwav/coding-harness/dist/cli.js blast-radius --files src/rules.js  # Check impact
```
---
## Architecture
```mermaid
flowchart TB
  subgraph CLI["src/diagram.js"]
    analyze["analyze"]
    generate["generate"]
    all["all"]
    test["test"]
    video["video"]
    animate["animate"]
    manifest["manifest"]
    workflow["workflow pr"]
  end
  subgraph Core["Core Modules"]
    rules["rules.js"]
    graph["graph.js"]
    video_mod["video.js"]
  end
  subgraph Utils["Utilities"]
    commands["utils/commands"]
    schema["schema/rules-schema"]
    factory["rules/factory"]
  end
  subgraph Formatters["Output Formatters"]
    console["formatters/console"]
    json["formatters/json"]
    junit["formatters/junit"]
  end
  analyze --> commands
  generate --> commands
  all --> commands
  test --> rules
  test --> factory
  video --> video_mod
  animate --> video_mod
  manifest --> commands
  workflow --> graph
  workflow --> rules
  rules --> factory
  rules --> graph
  video_mod --> commands
  factory --> rules/types/import-rule
```
---
## Codex Skill
A **diagram-cli** skill was created and published to `github.com/jscraik/Agent-skills`:
- **Location**: `~/.codex/skills/diagram-cli` → `/Users/jamiecraik/dev/agent-skills/utilities/diagram-cli`
- **Quality score**: 107/120 (Excellent)
- **Covers**: Installation, all commands, architecture testing, PR impact analysis, CI integration
To invoke: "Use diagram-cli to generate an architecture diagram for this repo"
---
## Codebase Tour
| Path | What it is |
|------|------------|
| `src/diagram.js` | CLI entrypoint, all commands |
| `src/video.js` | Video/animation generation (Playwright) |
| `src/rules.js` | Architecture rule engine |
| `src/graph.js` | Component graph builder |
| `src/utils/commands.js` | Shell command helpers (open, npx) |
| `src/schema/rules-schema.js` | Zod schema for `.architecture.yml` |
| `src/rules/factory.js` | Rule instantiation |
| `src/rules/types/` | Rule implementations (import-rule, base) |
| `src/formatters/` | console, json, junit output |
| `harness.contract.json` | Harness config: risk tiers, pilot policies, merge policy |
| `.github/workflows/pr-pipeline.yml` | PR tests + harness preflight gate |
| `.github/workflows/harness-update-check.yml` | Weekly harness template updates |
| `scripts/` | Helper scripts |
| `scripts/refresh-diagram-context.sh` | Generate `.diagram/` context pack |
| `scripts/deep-regression.js` | Deep test suite |
| `scripts/pre-commit.sh` | Pre-commit hook (runs tests) |
| `.github/dependabot.yml` | Weekly dependency updates |
| `docs/` | User-facing docs |
| `test/` | Mocha test suite |
| `test/setup.js` | MockGraph utility |
| `test/rules.test.js` | ImportRule tests |
| `test/rules.inward_only.test.js` | inward_only feature tests |
| `.mocharc.json` | Mocha config |
---
## Tech Stack
| Choice | Why |
|--------|-----|
| Node.js 18+ | Runtime target, ESM/CJS compat |
| CommonJS | Simpler CLI distribution |
| Commander | CLI parsing |
| Glob + picomatch | Fast file matching |
| Zod | Config validation |
| Chalk | Terminal colors |
| cli-table3 | Table output |
| YAML | Config file parsing |
| @brainwav/coding-harness@0.3.10 | Agentic dev control plane (risk tiers, pilot policies, gates) |
| **Test deps:**
| Mocha | Test framework |
| Chai | Assertions |
**Optional deps (video/animate):**
- Playwright - Browser automation for rendering
- ffmpeg - Video encoding
---
## Developer Workflows
### Add a new diagram type
1. Add type to `diagramTypes` array in `diagram.js`
2. Add generator function or switch case
3. Update README diagram types table
4. Add test case in `deep-regression.js`
### add a new rule type
1. Create `src/rules/types/my-rule.js` extending `base.js`
2. Register in `src/rules/factory.js`
3. Add schema in `src/schema/rules-schema.js`
4. Document in README and docs/architecture-testing.md
### Adopt rules incrementally (baseline)
Use baselines to introduce architecture rules without blocking PRs:
```bash
# 1. Add rule to .architecture.yml (without baseline)
# 2. Run and see violations
diagram test .
# 3. Save current count as baseline (accepts technical debt)
diagram test . --save-baseline
# 4. Now passes - but new violations will fail
diagram test .
```
Config updates automatically
```yaml
rules:
  - name: "Domain isolation"
    layer: "src/domain/**/*.js"
    must_not_import_from: ["src/ui"]
    baseline: 3  # <-- auto-added
```
### Run tests (Mocha/Chai)
```bash
npm test           # 22 tests covering rules engine
npm run test:watch  # Watch mode for TDD
```
### Run CI locally
```bash
npm run ci:artifacts
ls .diagram/
```
### Run harness gates
```bash
# Preflight check before commits
node node_modules/@brainwav/coding-harness/dist/cli.js preflight-gate --contract harness.contract.json
# Check blast radius for changed files (uses built-in defaults in v0.3.10)
node node_modules/@brainwav/coding-harness/dist/cli.js blast-radius --files src/rules.js,src/graph.js
# Risk tier classification
node node_modules/@brainwav/coding-harness/dist/cli.js risk-tier --contract harness.contract.json --files "src/**/*.js"
# Diff budget check
node node_modules/@brainwav/coding-harness/dist/cli.js diff-budget --contract harness.contract.json
# Gardener (stale docs detection)
node node_modules/@brainwav/coding-harness/dist/cli.js gardener --docs docs
```
### Watch mode (TDD-friendly)
npm run test:watch
```bash
# Preview
bash scripts/refresh-diagram-context.sh --dry-run
# Execute
bash scripts/refresh-diagram-context.sh --force
```
Outputs:
- `.diagram/*.mmd` - Individual Mermaid diagrams
- `.diagram/context/diagram-context.md` - Compacted context for AI
- `.diagram/context/diagram-context.meta.json` - Metadata
---
## Test Infrastructure
- **MockGraph utility** (`test/setup.js`): Creates fake graphs for unit tests without full codebase
- **Test files**: `test/rules.test.js`, `test/rules.inward_only.test.js`
- **Config**: `.mocharc.json` - Mocha with Chai assertions, spec reporter
- **Commands**: `npm test` (22 tests), `npm run test:watch`

## CI/CD Infrastructure
- **GitHub Actions**: npm caching enabled, Node 20 LTS across all jobs
- **Dependabot**: Weekly updates for npm + github-actions (Mondays 9am)
- **Pre-commit hook**: Runs `npm test` before every commit
  - Install: `cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`
  - Skip: `git commit --no-verify`
- **Dogfooding**: `.architecture.yml` enforces 6 layer constraints on diagram-cli itself
- **Code Review**: Agent-based review found Node version inconsistency (fixed 2026-03-02)

## Debugging Playbook ("cheat codes")
| Symptom | Check |
|---------|-------|
| `Cannot find module './utils/commands'` | Packaged wrong; use v1.0.1+ |
| `diagram generate` hangs | Large repo? Use `--max-files 50` |
| Video fails | Playwright installed? `npx playwright install chromium` |
| ffmpeg not found | `brew install ffmpeg` |
| Empty diagram output | Check file patterns match your code |
| Rule validation false positives | Verify `.architecture.yml` paths are relative to repo root |
| Tests failing | Check imports are require paths are correct |
### Common fixes
```bash
# Slow analysis on large monorepo
node src/diagram.js analyze . --max-files 50 --patterns "**/*.ts"
# Missing diagrams in .diagram/
node src/diagram.js all . --output-dir .diagram --max-files 200
# JUnit output for CI
node src/diagram.js test . --format junit --output results.xml
```
---
## Sharp Edges
1. **Large repos** - Default `--max-files 100` may be too low; tune per project
2. **Video generation** - Requires Playwright + chromium; heavy install
3. **Mermaid CLI rendering** - Optional dep for SVG/PNG; not bundled
4. **Sequence/flow limits** - Capped at 6/8 components to avoid noise
5. **Path matching** - Uses picomatch; Windows paths may need normalization
6. **ESM-only deps** - Chalk v5+, glob v11+, chai v5+ are ESM-only; pinned to CommonJS-compatible versions
---
## Improvements Backlog
| Priority | Item | Why |
|----------|------|-----|
| P1 | Add incremental analysis | Large repos are slow on every run |
| P1 | Cache parsed imports | Re-scan unchanged files is wasteful |
| ✅ | ~~Watch mode~~ | ~~Added `npm run test:watch` for TDD (2026-03-02) |
| ✅ | ~~More language support~~ | ~~TS/JS dominant; Python/Go/Rust remain (2026-03-02) |
| P3 | Plugin system | Allow custom diagram generators |
| ✅ | ~~Baseline violations~~ | ~~Added `--save-baseline` for incremental rule adoption (2026-03-02) |
| ✅ | ~~Inward-only directionality~~ | ~~Added `inward_only: true` for directional layer constraints (2026-03-02) |
| ✅ | ~~Test infrastructure~~ | ~~Added Mocha/Chai with MockGraph utility (22 tests) (2026-03-02) |
| ✅ | ~~CI caching~~ | ~~Added npm cache to GitHub Actions (2026-03-02) |
| ✅ | ~~Dependabot~~ | ~~Weekly npm + github-actions updates (2026-03-02) |
| ✅ | ~~Pre-commit hook~~ | ~~Runs tests before commits (2026-03-02) |
---
## Recent Changes
| Date | What | Commit |
|------|------|--------|
| 2026-03-02 | Merge Dependabot PRs: actions/checkout v6, setup-node v6, upload-artifact v7, test-reporter v2, commander v14 | various |
| 2026-03-02 | Commit FORJAMIE.md for harness closeout compliance | `6beac64` |
| 2026-03-02 | Pin chai to v4 for CommonJS compatibility (ESM-only breaking change) | `1e3dd8e` |
| 2026-03-02 | Add Dependabot ignore rules for ESM-only packages (chalk v5+, glob v11+, chai v5+) | `5eecc6e` |
| 2026-03-02 | Standardize Node version to 20 across all CI jobs | `8b4de69` |
| 2026-03-02 | Fix CI Node version inconsistency (standardize to 20 LTS), improve null byte error messages | `d0a2c49` |
| 2026-03-02 | Add CI caching, Dependabot, and pre-commit hook | `19d0eeb` |
| 2026-03-02 | Fix mocha transitive deps vulnerabilities (serialize-javascript, diff) | `5fb018e` |
| 2026-03-02 | Add dogfooding architecture rules (6 rules, inward_only on core layers)| `712290c` |
| 2026-03-02 | Add Mocha/Chai test infrastructure with MockGraph utility for isolated unit testing (22 tests) | `aa4e233` |
| 2026-03-02 | Add `inward_only: true` for directional layer constraints (Clean Architecture/DDD pattern) | `554e0b9` |
| 2026-03-02 | Add baseline violations for incremental rule adoption (`--save-baseline`, `--baseline` flag) | `95870eb` |
| 2026-03-02 | Add `diagram workflow pr` command for PR architecture impact analysis with blast radius, risk scoring, and HTML explainers | `ad5edfa` |
| 2026-03-02 | Fix risk level mapping (0 → none, 1-2 → low, 3-5 → medium, 6+ → high) | `fcacd9b` |
| 2026-03-02 | Fix risk override not recorded in JSON (reorder artifact write after risk check) | `2ec55ca` |
| 2026-03-02 | Create diagram-cli skill for agent-skills (107/120 quality score) | `d0bb569` |
| 2026-03-02 | Add npm token auth for private packages in CI workflows | `ad5edfa` |
| 2026-02-28 | Upgrade harness to v0.3.10, add pilot policies, remove deprecated blastRadiusRules | `325f3a5` |
| 2026-02-28 | Add `@brainwav/coding-harness` with customized contract and PR workflow | `91a03e9` |
| 2026-02-28 | Add `scripts/refresh-diagram-context.sh` for AI context generation | `ca013ef` |
| 2026-02-28 | Add architecture CI artifact workflow outputs | `36afcd7` |
| 2026-02-27 | Ignore local tooling caches in .gitignore | `f168047` |
