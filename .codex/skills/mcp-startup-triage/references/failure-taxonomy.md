# MCP Startup Failure Taxonomy

## Table of Contents
- [Classes](#classes)
- [Interpretation order](#interpretation-order)

## Classes

- Missing binary or path drift:
  - the configured command does not exist or resolves to a dead path.
- `mise` trust or runtime selection:
  - startup fails before MCP diagnostics because the repo stack or shim runtime is not trusted or not selected.
- Handshake incompatibility:
  - the server starts but never returns a valid initialize response.
- Auth or consent rejection:
  - config is valid, but the connector or session rejects the tool call.
- Local Memory listener failure:
  - the daemon process exists but port `3002` is not serving the REST API.
- Login-shell drift:
  - startup or hook failures occur only because shell bootstrap hits interactive trust prompts or other shell-side state.

## Interpretation order

1. Config, hook, and symlink health
2. `mise` trust and runtime selection
3. Local Memory listener health
4. MCP initialize response behavior
5. Auth or consent state
