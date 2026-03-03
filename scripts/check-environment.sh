#!/usr/bin/env bash
# Local environment check using ralph-gold.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "Checking environment with ralph-gold..."

case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) export PATH="$HOME/.local/bin:$PATH" ;;
esac

if ! command -v uv >/dev/null 2>&1; then
  echo "Error: uv is required but not found on PATH." >&2
  exit 1
fi

if [[ ! -f harness.contract.json ]]; then
  echo "Error: harness.contract.json not found at repo root." >&2
  exit 1
fi

if ! command -v ralph >/dev/null 2>&1; then
  echo "Installing ralph-gold..."
  uv tool install ralph-gold
fi

if command -v ralph >/dev/null 2>&1; then
  ralph harness doctor
else
  uv tool run --from ralph-gold ralph harness doctor
fi

echo "Environment check passed!"
