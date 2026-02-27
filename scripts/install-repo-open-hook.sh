#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZSHRC="${ZDOTDIR:-$HOME}/.zshrc"
START_MARKER="# >>> diagram-cli auto-refresh >>>"
END_MARKER="# <<< diagram-cli auto-refresh <<<"

mkdir -p "$(dirname "$ZSHRC")"
touch "$ZSHRC"

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

awk -v start="$START_MARKER" -v end="$END_MARKER" '
  BEGIN { in_block = 0 }
  $0 == start { in_block = 1; next }
  $0 == end { in_block = 0; next }
  !in_block { print }
' "$ZSHRC" > "$TMP_FILE"

cat >> "$TMP_FILE" <<EOF
$START_MARKER
autoload -Uz add-zsh-hook
__diagram_cli_repo="$ROOT_DIR"
__diagram_cli_refresh_context() {
  case "\$PWD" in
    "\$__diagram_cli_repo"|"\$__diagram_cli_repo"/*)
      "\$__diagram_cli_repo/scripts/refresh-diagram-context.sh" --quiet >/dev/null 2>&1 &
      ;;
  esac
}
add-zsh-hook chpwd __diagram_cli_refresh_context
__diagram_cli_refresh_context
$END_MARKER
EOF

mv "$TMP_FILE" "$ZSHRC"
echo "Installed auto-refresh hook into $ZSHRC"
echo "Restart your shell or run: source $ZSHRC"
