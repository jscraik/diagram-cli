#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "Error: $1" >&2
  exit 1
}

HARNESS_CLI=(node node_modules/@brainwav/coding-harness/dist/cli.js)
CONTRACT_PATH="${HARNESS_CONTRACT_PATH:-harness.contract.json}"
BASE_REF="${HARNESS_BASE_REF:-main}"
BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-$(git rev-parse HEAD)}"

[[ -f "${CONTRACT_PATH}" ]] || fail "Harness contract not found at ${CONTRACT_PATH}."
[[ -f "${HARNESS_CLI[1]}" ]] || fail "Harness CLI not found at ${HARNESS_CLI[1]}. Run npm install first."

if [[ -z "${BASE_SHA}" ]]; then
  if git rev-parse --verify --quiet "origin/${BASE_REF}" >/dev/null; then
    BASE_SHA="$(git merge-base "origin/${BASE_REF}" "${HEAD_SHA}")"
  elif git rev-parse --verify --quiet HEAD~1 >/dev/null; then
    BASE_SHA="$(git rev-parse HEAD~1)"
  else
    BASE_SHA="${HEAD_SHA}"
  fi
fi

# Collect changed files from range + working tree, excluding generated noise.
mapfile -t changed_files < <(
  {
    git diff --name-only "${BASE_SHA}...${HEAD_SHA}"
    git diff --name-only
    git diff --name-only --cached
    git ls-files --others --exclude-standard
  } | sed /^$/d | sort -u | while IFS= read -r file; do
    case "${file}" in
      artifacts/*|node_modules/*|.narrative/*)
        continue
        ;;
      *)
        printf %sn "${file}"
        ;;
    esac
  done
)

if (( ${#changed_files[@]} > 0 )); then
  changed_csv="$(printf %sn "${changed_files[@]}" | paste -sd, -)"

  echo "Running preflight-gate on ${#changed_files[@]} changed file(s)..."
  "${HARNESS_CLI[@]}" preflight-gate --contract "${CONTRACT_PATH}" --files "${changed_csv}" --json
else
  echo "No changed files detected; skipping preflight-gate."
fi

if [[ "${BASE_SHA}" != "${HEAD_SHA}" ]]; then
  echo "Running diff-budget (${BASE_SHA}...${HEAD_SHA})..."
  "${HARNESS_CLI[@]}" diff-budget --contract "${CONTRACT_PATH}" --base "${BASE_SHA}" --head "${HEAD_SHA}" --json
else
  echo "Only one commit available; skipping diff-budget."
fi

echo "Running memory-gate..."
"${HARNESS_CLI[@]}" memory-gate --json

echo "harness:check complete."
