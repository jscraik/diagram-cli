# External integrations

## Table of Contents
- [MCP and API preflight order](#mcp-and-api-preflight-order)
- [Authentication failure handling](#authentication-failure-handling)

## MCP and API preflight order
Before full MCP/API operations, run checks in this order:
1. Verify environment variables are expanded correctly (not placeholders).
2. Verify 1Password session is active: `op account list`.
3. Verify MCP server availability: `codex mcp list`.
4. Perform a simple connectivity check.
5. Proceed with full operations only after checks pass.

## Authentication failure handling
- If authentication fails, debug the auth layer first before retrying full operations.
- Treat missing MCP server setup as a blocker; fix setup before implementation attempts.
