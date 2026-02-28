#!/usr/bin/env bash
#
# refresh-diagram-context.sh - Generate Mermaid diagrams and compact into AI context
#
# Usage:
#   scripts/refresh-diagram-context.sh --dry-run    # Preview actions without changes
#   scripts/refresh-diagram-context.sh --force      # Execute refresh
#
# Outputs:
#   .diagram/*.mmd                        - Individual Mermaid diagrams
#   .diagram/context/diagram-context.md   - Compacted context for AI agents
#   .diagram/context/diagram-context.meta.json - Metadata with schema version
#
set -euo pipefail

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIAGRAM_ENTRYPOINT="$REPO_ROOT/src/diagram.js"
DIAGRAMS_DIR="$REPO_ROOT/.diagram"
CONTEXT_DIR="$REPO_ROOT/.diagram/context"
CONTEXT_FILE="$CONTEXT_DIR/diagram-context.md"
META_FILE="$CONTEXT_DIR/diagram-context.meta.json"
SCHEMA_VERSION="1.0"

# State
DRY_RUN=false
FORCE=false

usage() {
  cat <<'USAGE'
Usage:
  scripts/refresh-diagram-context.sh --dry-run    # Preview actions without changes
  scripts/refresh-diagram-context.sh --force      # Execute refresh

Options:
  --dry-run    Show what would be done without making changes
  --force      Execute the refresh (required for actual changes)
  -h, --help   Show this help message

Outputs:
  .diagram/*.mmd                        Individual Mermaid diagrams
  .diagram/context/diagram-context.md   Compacted context for AI agents
  .diagram/context/diagram-context.meta.json  Metadata with schema version
USAGE
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --force)
        FORCE=true
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage >&2
        exit 2
        ;;
    esac
  done
}

log() {
  echo "[refresh] $1"
}

log_dry() {
  echo "[dry-run] $1"
}

ensure_dirs() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log_dry "Would use: $DIAGRAMS_DIR"
    log_dry "Would create: $CONTEXT_DIR"
  else
    mkdir -p "$DIAGRAMS_DIR"
    mkdir -p "$CONTEXT_DIR"
  fi
}

generate_diagrams() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log_dry "Would generate diagrams to: $DIAGRAMS_DIR"
    log_dry "  - All diagram types via 'diagram all'"
    return 0
  fi

  if [[ "$FORCE" != "true" ]]; then
    echo "Error: --force required to execute refresh" >&2
    exit 1
  fi

  log "Generating diagrams to: $DIAGRAMS_DIR"

  # Use 'diagram all' command with .diagram output directory
  node "$DIAGRAM_ENTRYPOINT" all "$REPO_ROOT" --output-dir "$DIAGRAMS_DIR"
}

compact_context() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log_dry "Would compact diagrams into: $CONTEXT_FILE"
    return 0
  fi

  log "Compacting diagrams into: $CONTEXT_FILE"

  # Build header
  cat > "$CONTEXT_FILE" <<'HEADER'
# Diagram Context Pack

Auto-generated architecture context from Mermaid diagrams.
Do not edit manually - regenerate with `scripts/refresh-diagram-context.sh --force`.

---

HEADER

  # Diagram types to include (matches diagram all output)
  local diagram_types=("architecture" "dependency" "class" "sequence" "flow" "database" "user" "events" "auth" "security")

  for dtype in "${diagram_types[@]}"; do
    local mmd_file="$DIAGRAMS_DIR/${dtype}.mmd"
    if [[ -f "$mmd_file" ]]; then
      echo "## ${dtype^} Diagram" >> "$CONTEXT_FILE"
      echo "" >> "$CONTEXT_FILE"
      echo '```mermaid' >> "$CONTEXT_FILE"
      cat "$mmd_file" >> "$CONTEXT_FILE"
      echo '```' >> "$CONTEXT_FILE"
      echo "" >> "$CONTEXT_FILE"
      echo "---" >> "$CONTEXT_FILE"
      echo "" >> "$CONTEXT_FILE"
    fi
  done

  log "Context file created: $CONTEXT_FILE"
}

write_metadata() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log_dry "Would write metadata to: $META_FILE"
    return 0
  fi

  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  local diagram_count
  diagram_count=$(find "$DIAGRAMS_DIR" -maxdepth 1 -name "*.mmd" -type f 2>/dev/null | wc -l | tr -d ' ')

  cat > "$META_FILE" <<EOF
{
  "schema_version": "$SCHEMA_VERSION",
  "generated_at": "$timestamp",
  "repo_root": "$REPO_ROOT",
  "diagrams_dir": ".diagram",
  "context_file": ".diagram/context/diagram-context.md",
  "diagram_count": $diagram_count,
  "diagram_types": ["architecture", "dependency", "class", "sequence", "flow", "database", "user", "events", "auth", "security"]
}
EOF

  log "Metadata file created: $META_FILE"
}

main() {
  parse_args "$@"

  echo "== Diagram Context Refresh =="
  echo "Repo: $REPO_ROOT"
  echo "Dry-run: $DRY_RUN"
  echo "Force: $FORCE"
  echo ""

  ensure_dirs
  generate_diagrams
  compact_context
  write_metadata

  if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    echo "Dry-run complete. Run with --force to execute."
  else
    echo ""
    echo "Refresh complete."
    echo "  Diagrams: .diagram/"
    echo "  Context:  .diagram/context/diagram-context.md"
    echo "  Metadata: .diagram/context/diagram-context.meta.json"
  fi
}

main "$@"
