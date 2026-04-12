#!/usr/bin/env bash
set -euo pipefail

resolve_script_path() {
	if [[ -n "${ZSH_VERSION:-}" ]]; then
		local source_path=''
		# In sourced zsh sessions, %x resolves to the current script file while
		# %N may resolve to function names or "(eval)".
		source_path="$(eval 'printf "%s\n" "${(%):-%x}"')"
		if [[ -n "${source_path}" && "${source_path}" != '(eval)' ]]; then
			printf '%s\n' "${source_path}"
			return
		fi
		source_path="$(eval 'printf "%s\n" "${(%):-%N}"')"
		if [[ -n "${source_path}" && "${source_path}" != '(eval)' ]]; then
			printf '%s\n' "${source_path}"
			return
		fi
	fi
	printf '%s\n' "${BASH_SOURCE[0]:-$0}"
}

is_script_sourced() {
	if [[ -n "${ZSH_VERSION:-}" ]]; then
		local source_path
		source_path="$(resolve_script_path)"
		[[ "${source_path}" != "$0" ]]
		return
	fi
	[[ "${BASH_SOURCE[0]:-$0}" != "$0" ]]
}

SCRIPT_PATH="$(resolve_script_path)"
SCRIPT_DIR="$(cd -- "$(dirname -- "${SCRIPT_PATH}")" && pwd -P)"
WORKSPACE_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd -P)"
PREFLIGHT_OVERRIDES_FILE="${WORKSPACE_ROOT}/.harness/memory/codex-preflight-overrides.env"

usage() {
	cat <<'USAGE'
Usage:
  ./scripts/codex-preflight.sh [options]

Options:
  --stack <auto|repo|js|py|rust>    Stack mode. Default: auto
  --mode <off|optional|required>    Local Memory mode. Default: required
  --repo-fragment <text>            Require repo root to contain this fragment
  --bins <csv>                      Override required binaries
  --paths <csv>                     Override required paths
  -h, --help                        Show this help

Examples:
  ./scripts/codex-preflight.sh
  ./scripts/codex-preflight.sh --stack js
  ./scripts/codex-preflight.sh --stack py --mode required
  ./scripts/codex-preflight.sh --repo-fragment local-memory

Legacy compatibility:
  ./scripts/codex-preflight.sh <repo-fragment> [bins-csv] [paths-csv]
  This preserves the older positional interface used by parent-repo checks and
  runs with Local Memory disabled unless the new flag-based mode is used.
USAGE
}

log_section() {
	printf '== %s ==\n' "$*"
}

log_ok() {
	printf '✅ %s\n' "$*"
}

log_warn() {
	printf '⚠️ %s\n' "$*"
}

log_err() {
	printf '❌ %s\n' "$*" >&2
}

append_csv_values() {
	local base_csv="${1:-}"
	local extra_csv="${2:-}"

	if [[ -z "${base_csv}" ]]; then
		printf '%s\n' "${extra_csv}"
		return
	fi
	if [[ -z "${extra_csv}" ]]; then
		printf '%s\n' "${base_csv}"
		return
	fi
	printf '%s,%s\n' "${base_csv}" "${extra_csv}"
}

load_preflight_overrides() {
	local override_file="$1"

	PREFLIGHT_OVERRIDE_BINS=''
	PREFLIGHT_OVERRIDE_PATHS=''
	if [[ ! -f "${override_file}" ]]; then
		return 0
	fi

	# shellcheck source=/dev/null
	source "${override_file}"
	PREFLIGHT_OVERRIDE_BINS="${CODEX_PREFLIGHT_EXTRA_BINS:-}"
	PREFLIGHT_OVERRIDE_PATHS="${CODEX_PREFLIGHT_EXTRA_PATHS:-}"
}

extract_last_json_line() {
	local raw="${1:-}"
	printf '%s\n' "${raw}" | awk '/^\{/{line=$0} END{if (line != "") print line}'
}

extract_local_memory_rest_value() {
	local config_path="$1"
	local key="$2"
	awk -v wanted="${key}" '
		BEGIN { in_rest = 0 }
		/^[[:space:]]*rest_api:[[:space:]]*$/ { in_rest = 1; next }
		in_rest && /^[^[:space:]]/ { in_rest = 0 }
		in_rest && $1 == wanted ":" {
			sub(/^[^:]+:[[:space:]]*/, "", $0)
			gsub(/"/, "", $0)
			gsub(/[[:space:]]+#.*/, "", $0)
			gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0)
			print $0
			exit
		}
	' "${config_path}"
}

is_local_memory_pidfile_sandbox_block() {
	local output="${1:-}"
	[[ "${output}" == *"failed to write PID file"* && "${output}" == *"operation not permitted"* ]]
}

wait_for_local_memory_health() {
	local health_url="$1"
	local max_attempts="${2:-10}"
	local attempt=1
	local health_json=''
	local health_success='false'

	while (( attempt <= max_attempts )); do
		if health_json="$(curl -fsS "${health_url}" 2>/dev/null)"; then
			health_success="$(echo "${health_json}" | jq -r '.success // false')"
			if [[ "${health_success}" == 'true' ]]; then
				printf '%s\n' "${health_json}"
				return 0
			fi
		fi
		sleep 1
		attempt=$((attempt + 1))
	done
	return 1
}

start_local_memory_daemon_if_needed() {
	local health_url="$1"
	local start_output=''
	local started=1

	log_warn 'local-memory status reported stopped; attempting daemon start'
	if ! start_output="$(local-memory start 2>&1)"; then
		if is_local_memory_pidfile_sandbox_block "${start_output}"; then
			log_warn 'local-memory start reported sandbox pidfile limits; continuing with REST health probe'
		else
			log_err 'local-memory start failed'
			if [[ -n "${start_output}" ]]; then
				echo "${start_output}" >&2
			fi
			return 1
		fi
	else
		started=0
	fi

	if [[ "${started}" -eq 0 ]]; then
		log_ok 'local-memory start command succeeded'
	fi
	if ! wait_for_local_memory_health "${health_url}" 12 >/dev/null; then
		log_err "local-memory daemon failed to become healthy at ${health_url} after start attempt"
		return 1
	fi
	return 0
}


make_tmp_file() {
	mktemp "${TMPDIR:-/tmp}/local-memory-preflight.XXXXXX"
}

cleanup_tmp_files() {
	local path
	for path in "$@"; do
		[[ -n "${path}" ]] || continue
		/bin/rm -f -- "${path}"
	done
}

set_cleanup_trap() {
	local trap_cmd='cleanup_tmp_files'
	local path
	for path in "$@"; do
		trap_cmd+=" $(printf '%q' "${path}")"
	done
	if [[ -n "${ZSH_VERSION:-}" ]]; then
		trap "${trap_cmd}" EXIT
	else
		trap "${trap_cmd}" RETURN
	fi
}

create_tmp_file() {
	local label="$1"
	local tmp_file=''

	if ! tmp_file="$(make_tmp_file)"; then
		log_err "mktemp failed for ${label}"
		return 1
	fi
	if [[ -z "${tmp_file}" ]]; then
		log_err "mktemp returned empty path for ${label}"
		return 1
	fi
	printf '%s\n' "${tmp_file}"
}

post_json_to_file() {
	local output_path="$1"
	local url="$2"
	local payload="$3"

	curl -sS -o "${output_path}" -w '%{http_code}' \
		-H 'Content-Type: application/json' \
		-d "${payload}" \
		"${url}"
}

detect_stack() {
	if [[ -f package.json ]]; then
		echo js
		return
	fi
	if [[ -f pyproject.toml ]]; then
		echo py
		return
	fi
	if [[ -f Cargo.toml ]]; then
		echo rust
		return
	fi
	echo repo
}

stack_bins_csv() {
	case "$1" in
		js) echo 'git,bash,sed,rg,jq,curl,node,npm,python3' ;;
		py) echo 'git,bash,sed,rg,jq,curl,python3' ;;
		rust) echo 'git,bash,sed,rg,jq,curl,python3,cargo' ;;
		repo) echo 'git,bash,sed,rg,jq,curl,python3' ;;
		*) log_err "unknown stack: $1"; return 2 ;;
	esac
}

stack_paths_csv() {
	case "$1" in
		js) echo 'package.json,CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		py) echo 'pyproject.toml,CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		rust) echo 'Cargo.toml,CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		repo) echo 'CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		*) log_err "unknown stack: $1"; return 2 ;;
	esac
}

check_bins() {
	local bins_csv="$1"
	local b
	local missing_bins=''

	while IFS= read -r b; do
		[[ -z "${b}" ]] && continue
		if ! command -v "${b}" >/dev/null 2>&1; then
			if [[ -n "${missing_bins}" ]]; then
				missing_bins="${missing_bins} ${b}"
			else
				missing_bins="${b}"
			fi
		fi
	done < <(printf '%s' "${bins_csv}" | tr ',' '\n')

	if [[ -n "${missing_bins}" ]]; then
		log_err "missing binaries: ${missing_bins}"
		return 2
	fi
	log_ok "binaries ok: ${bins_csv}"
}

check_paths() {
	local root="$1"
	local paths_csv="$2"
	local p

	while IFS= read -r p; do
		[[ -z "${p}" ]] && continue

		local match
		local found=0
		local match_count=0
		local abs
		while IFS= read -r match; do
			[[ -z "${match}" ]] && continue
			match_count=$((match_count + 1))
			if [[ -e "${match}" ]]; then
				found=1
				if ! abs="$(python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "${match}")"; then
					log_err "failed to resolve path: ${match}"
					return 2
				fi
				if [[ "${abs}" != "${root}" && "${abs}" != "${root}"/* ]]; then
					log_err "path escapes repo root: ${match} -> ${abs}"
					return 2
				fi
			fi
		done < <(python3 - "${p}" <<'PY'
import glob
import sys

pattern = sys.argv[1]
for candidate in glob.glob(pattern):
    print(candidate)
PY
)

		if (( match_count == 0 )) && [[ -e "${p}" ]]; then
			found=1
			if ! abs="$(python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "${p}")"; then
				log_err "failed to resolve path: ${p}"
				return 2
			fi
			if [[ "${abs}" != "${root}" && "${abs}" != "${root}"/* ]]; then
				log_err "path escapes repo root: ${p} -> ${abs}"
				return 2
			fi
		fi

		if (( found == 0 )); then
			log_err "missing path: ${p}"
			return 2
		fi
	done < <(printf '%s' "${paths_csv}" | tr ',' '\n')
	log_ok "paths ok: ${paths_csv}"
}

preflight_local_memory_gold() {
	log_section "Local Memory Preflight"

	if ! command -v local-memory >/dev/null 2>&1; then
		log_err 'missing binary: local-memory'
		return 1
	fi
	if ! command -v jq >/dev/null 2>&1; then
		log_err 'missing binary: jq (required for local-memory checks)'
		return 1
	fi
	if ! command -v curl >/dev/null 2>&1; then
		log_err 'missing binary: curl (required for REST checks)'
		return 1
	fi

	local version
	version="$(local-memory --version 2>/dev/null | tr -d '\r')"
	echo "local-memory version: ${version}"

	local status_json
	if ! status_json="$(local-memory status --json 2>/dev/null)"; then
		log_err 'local-memory status failed'
		return 1
	fi
	status_json="$(extract_last_json_line "${status_json}")"
	if [[ -z "${status_json}" ]]; then
		log_err 'local-memory status returned no JSON payload'
		return 1
	fi

	local running
	running="$(echo "${status_json}" | jq -r '.data.running // .running // false')"

	local lm_config_path="${LOCAL_MEMORY_CONFIG_PATH:-${HOME}/.local-memory/config.yaml}"
	if [[ ! -f "${lm_config_path}" ]]; then
		log_err "local-memory config missing: ${lm_config_path}"
		echo '   Set LOCAL_MEMORY_CONFIG_PATH if your config lives elsewhere.' >&2
		return 1
	fi

	if ! rg -q '^[[:space:]]*host:[[:space:]]*"?127\.0\.0\.1"?([[:space:]]*#.*)?$' "${lm_config_path}"; then
		log_err 'local-memory config host policy failed: expected host: 127.0.0.1'
		echo "   file: ${lm_config_path}" >&2
		return 1
	fi
	if ! rg -q '^[[:space:]]*auto_port:[[:space:]]*false([[:space:]]*#.*)?$' "${lm_config_path}"; then
		log_err 'local-memory config auto_port policy failed: expected auto_port: false'
		echo "   file: ${lm_config_path}" >&2
		return 1
	fi
	log_ok "config host/auto_port policy ok: ${lm_config_path}"

	local rest_host
	rest_host="$(extract_local_memory_rest_value "${lm_config_path}" host)"
	rest_host="${rest_host:-127.0.0.1}"

	local rest_port
	rest_port="$(extract_local_memory_rest_value "${lm_config_path}" port)"
	rest_port="${rest_port:-3002}"
	if [[ ! "${rest_port}" =~ ^[0-9]+$ ]]; then
		log_err "invalid rest_api_port from config: ${rest_port}"
		return 1
	fi

	local health_url="http://${rest_host}:${rest_port}/api/v1/health"
	local health_json
	if [[ "${running}" != 'true' ]]; then
		if health_json="$(curl -fsS "${health_url}" 2>/dev/null)"; then
			if [[ "$(echo "${health_json}" | jq -r '.success // false')" == 'true' ]]; then
				log_warn "local-memory status reported stopped; REST health succeeded at ${health_url}"
				running='true'
			fi
		fi
	fi
	if [[ "${running}" != 'true' ]]; then
		if ! start_local_memory_daemon_if_needed "${health_url}"; then
			return 1
		fi
		running='true'
		health_json="$(wait_for_local_memory_health "${health_url}" 1 || true)"
	fi
	if [[ -z "${health_json:-}" ]] && ! health_json="$(curl -fsS "${health_url}")"; then
		log_err "REST health endpoint unreachable at ${health_url}"
		return 1
	fi
	if [[ "$(echo "${health_json}" | jq -r '.success // false')" != 'true' ]]; then
		log_err 'REST health endpoint returned success=false'
		return 1
	fi
	log_ok "REST health ok: ${health_url}"

	local probe
	probe="LM-PREFLIGHT-$(date +%Y%m%d-%H%M%S)-$$"
	local content_a="Preflight anchor ${probe}"
	local content_b="Preflight evidence ${probe}"
	local observe_url="http://${rest_host}:${rest_port}/api/v1/observe"
	local relationships_url="http://${rest_host}:${rest_port}/api/v1/relationships"
	local relate_url="http://${rest_host}:${rest_port}/api/v1/relate"
	local search_url="http://${rest_host}:${rest_port}/api/v1/memories/search"
	local malformed_output=''
	local dup_output_1=''
	local dup_output_2=''
	local observe_a_output=''
	local observe_b_output=''
	local relate_output=''
	local search_output=''

	if ! malformed_output="$(create_tmp_file 'malformed payload response')"; then
		return 1
	fi
	if ! dup_output_1="$(create_tmp_file 'duplicate response one')"; then
		cleanup_tmp_files "${malformed_output}"
		return 1
	fi
	if ! dup_output_2="$(create_tmp_file 'duplicate response two')"; then
		cleanup_tmp_files "${malformed_output}" "${dup_output_1}"
		return 1
	fi
	if ! observe_a_output="$(create_tmp_file 'observe response A')"; then
		cleanup_tmp_files "${malformed_output}" "${dup_output_1}" "${dup_output_2}"
		return 1
	fi
	if ! observe_b_output="$(create_tmp_file 'observe response B')"; then
		cleanup_tmp_files "${malformed_output}" "${dup_output_1}" "${dup_output_2}" "${observe_a_output}"
		return 1
	fi
	if ! relate_output="$(create_tmp_file 'relationship response')"; then
		cleanup_tmp_files "${malformed_output}" "${dup_output_1}" "${dup_output_2}" "${observe_a_output}" "${observe_b_output}"
		return 1
	fi
	if ! search_output="$(create_tmp_file 'search response')"; then
		cleanup_tmp_files "${malformed_output}" "${dup_output_1}" "${dup_output_2}" "${observe_a_output}" "${observe_b_output}" "${relate_output}"
		return 1
	fi
	set_cleanup_trap \
		"${malformed_output}" \
		"${dup_output_1}" \
		"${dup_output_2}" \
		"${observe_a_output}" \
		"${observe_b_output}" \
		"${relate_output}" \
		"${search_output}"

	local observe_a_payload
	observe_a_payload="$(jq -nc --arg c "${content_a}" '{content:$c,domain:"coding-harness",source:"codex_preflight",tags:["preflight","local-memory"]}')"
	local observe_b_payload
	observe_b_payload="$(jq -nc --arg c "${content_b}" '{content:$c,domain:"coding-harness",source:"codex_preflight",tags:["preflight","local-memory"]}')"

	local observe_code_a
	local observe_code_b
	if ! observe_code_a="$(post_json_to_file "${observe_a_output}" "${observe_url}" "${observe_a_payload}")"; then
		log_err 'observe A failed'
		return 1
	fi
	if [[ "${observe_code_a}" -ge 400 ]]; then
		log_err "observe A returned HTTP ${observe_code_a}"
		return 1
	fi
	if ! observe_code_b="$(post_json_to_file "${observe_b_output}" "${observe_url}" "${observe_b_payload}")"; then
		log_err 'observe B failed'
		return 1
	fi
	if [[ "${observe_code_b}" -ge 400 ]]; then
		log_err "observe B returned HTTP ${observe_code_b}"
		return 1
	fi

	local observe_a_json
	local observe_b_json
	observe_a_json="$(cat "${observe_a_output}")"
	observe_b_json="$(cat "${observe_b_output}")"

	local id_a
	local id_b
	id_a="$(echo "${observe_a_json}" | jq -r '.id // .data.id // .memory_id // .data.memory_id // empty')"
	id_b="$(echo "${observe_b_json}" | jq -r '.id // .data.id // .memory_id // .data.memory_id // empty')"
	if [[ -z "${id_a}" || -z "${id_b}" ]]; then
		log_err 'observe returned no memory IDs'
		return 1
	fi

	local relate_payload
	relate_payload="$(jq -nc \
		--arg source "${id_a}" \
		--arg target "${id_b}" \
		'{source_memory_id:$source,target_memory_id:$target,relationship_type:"references",strength:0.8,context:"codex preflight smoke cycle"}')"
	local relate_code
	if ! relate_code="$(post_json_to_file "${relate_output}" "${relationships_url}" "${relate_payload}")"; then
		log_err 'relationships create failed'
		return 1
	fi
	if [[ "${relate_code}" -ge 400 ]]; then
		if ! relate_code="$(post_json_to_file "${relate_output}" "${relate_url}" "${relate_payload}")"; then
			log_err 'relate fallback failed'
			return 1
		fi
	fi
	if [[ "${relate_code}" -ge 400 ]]; then
		log_err "relationship create returned HTTP ${relate_code}"
		return 1
	fi
	local relate_json
	relate_json="$(cat "${relate_output}")"
	local relationship_id
	relationship_id="$(echo "${relate_json}" | jq -r '.id // .data.id // .relationship_id // .data.relationship_id // empty')"
	local relate_ok
	relate_ok="$(echo "${relate_json}" | jq -r '.success // true')"
	if [[ "${relate_ok}" != 'true' ]]; then
		log_err 'relate reported failure'
		return 1
	fi

	local search_payload
	search_payload="$(jq -nc --arg query "${probe}" '{query:$query,limit:10,response_format:"ids_only"}')"
	local search_code=''
	local search_attempt=1
	while (( search_attempt <= 5 )); do
		if ! search_code="$(post_json_to_file "${search_output}" "${search_url}" "${search_payload}")"; then
			log_err 'search failed'
			return 1
		fi
		if [[ "${search_code}" -ge 400 ]]; then
			log_err "search returned HTTP ${search_code}"
			return 1
		fi
		local search_json_attempt
		search_json_attempt="$(cat "${search_output}")"
		local search_hits_attempt
		search_hits_attempt="$(echo "${search_json_attempt}" | jq -r '
			if type == "array" then length
			elif .search_info.total_results != null then .search_info.total_results
			elif .results then (.results | length)
			elif .data.results then (.data.results | length)
			elif .data then (.data | length)
			else 0 end
		')"
		if [[ "${search_hits_attempt}" -ge 1 ]]; then
			break
		fi
		sleep 0.2
		search_attempt=$((search_attempt + 1))
	done
	local search_json
	search_json="$(cat "${search_output}")"
	local search_hits
	search_hits="$(echo "${search_json}" | jq -r '
		if type == "array" then length
		elif .search_info.total_results != null then .search_info.total_results
		elif .results then (.results | length)
		elif .data.results then (.data.results | length)
		elif .data then (.data | length)
		else 0 end
	')"
	if [[ "${search_hits}" -lt 1 ]]; then
		log_err "search returned no results for probe ${probe}"
		return 1
	fi
	log_ok "smoke cycle ok: ids ${id_a}, ${id_b}; relationship ${relationship_id}"

	local malformed_code
	malformed_code="$(post_json_to_file "${malformed_output}" "${observe_url}" '{"level":"observation"}')"
	if [[ "${malformed_code}" -lt 400 ]]; then
		trap - RETURN
		rm -f "${malformed_output}" "${dup_output_1}" "${dup_output_2}"
		log_err "malformed payload did not return an error (HTTP ${malformed_code})"
		return 1
	fi
	log_ok "malformed payload rejected: HTTP ${malformed_code}"

	local dup_payload
	dup_payload="$(jq -nc --arg c "${content_a}" '{content:$c,domain:"coding-harness",source:"codex_preflight",tags:["preflight","duplicate-check"]}')"
	local dup_code_1
	local dup_code_2
	dup_code_1="$(post_json_to_file "${dup_output_1}" "${observe_url}" "${dup_payload}")"
	dup_code_2="$(post_json_to_file "${dup_output_2}" "${observe_url}" "${dup_payload}")"
	echo "ℹ️ duplicate behavior snapshot: first=${dup_code_1}, second=${dup_code_2}"

	local daemon_log="${HOME}/.local-memory/daemon.log"
	if [[ -f "${daemon_log}" ]]; then
		local migration_line
		migration_line="$(tail -n 300 "${daemon_log}" | rg -n '"pending_migrations"|"target_version"|"current_version"' -m 1 || true)"
		if [[ -n "${migration_line}" ]]; then
			echo 'ℹ️ migration status signal found in daemon log'
		else
			log_warn 'no migration status signal found in recent daemon log tail'
		fi
	else
		log_warn "daemon log not found at ${daemon_log}"
	fi

log_ok 'local-memory preflight passed'
}

run_preflight_profile() {
	local stack="$1"
	local expected_repo="${2:-}"
	local bins_csv="${3:-}"
	local paths_csv="${4:-}"
	local local_memory_mode="${5:-required}"

	if [[ -z "${bins_csv}" ]]; then
		bins_csv="$(stack_bins_csv "${stack}")"
	fi
	if [[ -z "${paths_csv}" ]]; then
		paths_csv="$(stack_paths_csv "${stack}")"
	fi

	local -a args=(
		--stack "${stack}"
		--mode "${local_memory_mode}"
	)

	if [[ -n "${expected_repo}" ]]; then
		args+=(--repo-fragment "${expected_repo}")
	fi
	if [[ -n "${bins_csv}" ]]; then
		args+=(--bins "${bins_csv}")
	fi
	if [[ -n "${paths_csv}" ]]; then
		args+=(--paths "${paths_csv}")
	fi

	main "${args[@]}"
}

preflight_repo() {
	run_preflight_profile repo "${1:-}" "${2:-}" "${3:-}" "${4:-required}"
}

preflight_js() {
	run_preflight_profile js "${1:-}" "${2:-}" "${3:-}" "${4:-required}"
}

preflight_py() {
	run_preflight_profile py "${1:-}" "${2:-}" "${3:-}" "${4:-required}"
}

preflight_rust() {
	run_preflight_profile rust "${1:-}" "${2:-}" "${3:-}" "${4:-required}"
}

preflight_repo_local_memory() {
	preflight_repo "${1:-}" "${2:-}" "${3:-}" required
}

main() {
	local stack='auto'
	local local_memory_mode='required'
	local expected_repo=''
	local bins_csv=''
	local paths_csv=''

	if (( $# > 0 )) && [[ "${1}" != --* ]] && [[ "${1}" != '-h' ]]; then
		if (( $# > 3 )); then
			log_err "legacy positional mode accepts at most 3 arguments"
			usage >&2
			exit 2
		fi
		expected_repo="${1:-}"
		bins_csv="${2:-}"
		paths_csv="${3:-}"
		local_memory_mode='off'
		set --
	fi

	while (( $# > 0 )); do
		case "$1" in
			--stack)
				stack="${2:-}"
				shift 2
				;;
			--mode)
				local_memory_mode="${2:-}"
				shift 2
				;;
			--repo-fragment)
				expected_repo="${2:-}"
				shift 2
				;;
			--bins)
				bins_csv="${2:-}"
				shift 2
				;;
			--paths)
				paths_csv="${2:-}"
				shift 2
				;;
			-h|--help)
				usage
				return 0
				;;
			*)
				log_err "unknown argument: $1"
				usage >&2
				return 2
				;;
		esac
	done

	case "${local_memory_mode}" in
		off|optional|required) ;;
		*) log_err "invalid --mode: ${local_memory_mode}"; return 2 ;;
	esac

	log_section 'Codex Preflight'
	echo "pwd: $(pwd)"

	if ! command -v git >/dev/null 2>&1; then
		log_err 'missing binary: git'
		return 2
	fi

	local git_root
	if ! git_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
		log_err 'not inside a git repo (git rev-parse failed)'
		return 2
	fi
	if [[ -z "${git_root}" ]]; then
		log_err 'git rev-parse returned empty root'
		return 2
	fi
	git_root="$(cd -- "${git_root}" && pwd -P)"
	echo "git root: ${git_root}"
	echo "workspace root: ${WORKSPACE_ROOT}"

	if [[ "${WORKSPACE_ROOT}" != "${git_root}" && "${WORKSPACE_ROOT}" != "${git_root}"/* ]]; then
		log_err "script workspace mismatch: ${WORKSPACE_ROOT} is not inside git root ${git_root}"
		exit 2
	fi
	if [[ -n "${expected_repo}" && "${WORKSPACE_ROOT}" != *"${expected_repo}"* ]]; then
		log_err "repo mismatch: expected fragment '${expected_repo}' in '${WORKSPACE_ROOT}'"
		exit 2
	fi

	cd "${WORKSPACE_ROOT}"

	if [[ "${stack}" == 'auto' ]]; then
		stack="$(detect_stack)"
	fi
	echo "stack: ${stack}"

	if [[ -z "${bins_csv}" ]]; then
		bins_csv="$(stack_bins_csv "${stack}")"
	fi
	if [[ -z "${paths_csv}" ]]; then
		paths_csv="$(stack_paths_csv "${stack}")"
	fi
	load_preflight_overrides "${PREFLIGHT_OVERRIDES_FILE}"
	bins_csv="$(append_csv_values "${bins_csv}" "${PREFLIGHT_OVERRIDE_BINS}")"
	paths_csv="$(append_csv_values "${paths_csv}" "${PREFLIGHT_OVERRIDE_PATHS}")"

	check_bins "${bins_csv}"
	check_paths "${WORKSPACE_ROOT}" "${paths_csv}"

	local branch_name
	branch_name="$(git -C "${WORKSPACE_ROOT}" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
	echo "git branch: ${branch_name:-HEAD}"
	echo "clean?: $(git -C "${WORKSPACE_ROOT}" status --porcelain -- . | wc -l | tr -d ' ') changes"

	if [[ "${local_memory_mode}" != 'off' ]]; then
		if ! preflight_local_memory_gold; then
			if [[ "${local_memory_mode}" == 'required' ]]; then
				log_err 'local-memory preflight failed (required mode)'
				return 2
			fi
			log_warn 'local-memory preflight failed (optional mode)'
		fi
	fi

	log_ok 'preflight passed'
}

if ! is_script_sourced; then
	main "$@"
fi
