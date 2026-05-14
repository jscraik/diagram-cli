#!/usr/bin/env bash
set -euo pipefail

for candidate in \
	"$HOME/.local/share/mise/shims" \
	"$HOME/.local/bin" \
	"/opt/homebrew/bin" \
	"/opt/homebrew/sbin" \
	"/usr/local/bin" \
	"/usr/sbin" \
	"/sbin"; do
	if [[ -d "$candidate" && ":$PATH:" != *":$candidate:"* ]]; then
		PATH="$candidate:$PATH"
	fi
done
export PATH

if command -v mise >/dev/null 2>&1; then
	mise trust --yes .mise.toml || true
	mise install
fi

if [[ -f scripts/prepare-worktree.sh ]]; then
	bash scripts/prepare-worktree.sh
else
	npm install
fi
