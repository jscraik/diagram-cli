#!/usr/bin/env bash
set -euo pipefail

QUIET=0
FORCE=0
DRY_RUN=0
CHECK=0

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
		--check)
			CHECK=1
			shift
			;;
		*)
			echo "Unknown option: $1" >&2
			exit 2
			;;
	esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bash "$ROOT_DIR/scripts/codex-preflight.sh" --mode optional

DIAGRAM_DIR="$ROOT_DIR/.diagram"
CONTEXT_DIR="$DIAGRAM_DIR/context"
CONTEXT_FILE="$CONTEXT_DIR/diagram-context.md"
META_FILE="$CONTEXT_DIR/diagram-context.meta.json"
GIT_STATE_FILE="$(git -C "$ROOT_DIR" rev-parse --git-path archscope/refresh-state.local.json 2>/dev/null || true)"
if [[ -n "$GIT_STATE_FILE" && "$GIT_STATE_FILE" != /* ]]; then
	GIT_STATE_FILE="$ROOT_DIR/$GIT_STATE_FILE"
fi
ROOT_STATE_HASH="$(printf '%s' "$ROOT_DIR" | shasum -a 256 | awk '{print $1}')"
FALLBACK_STATE_DIR="${DIAGRAM_REFRESH_STATE_DIR:-${TMPDIR:-/tmp}/archscope-refresh-state/$ROOT_STATE_HASH}"
STATE_FILE="${GIT_STATE_FILE:-$FALLBACK_STATE_DIR/refresh-state.local.json}"
LOG_FILE="$(dirname "$STATE_FILE")/refresh.log"
MIN_SECONDS="${DIAGRAM_REFRESH_MIN_SECONDS:-1800}"
MAX_FILES="${DIAGRAM_REFRESH_MAX_FILES:-1000}"
CONTEXT_MAX_BYTES="${DIAGRAM_CONTEXT_MAX_BYTES:-12000}"
CONTEXT_MAX_LINES_PER_DIAGRAM="${DIAGRAM_CONTEXT_MAX_LINES_PER_DIAGRAM:-140}"
CONTEXT_MAX_EMBEDDED_DIAGRAMS="${DIAGRAM_CONTEXT_MAX_EMBEDDED_DIAGRAMS:-3}"
NOW_EPOCH="$(date +%s)"

if ! mkdir -p "$(dirname "$STATE_FILE")" 2>/dev/null; then
	STATE_FILE="$FALLBACK_STATE_DIR/refresh-state.local.json"
	mkdir -p "$(dirname "$STATE_FILE")"
fi
LOG_FILE="$(dirname "$STATE_FILE")/refresh.log"
if [[ "$CHECK" -ne 1 && "$DRY_RUN" -ne 1 ]]; then
	mkdir -p "$DIAGRAM_DIR" "$CONTEXT_DIR"
fi

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

COOLDOWN_FILE=""
if [[ -f "$STATE_FILE" ]]; then
	COOLDOWN_FILE="$STATE_FILE"
elif [[ -f "$META_FILE" ]]; then
	COOLDOWN_FILE="$META_FILE"
fi

if [[ "$CHECK" -ne 1 && "$FORCE" -ne 1 && -n "$COOLDOWN_FILE" ]]; then
	last_epoch="$(jq -r '.last_generated_epoch // 0' "$COOLDOWN_FILE" 2>/dev/null || echo 0)"
	if [[ "$last_epoch" =~ ^[0-9]+$ ]]; then
		age=$((NOW_EPOCH - last_epoch))
		if (( age < MIN_SECONDS )); then
			log "skip: cooldown active (${age}s < ${MIN_SECONDS}s)"
			exit 0
		fi
	fi
fi

if ! command -v node >/dev/null 2>&1; then
	log "error: node runtime is not available"
	exit 1
fi

TRUNC_DIR=".tmp-diagram-refresh-XXXXXX"
TMP_DIR="$(mktemp -d "$ROOT_DIR/${TRUNC_DIR}")"
TMP_BASENAME="$(basename "$TMP_DIR")"
EXCLUDE_PATTERNS="node_modules/**,.git/**,dist/**,${TMP_BASENAME}/**"
trap 'rm -rf "$TMP_DIR"' EXIT

pushd "$ROOT_DIR" >/dev/null
GENERATE_ALL_CMD=(
	node src/diagram.js generate-all .
	--output-dir "$TMP_BASENAME/diagrams"
	--artifact-profile agent
	--deterministic
	--exclude "$EXCLUDE_PATTERNS"
	--max-files "$MAX_FILES"
)
if [[ "$QUIET" -eq 1 ]]; then
	GENERATE_ALL_CMD+=(--quiet)
fi
"${GENERATE_ALL_CMD[@]}"
popd >/dev/null

if ! ls "$TMP_DIR/diagrams"/*.mmd >/dev/null 2>&1; then
	log "error: no .mmd files produced"
	exit 1
fi

MANIFEST_PATH="$TMP_DIR/diagrams/manifest.json"
# shellcheck disable=SC2097,SC2098
ROOT_DIR="$ROOT_DIR" TMP_DIR="$TMP_DIR" MANIFEST_PATH="$MANIFEST_PATH" \
	node "$ROOT_DIR/src/context/normalize-diagram-manifest.js"

TMP_CONTEXT="$TMP_DIR/diagram-context.md"
TMP_CONTEXT_META="$TMP_DIR/diagram-context.meta.json"
# shellcheck disable=SC2097,SC2098,SC2034
ROOT_DIR="$ROOT_DIR" \
TMP_DIR="$TMP_DIR" \
CONTEXT_MAX_BYTES="$CONTEXT_MAX_BYTES" \
CONTEXT_MAX_LINES_PER_DIAGRAM="$CONTEXT_MAX_LINES_PER_DIAGRAM" \
CONTEXT_MAX_EMBEDDED_DIAGRAMS="$CONTEXT_MAX_EMBEDDED_DIAGRAMS" \
CONTEXT_DETERMINISTIC=1 \
CONTEXT_OUTPUT_PATH="$TMP_CONTEXT" \
CONTEXT_META_OUTPUT_PATH="$TMP_CONTEXT_META" \
	node "$ROOT_DIR/src/context/build-context-pack.js"

CONTEXT_SHA="$(shasum -a 256 "$TMP_CONTEXT" | awk '{print $1}')"
GIT_HEAD="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
# shellcheck disable=SC2012
DIAGRAM_COUNT="$(ls "$TMP_DIR/diagrams"/*.mmd | wc -l | tr -d ' ')"
TMP_STABLE_META="$TMP_DIR/diagram-context.stable-meta.json"
TMP_STATE="$TMP_DIR/refresh-state.local.json"

if [[ ! -f "$TMP_CONTEXT_META" ]]; then
	log "error: context pack metadata sidecar missing at $TMP_CONTEXT_META"
	exit 1
fi

jq --tab \
	--arg context_sha256 "$CONTEXT_SHA" \
	--argjson diagram_count "$DIAGRAM_COUNT" \
	--argjson context_max_bytes "$CONTEXT_MAX_BYTES" \
	--argjson context_max_lines_per_diagram "$CONTEXT_MAX_LINES_PER_DIAGRAM" \
	--argjson context_max_embedded_diagrams "$CONTEXT_MAX_EMBEDDED_DIAGRAMS" \
	--argjson context_bytes "$(wc -c < "$TMP_CONTEXT" | tr -d ' ')" \
	'
		. as $packer
		| ($packer // {})
		| del(.rootPath)
		| .schema_version = 1
		| .generated_at = (.generatedAt // "1970-01-01T00:00:00.000Z")
		| .context_sha256 = $context_sha256
		| .context_bytes = $context_bytes
		| .context_max_bytes = $context_max_bytes
		| .context_max_lines_per_diagram = $context_max_lines_per_diagram
		| .context_max_embedded_diagrams = $context_max_embedded_diagrams
		| .diagram_count = $diagram_count
		| .context_path = ".diagram/context/diagram-context.md"
		| .context_meta_path = ".diagram/context/diagram-context.meta.json"
		| .diagram_manifest_path = ".diagram/manifest.json"
		| .embedded_diagram_count = ((.embeddedCount // 0) | tonumber)
		| .omittedTypes = ((.omittedTypes // []) | sort)
		| .omitted_types = .omittedTypes
		| .omitted_count = (.omittedTypes | length)
	' "$TMP_CONTEXT_META" > "$TMP_STABLE_META"

CHANGED=false
changed_files=()

mark_changed() {
	CHANGED=true
	changed_files+=("$1")
}

compare_file() {
	local source_file="$1"
	local target_file="$2"
	local label="$3"
	if [[ ! -f "$target_file" ]] || ! cmp -s "$source_file" "$target_file"; then
		mark_changed "$label"
	fi
}

collect_mmd_names() {
	local source_dir="$1"
	local names=()
	local file
	for file in "$source_dir"/*.mmd; do
		[[ -e "$file" ]] || continue
		names+=("$(basename "$file")")
	done
	if [[ "${#names[@]}" -gt 0 ]]; then
		printf '%s\n' "${names[@]}" | sort
	fi
}

compare_file "$TMP_CONTEXT" "$CONTEXT_FILE" ".diagram/context/diagram-context.md"
compare_file "$TMP_DIR/diagrams/manifest.json" "$DIAGRAM_DIR/manifest.json" ".diagram/manifest.json"
compare_file "$TMP_STABLE_META" "$META_FILE" ".diagram/context/diagram-context.meta.json"

tmp_mmd_list="$(collect_mmd_names "$TMP_DIR/diagrams")"
current_mmd_list="$(collect_mmd_names "$DIAGRAM_DIR")"
if [[ "$tmp_mmd_list" != "$current_mmd_list" ]]; then
	mark_changed ".diagram/*.mmd"
else
	while IFS= read -r mmd_name; do
		[[ -n "$mmd_name" ]] || continue
		compare_file "$TMP_DIR/diagrams/$mmd_name" "$DIAGRAM_DIR/$mmd_name" ".diagram/$mmd_name"
	done <<< "$tmp_mmd_list"
fi

if [[ "$CHECK" -eq 1 ]]; then
	if [[ "$CHANGED" == "true" ]]; then
		log "check: diagram context is stale"
		{
			printf 'diagram context is stale; refresh required for:\n'
			printf '  %s\n' "${changed_files[@]}"
		} >&2
		exit 1
	fi
	log "check: diagram context is current"
	exit 0
fi

copy_if_changed() {
	local source_file="$1"
	local target_file="$2"
	if [[ ! -f "$target_file" ]] || ! cmp -s "$source_file" "$target_file"; then
		cp "$source_file" "$target_file"
	fi
}

while IFS= read -r mmd_name; do
	[[ -n "$mmd_name" ]] || continue
	copy_if_changed "$TMP_DIR/diagrams/$mmd_name" "$DIAGRAM_DIR/$mmd_name"
done <<< "$tmp_mmd_list"

while IFS= read -r mmd_name; do
	[[ -n "$mmd_name" ]] || continue
	if ! printf '%s\n' "$tmp_mmd_list" | grep -Fxq "$mmd_name"; then
		rm -f "$DIAGRAM_DIR/$mmd_name"
	fi
done <<< "$current_mmd_list"

copy_if_changed "$TMP_DIR/diagrams/manifest.json" "$DIAGRAM_DIR/manifest.json"
copy_if_changed "$TMP_CONTEXT" "$CONTEXT_FILE"
copy_if_changed "$TMP_STABLE_META" "$META_FILE"

jq --tab \
	--arg generated_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
	--arg git_head "$GIT_HEAD" \
	--arg context_sha256 "$CONTEXT_SHA" \
	--argjson context_bytes "$(wc -c < "$TMP_CONTEXT" | tr -d ' ')" \
	--argjson last_generated_epoch "$NOW_EPOCH" \
	--argjson min_interval_seconds "$MIN_SECONDS" \
	--arg changed "$CHANGED" \
	--arg root_path "$ROOT_DIR" \
	'
		{
			schema_version: 1,
			generated_at: $generated_at,
			root_path: $root_path,
			git_head: $git_head,
			context_sha256: $context_sha256,
			context_bytes: $context_bytes,
			last_generated_epoch: $last_generated_epoch,
			min_interval_seconds: $min_interval_seconds,
			changed: ($changed == "true")
		}
	' "$TMP_STABLE_META" > "$TMP_STATE"
copy_if_changed "$TMP_STATE" "$STATE_FILE"

log "ok: refreshed ${DIAGRAM_COUNT} diagrams (changed=${CHANGED})"
