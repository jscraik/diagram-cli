#!/usr/bin/env bash
set -euo pipefail

QUIET=0
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quiet)
      QUIET=1
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIAGRAM_DIR="$ROOT_DIR/AI/diagrams"
CONTEXT_DIR="$ROOT_DIR/AI/context"
CONTEXT_FILE="$CONTEXT_DIR/diagram-context.md"
META_FILE="$CONTEXT_DIR/diagram-context.meta.json"
LOG_FILE="$CONTEXT_DIR/refresh.log"
MIN_SECONDS="${DIAGRAM_REFRESH_MIN_SECONDS:-1800}"
NOW_EPOCH="$(date +%s)"

mkdir -p "$DIAGRAM_DIR" "$CONTEXT_DIR"

log() {
  local message="$1"
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$message" >> "$LOG_FILE"
  if [[ "$QUIET" -ne 1 ]]; then
    printf '%s\n' "$message"
  fi
}

if [[ "$FORCE" -ne 1 && -f "$META_FILE" ]]; then
  last_epoch="$(jq -r '.last_generated_epoch // 0' "$META_FILE" 2>/dev/null || echo 0)"
  if [[ "$last_epoch" =~ ^[0-9]+$ ]]; then
    age=$((NOW_EPOCH - last_epoch))
    if (( age < MIN_SECONDS )); then
      log "skip: cooldown active (${age}s < ${MIN_SECONDS}s)"
      exit 0
    fi
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  log "error: node not found"
  exit 1
fi

TMP_DIR="$(mktemp -d "${ROOT_DIR}/.tmp-diagram-refresh-XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

pushd "$ROOT_DIR" >/dev/null
if [[ "$QUIET" -eq 1 ]]; then
  node src/diagram.js all . --output-dir "$TMP_DIR/diagrams" >/dev/null 2>&1
else
  node src/diagram.js all . --output-dir "$TMP_DIR/diagrams"
fi
popd >/dev/null

if ! ls "$TMP_DIR/diagrams"/*.mmd >/dev/null 2>&1; then
  log "error: no .mmd files produced"
  exit 1
fi

TMP_CONTEXT="$TMP_DIR/diagram-context.md"
{
  echo "# Diagram Context Pack"
  echo
  echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo
  for file in "$TMP_DIR"/diagrams/*.mmd; do
    name="$(basename "$file" .mmd)"
    echo "## ${name}"
    echo
    echo '```mermaid'
    cat "$file"
    echo
    echo '```'
    echo
  done
} > "$TMP_CONTEXT"

CONTEXT_SHA="$(shasum -a 256 "$TMP_CONTEXT" | awk '{print $1}')"
GIT_HEAD="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
DIAGRAM_COUNT="$(ls "$TMP_DIR/diagrams"/*.mmd | wc -l | tr -d ' ')"
CHANGED=true

if [[ -f "$CONTEXT_FILE" ]] && cmp -s "$TMP_CONTEXT" "$CONTEXT_FILE"; then
  CHANGED=false
fi

rm -f "$DIAGRAM_DIR"/*.mmd
cp "$TMP_DIR"/diagrams/*.mmd "$DIAGRAM_DIR/"
cp "$TMP_CONTEXT" "$CONTEXT_FILE"

jq -n \
  --arg generated_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --arg git_head "$GIT_HEAD" \
  --arg context_sha256 "$CONTEXT_SHA" \
  --argjson diagram_count "$DIAGRAM_COUNT" \
  --argjson last_generated_epoch "$NOW_EPOCH" \
  --argjson min_interval_seconds "$MIN_SECONDS" \
  --arg changed "$CHANGED" \
  '{
    schema_version: 1,
    generated_at: $generated_at,
    git_head: $git_head,
    context_sha256: $context_sha256,
    diagram_count: $diagram_count,
    last_generated_epoch: $last_generated_epoch,
    min_interval_seconds: $min_interval_seconds,
    changed: ($changed == "true")
  }' > "$META_FILE"

log "ok: refreshed ${DIAGRAM_COUNT} diagrams (changed=${CHANGED})"
