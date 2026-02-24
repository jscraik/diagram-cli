# Claude Context: diagram-cli

Generate architecture diagrams from codebases using static analysis and Mermaid.

## When to use this tool

- **Analyze**: Understand project structure, dependencies, and entry points
- **Generate**: Create architecture, sequence, dependency, class, or flow diagrams  
- **Video**: Export animated videos or SVGs for presentations

## Bash Commands

```bash
# Development
npm install                    # Install deps
npm link                       # Link globally for local dev
npm test                       # Run self-test (analyzes current dir)

# Usage examples
diagram analyze .              # Quick project overview
diagram generate .             # Architecture diagram to stdout
diagram all . --output-dir docs/diagrams  # Generate all types
diagram video . --output demo.mp4 --duration 5  # Animated video
```

## Code Style

- **Node.js 18+**, CommonJS (for broad compatibility)
- Use `path.posix` for cross-platform path consistency
- Escape all user input before shell commands (`escapeShellArg`)
- Hash suffix on all mermaid IDs to prevent collisions
- Validate numeric inputs (bounds checking)

## Architecture

```
src/
  diagram.js    # CLI entry, analysis, diagram generators
  video.js      # Playwright-based video/SVG rendering (optional)
```

- **Analysis**: AST-less regex parsing for speed (supports TS/JS/Py/Go/Rust/Java)
- **Diagrams**: Mermaid syntax generation with collision-resistant IDs
- **Video**: Playwright screenshots → FFmpeg compilation

## Key Implementation Details

- **Sanitize**: `sanitize(name)` adds MD5 hash suffix to prevent ID collisions
- **Normalize**: `normalizePath()` converts all paths to forward slashes
- **Escape**: `escapeMermaid()` handles quotes, brackets, hashes for mermaid
- **Video**: Auto-detects FFmpeg codec (libx264 → h264_videotoolbox → mpeg4 fallback)

## Testing

```bash
# Manual verification
diagram analyze /Users/jamiecraik/dev/design-system --max-files 50
diagram generate . --type dependency --focus src/api
diagram video . --output /tmp/test.mp4 --duration 2 --fps 10
```

## Git/PR Etiquette

- Run `npm test` before commit
- Update README.md if adding new diagram types or commands
- Video feature requires Playwright + FFmpeg (document in README)

## @imports

- @README.md — User-facing documentation
- @package.json — Dependencies and scripts

## Package Manager

Detected: **npm** (lockfile present)

```bash
npm install       # dependencies
npm install -g .  # global install
```
