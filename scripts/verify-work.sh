#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"

changed_only=1
fast_mode=0
strict_mode=0
repo_root=""
hook_governance_scope="project-local"
local_memory_mode="required"
declare -a temp_paths=()

cleanup_temp_paths() {
	local path=""
	for path in "${temp_paths[@]}"; do
		[[ -n "$path" ]] || continue
		rm -f "$path"
	done
}
trap cleanup_temp_paths EXIT

new_temp_json() {
	local __target_var="$1"
	local pattern="$2"
	local temp_path=""
	temp_path="$(mktemp "${TMPDIR:-/tmp}/${pattern}.XXXXXX.json")"
	temp_paths+=("$temp_path")
	printf -v "$__target_var" '%s' "$temp_path"
}

print_stage() {
	echo
	echo "==> $1"
}

usage() {
	cat <<'USAGE'
Usage: scripts/verify-work.sh [options]

Canonical repo-local verification runner.

Options:
  --all              Run full test coverage in --fast mode
  --changed-only     Prefer changed-file validation in --fast mode (default)
  --strict           Fail when fast-mode fallbacks are needed
  --fast             Run preflight + lint + typecheck + tests instead of the full check bundle
  --repo-root PATH   Run checks in a specific repository root
  --project-governance   Limit hook-governance checks to the current git repo (default)
  --workspace-governance Run hook-governance checks using docs/hooks-governance/repo-scope.manifest.json
  -h, --help         Show this help text
USAGE
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

preflight_bins_csv() {
	case "$1" in
		js) echo 'git,bash,sed,rg,jq,curl,node,npm,python3' ;;
		py) echo 'git,bash,sed,rg,jq,curl,python3' ;;
		rust) echo 'git,bash,sed,rg,jq,curl,python3,cargo' ;;
		repo) echo 'git,bash,sed,rg,jq,curl,python3' ;;
		*) echo "[verify-work] unknown stack: $1" >&2; return 2 ;;
	esac
}

preflight_paths_csv() {
	case "$1" in
		js) echo 'package.json,CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		py) echo 'pyproject.toml,CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		rust) echo 'Cargo.toml,CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		repo) echo 'CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		*) echo "[verify-work] unknown stack: $1" >&2; return 2 ;;
	esac
}

has_package_script() {
	local script_name="$1"
	[[ -f "$repo_root/package.json" ]] || return 1
	jq -e --arg script_name "$script_name" '(.scripts // {}) | has($script_name)' "$repo_root/package.json" >/dev/null 2>&1
}

build_project_local_manifest() {
	local out_path="$1"
	local workspace_root="$2"
	local repo_name="$3"
	python3 - "$out_path" "$workspace_root" "$repo_name" <<'PY'
import json
import sys
from pathlib import Path

out = Path(sys.argv[1])
workspace_root = sys.argv[2]
repo_name = sys.argv[3]
payload = {
    "workspace_root": workspace_root,
    "repos": {
        "in_scope": [repo_name],
        "excluded": [],
    },
}
out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
}

run_hook_governance_checks() {
	local hook_root="$repo_root/scripts/hook-governance"
	if [[ ! -d "$hook_root" ]]; then
		echo "[verify-work] hook-governance scripts not found; skipping governance checks"
		return 0
	fi

	local current_git_root=""
	current_git_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
	local current_repo_name=""
	current_repo_name="$(basename "$current_git_root")"
	local workspace_root=""
	workspace_root="$(dirname "$current_git_root")"

	local inventory_script="$hook_root/inventory_repos.py"
	local classify_script="$hook_root/classify_public_api.py"
	local rollout_script="$hook_root/rollout_check.py"
	local ratchet_script="$hook_root/evaluate_docstring_ratchet.py"
	local scope_manifest="$repo_root/docs/hooks-governance/repo-scope.manifest.json"
	local public_rules="$repo_root/docs/hooks-governance/public-api-rules.yaml"
	local metrics_file="$repo_root/docs/hooks-governance/docstring-ratchet-metrics.json"
	local inventory_path="$repo_root/docs/hooks-governance/repo-profile-matrix.json"
	local classification_path="$repo_root/docs/hooks-governance/public-api-classification.json"
	local rollout_output="$repo_root/docs/hooks-governance/rollout-check-report.json"
	local ratchet_output="$repo_root/docs/hooks-governance/docstring-ratchet-report.json"
	local inventory_ready=0
	local classification_ready=0

	if [[ "$hook_governance_scope" == "project-local" ]]; then
		new_temp_json scope_manifest "verify-work-hook-scope"
		new_temp_json rollout_output "verify-work-rollout-check-report"
		new_temp_json ratchet_output "verify-work-docstring-ratchet-report"
		build_project_local_manifest "$scope_manifest" "$workspace_root" "$current_repo_name"
		echo "[verify-work] hook-governance scope: project-local (repo=$current_repo_name)"
	else
		echo "[verify-work] hook-governance scope: workspace"
	fi

	if [[ -f "$inventory_path" ]]; then
		inventory_ready=1
	elif [[ -f "$inventory_script" && -f "$scope_manifest" ]]; then
		print_stage "hook-governance-inventory"
		python3 "$inventory_script" --manifest "$scope_manifest" --out "$inventory_path"
		inventory_ready=1
	else
		echo "[verify-work] error: hook-governance inventory inputs missing: inventory_repos.py or scope manifest not found" >&2
		return 1
	fi

	if [[ -f "$classification_path" ]]; then
		classification_ready=1
	elif [[ -f "$classify_script" && -f "$public_rules" && "$inventory_ready" -eq 1 ]]; then
		print_stage "hook-governance-public-api-classification"
		python3 "$classify_script" \
			--inventory "$inventory_path" \
		--rules "$public_rules" \
		--out "$classification_path"
		classification_ready=1
	else
		echo "[verify-work] error: hook-governance classification inputs missing: classifier script, rules, or inventory not found" >&2
		return 1
	fi

	if [[ -f "$ratchet_script" && -f "$metrics_file" && "$classification_ready" -eq 1 ]]; then
		print_stage "hook-governance-docstring-ratchet"
		python3 "$ratchet_script" \
			--classification "$classification_path" \
		--metrics "$metrics_file" \
		--window-days 14 \
		--out "$ratchet_output"
	else
		echo "[verify-work] error: hook-governance docstring-ratchet inputs missing: evaluator script, classification, or metrics not found" >&2
		return 1
	fi

	if [[ -f "$rollout_script" && "$inventory_ready" -eq 1 ]]; then
		print_stage "hook-governance-rollout-check"
		python3 "$rollout_script" \
		--inventory "$inventory_path" \
		--recovery-slo-hours 24 \
		--out "$rollout_output"
	else
		echo "[verify-work] error: hook-governance rollout-check inputs missing: rollout_check.py or inventory not found" >&2
		return 1
	fi
}

while (( $# > 0 )); do
	case "$1" in
		--all|--all-skills)
			changed_only=0
			shift
			;;
		--changed-only)
			changed_only=1
			shift
			;;
		--strict)
			strict_mode=1
			shift
			;;
		--fast)
			fast_mode=1
			shift
			;;
		--repo-root)
			repo_root="${2:-}"
			shift 2
			;;
		--project-governance)
			hook_governance_scope="project-local"
			shift
			;;
		--workspace-governance)
			hook_governance_scope="workspace"
			shift
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			echo "[verify-work] unknown argument: $1" >&2
			usage >&2
			exit 2
			;;
	esac
done

if [[ -z "$repo_root" ]]; then
	repo_root="$REPO_ROOT"
fi

if [[ "$fast_mode" -eq 1 ]]; then
	local_memory_mode="optional"
fi

cd "$repo_root"
echo "[verify-work] repo root: $repo_root"

stack="$(detect_stack)"
bins_csv="$(preflight_bins_csv "$stack")"
paths_csv="$(preflight_paths_csv "$stack")"

print_stage "codex-preflight"
bash "$repo_root/scripts/codex-preflight.sh" \
	--stack "$stack" \
	--mode "$local_memory_mode" \
	--bins "$bins_csv" \
	--paths "$paths_csv"

if [[ "$fast_mode" -eq 0 ]]; then
	print_stage "check"
	npm run check
	run_hook_governance_checks
	exit 0
fi

print_stage "lint"
npm run lint

print_stage "typecheck"
npm run typecheck

if [[ "$changed_only" -eq 1 ]]; then
	if has_package_script "test:related"; then
		print_stage "test:related"
		npm run test:related
	else
		if [[ "$strict_mode" -eq 1 ]]; then
			echo "[verify-work] missing package script: test:related" >&2
			exit 1
		fi
		echo "[verify-work] test:related unavailable; falling back to full test run"
		print_stage "test"
		npm test
	fi
else
	print_stage "test"
	npm test
fi

run_hook_governance_checks
