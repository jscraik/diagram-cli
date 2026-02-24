# diagram-cli

Generate codebase architecture diagrams from source files. No AI required.

## Table of Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Diagram types](#diagram-types)
- [Output formats](#output-formats)
- [Documentation](#documentation)
- [Development](#development)
- [License](#license)

## Install

```bash
# Clone and link locally
git clone https://github.com/jscraik/diagram-cli.git
cd diagram-cli
npm install
npm link
```

## Quick start

```bash
# Analyze repository structure
diagram analyze .

# Generate architecture diagram (default type)
diagram generate .

# Generate all diagram types into ./diagrams
diagram all .
```

## Commands

### `diagram analyze [path]`

Analyze file structure and dependencies without rendering a diagram.

```bash
diagram analyze ./my-project
diagram analyze . --json
diagram analyze . --patterns "**/*.py,**/*.go"
diagram analyze . --max-files 200
```

Options:

- `-p, --patterns <list>` file patterns (default: `**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.go,**/*.rs`)
- `-e, --exclude <list>` exclude patterns
- `-m, --max-files <n>` max files to analyze (default: `100`)
- `-j, --json` JSON output

### `diagram generate [path]`

Generate one Mermaid diagram and print a preview URL.

```bash
diagram generate .
diagram generate . --type sequence
diagram generate . --focus src/api
diagram generate . --theme dark
diagram generate . --output diagram.mmd
diagram generate . --output diagram.svg
diagram generate . --open
```

Options:

- `-t, --type <type>` `architecture|sequence|dependency|class|flow` (default: `architecture`)
- `-f, --focus <module>` focus on one module or directory
- `-o, --output <file>` write `.mmd`, `.svg`, or `.png`
- `-m, --max-files <n>` max files to analyze
- `--theme <theme>` `default|dark|forest|neutral`
- `--open` open generated preview URL

### `diagram all [path]`

Generate all diagram types in one run.

```bash
diagram all .
diagram all . --output-dir ./docs/diagrams
```

Options:

- `-o, --output-dir <dir>` output directory (default: `./diagrams`)

## Diagram types

| Type | Description | Best for |
| --- | --- | --- |
| `architecture` | Component hierarchy by directory | Overall structure |
| `sequence` | Service or module interactions | API and flow analysis |
| `dependency` | Internal and external imports | Dependency review |
| `class` | Class-oriented relationships | OOP-heavy codebases |
| `flow` | Process/data flow | Control-flow mapping |

## Output formats

- Terminal Mermaid output
- `.mmd` Mermaid source files
- `.svg`/`.png` rendered images (requires Mermaid CLI)

Install Mermaid CLI for image export:

```bash
npm install -g @mermaid-js/mermaid-cli
```

## Documentation

- Contributor guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Support policy: [SUPPORT.md](SUPPORT.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Maintainer docs index: [docs/README.md](docs/README.md)
- Release history: [CHANGELOG.md](CHANGELOG.md)

## Development

```bash
npm install
npm test
node src/diagram.js --help
```

## License

MIT - see [LICENSE](LICENSE).
