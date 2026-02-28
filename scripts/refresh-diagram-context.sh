#!/usr/bin/env bash
set -euo pipefail

QUIET=0
FORCE=0
DRY_RUN=0

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
    --dry-run)
      DRY_RUN=1
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
INDEX_FILE="$CONTEXT_DIR/diagram-context.index.json"
LITE_FILE="$CONTEXT_DIR/diagram-context-lite.md"
META_FILE="$CONTEXT_DIR/diagram-context.meta.json"
LOG_FILE="$ROOT_DIR/.diagram-refresh.log"
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

if [[ "$DRY_RUN" -eq 1 ]]; then
  log "dry-run: would refresh diagrams into $DIAGRAM_DIR and context at $CONTEXT_FILE"
  exit 0
fi

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

TRUNC_DIR=".tmp-diagram-refresh-XXXXXX"
TMP_DIR="$(mktemp -d "${ROOT_DIR}/${TRUNC_DIR}")"
trap 'rm -rf "$TMP_DIR"' EXIT

pushd "$ROOT_DIR" >/dev/null
if [[ "$QUIET" -eq 1 ]]; then
  node src/diagram.js all . --output-dir "$TMP_DIR/diagrams" >/dev/null 2>&1
else
  node src/diagram.js all . --output-dir "$TMP_DIR/diagrams"
fi
popd >/dev/null

mapfile -t DIAGRAM_FILES < <(printf '%s\n' "$TMP_DIR"/diagrams/*.mmd | sort)
if (( ${#DIAGRAM_FILES[@]} == 0 )); then
  log "error: no .mmd files produced"
  exit 1
fi

# Helpers for machine-readable outputs
diagram_type() {
  local file_path="$1"
  local first_token

  first_token="$(awk 'NF {print $1; exit}' "$file_path")"

  case "$first_token" in
    graph|flowchart)
      echo "module-graph"
      ;;
    classDiagram)
      echo "class-model"
      ;;
    sequenceDiagram)
      echo "sequence-flow"
      ;;
    *)
      echo "mermaid"
      ;;
  esac
}

diagram_summary() {
  local name="$1"
  local dtype="$2"

  case "$name" in
    architecture)
      echo "Module-level architecture graph showing repository structure and dependency direction."
      ;;
    dependency)
      echo "Dependency map showing external packages and internal import boundaries."
      ;;
    class)
      echo "Class/module model for the principal command and rule objects."
      ;;
    flow)
      echo "Command flow across major phases in the diagram CLI pipeline."
      ;;
    sequence)
      echo "Execution sequence for the current CLI surface and dependencies."
      ;;
    *)
      echo "${dtype} generated from this repository's source graph."
      ;;
  esac
}

diagram_tags() {
  local name="$1"

  case "$name" in
    architecture)
      printf '%s' '["architecture","module-graph","structure"]'
      ;;
    dependency)
      printf '%s' '["dependencies","imports","imports-graph"]'
      ;;
    class)
      printf '%s' '["types","object-model","classes"]'
      ;;
    flow)
      printf '%s' '["runtime","control-flow","pipeline"]'
      ;;
    sequence)
      printf '%s' '["call-order","runtime","sequence"]'
      ;;
    *)
      printf '%s' '["mermaid","generated"]'
      ;;
  esac
}

diagram_use_cases() {
  local name="$1"

  case "$name" in
    architecture)
      printf '%s' '["architecture-review","boundary-analysis","module-discovery"]'
      ;;
    dependency)
      printf '%s' '["import-audit","coupling-check","package-risk"]'
      ;;
    class)
      printf '%s' '["refactoring","type-shape-checks","abstraction-overview"]'
      ;;
    flow)
      printf '%s' '["task-understanding","end-to-end-check","entrypoint-analysis"]'
      ;;
    sequence)
      printf '%s' '["behavior-analysis","runtime-order","call-path-check"]'
      ;;
    *)
      printf '%s' '["quick-reference","inspection"]'
      ;;
  esac
}

TMP_CONTEXT_INDEX="$TMP_DIR/diagram-context.index.md"
TMP_CONTEXT_SECTIONS="$TMP_DIR/diagram-context.sections.md"
TMP_CONTEXT="$TMP_DIR/diagram-context.md"
TMP_INDEX="$TMP_DIR/diagram-context.index.json"
TMP_LITE="$TMP_DIR/diagram-context-lite.md"

DIAGRAM_COUNT=0
DIAGRAM_ENTRIES='[]'

authored_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

{
  echo '| Diagram | Type | Path | Summary |'
  echo '| --- | --- | --- | --- |'
} > "$TMP_CONTEXT_INDEX"

: > "$TMP_CONTEXT_SECTIONS"

for file in "${DIAGRAM_FILES[@]}"; do
  name="$(basename "$file" .mmd)"
  rel_path="AI/diagrams/${name}.mmd"
  dtype="$(diagram_type "$file")"
  summary="$(diagram_summary "$name" "$dtype")"
  safe_summary="${summary//|/\\|}"
  line_count="$(wc -l < "$file" | tr -d '[:space:]')"
  checksum="$(shasum -a 256 "$file" | awk '{print $1}')"
  tag_set="$(diagram_tags "$name")"
  use_case_set="$(diagram_use_cases "$name")"

  entry="$(jq -n \
    --arg name "$name" \
    --arg path "$rel_path" \
    --arg type "$dtype" \
    --arg summary "$summary" \
    --arg checksum "$checksum" \
    --argjson line_count "$line_count" \
    --argjson tags "$tag_set" \
    --argjson use_cases "$use_case_set" \
    '{name:$name, path:$path, type:$type, summary:$summary, line_count:$line_count, checksum:$checksum, tags:$tags, recommended_for:$use_cases}')"

  DIAGRAM_ENTRIES="$(jq -c --argjson entry "$entry" '. + [$entry]' <<< "$DIAGRAM_ENTRIES")"
  DIAGRAM_COUNT=$((DIAGRAM_COUNT + 1))

  {
    echo "| ${name} | ${dtype} | ${rel_path} | ${safe_summary} |"
  } >> "$TMP_CONTEXT_INDEX"

  {
    echo "## ${name}"
    echo
    echo "- Type: ${dtype}"
    echo "- Path: ${rel_path}"
    echo "- Summary: ${summary}"
    echo
    echo '```mermaid'
    cat "$file"
    echo
    echo '```'
    echo
  } >> "$TMP_CONTEXT_SECTIONS"
done

echo "$DIAGRAM_ENTRIES" > "$TMP_INDEX"
INDEX_SHA="$(shasum -a 256 "$TMP_INDEX" | awk '{print $1}')"

# Build context WITHOUT timestamp for deterministic comparison
{
  echo '# Diagram Context Pack'
  echo
  echo '## Agent-first index'
  echo
  cat "$TMP_CONTEXT_INDEX"
  echo
  echo '## Detailed diagrams'
  echo
} > "$TMP_CONTEXT"
cat "$TMP_CONTEXT_SECTIONS" >> "$TMP_CONTEXT"

{
  echo '# Diagram Context Pack (Lite)'
  echo
  echo '## Diagram index (agent-first)'
  echo
  cat "$TMP_CONTEXT_INDEX"
} > "$TMP_LITE"

CONTEXT_SHA="$(shasum -a 256 "$TMP_CONTEXT" | awk '{print $1}')"
GIT_HEAD="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
CHANGED=true

# Compare content without timestamp for deterministic change detection
if [[ -f "$CONTEXT_FILE" ]]; then
  # Strip "Generated:" line from both files for comparison
  existing_content="$(grep -v '^Generated: ' "$CONTEXT_FILE" 2>/dev/null || cat "$CONTEXT_FILE")"
  new_content="$(grep -v '^Generated: ' "$TMP_CONTEXT" 2>/dev/null || cat "$TMP_CONTEXT")"
  if [[ "$existing_content" == "$new_content" ]]; then
    CHANGED=false
  fi
fi

# Now add timestamp to the final output files
{
  echo '# Diagram Context Pack'
  echo
  echo "Generated: $authored_at"
  echo
  echo '## Agent-first index'
  echo
  cat "$TMP_CONTEXT_INDEX"
  echo
  echo '## Detailed diagrams'
  echo
  cat "$TMP_CONTEXT_SECTIONS"
} > "$TMP_CONTEXT"

{
  echo '# Diagram Context Pack (Lite)'
  echo
  echo "Generated: $authored_at"
  echo
  echo '## Diagram index (agent-first)'
  echo
  cat "$TMP_CONTEXT_INDEX"
} > "$TMP_LITE"

rm -f "$DIAGRAM_DIR"/*.mmd
cp "$TMP_DIR"/diagrams/*.mmd "$DIAGRAM_DIR/"
cp "$TMP_CONTEXT" "$CONTEXT_FILE"
cp "$TMP_INDEX" "$INDEX_FILE"
cp "$TMP_LITE" "$LITE_FILE"

jq -n \
  --arg generated_at "$authored_at" \
  --arg git_head "$GIT_HEAD" \
  --arg context_sha256 "$CONTEXT_SHA" \
  --arg index_file_sha256 "$INDEX_SHA" \
  --argjson diagram_count "$DIAGRAM_COUNT" \
  --argjson last_generated_epoch "$NOW_EPOCH" \
  --argjson min_interval_seconds "$MIN_SECONDS" \
  --arg changed "$CHANGED" \
  --arg index_path "AI/context/diagram-context.index.json" \
  --arg lite_path "AI/context/diagram-context-lite.md" \
  --argjson index "$DIAGRAM_ENTRIES" \
  '{
    schema_version: 2,
    generated_at: $generated_at,
    git_head: $git_head,
    context_sha256: $context_sha256,
    diagram_count: $diagram_count,
    last_generated_epoch: $last_generated_epoch,
    min_interval_seconds: $min_interval_seconds,
    changed: ($changed == "true"),
    index_path: $index_path,
    index_file_sha256: $index_file_sha256,
    lite_path: $lite_path,
    diagrams: $index
  }' > "$META_FILE"

log "ok: refreshed ${DIAGRAM_COUNT} diagrams (changed=${CHANGED})"
