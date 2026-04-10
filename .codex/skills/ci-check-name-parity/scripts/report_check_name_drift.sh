#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SKILL_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd -P)"
REPO_ROOT="$(cd -- "${SKILL_ROOT}/../../.." && pwd -P)"

cd "${REPO_ROOT}"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ci-check-parity.XXXXXX")"
trap 'rm -r "${tmp_dir}"' EXIT

WORKFLOW_FILE="${WORKFLOW_FILE:-.github/workflows/pr-pipeline.yml}"
if [[ ! -f "${WORKFLOW_FILE}" ]]; then
  echo "Missing workflow file: ${WORKFLOW_FILE}" >&2
  exit 1
fi
export WORKFLOW_FILE

python3 <<'PY' > "${tmp_dir}/workflow_names.txt"
from pathlib import Path
import os
import re

workflow = Path(os.environ["WORKFLOW_FILE"])
text = workflow.read_text()
in_jobs = False
current_job = None
current_name = None
results = []

for line in text.splitlines():
    if line.strip() == "jobs:":
        in_jobs = True
        continue
    if not in_jobs:
        continue
    job_match = re.match(r"^  ([A-Za-z0-9_-]+):\s*$", line)
    if job_match:
        if current_job and current_name:
            results.append(current_name)
        current_job = job_match.group(1)
        current_name = None
        continue
    name_match = re.match(r'^    name:\s*(.+?)\s*$', line)
    if current_job and name_match and current_name is None:
        current_name = name_match.group(1).strip().strip('"').strip("'")

if current_job and current_name:
    results.append(current_name)

for item in sorted(dict.fromkeys(results)):
    print(item)
PY

jq -r '.requiredChecks[].displayName' .harness/ci-required-checks.json | sort -u > "${tmp_dir}/required_checks.txt"
jq -r '.reviewPolicy.requiredChecks[]?, .branchProtection.requiredChecks[]?' harness.contract.json | sort -u > "${tmp_dir}/contract_checks.txt"

printf '== workflow names ==\n'
cat "${tmp_dir}/workflow_names.txt"
printf '\n== .harness required checks ==\n'
cat "${tmp_dir}/required_checks.txt"
printf '\n== harness.contract required checks ==\n'
cat "${tmp_dir}/contract_checks.txt"

printf '\n== workflow only ==\n'
comm -23 "${tmp_dir}/workflow_names.txt" "${tmp_dir}/required_checks.txt" || true
printf '\n== .harness only ==\n'
comm -13 "${tmp_dir}/workflow_names.txt" "${tmp_dir}/required_checks.txt" || true
printf '\n== contract only (vs workflow) ==\n'
comm -13 "${tmp_dir}/workflow_names.txt" "${tmp_dir}/contract_checks.txt" || true
