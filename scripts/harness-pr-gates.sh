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

echo "Running diff-budget..."
"${HARNESS_CLI[@]}" diff-budget --contract "${CONTRACT_PATH}" --base "${BASE_SHA}" --head "${HEAD_SHA}" --json

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
    repo_owner="${REPO_OWNER:-${GITHUB_REPOSITORY%%/*}}"
    repo_name="${REPO_NAME:-${GITHUB_REPOSITORY##*/}}"

    [[ -n "${github_token}" ]] || fail "GITHUB_TOKEN is required for review-gate when tier is ${tier}."
    [[ -n "${pr_number}" ]] || fail "PR_NUMBER is required for review-gate when tier is ${tier}."
    [[ -n "${repo_owner}" ]] || fail "REPO_OWNER/GITHUB_REPOSITORY is required for review-gate."
    [[ -n "${repo_name}" ]] || fail "REPO_NAME/GITHUB_REPOSITORY is required for review-gate."

    echo "Running review-gate (check=${REVIEW_CHECK_NAME})..."
    "${HARNESS_CLI[@]}" review-gate \
      --token "${github_token}" \
      --owner "${repo_owner}" \
      --repo "${repo_name}" \
      --pr "${pr_number}" \
      --sha "${HEAD_SHA}" \
      --check "${REVIEW_CHECK_NAME}" \
      --contract "${CONTRACT_PATH}" \
      --json
  fi
fi

if [[ "${tier}" == "high" ]]; then
  evidence_csv="$(printf '%s\n' "${changed_files[@]}" | rg -N '\.(png|jpe?g)$' | paste -sd, - || true)"
  echo "Running evidence-verify..."
  if [[ -n "${evidence_csv}" ]]; then
    "${HARNESS_CLI[@]}" evidence-verify --contract "${CONTRACT_PATH}" --changed "${changed_csv}" --files "${evidence_csv}" --json
  else
    "${HARNESS_CLI[@]}" evidence-verify --contract "${CONTRACT_PATH}" --changed "${changed_csv}" --json
  fi
fi

echo "Harness gate pipeline completed."
