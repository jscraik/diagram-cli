#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "Error: $1" >&2
  exit 1
}

HARNESS_CLI=(node node_modules/@brainwav/coding-harness/dist/cli.js)
CONTRACT_PATH="${HARNESS_CONTRACT_PATH:-harness.contract.json}"
BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-}"
RUN_MEMORY_GATE="${RUN_MEMORY_GATE:-1}"
SKIP_REVIEW_GATE="${SKIP_REVIEW_GATE:-0}"
REVIEW_CHECK_NAME="${REVIEW_CHECK_NAME:-test}"
MEMORY_METRICS_PATH="${MEMORY_METRICS_PATH:-${TMPDIR:-/tmp}/harness-memory-metrics.json}"
REPO_OWNER="${REPO_OWNER:-${GITHUB_REPOSITORY%%/*}}"
REPO_NAME="${REPO_NAME:-${GITHUB_REPOSITORY##*/}}"

if [[ -z "${BASE_SHA}" || -z "${HEAD_SHA}" ]]; then
  fail "BASE_SHA and HEAD_SHA are required."
fi

if [[ ! -f "${CONTRACT_PATH}" ]]; then
  fail "Harness contract not found at ${CONTRACT_PATH}."
fi

if ! command -v jq >/dev/null 2>&1; then
  fail "jq is required but not found on PATH."
fi

mapfile -t changed_files < <(git diff --name-only "${BASE_SHA}...${HEAD_SHA}" | sed '/^$/d')

if (( ${#changed_files[@]} == 0 )); then
  echo "No changed files between ${BASE_SHA} and ${HEAD_SHA}."
  if [[ "${RUN_MEMORY_GATE}" == "1" ]]; then
    echo "Running memory-gate (policy: memoryPolicy.enabled=true)..."
    "${HARNESS_CLI[@]}" memory-gate --metrics "${MEMORY_METRICS_PATH}" --json
  fi
  exit 0
fi

changed_csv="$(printf '%s\n' "${changed_files[@]}" | paste -sd, -)"

echo "Changed files (${#changed_files[@]}):"
printf '  - %s\n' "${changed_files[@]}"

echo "Running preflight-gate..."
"${HARNESS_CLI[@]}" preflight-gate --contract "${CONTRACT_PATH}" --files "${changed_csv}" --json

echo "Running policy-gate..."
policy_output="$("${HARNESS_CLI[@]}" policy-gate --contract "${CONTRACT_PATH}" --files "${changed_csv}" --json)"
echo "${policy_output}" | jq .

tier="$(echo "${policy_output}" | jq -r '.tier // "low"')"
echo "Resolved risk tier: ${tier}"

diff_budget_override_flag=()
diff_budget_override_file=""
diff_budget_override_label="$(jq -r '.diffBudget.overrideLabel // empty' "${CONTRACT_PATH}")"
if [[ -n "${diff_budget_override_label}" && -n "${PR_NUMBER:-}" && -n "${GITHUB_TOKEN:-}" && -n "${REPO_OWNER:-}" && -n "${REPO_NAME:-}" ]]; then
  labels_api="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${PR_NUMBER}/labels"
  labels_json="$(curl -fsSL \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "${labels_api}" || true)"
  if [[ -n "${labels_json}" ]] && echo "${labels_json}" | jq -e --arg label "${diff_budget_override_label}" 'any(.[]?; .name == $label)' >/dev/null; then
    diff_budget_override_file="$(mktemp "${PWD}/.harness-diff-override.XXXXXX.json")"
    jq -n \
      --arg reason "Diff budget override via label ${diff_budget_override_label} on PR #${PR_NUMBER}" \
      --arg approvedBy "${REPO_OWNER}/${REPO_NAME}" \
      --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
      '{ reason: $reason, approvedBy: $approvedBy, timestamp: $timestamp }' > "${diff_budget_override_file}"
    diff_budget_override_flag=(--override "${diff_budget_override_file}")
    echo "Diff budget override active via label '${diff_budget_override_label}'."
  fi
fi

cleanup() {
  if [[ -n "${diff_budget_override_file}" && -f "${diff_budget_override_file}" ]]; then
    rm -f "${diff_budget_override_file}"
  fi
}
trap cleanup EXIT

echo "Running diff-budget..."
"${HARNESS_CLI[@]}" diff-budget --contract "${CONTRACT_PATH}" --base "${BASE_SHA}" --head "${HEAD_SHA}" "${diff_budget_override_flag[@]}" --json

if [[ "${RUN_MEMORY_GATE}" == "1" ]]; then
  echo "Running memory-gate..."
  "${HARNESS_CLI[@]}" memory-gate --metrics "${MEMORY_METRICS_PATH}" --json
fi

if [[ "${tier}" == "medium" || "${tier}" == "high" ]]; then
  if [[ "${SKIP_REVIEW_GATE}" == "1" ]]; then
    echo "Skipping review-gate (SKIP_REVIEW_GATE=1)."
  else
    github_token="${GITHUB_TOKEN:-}"
    pr_number="${PR_NUMBER:-}"
    [[ -n "${github_token}" ]] || fail "GITHUB_TOKEN is required for review-gate when tier is ${tier}."
    [[ -n "${pr_number}" ]] || fail "PR_NUMBER is required for review-gate when tier is ${tier}."
    [[ -n "${REPO_OWNER}" ]] || fail "REPO_OWNER/GITHUB_REPOSITORY is required for review-gate."
    [[ -n "${REPO_NAME}" ]] || fail "REPO_NAME/GITHUB_REPOSITORY is required for review-gate."

    echo "Running review-gate (check=${REVIEW_CHECK_NAME})..."
    "${HARNESS_CLI[@]}" review-gate \
      --token "${github_token}" \
      --owner "${REPO_OWNER}" \
      --repo "${REPO_NAME}" \
      --pr "${pr_number}" \
      --sha "${HEAD_SHA}" \
      --check "${REVIEW_CHECK_NAME}" \
      --contract "${CONTRACT_PATH}" \
      --json
  fi
fi

if [[ "${tier}" == "high" ]]; then
  evidence_files=()
  for changed_file in "${changed_files[@]}"; do
    if [[ "${changed_file}" =~ \.(png|jpe?g)$ ]]; then
      evidence_files+=("${changed_file}")
    fi
  done
  evidence_csv=""
  if (( ${#evidence_files[@]} > 0 )); then
    evidence_csv="$(IFS=,; echo "${evidence_files[*]}")"
  fi
  echo "Running evidence-verify..."
  if [[ -n "${evidence_csv}" ]]; then
    "${HARNESS_CLI[@]}" evidence-verify --contract "${CONTRACT_PATH}" --changed "${changed_csv}" --files "${evidence_csv}" --json
  else
    "${HARNESS_CLI[@]}" evidence-verify --contract "${CONTRACT_PATH}" --changed "${changed_csv}" --json
  fi
fi

echo "Harness gate pipeline completed."
