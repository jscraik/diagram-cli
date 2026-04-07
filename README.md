# diagram-cli

> Generate codebase architecture diagrams from source files. No AI required.

> [!WARNING]
> `@brainwav/diagram@1.0.0` had a packaging regression. Please use `@brainwav/diagram@1.0.1` or later.

## 1. Overview & TL;DR

This tool reads code and draws a precise map of your architecture. It scans files, finds dependencies, and outputs a clear Mermaid graph. 

The goal is simple: keep the code map transparent and prevent architectural drift. You can export as `.mmd`, `.svg`, `.png`, or even generate animation sequences.

## 2. Quickstart & Installation

```bash
# Clone and link locally
git clone https://github.com/jscraik/diagram-cli.git
cd diagram-cli
npm install
npm link
```

### First-run checklist
1. Use a small test repo and run from the root.
2. View repository stats: `diagram analyze .`
3. Generate image/text diagram: `diagram generate . --output diagram.svg`
4. Generate all views into `./diagrams`: `diagram all .`
5. *Deep integration:* Try `diagram test --init` to setup CI rules.

## 3. Core Workflows

### Standard Generation
Focus purely on what matters in the CLI right now:
```bash
# Focus on a specific module with dark theme
diagram generate . --focus src/api --theme dark --open
```

### PR Architecture Impact Analysis
Analyze the blast-radius of architectural changes automatically (perfect for GitHub Actions):
```bash
diagram workflow pr . --base origin/main --head HEAD --fail-on-risk
```
This produces `pr-impact.html` and JSON artifacts for structured PR review narratives, flagging risk levels based on files touched.

### AI-Focused Pipeline Outputs
For AI agents (e.g., Cursor, GitHub Copilot), feeding `.mmd` files is far more efficient than loading the entire source tree into context. Run:
```bash
diagram all . --output-dir .diagram
```
This produces minimal, highly textual context maps (e.g., Databases, User paths, Auth flows).

## 4. Configuration & Testing

Validate your codebase architecture against declarative YAML rules (`.architecture.yml`) to prevent directional drift.

```bash
diagram test --init    # Generate starter configuration
diagram test           # Run validation checks
```

**Example Rule (`.architecture.yml`)**:
```yaml
version: "1.0"
rules:
  - name: "Domain isolation"
    layer: "src/domain"
    must_not_import_from: ["src/ui", "src/components"]
    inward_only: true
```
> *Pattern note:* Use `inward_only` to enforce Clean Architecture/DDD dependencies.

## 5. Command Reference & Docs

For an exhaustive list of arguments, video generation prerequisites, CI setups, and more, refer to our detailed documentation:

- 📖 **[CLI Command Reference](docs/cli-reference.md)**
- Setting up architecture tests: [docs/architecture-testing.md](docs/architecture-testing.md)
- GitHub Actions CI Integration: [docs/getting-started.md](docs/getting-started.md)
- Contributor guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Release history: [CHANGELOG.md](CHANGELOG.md)

---
<div align="center">
  <img src="brand/brand-mark.webp" alt="brAInwav brand-mark" width="150" />
  <p><i>from demo to duty</i></p>
</div>
## Documentation signature

brAInwav - from demo to duty

## Development

```bash
npm install
npm test
npm run test:deep
node src/diagram.js --help
```

## License

Apache 2.0 - see [LICENSE](LICENSE).
