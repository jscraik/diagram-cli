#!/bin/zsh

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  printf '%s\n' '{"continue":true,"systemMessage":"jq not found; skipping hook runner."}'
  exit 0
fi

hook_name="${1:-}"
if [[ -z "$hook_name" ]]; then
  printf '%s\n' '{"continue":true,"systemMessage":"hook name missing; skipping hook runner."}'
  exit 0
fi

script_dir="$(cd -- "$(dirname -- "${0}")" && pwd -P)"
target_script="${script_dir}/${hook_name}.sh"

if [[ ! -x "$target_script" ]]; then
  jq -n \
    --arg hook_name "$hook_name" \
    '{
      continue: true,
      systemMessage: ("hook script not found: " + $hook_name + ".sh")
    }'
  exit 0
fi

exec "$target_script"
