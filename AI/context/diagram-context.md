# Diagram Context Pack

This file is refreshed for **diagram-cli** by the diagram context pipeline.

When source files change, the CI pipeline:
1. Runs the `diagram-cli` commands to generate Mermaid outputs
2. Updates this context pack from generated artifacts
3. Commits changes back to the PR branch

## Usage for Agents

Reference this file to understand:
- CLI entry points and command dispatch flow
- Rule engine + formatter dependencies
- Test and release-impact touchpoints

## Manual refresh

To refresh diagrams locally:

```bash
# Ensure dependencies are installed
npm install

# Generate diagrams
npm run ci:artifacts

# Refresh context pack markdown
bash scripts/refresh-diagram-context.sh --force
```
